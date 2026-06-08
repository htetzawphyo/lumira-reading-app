import * as FileSystem from "expo-file-system/legacy";
import * as Network from "expo-network";

import {
  getCloudSyncSettings,
  getBookById,
  listAllHighlights,
  listAllNotes,
  listBooks,
  listFolderBookLinks,
  listFolders,
  restoreBookRecord,
  restoreFolderBookRecord,
  restoreFolderRecord,
  restoreHighlightRecord,
  restoreNoteRecord,
  updateBookCoverUri,
  updateCloudSyncSettings,
} from "@/db/repositories";
import { API_BASE_URL, apiRequest } from "@/features/api/api-client";
import { getStoredAuthSession } from "@/features/auth/auth-store";
import type {
  CloudActionResult,
  CloudBackupContext,
  CloudBookItem,
  RestoreSummary,
  SyncDashboard,
} from "@/features/sync/cloud-backup-types";
import type {
  BackupSnapshotPayload,
  BackendBackupSnapshot,
  BookDownloadUrlResponse,
  BookUploadUrlResponse,
} from "@/features/sync/backend-backup-types";
import { ensureLumiraStorage, getStoredBookFileUri } from "@/utils/file-storage";
import { nowIso } from "@/utils/date";
import { extractEpubMetadata } from "@/utils/epub-metadata";
import { createId } from "@/utils/id";

const CLOUD_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;
let autoSyncPromise: Promise<CloudActionResult | null> | null = null;

async function getFileSizeBytes(fileUri: string) {
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    return info.exists && typeof info.size === "number" ? info.size : 0;
  } catch {
    return 0;
  }
}

function authRequiredResult(): CloudActionResult {
  return {
    ok: false,
    status: "failed",
    message: "Sign in with Google from Settings > Profile before using Cloud Backup.",
  };
}

async function ensureSignedIn() {
  const session = await getStoredAuthSession();

  return Boolean(session?.accessToken);
}

export function canUseCloudBackup(isPremiumUser: boolean) {
  return isPremiumUser;
}

export function getCloudBackupSettings() {
  return getCloudSyncSettings();
}

export function setCloudBackupSettings(
  settings: Parameters<typeof updateCloudSyncSettings>[0],
) {
  return updateCloudSyncSettings(settings);
}

async function buildBackupSnapshot(): Promise<BackupSnapshotPayload> {
  const books = listBooks();
  const folders = listFolders();
  const highlights = listAllHighlights();
  const notes = listAllNotes();
  const folderBooks = listFolderBookLinks();
  const bookSizePairs = await Promise.all(
    books.map(async (book) => [book.id, await getFileSizeBytes(book.fileUri)] as const),
  );
  const fileSizes = new Map(bookSizePairs);

  return {
    books: books.map((book) => ({
      localBookId: book.id,
      title: book.title,
      author: book.author ?? undefined,
      fileName: book.originalFileName ?? `${book.title}.epub`,
      mimeType: "application/epub+zip",
      fileSizeBytes: String(fileSizes.get(book.id) ?? 0),
      currentChapterIndex: book.currentChapterIndex,
      currentLocation: book.currentLocation ?? undefined,
      progressPercent: book.progress,
      lastOpenedAt: book.lastOpenedAt ?? undefined,
    })),
    folders: folders.map((folder) => ({
      localFolderId: folder.id,
      name: folder.name,
    })),
    highlights: highlights.map((highlight) => ({
      localHighlightId: highlight.id,
      localBookId: highlight.bookId,
      chapterIndex: highlight.chapterIndex,
      selectedText: highlight.text,
      color: "YELLOW",
      startOffset: highlight.startOffset ?? undefined,
      endOffset: highlight.endOffset ?? undefined,
    })),
    notes: notes.map((note) => ({
      localNoteId: note.id,
      localBookId: note.bookId,
      chapterIndex: note.chapterIndex,
      selectedText: note.selectedText ?? note.content,
      noteText: note.content,
      startOffset: note.startOffset ?? undefined,
      endOffset: note.endOffset ?? undefined,
    })),
    folderBooks: folderBooks.map((link) => ({
      localFolderId: link.folderId,
      localBookId: link.bookId,
    })),
  };
}

function remoteBookLocalId(book: BackendBackupSnapshot["books"][number]) {
  return book.localBookId || book.id;
}

function remoteFolderLocalId(
  folder: BackendBackupSnapshot["folders"][number],
) {
  return folder.localFolderId || folder.id || createId();
}

function buildRemoteBookIdMap(snapshot: BackendBackupSnapshot) {
  const map = new Map<string, string>();

  for (const book of snapshot.books) {
    const localBookId = remoteBookLocalId(book);
    map.set(book.id, localBookId);
    if (book.localBookId) {
      map.set(book.localBookId, localBookId);
    }
  }

  return map;
}

function remoteKnowledgeBookId(
  item:
    | BackendBackupSnapshot["highlights"][number]
    | BackendBackupSnapshot["notes"][number],
  bookIdMap: Map<string, string>,
) {
  if (item.localBookId) {
    return item.localBookId;
  }

  if (item.bookId && bookIdMap.has(item.bookId)) {
    return bookIdMap.get(item.bookId);
  }

  return undefined;
}

async function repairMissingCoverFromEpub(bookId: string) {
  const existingBook = getBookById(bookId);

  if (!existingBook || existingBook.coverUri) {
    return;
  }

  try {
    const fileInfo = await FileSystem.getInfoAsync(existingBook.fileUri);

    if (!fileInfo.exists) {
      return;
    }

    const metadata = await extractEpubMetadata(existingBook.fileUri, bookId);

    if (metadata.coverUri) {
      updateBookCoverUri(bookId, metadata.coverUri);
    }
  } catch {
    // Cover repair is best-effort; restored reading data should not fail because of it.
  }
}

async function canAutoSyncOnCurrentNetwork() {
  const settings = getCloudSyncSettings();

  if (!settings.cloudBackupEnabled) {
    return false;
  }

  try {
    const network = await Network.getNetworkStateAsync();

    if (network.isInternetReachable === false || !network.isConnected) {
      return false;
    }

    if (network.type === Network.NetworkStateType.CELLULAR) {
      return settings.allowMobileDataSync;
    }

    if (settings.autoSyncWifiOnly) {
      return network.type === Network.NetworkStateType.WIFI;
    }

    return true;
  } catch {
    return false;
  }
}

async function uploadBookFile(book: ReturnType<typeof listBooks>[number]) {
  const fileInfo = await FileSystem.getInfoAsync(book.fileUri);

  if (!fileInfo.exists) {
    throw new Error(`${book.title} is missing its local EPUB file.`);
  }

  const fileSizeBytes =
    typeof fileInfo.size === "number" ? String(fileInfo.size) : "0";
  const fileName = book.originalFileName ?? `${book.title}.epub`;
  const upload = await apiRequest<BookUploadUrlResponse>(
    `/backup/books/${encodeURIComponent(book.id)}/upload-url`,
    {
      method: "POST",
      body: JSON.stringify({
        fileName,
        contentType: "application/epub+zip",
        fileSizeBytes,
      }),
    },
  );

  const result = await FileSystem.uploadAsync(upload.uploadUrl, book.fileUri, {
    httpMethod: upload.method,
    uploadType: FileSystem.FileSystemUploadType.BINARY_CONTENT,
    headers: {
      "Content-Type": "application/epub+zip",
    },
  });

  if (result.status < 200 || result.status >= 300) {
    throw new Error(
      `Upload failed for ${book.title} (${result.status}): ${result.body || "No response body"}`,
    );
  }

  await apiRequest(`/backup/books/${encodeURIComponent(book.id)}/confirm-upload`, {
    method: "POST",
  });
}

async function downloadCloudBookFile(params: {
  bookId: string;
  directUrl: string;
  destination: string;
}) {
  try {
    const downloaded = await FileSystem.downloadAsync(
      params.directUrl,
      params.destination,
    );

    if (downloaded.status >= 200 && downloaded.status < 300) {
      return downloaded;
    }
  } catch {
    // Some Android networks reject direct R2 signed URLs. Fall back to the API.
  }

  const session = await getStoredAuthSession();
  const downloaded = await FileSystem.downloadAsync(
    `${API_BASE_URL}/backup/books/${encodeURIComponent(params.bookId)}/file`,
    params.destination,
    {
      headers: session?.accessToken
        ? { Authorization: `Bearer ${session.accessToken}` }
        : undefined,
    },
  );

  if (downloaded.status < 200 || downloaded.status >= 300) {
    throw new Error(`Download failed (${downloaded.status})`);
  }

  return downloaded;
}

async function uploadLocalBookFiles(books: ReturnType<typeof listBooks>) {
  let uploaded = 0;
  let failed = 0;
  const errors: string[] = [];

  for (const book of books) {
    try {
      await uploadBookFile(book);
      uploaded += 1;
    } catch (error) {
      failed += 1;
      errors.push(error instanceof Error ? error.message : `Upload failed for ${book.title}.`);
    }
  }

  return { uploaded, failed, errors };
}

function dashboardFromSnapshot(
  context: CloudBackupContext,
  snapshot: BackendBackupSnapshot | null,
): SyncDashboard {
  const settings = getCloudSyncSettings();
  const backedUpBookCount = snapshot?.books.length ?? 0;
  const backedUpKnowledgeCount =
    (snapshot?.highlights.length ?? 0) + (snapshot?.notes.length ?? 0);
  const latestBookDate = snapshot?.books
    .map((book) => book.lastOpenedAt)
    .filter(Boolean)
    .sort()
    .at(-1);

  return {
    status: backedUpBookCount > 0 || backedUpKnowledgeCount > 0 ? "synced" : "enabled",
    lastSyncedAt: latestBookDate ?? null,
    storage: {
      usedBytes: Number(snapshot?.storage.usedBytes ?? 0),
      totalBytes: Number(snapshot?.storage.limitBytes ?? CLOUD_STORAGE_LIMIT_BYTES),
    },
    cloudBackupEnabled: true,
    autoSyncWifiOnly: settings.autoSyncWifiOnly,
    allowMobileDataSync: settings.allowMobileDataSync,
    backedUpBookCount,
    backedUpKnowledgeCount:
      backedUpKnowledgeCount || context.knowledgeCount,
  };
}

export async function getSyncDashboard(
  context: CloudBackupContext,
): Promise<SyncDashboard> {
  const settings = getCloudSyncSettings();

  if (!(await ensureSignedIn())) {
    return {
      status: "not-enabled",
      lastSyncedAt: null,
      storage: {
        usedBytes: 0,
        totalBytes: CLOUD_STORAGE_LIMIT_BYTES,
      },
      cloudBackupEnabled: settings.cloudBackupEnabled,
      autoSyncWifiOnly: settings.autoSyncWifiOnly,
      allowMobileDataSync: settings.allowMobileDataSync,
      backedUpBookCount: 0,
      backedUpKnowledgeCount: context.knowledgeCount,
    };
  }

  const snapshot = await apiRequest<BackendBackupSnapshot>("/backup/snapshot");
  return dashboardFromSnapshot(context, snapshot);
}

export async function syncNow(): Promise<CloudActionResult> {
  if (!(await ensureSignedIn())) {
    return authRequiredResult();
  }

  const localBooks = listBooks();
  const snapshot = await buildBackupSnapshot();
  await apiRequest<BackendBackupSnapshot>("/backup/snapshot", {
    method: "PUT",
    body: JSON.stringify(snapshot),
  });
  const uploadSummary = await uploadLocalBookFiles(localBooks);

  return {
    ok: uploadSummary.failed === 0,
    status: uploadSummary.failed === 0 ? "synced" : "failed",
    message:
      uploadSummary.failed === 0
        ? `Books, EPUB files, folders, notes, highlights, and reading progress synced. Uploaded ${uploadSummary.uploaded} book file${uploadSummary.uploaded === 1 ? "" : "s"}.`
        : `Metadata synced, but ${uploadSummary.failed} book file${uploadSummary.failed === 1 ? "" : "s"} could not upload. ${uploadSummary.errors[0] ?? ""}`,
  };
}

export async function restoreBackup(): Promise<RestoreSummary> {
  if (!(await ensureSignedIn())) {
    throw new Error(authRequiredResult().message);
  }

  const snapshot = await apiRequest<BackendBackupSnapshot>("/backup/snapshot");
  const bookIdMap = buildRemoteBookIdMap(snapshot);
  const localBookIds = new Set(listBooks().map((book) => book.id));
  const folderIdMap = new Map<string, string>();
  let booksRestored = 0;
  let notesRestored = 0;
  let highlightsRestored = 0;
  let skippedDuplicates = 0;
  let failedItems = 0;

  await ensureLumiraStorage();

  for (const folder of snapshot.folders) {
    const localFolderId = remoteFolderLocalId(folder);
    folderIdMap.set(folder.id ?? localFolderId, localFolderId);
    if (folder.localFolderId) {
      folderIdMap.set(folder.localFolderId, localFolderId);
    }

    const restoredFolder = restoreFolderRecord({
      id: localFolderId,
      name: folder.name,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    const actualFolderId = restoredFolder?.id ?? localFolderId;
    folderIdMap.set(localFolderId, actualFolderId);
    if (folder.id) {
      folderIdMap.set(folder.id, actualFolderId);
    }
  }

  for (const book of snapshot.books) {
    const localBookId = remoteBookLocalId(book);

    if (book.backupStatus && book.backupStatus !== "BACKED_UP") {
      failedItems += 1;
      continue;
    }

    if (localBookIds.has(localBookId)) {
      await repairMissingCoverFromEpub(localBookId);
      skippedDuplicates += 1;
      continue;
    }

    try {
      const download = await apiRequest<BookDownloadUrlResponse>(
        `/backup/books/${encodeURIComponent(localBookId)}/download-url`,
      );
      const destination = getStoredBookFileUri(localBookId);
      await downloadCloudBookFile({
        bookId: localBookId,
        directUrl: download.downloadUrl,
        destination,
      });

      let metadata: Awaited<ReturnType<typeof extractEpubMetadata>> = {};

      try {
        metadata = await extractEpubMetadata(destination, localBookId);
      } catch {
        metadata = {};
      }

      restoreBookRecord({
        id: localBookId,
        title: metadata.title ?? book.title,
        author: metadata.author ?? book.author ?? null,
        description: metadata.description ?? null,
        language: metadata.language ?? null,
        publisher: metadata.publisher ?? null,
        coverUri: metadata.coverUri ?? null,
        fileUri: destination,
        originalFileName: book.fileName ?? download.fileName ?? `${book.title}.epub`,
        fileType: "epub",
        progress: book.progressPercent ?? 0,
        currentChapterIndex: book.currentChapterIndex ?? 0,
        currentLocation: book.currentLocation ?? null,
        lastOpenedAt: book.lastOpenedAt ?? null,
        createdAt: book.createdAt ?? nowIso(),
        updatedAt: book.updatedAt ?? nowIso(),
      });
      localBookIds.add(localBookId);
      booksRestored += 1;
    } catch {
      failedItems += 1;
    }
  }

  for (const highlight of snapshot.highlights) {
    const localBookId = remoteKnowledgeBookId(highlight, bookIdMap);

    if (!localBookId || !localBookIds.has(localBookId)) {
      continue;
    }

    restoreHighlightRecord({
      id: highlight.localHighlightId || createId(),
      bookId: localBookId,
      text: highlight.selectedText,
      cfiRange: null,
      color: "yellow",
      note: null,
      pageLabel: `Chapter ${highlight.chapterIndex + 1}`,
      chapterIndex: highlight.chapterIndex,
      startOffset: highlight.startOffset ?? null,
      endOffset: highlight.endOffset ?? null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    highlightsRestored += 1;
  }

  for (const note of snapshot.notes) {
    const localBookId = remoteKnowledgeBookId(note, bookIdMap);

    if (!localBookId || !localBookIds.has(localBookId)) {
      continue;
    }

    restoreNoteRecord({
      id: note.localNoteId || createId(),
      bookId: localBookId,
      content: note.noteText,
      linkedCfi: `Chapter ${note.chapterIndex + 1}`,
      selectedText: note.selectedText,
      chapterIndex: note.chapterIndex,
      startOffset: note.startOffset ?? null,
      endOffset: note.endOffset ?? null,
      createdAt: nowIso(),
      updatedAt: nowIso(),
    });
    notesRestored += 1;
  }

  for (const link of snapshot.folderBooks) {
    const localFolderId =
      (link.localFolderId ? folderIdMap.get(link.localFolderId) : undefined) ??
      (link.folderId ? folderIdMap.get(link.folderId) : undefined) ??
      link.localFolderId;
    const localBookId =
      (link.localBookId ? bookIdMap.get(link.localBookId) : undefined) ??
      (link.bookId ? bookIdMap.get(link.bookId) : undefined) ??
      link.localBookId;

    if (!localFolderId || !localBookId || !localBookIds.has(localBookId)) {
      continue;
    }

    restoreFolderBookRecord({
      id: createId(),
      folderId: localFolderId,
      bookId: localBookId,
      createdAt: nowIso(),
    });
  }

  return {
    booksRestored,
    notesRestored,
    highlightsRestored,
    skippedDuplicates,
    failedItems,
  };
}

export async function restoreCloudBook(bookId: string): Promise<CloudActionResult> {
  if (!(await ensureSignedIn())) {
    return authRequiredResult();
  }

  const snapshot = await apiRequest<BackendBackupSnapshot>("/backup/snapshot");
  const book = snapshot.books.find((item) => remoteBookLocalId(item) === bookId || item.id === bookId);

  if (!book) {
    return {
      ok: false,
      status: "failed",
      message: "This cloud book is no longer available.",
    };
  }

  const localBookId = remoteBookLocalId(book);

  if (book.backupStatus && book.backupStatus !== "BACKED_UP") {
    return {
      ok: false,
      status: "failed",
      message: "This cloud record is missing its EPUB file. Sync this book again from the device that still has the local EPUB.",
    };
  }

  if (getBookById(localBookId)) {
    return {
      ok: false,
      status: "synced",
      message: "This book is already restored on this device.",
    };
  }

  try {
    await ensureLumiraStorage();
    const download = await apiRequest<BookDownloadUrlResponse>(
      `/backup/books/${encodeURIComponent(localBookId)}/download-url`,
    );
    const destination = getStoredBookFileUri(localBookId);
    await downloadCloudBookFile({
      bookId: localBookId,
      directUrl: download.downloadUrl,
      destination,
    });

    let metadata: Awaited<ReturnType<typeof extractEpubMetadata>> = {};

    try {
      metadata = await extractEpubMetadata(destination, localBookId);
    } catch {
      metadata = {};
    }

    restoreBookRecord({
      id: localBookId,
      title: metadata.title ?? book.title,
      author: metadata.author ?? book.author ?? null,
      description: metadata.description ?? null,
      language: metadata.language ?? null,
      publisher: metadata.publisher ?? null,
      coverUri: metadata.coverUri ?? null,
      fileUri: destination,
      originalFileName: book.fileName ?? download.fileName ?? `${book.title}.epub`,
      fileType: "epub",
      progress: book.progressPercent ?? 0,
      currentChapterIndex: book.currentChapterIndex ?? 0,
      currentLocation: book.currentLocation ?? null,
      lastOpenedAt: book.lastOpenedAt ?? null,
      createdAt: book.createdAt ?? nowIso(),
      updatedAt: book.updatedAt ?? nowIso(),
    });

    const bookIdMap = buildRemoteBookIdMap(snapshot);

    for (const highlight of snapshot.highlights) {
      const highlightBookId = remoteKnowledgeBookId(highlight, bookIdMap);

      if (highlightBookId !== localBookId) {
        continue;
      }

      restoreHighlightRecord({
        id: highlight.localHighlightId || createId(),
        bookId: localBookId,
        text: highlight.selectedText,
        cfiRange: null,
        color: "yellow",
        note: null,
        pageLabel: `Chapter ${highlight.chapterIndex + 1}`,
        chapterIndex: highlight.chapterIndex,
        startOffset: highlight.startOffset ?? null,
        endOffset: highlight.endOffset ?? null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }

    for (const note of snapshot.notes) {
      const noteBookId = remoteKnowledgeBookId(note, bookIdMap);

      if (noteBookId !== localBookId) {
        continue;
      }

      restoreNoteRecord({
        id: note.localNoteId || createId(),
        bookId: localBookId,
        content: note.noteText,
        linkedCfi: `Chapter ${note.chapterIndex + 1}`,
        selectedText: note.selectedText,
        chapterIndex: note.chapterIndex,
        startOffset: note.startOffset ?? null,
        endOffset: note.endOffset ?? null,
        createdAt: nowIso(),
        updatedAt: nowIso(),
      });
    }

    return {
      ok: true,
      status: "restore-completed",
      message: `${book.title} was restored to this device.`,
    };
  } catch (error) {
    return {
      ok: false,
      status: "failed",
      message: error instanceof Error ? error.message : "This book could not be restored.",
    };
  }
}

export async function listCloudBooks(
  context: CloudBackupContext,
): Promise<CloudBookItem[]> {
  if (!(await ensureSignedIn())) {
    return [];
  }

  const snapshot = await apiRequest<BackendBackupSnapshot>("/backup/snapshot");
  const localBookIds = new Set(context.books.map((book) => book.id));

  return snapshot.books.map((book) => ({
    id: remoteBookLocalId(book),
    title: book.title,
    author: book.author ?? null,
    coverUri:
      context.books.find((localBook) => localBook.id === remoteBookLocalId(book))
        ?.coverUri ?? null,
    fileSizeBytes: Number(book.fileSizeBytes ?? book.fileSize ?? 0),
    lastSyncedAt: book.lastSyncedAt ?? book.lastOpenedAt ?? null,
    backupStatus: localBookIds.has(remoteBookLocalId(book))
      ? "backed-up"
      : book.backupStatus === "SYNC_FAILED"
        ? "failed"
        : book.backupStatus === "PENDING_UPLOAD"
          ? "pending"
          : book.backupStatus === "BACKED_UP"
            ? "cloud-only"
            : "not-backed-up",
  }));
}

export async function runAutoSyncIfNeeded(): Promise<CloudActionResult | null> {
  if (autoSyncPromise) {
    return autoSyncPromise;
  }

  autoSyncPromise = (async () => {
    if (!(await ensureSignedIn())) {
      return null;
    }

    if (!(await canAutoSyncOnCurrentNetwork())) {
      return null;
    }

    try {
      return await syncNow();
    } catch {
      return null;
    }
  })().finally(() => {
    autoSyncPromise = null;
  });

  return autoSyncPromise;
}

export async function deleteCloudBook(bookId: string): Promise<CloudActionResult> {
  if (!(await ensureSignedIn())) {
    return authRequiredResult();
  }

  try {
    await apiRequest(`/backup/books/${encodeURIComponent(bookId)}`, {
      method: "DELETE",
    });

    return {
      ok: true,
      status: "synced",
      message: "Cloud backup was removed.",
    };
  } catch (error) {
    return {
      ok: false,
      status: "failed",
      message: error instanceof Error ? error.message : "Cloud backup could not be removed.",
    };
  }
}

export async function backupBook(): Promise<CloudActionResult> {
  return syncNow();
}
