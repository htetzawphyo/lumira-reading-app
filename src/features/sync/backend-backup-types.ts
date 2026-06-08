export type BackupSnapshotPayload = {
  books: Array<{
    localBookId: string;
    title: string;
    author?: string;
    fileName: string;
    mimeType?: string;
    fileSizeBytes: string;
    checksum?: string;
    currentChapterIndex?: number;
    currentLocation?: string;
    progressPercent?: number;
    lastOpenedAt?: string;
  }>;
  folders: Array<{
    localFolderId: string;
    id?: string;
    name: string;
  }>;
  highlights: Array<{
    localHighlightId: string;
    localBookId?: string;
    id?: string;
    bookId?: string;
    chapterIndex: number;
    selectedText: string;
    color?: "YELLOW" | "PURPLE";
    startOffset?: number;
    endOffset?: number;
  }>;
  notes: Array<{
    localNoteId: string;
    localBookId?: string;
    id?: string;
    bookId?: string;
    chapterIndex: number;
    selectedText: string;
    noteText: string;
    startOffset?: number;
    endOffset?: number;
  }>;
  folderBooks: Array<{
    localFolderId?: string | null;
    localBookId?: string | null;
    folderId?: string;
    bookId?: string;
  }>;
};

export type BackendBackupBook = BackupSnapshotPayload["books"][number] & {
  id: string;
  userId?: string;
  fileSize?: string;
  r2Key?: string | null;
  backupStatus?: "LOCAL_ONLY" | "PENDING_UPLOAD" | "BACKED_UP" | "SYNC_FAILED" | "DELETED_FROM_CLOUD";
  createdAt?: string;
  updatedAt?: string;
  lastSyncedAt?: string | null;
};

export type BackendBackupSnapshot = Omit<BackupSnapshotPayload, "books"> & {
  books: BackendBackupBook[];
  storage: {
    usedBytes: string;
    limitBytes: string;
  };
};

export type BookUploadUrlResponse = {
  uploadUrl: string;
  method: "PUT";
  expiresInSeconds: number;
  key: string;
};

export type BookDownloadUrlResponse = {
  downloadUrl: string;
  method: "GET";
  expiresInSeconds: number;
  fileName: string;
  contentType: string;
  fileSizeBytes: string;
};
