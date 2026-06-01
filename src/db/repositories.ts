import { and, desc, eq, isNotNull, or, sql } from "drizzle-orm";

import { getDb, getSqlite, isSQLiteAvailable } from "@/db/client";
import {
  books,
  folderBooks,
  folders,
  highlights,
  notes,
  notificationSettings,
  readerSettings,
  readingSessions,
} from "@/db/schema";
import {
  canUseAppTheme,
  defaultAppThemeId,
  migrateAppThemeId,
} from "@/design/app-themes";
import {
  defaultReaderFontFamily,
  isReaderFontFamily,
} from "@/design/fonts";
import {
  canUseReaderTheme,
  defaultReaderTheme,
  migrateReaderTheme,
} from "@/features/reader/reader-theme-options";
import type {
  Book,
  FolderWithCount,
  Highlight,
  HighlightColor,
  HighlightWithBook,
  KnowledgeItem,
  LocalCounts,
  Note,
  NoteWithBook,
  NotificationPermissionStatus,
  NotificationSettings,
  NotificationSettingsInput,
  ReaderAnchor,
  ReaderSettings,
  ReaderSettingsInput,
} from "@/features/books/types";
import { createId } from "@/utils/id";
import { nowIso } from "@/utils/date";

type NewBook = typeof books.$inferInsert;
const readerSettingsId = "default";
const notificationSettingsId = "default";

const defaultReaderSettings: Omit<ReaderSettings, "updatedAt"> = {
  id: readerSettingsId,
  appThemeId: defaultAppThemeId,
  theme: defaultReaderTheme,
  fontSize: 19,
  readerFontFamily: defaultReaderFontFamily,
  lineHeight: 1.72,
  contentWidth: 720,
  musicianAutoScrollSpeed: 28,
  musicianKeepAwake: true,
  musicianExtraLargeText: false,
  musicianHighContrast: false,
};

const defaultNotificationSettings: Omit<NotificationSettings, "updatedAt"> = {
  id: notificationSettingsId,
  readingReminderEnabled: false,
  insightDigestEnabled: false,
  importCompleteEnabled: false,
  reminderHour: 20,
  reminderMinute: 0,
  digestWeekday: 1,
  digestHour: 19,
  digestMinute: 0,
  quietStartHour: 22,
  quietStartMinute: 0,
  quietEndHour: 7,
  quietEndMinute: 0,
  permissionStatus: "undetermined",
  readingReminderNotificationId: null,
  insightDigestNotificationId: null,
};

function normalizePermissionStatus(
  value: string | null | undefined,
): NotificationPermissionStatus {
  if (value === "granted" || value === "denied" || value === "undetermined") {
    return value;
  }

  return "undetermined";
}

export function listBooks(): Book[] {
  if (!isSQLiteAvailable()) {
    return [];
  }

  return getDb().select().from(books).orderBy(desc(books.createdAt)).all();
}

export function listContinueReadingBooks(): Book[] {
  if (!isSQLiteAvailable()) {
    return [];
  }

  return getDb()
    .select()
    .from(books)
    .where(isNotNull(books.lastOpenedAt))
    .orderBy(desc(books.lastOpenedAt))
    .all();
}

function normalizeFolderName(name: string) {
  return name.trim().replace(/\s+/g, " ");
}

function isDuplicateFolderName(name: string, ignoreFolderId?: string) {
  const normalizedName = normalizeFolderName(name).toLocaleLowerCase();

  return listFolders().some(
    (folder) =>
      folder.id !== ignoreFolderId &&
      folder.name.toLocaleLowerCase() === normalizedName,
  );
}

export function listFolders(): FolderWithCount[] {
  if (!isSQLiteAvailable()) {
    return [];
  }

  const rows = getSqlite().getAllSync<
    {
      id: string;
      name: string;
      createdAt: string;
      updatedAt: string;
      bookCount: number;
    }
  >(`
    SELECT
      folders.id,
      folders.name,
      folders.created_at as createdAt,
      folders.updated_at as updatedAt,
      COUNT(folder_books.book_id) as bookCount
    FROM folders
    LEFT JOIN folder_books ON folder_books.folder_id = folders.id
    GROUP BY folders.id
    ORDER BY lower(folders.name) ASC
  `);

  return rows.map((row) => ({
    ...row,
    bookCount: Number(row.bookCount ?? 0),
  }));
}

export function getFolderById(folderId: string): FolderWithCount | undefined {
  if (!isSQLiteAvailable()) {
    return undefined;
  }

  const row = getSqlite().getFirstSync<
    | {
        id: string;
        name: string;
        createdAt: string;
        updatedAt: string;
        bookCount: number;
      }
    | undefined
  >(
    `
      SELECT
        folders.id,
        folders.name,
        folders.created_at as createdAt,
        folders.updated_at as updatedAt,
        COUNT(folder_books.book_id) as bookCount
      FROM folders
      LEFT JOIN folder_books ON folder_books.folder_id = folders.id
      WHERE folders.id = ?
      GROUP BY folders.id
    `,
    [folderId],
  );

  return row ? { ...row, bookCount: Number(row.bookCount ?? 0) } : undefined;
}

export function createFolder(name: string): FolderWithCount {
  if (!isSQLiteAvailable()) {
    throw new Error("Local database is not ready yet.");
  }

  const normalizedName = normalizeFolderName(name);

  if (!normalizedName) {
    throw new Error("Folder name cannot be empty.");
  }

  if (isDuplicateFolderName(normalizedName)) {
    throw new Error("A folder with this name already exists.");
  }

  const timestamp = nowIso();
  const id = createId();

  getDb()
    .insert(folders)
    .values({
      id,
      name: normalizedName,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  const folder = getFolderById(id);

  if (!folder) {
    throw new Error("Folder was created, but could not be loaded.");
  }

  return folder;
}

export function renameFolder(folderId: string, name: string): FolderWithCount {
  if (!isSQLiteAvailable()) {
    throw new Error("Local database is not ready yet.");
  }

  const existing = getFolderById(folderId);

  if (!existing) {
    throw new Error("This folder no longer exists.");
  }

  const normalizedName = normalizeFolderName(name);

  if (!normalizedName) {
    throw new Error("Folder name cannot be empty.");
  }

  if (isDuplicateFolderName(normalizedName, folderId)) {
    throw new Error("A folder with this name already exists.");
  }

  getDb()
    .update(folders)
    .set({ name: normalizedName, updatedAt: nowIso() })
    .where(eq(folders.id, folderId))
    .run();

  const folder = getFolderById(folderId);

  if (!folder) {
    throw new Error("Folder was renamed, but could not be loaded.");
  }

  return folder;
}

export function deleteFolder(folderId: string) {
  if (!isSQLiteAvailable()) {
    throw new Error("Local database is not ready yet.");
  }

  getDb().delete(folders).where(eq(folders.id, folderId)).run();
}

export function listBooksForFolder(folderId: string): Book[] {
  if (!isSQLiteAvailable()) {
    return [];
  }

  const rows = getDb()
    .select()
    .from(books)
    .innerJoin(folderBooks, eq(folderBooks.bookId, books.id))
    .where(eq(folderBooks.folderId, folderId))
    .orderBy(desc(folderBooks.createdAt))
    .all() as Array<{ books: Book }>;

  return rows.map((row) => row.books).filter(Boolean);
}

export function listBooksNotInFolder(folderId: string): Book[] {
  const folderBookIds = new Set(
    listBooksForFolder(folderId).map((book) => book.id),
  );

  return listBooks().filter((book) => !folderBookIds.has(book.id));
}

export function addBooksToFolder(folderId: string, bookIds: string[]) {
  if (!isSQLiteAvailable()) {
    throw new Error("Local database is not ready yet.");
  }

  const folder = getFolderById(folderId);

  if (!folder) {
    throw new Error("This folder no longer exists.");
  }

  const uniqueBookIds = Array.from(new Set(bookIds)).filter((bookId) =>
    Boolean(getBookById(bookId)),
  );

  if (uniqueBookIds.length === 0) {
    return;
  }

  const timestamp = nowIso();

  getDb()
    .insert(folderBooks)
    .values(
      uniqueBookIds.map((bookId) => ({
        id: createId(),
        folderId,
        bookId,
        createdAt: timestamp,
      })),
    )
    .onConflictDoNothing({
      target: [folderBooks.folderId, folderBooks.bookId],
    })
    .run();
}

export function removeBookFromFolder(folderId: string, bookId: string) {
  if (!isSQLiteAvailable()) {
    throw new Error("Local database is not ready yet.");
  }

  getDb()
    .delete(folderBooks)
    .where(
      and(eq(folderBooks.folderId, folderId), eq(folderBooks.bookId, bookId)),
    )
    .run();
}

export function getBookById(id: string): Book | undefined {
  if (!isSQLiteAvailable()) {
    return undefined;
  }

  return getDb().select().from(books).where(eq(books.id, id)).get();
}

export function getBookByOriginalFileName(fileName: string): Book | undefined {
  if (!isSQLiteAvailable()) {
    return undefined;
  }

  return getDb()
    .select()
    .from(books)
    .where(eq(books.originalFileName, fileName))
    .limit(1)
    .get();
}

export function insertBook(book: NewBook): Book {
  getDb().insert(books).values(book).run();
  return getBookById(book.id) as Book;
}

export function markBookOpened(bookId: string, openedAt: string): Book | undefined {
  const existing = getBookById(bookId);

  if (!existing) {
    return undefined;
  }

  getDb().update(books)
    .set({
      lastOpenedAt: openedAt,
      updatedAt: openedAt,
      progress: existing.progress,
    })
    .where(eq(books.id, bookId))
    .run();

  getDb().insert(readingSessions)
    .values({
      id: createId(),
      bookId,
      startedAt: openedAt,
      progress: existing.progress,
    })
    .run();

  return getBookById(bookId);
}

export function updateBookReadingState({
  bookId,
  chapterIndex,
  progress,
  scrollProgress,
  mode,
  pageIndex,
  pageCount,
  autoScrollSpeed,
  updatedAt,
}: {
  bookId: string;
  chapterIndex: number;
  progress: number;
  scrollProgress?: number;
  mode?: "scroll" | "book" | "musician";
  pageIndex?: number;
  pageCount?: number;
  autoScrollSpeed?: number;
  updatedAt: string;
}): Book | undefined {
  if (!isSQLiteAvailable()) {
    return undefined;
  }

  const safeChapterIndex = Math.max(0, Math.floor(chapterIndex));
  const safeProgress = Math.min(Math.max(progress, 0), 1);
  const safeScrollProgress = Math.min(Math.max(scrollProgress ?? 0, 0), 1);
  const safePageIndex =
    typeof pageIndex === "number" ? Math.max(0, Math.floor(pageIndex)) : undefined;
  const safePageCount =
    typeof pageCount === "number" ? Math.max(1, Math.floor(pageCount)) : undefined;
  const safeAutoScrollSpeed =
    typeof autoScrollSpeed === "number"
      ? Math.min(Math.max(autoScrollSpeed, 8), 96)
      : undefined;

  getDb()
    .update(books)
    .set({
      currentChapterIndex: safeChapterIndex,
      currentLocation: JSON.stringify({
        type: "epub",
        mode: mode ?? "scroll",
        chapterIndex: safeChapterIndex,
        scrollProgress: safeScrollProgress,
        ...(safePageIndex !== undefined ? { pageIndex: safePageIndex } : {}),
        ...(safePageCount !== undefined ? { pageCount: safePageCount } : {}),
        ...(safeAutoScrollSpeed !== undefined
          ? { autoScrollSpeed: safeAutoScrollSpeed }
          : {}),
      }),
      progress: safeProgress,
      lastOpenedAt: updatedAt,
      updatedAt,
    })
    .where(eq(books.id, bookId))
    .run();

  return getBookById(bookId);
}

export function finishLatestReadingSession({
  bookId,
  endedAt,
  progress,
}: {
  bookId: string;
  endedAt: string;
  progress: number;
}) {
  if (!isSQLiteAvailable()) {
    return;
  }

  const sessions = getDb()
    .select()
    .from(readingSessions)
    .where(eq(readingSessions.bookId, bookId))
    .orderBy(desc(readingSessions.startedAt))
    .limit(1)
    .all();
  const latestSession = sessions[0];

  if (!latestSession || latestSession.endedAt) {
    return;
  }

  getDb()
    .update(readingSessions)
    .set({
      endedAt,
      progress: Math.min(Math.max(progress, 0), 1),
    })
    .where(eq(readingSessions.id, latestSession.id))
    .run();
}

export function getReaderSettings(): ReaderSettings {
  const fallback = {
    ...defaultReaderSettings,
    updatedAt: nowIso(),
  };

  if (!isSQLiteAvailable()) {
    return fallback;
  }

  const existing = getDb()
    .select()
    .from(readerSettings)
    .where(eq(readerSettings.id, readerSettingsId))
    .get();

  if (existing) {
    const existingSettings = existing as ReaderSettings & {
      appThemeId?: string | null;
      readerFontFamily?: string | null;
    };

    const migratedAppThemeId = migrateAppThemeId(
      existingSettings.appThemeId ?? existingSettings.theme,
    );

    return {
      ...existingSettings,
      theme: canUseReaderTheme(
        migrateReaderTheme(existingSettings.theme),
        false,
      )
        ? migrateReaderTheme(existingSettings.theme)
        : defaultReaderTheme,
      appThemeId: canUseAppTheme(migratedAppThemeId, false)
        ? migratedAppThemeId
        : defaultAppThemeId,
      readerFontFamily: isReaderFontFamily(existingSettings.readerFontFamily)
        ? existingSettings.readerFontFamily
        : defaultReaderFontFamily,
    };
  }

  getDb()
    .insert(readerSettings)
    .values(fallback)
    .run();

  return fallback;
}

export function updateReaderSettings(settings: ReaderSettingsInput): ReaderSettings {
  const currentSettings = getReaderSettings();
  const requestedTheme = migrateReaderTheme(
    settings.theme ?? currentSettings.theme,
  );
  const requestedAppThemeId = migrateAppThemeId(
    settings.appThemeId ?? currentSettings.appThemeId,
  );
  const requestedReaderFontFamily =
    settings.readerFontFamily ?? currentSettings.readerFontFamily;
  const updatedSettings: ReaderSettings = {
    ...currentSettings,
    ...settings,
    theme: canUseReaderTheme(requestedTheme, false)
      ? requestedTheme
      : currentSettings.theme,
    appThemeId: canUseAppTheme(requestedAppThemeId, false)
      ? requestedAppThemeId
      : currentSettings.appThemeId,
    readerFontFamily: isReaderFontFamily(requestedReaderFontFamily)
      ? requestedReaderFontFamily
      : currentSettings.readerFontFamily,
    fontSize: Math.min(Math.max(settings.fontSize ?? currentSettings.fontSize, 15), 26),
    lineHeight: Math.min(Math.max(settings.lineHeight ?? currentSettings.lineHeight, 1.35), 2.15),
    contentWidth: Math.min(Math.max(settings.contentWidth ?? currentSettings.contentWidth, 520), 920),
    musicianAutoScrollSpeed: Math.min(
      Math.max(settings.musicianAutoScrollSpeed ?? currentSettings.musicianAutoScrollSpeed, 8),
      96,
    ),
    musicianKeepAwake:
      settings.musicianKeepAwake ?? currentSettings.musicianKeepAwake,
    musicianExtraLargeText:
      settings.musicianExtraLargeText ?? currentSettings.musicianExtraLargeText,
    musicianHighContrast:
      settings.musicianHighContrast ?? currentSettings.musicianHighContrast,
    updatedAt: nowIso(),
  };

  if (!isSQLiteAvailable()) {
    return updatedSettings;
  }

  getDb()
    .insert(readerSettings)
    .values(updatedSettings)
    .onConflictDoUpdate({
      target: readerSettings.id,
      set: {
        appThemeId: updatedSettings.appThemeId,
        theme: updatedSettings.theme,
        fontSize: updatedSettings.fontSize,
        readerFontFamily: updatedSettings.readerFontFamily,
        lineHeight: updatedSettings.lineHeight,
        contentWidth: updatedSettings.contentWidth,
        musicianAutoScrollSpeed: updatedSettings.musicianAutoScrollSpeed,
        musicianKeepAwake: updatedSettings.musicianKeepAwake,
        musicianExtraLargeText: updatedSettings.musicianExtraLargeText,
        musicianHighContrast: updatedSettings.musicianHighContrast,
        updatedAt: updatedSettings.updatedAt,
      },
    })
    .run();

  return updatedSettings;
}

export function getNotificationSettings(): NotificationSettings {
  const fallback: NotificationSettings = {
    ...defaultNotificationSettings,
    updatedAt: nowIso(),
  };

  if (!isSQLiteAvailable()) {
    return fallback;
  }

  const existing = getDb()
    .select()
    .from(notificationSettings)
    .where(eq(notificationSettings.id, notificationSettingsId))
    .get();

  if (existing) {
    const existingSettings = existing as NotificationSettings & {
      permissionStatus?: string | null;
    };

    return {
      ...existingSettings,
      permissionStatus: normalizePermissionStatus(
        existingSettings.permissionStatus,
      ),
    };
  }

  getDb().insert(notificationSettings).values(fallback).run();

  return fallback;
}

export function updateNotificationSettings(
  settings: NotificationSettingsInput,
): NotificationSettings {
  const currentSettings = getNotificationSettings();
  const updatedSettings: NotificationSettings = {
    ...currentSettings,
    ...settings,
    permissionStatus: normalizePermissionStatus(
      settings.permissionStatus ?? currentSettings.permissionStatus,
    ),
    reminderHour: Math.min(
      Math.max(settings.reminderHour ?? currentSettings.reminderHour, 0),
      23,
    ),
    reminderMinute: Math.min(
      Math.max(settings.reminderMinute ?? currentSettings.reminderMinute, 0),
      59,
    ),
    digestWeekday: Math.min(
      Math.max(settings.digestWeekday ?? currentSettings.digestWeekday, 1),
      7,
    ),
    digestHour: Math.min(
      Math.max(settings.digestHour ?? currentSettings.digestHour, 0),
      23,
    ),
    digestMinute: Math.min(
      Math.max(settings.digestMinute ?? currentSettings.digestMinute, 0),
      59,
    ),
    quietStartHour: Math.min(
      Math.max(settings.quietStartHour ?? currentSettings.quietStartHour, 0),
      23,
    ),
    quietStartMinute: Math.min(
      Math.max(
        settings.quietStartMinute ?? currentSettings.quietStartMinute,
        0,
      ),
      59,
    ),
    quietEndHour: Math.min(
      Math.max(settings.quietEndHour ?? currentSettings.quietEndHour, 0),
      23,
    ),
    quietEndMinute: Math.min(
      Math.max(settings.quietEndMinute ?? currentSettings.quietEndMinute, 0),
      59,
    ),
    updatedAt: nowIso(),
  };

  if (!isSQLiteAvailable()) {
    return updatedSettings;
  }

  getDb()
    .insert(notificationSettings)
    .values(updatedSettings)
    .onConflictDoUpdate({
      target: notificationSettings.id,
      set: {
        readingReminderEnabled: updatedSettings.readingReminderEnabled,
        insightDigestEnabled: updatedSettings.insightDigestEnabled,
        importCompleteEnabled: updatedSettings.importCompleteEnabled,
        reminderHour: updatedSettings.reminderHour,
        reminderMinute: updatedSettings.reminderMinute,
        digestWeekday: updatedSettings.digestWeekday,
        digestHour: updatedSettings.digestHour,
        digestMinute: updatedSettings.digestMinute,
        quietStartHour: updatedSettings.quietStartHour,
        quietStartMinute: updatedSettings.quietStartMinute,
        quietEndHour: updatedSettings.quietEndHour,
        quietEndMinute: updatedSettings.quietEndMinute,
        permissionStatus: updatedSettings.permissionStatus,
        readingReminderNotificationId:
          updatedSettings.readingReminderNotificationId,
        insightDigestNotificationId: updatedSettings.insightDigestNotificationId,
        updatedAt: updatedSettings.updatedAt,
      },
    })
    .run();

  return updatedSettings;
}

export function listHighlightsWithBooks(): HighlightWithBook[] {
  if (!isSQLiteAvailable()) {
    return [];
  }

  return getDb()
    .select({
      id: highlights.id,
      bookId: highlights.bookId,
      text: highlights.text,
      cfiRange: highlights.cfiRange,
      color: highlights.color,
      note: highlights.note,
      pageLabel: highlights.pageLabel,
      chapterIndex: highlights.chapterIndex,
      startOffset: highlights.startOffset,
      endOffset: highlights.endOffset,
      createdAt: highlights.createdAt,
      updatedAt: highlights.updatedAt,
      bookTitle: books.title,
    })
    .from(highlights)
    .innerJoin(books, eq(highlights.bookId, books.id))
    .orderBy(desc(highlights.createdAt))
    .all();
}

export function listNotesWithBooks(): NoteWithBook[] {
  if (!isSQLiteAvailable()) {
    return [];
  }

  return getDb()
    .select({
      id: notes.id,
      bookId: notes.bookId,
      content: notes.content,
      linkedCfi: notes.linkedCfi,
      selectedText: notes.selectedText,
      chapterIndex: notes.chapterIndex,
      startOffset: notes.startOffset,
      endOffset: notes.endOffset,
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      bookTitle: books.title,
    })
    .from(notes)
    .innerJoin(books, eq(notes.bookId, books.id))
    .orderBy(desc(notes.createdAt))
    .all();
}

export function listHighlightsForBook(bookId: string): Highlight[] {
  if (!isSQLiteAvailable()) {
    return [];
  }

  return getDb()
    .select()
    .from(highlights)
    .where(eq(highlights.bookId, bookId))
    .orderBy(desc(highlights.createdAt))
    .all() as Highlight[];
}

export function listNotesForBook(bookId: string): Note[] {
  if (!isSQLiteAvailable()) {
    return [];
  }

  return getDb()
    .select()
    .from(notes)
    .where(eq(notes.bookId, bookId))
    .orderBy(desc(notes.createdAt))
    .all() as Note[];
}

export function addHighlight({
  bookId,
  anchor,
  color = "yellow",
}: {
  bookId: string;
  anchor: ReaderAnchor;
  color?: HighlightColor;
}): Highlight | undefined {
  if (!isSQLiteAvailable()) {
    return undefined;
  }

  const timestamp = nowIso();
  const id = createId();

  getDb()
    .insert(highlights)
    .values({
      id,
      bookId,
      text: anchor.selectedText,
      cfiRange: null,
      color,
      note: null,
      pageLabel: `Chapter ${anchor.chapterIndex + 1}`,
      chapterIndex: anchor.chapterIndex,
      startOffset: anchor.startOffset,
      endOffset: anchor.endOffset,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return getDb().select().from(highlights).where(eq(highlights.id, id)).get() as
    | Highlight
    | undefined;
}

export function addNote({
  bookId,
  anchor,
  content,
}: {
  bookId: string;
  anchor: ReaderAnchor;
  content: string;
}): Note | undefined {
  if (!isSQLiteAvailable()) {
    return undefined;
  }

  const timestamp = nowIso();
  const id = createId();

  getDb()
    .insert(notes)
    .values({
      id,
      bookId,
      content,
      linkedCfi: `Chapter ${anchor.chapterIndex + 1}`,
      selectedText: anchor.selectedText,
      chapterIndex: anchor.chapterIndex,
      startOffset: anchor.startOffset,
      endOffset: anchor.endOffset,
      createdAt: timestamp,
      updatedAt: timestamp,
    })
    .run();

  return getDb().select().from(notes).where(eq(notes.id, id)).get() as
    | Note
    | undefined;
}

export function updateNote(noteId: string, content: string): Note | undefined {
  if (!isSQLiteAvailable()) {
    return undefined;
  }

  getDb()
    .update(notes)
    .set({ content, updatedAt: nowIso() })
    .where(eq(notes.id, noteId))
    .run();

  return getDb().select().from(notes).where(eq(notes.id, noteId)).get() as
    | Note
    | undefined;
}

export function deleteNote(noteId: string) {
  if (!isSQLiteAvailable()) {
    return;
  }

  getDb().delete(notes).where(eq(notes.id, noteId)).run();
}

export function deleteHighlight(highlightId: string) {
  if (!isSQLiteAvailable()) {
    return;
  }

  getDb().delete(highlights).where(eq(highlights.id, highlightId)).run();
}

export function listKnowledgeItems(): KnowledgeItem[] {
  const highlightItems = listHighlightsWithBooks().map<KnowledgeItem>((highlight) => ({
    id: highlight.id,
    type: "highlight",
    bookId: highlight.bookId,
    bookTitle: highlight.bookTitle,
    text: highlight.text,
    color: highlight.color,
    note: highlight.note,
    pageLabel: highlight.pageLabel,
    chapterIndex: highlight.chapterIndex,
    startOffset: highlight.startOffset,
    endOffset: highlight.endOffset,
    createdAt: highlight.createdAt,
  }));
  const noteItems = listNotesWithBooks().map<KnowledgeItem>((note) => ({
    id: note.id,
    type: "note",
    bookId: note.bookId,
    bookTitle: note.bookTitle,
    text: note.selectedText || note.content,
    note: note.content,
    pageLabel: note.linkedCfi,
    chapterIndex: note.chapterIndex,
    startOffset: note.startOffset,
    endOffset: note.endOffset,
    createdAt: note.createdAt,
  }));

  return [...highlightItems, ...noteItems].sort(
    (first, second) =>
      new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime(),
  );
}

export function getLocalCounts(): LocalCounts {
  if (!isSQLiteAvailable()) {
    return {
      books: 0,
      highlights: 0,
      notes: 0,
    };
  }

  const sqlite = getSqlite();
  const [bookCount] = sqlite.getAllSync<{ count: number }>("SELECT COUNT(*) as count FROM books");
  const [highlightCount] = sqlite.getAllSync<{ count: number }>(
    "SELECT COUNT(*) as count FROM highlights",
  );
  const [noteCount] = sqlite.getAllSync<{ count: number }>("SELECT COUNT(*) as count FROM notes");

  return {
    books: bookCount?.count ?? 0,
    highlights: highlightCount?.count ?? 0,
    notes: noteCount?.count ?? 0,
  };
}

export function clearDatabase() {
  if (!isSQLiteAvailable()) {
    return;
  }

  const db = getDb();
  db.delete(notificationSettings).run();
  db.delete(readerSettings).run();
  db.delete(folderBooks).run();
  db.delete(folders).run();
  db.delete(readingSessions).run();
  db.delete(highlights).run();
  db.delete(notes).run();
  db.delete(books).run();
}

export function searchBooks(query: string): Book[] {
  const normalized = `%${query.trim().toLowerCase()}%`;

  if (!query.trim()) {
    return listBooks();
  }

  if (!isSQLiteAvailable()) {
    return [];
  }

  return getDb()
    .select()
    .from(books)
    .where(
      or(
        sql`lower(${books.title}) like ${normalized}`,
        sql`lower(coalesce(${books.author}, '')) like ${normalized}`,
      ),
    )
    .all();
}
