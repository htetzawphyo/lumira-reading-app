import type {
  CloudActionResult,
  CloudBackupContext,
  CloudBookItem,
  RestoreSummary,
  SyncDashboard,
} from "@/features/sync/cloud-backup-types";

const CLOUD_STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;

function delay(ms = 520) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function estimateStorageUsed(context: CloudBackupContext) {
  const estimatedBooks = context.books.length * 18 * 1024 * 1024;
  const estimatedKnowledge = context.knowledgeCount * 6 * 1024;

  return Math.min(estimatedBooks + estimatedKnowledge, CLOUD_STORAGE_LIMIT_BYTES);
}

export function canUseCloudBackup(isPremiumUser: boolean) {
  return isPremiumUser;
}

export async function getSyncDashboard(
  context: CloudBackupContext,
): Promise<SyncDashboard> {
  await delay(180);

  return {
    status: "not-enabled",
    lastSyncedAt: null,
    storage: {
      usedBytes: estimateStorageUsed(context),
      totalBytes: CLOUD_STORAGE_LIMIT_BYTES,
    },
    cloudBackupEnabled: false,
    autoSyncWifiOnly: true,
    allowMobileDataSync: false,
    backedUpBookCount: 0,
    backedUpKnowledgeCount: 0,
  };
}

export async function syncNow(): Promise<CloudActionResult> {
  await delay();

  // TODO: Replace with authenticated cloud backup API call.
  return {
    ok: false,
    status: "failed",
    message: "Cloud backup backend is not connected yet. Your local data is safe.",
  };
}

export async function restoreBackup(): Promise<RestoreSummary> {
  await delay();

  // TODO: Replace with cloud restore API and local merge transaction.
  return {
    booksRestored: 0,
    notesRestored: 0,
    highlightsRestored: 0,
    skippedDuplicates: 0,
    failedItems: 0,
  };
}

export async function listCloudBooks(
  context: CloudBackupContext,
): Promise<CloudBookItem[]> {
  await delay(220);

  return context.books.slice(0, 6).map((book, index) => ({
    id: book.id,
    title: book.title,
    author: book.author,
    coverUri: book.coverUri,
    fileSizeBytes: (index + 2) * 8 * 1024 * 1024,
    lastSyncedAt: book.lastOpenedAt ?? book.createdAt,
    backupStatus: book.progress > 0 ? "pending" : "not-backed-up",
  }));
}

export async function deleteCloudBook(): Promise<CloudActionResult> {
  await delay(360);

  // TODO: Replace with cloud object delete API.
  return {
    ok: false,
    status: "failed",
    message: "Cloud backup backend is not connected yet. Local books remain on this device.",
  };
}

export async function backupBook(): Promise<CloudActionResult> {
  await delay(360);

  // TODO: Replace with single-book upload API.
  return {
    ok: false,
    status: "failed",
    message: "Cloud backup backend is not connected yet. This book remains available locally.",
  };
}
