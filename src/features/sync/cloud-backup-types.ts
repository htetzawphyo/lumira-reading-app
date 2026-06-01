import type { Book } from "@/features/books/types";

export type CloudSyncStatus =
  | "not-enabled"
  | "enabled"
  | "syncing"
  | "synced"
  | "failed"
  | "storage-full"
  | "offline"
  | "restoring"
  | "restore-completed";

export type BookBackupStatus =
  | "backed-up"
  | "not-backed-up"
  | "pending"
  | "failed"
  | "cloud-only";

export type CloudStorageUsage = {
  usedBytes: number;
  totalBytes: number;
};

export type SyncDashboard = {
  status: CloudSyncStatus;
  lastSyncedAt: string | null;
  storage: CloudStorageUsage;
  cloudBackupEnabled: boolean;
  autoSyncWifiOnly: boolean;
  allowMobileDataSync: boolean;
  backedUpBookCount: number;
  backedUpKnowledgeCount: number;
};

export type RestoreSummary = {
  booksRestored: number;
  notesRestored: number;
  highlightsRestored: number;
  skippedDuplicates: number;
  failedItems: number;
};

export type CloudBookItem = {
  id: string;
  title: string;
  author: string | null;
  coverUri: string | null;
  fileSizeBytes: number;
  lastSyncedAt: string | null;
  backupStatus: BookBackupStatus;
};

export type CloudActionResult = {
  ok: boolean;
  status: CloudSyncStatus;
  message: string;
};

export type CloudBackupContext = {
  books: Book[];
  knowledgeCount: number;
};
