import { create } from "zustand";

import {
  addBooksToFolder as addBooksToFolderRecord,
  addHighlight,
  addNote,
  clearDatabase,
  createFolder as createFolderRecord,
  deleteHighlight,
  deleteFolder as deleteFolderRecord,
  deleteNote,
  getLocalCounts,
  getNotificationSettings,
  getReaderSettings,
  listBooksForFolder,
  listBooksNotInFolder,
  listFolders,
  listHighlightsForBook,
  listBooks,
  listKnowledgeItems,
  listNotesForBook,
  markBookOpened,
  removeBookFromFolder as removeBookFromFolderRecord,
  renameFolder as renameFolderRecord,
  updateNote,
  updateBookReadingState,
  updateNotificationSettings,
  updateReaderSettings,
} from "@/db/repositories";
import { initializeDatabase } from "@/db/migrations";
import { pickAndImportBook } from "@/features/books/import-book";
import type {
  Book,
  FolderWithCount,
  Highlight,
  HighlightColor,
  ImportBookResult,
  KnowledgeItem,
  LocalCounts,
  Note,
  NotificationSettings,
  NotificationSettingsInput,
  ReaderAnchor,
  ReaderSettings,
  ReaderSettingsInput,
} from "@/features/books/types";
import {
  showImportCompleteNotification,
  syncNotificationSchedules,
} from "@/features/settings/notifications-service";
import { clearLumiraStorage, ensureLumiraStorage } from "@/utils/file-storage";
import { nowIso } from "@/utils/date";
import { defaultAppThemeId } from "@/design/app-themes";
import { defaultReaderFontFamily } from "@/design/fonts";

type ImportState = "idle" | "loading" | "success" | "error";

type BooksStore = {
  books: Book[];
  folders: FolderWithCount[];
  knowledgeItems: KnowledgeItem[];
  currentBookId: string | null;
  selectedBookId: string | null;
  librarySearch: string;
  knowledgeSearch: string;
  importState: ImportState;
  importError: string | null;
  dbReady: boolean;
  dbError: string | null;
  counts: LocalCounts;
  readerSettings: ReaderSettings;
  notificationSettings: NotificationSettings;
  initialize: () => Promise<void>;
  refreshBooks: () => void;
  refreshFolders: () => void;
  refreshKnowledge: () => void;
  importBook: () => Promise<ImportBookResult | null>;
  createFolder: (name: string) => FolderWithCount;
  renameFolder: (folderId: string, name: string) => FolderWithCount;
  deleteFolder: (folderId: string) => void;
  getFolderBooks: (folderId: string) => Book[];
  getAvailableBooksForFolder: (folderId: string) => Book[];
  addBooksToFolder: (folderId: string, bookIds: string[]) => void;
  removeBookFromFolder: (folderId: string, bookId: string) => void;
  selectBook: (bookId: string) => void;
  saveReadingState: (
    bookId: string,
    chapterIndex: number,
    progress: number,
    scrollProgress?: number,
    location?: {
      mode?: "scroll" | "book" | "musician";
      pageIndex?: number;
      pageCount?: number;
      autoScrollSpeed?: number;
    },
  ) => void;
  setReaderSettings: (settings: ReaderSettingsInput) => void;
  setNotificationSettings: (
    settings: NotificationSettingsInput,
  ) => Promise<NotificationSettings>;
  getBookHighlights: (bookId: string) => Highlight[];
  getBookNotes: (bookId: string) => Note[];
  createHighlight: (bookId: string, anchor: ReaderAnchor, color?: HighlightColor) => Highlight | undefined;
  createNote: (bookId: string, anchor: ReaderAnchor, content: string) => Note | undefined;
  editNote: (noteId: string, content: string) => Note | undefined;
  removeNote: (noteId: string) => void;
  removeHighlight: (highlightId: string) => void;
  setLibrarySearch: (query: string) => void;
  setKnowledgeSearch: (query: string) => void;
  clearLocalData: () => Promise<void>;
};

const emptyCounts: LocalCounts = {
  books: 0,
  highlights: 0,
  notes: 0,
};

function replaceBook(books: Book[], updatedBook: Book) {
  let replaced = false;
  const nextBooks = books.map((book) => {
    if (book.id !== updatedBook.id) {
      return book;
    }

    replaced = true;
    return updatedBook;
  });

  return replaced ? nextBooks : books;
}

const defaultReaderSettings: ReaderSettings = {
  id: "default",
  appThemeId: defaultAppThemeId,
  theme: "dark",
  fontSize: 19,
  readerFontFamily: defaultReaderFontFamily,
  lineHeight: 1.72,
  contentWidth: 720,
  musicianAutoScrollSpeed: 28,
  musicianKeepAwake: true,
  musicianExtraLargeText: false,
  musicianHighContrast: false,
  updatedAt: new Date(0).toISOString(),
};

const defaultNotificationSettings: NotificationSettings = {
  id: "default",
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
  updatedAt: new Date(0).toISOString(),
};

export const useBooksStore = create<BooksStore>((set, get) => ({
  books: [],
  folders: [],
  knowledgeItems: [],
  currentBookId: null,
  selectedBookId: null,
  librarySearch: "",
  knowledgeSearch: "",
  importState: "idle",
  importError: null,
  dbReady: false,
  dbError: null,
  counts: emptyCounts,
  readerSettings: defaultReaderSettings,
  notificationSettings: defaultNotificationSettings,
  initialize: async () => {
    try {
      initializeDatabase();
      await ensureLumiraStorage();
      const localNotificationSettings = getNotificationSettings();
      set({
        books: listBooks(),
        folders: listFolders(),
        knowledgeItems: listKnowledgeItems(),
        counts: getLocalCounts(),
        readerSettings: getReaderSettings(),
        notificationSettings: localNotificationSettings,
        dbReady: true,
        dbError: null,
      });
      syncNotificationSchedules(localNotificationSettings)
        .then((syncedSettings) => {
          const persistedSettings = updateNotificationSettings(syncedSettings);
          set({ notificationSettings: persistedSettings });
        })
        .catch(() => undefined);
    } catch (error) {
      set({
        dbReady: false,
        dbError: error instanceof Error ? error.message : "Failed to initialize local database.",
      });
    }
  },
  refreshBooks: () => {
    set({
      books: listBooks(),
      counts: getLocalCounts(),
    });
  },
  refreshFolders: () => {
    set({
      folders: listFolders(),
    });
  },
  refreshKnowledge: () => {
    set({
      knowledgeItems: listKnowledgeItems(),
      counts: getLocalCounts(),
    });
  },
  importBook: async () => {
    set({ importState: "loading", importError: null });

    try {
      const result = await pickAndImportBook();
      get().refreshBooks();
      set({ importState: result ? "success" : "idle", importError: null });
      if (result && !result.duplicate) {
        showImportCompleteNotification(
          get().notificationSettings,
          result.book,
        ).catch(() => undefined);
      }
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Book import failed.";
      set({ importState: "error", importError: message });
      return Promise.reject(error);
    }
  },
  createFolder: (name: string) => {
    const folder = createFolderRecord(name);
    set({ folders: listFolders() });
    return folder;
  },
  renameFolder: (folderId: string, name: string) => {
    const folder = renameFolderRecord(folderId, name);
    set({ folders: listFolders() });
    return folder;
  },
  deleteFolder: (folderId: string) => {
    deleteFolderRecord(folderId);
    set({ folders: listFolders() });
  },
  getFolderBooks: (folderId: string) => listBooksForFolder(folderId),
  getAvailableBooksForFolder: (folderId: string) =>
    listBooksNotInFolder(folderId),
  addBooksToFolder: (folderId: string, bookIds: string[]) => {
    addBooksToFolderRecord(folderId, bookIds);
    set({ folders: listFolders() });
  },
  removeBookFromFolder: (folderId: string, bookId: string) => {
    removeBookFromFolderRecord(folderId, bookId);
    set({ folders: listFolders() });
  },
  selectBook: (bookId: string) => {
    const openedBook = markBookOpened(bookId, nowIso());

    if (!openedBook) {
      return;
    }

    set({
      currentBookId: bookId,
      selectedBookId: bookId,
      books: listBooks(),
      counts: getLocalCounts(),
    });
  },
  saveReadingState: (
    bookId: string,
    chapterIndex: number,
    progress: number,
    scrollProgress = 0,
    location,
  ) => {
    let updatedBook: Book | undefined;

    try {
      updatedBook = updateBookReadingState({
        bookId,
        chapterIndex,
        progress,
        scrollProgress,
        ...location,
        updatedAt: nowIso(),
      });
    } catch {
      return;
    }

    if (!updatedBook) {
      return;
    }

    set((state) => {
      const books = replaceBook(state.books, updatedBook);

      if (books === state.books) {
        return state;
      }

      return { books };
    });
  },
  setReaderSettings: (settings: ReaderSettingsInput) => {
    set({ readerSettings: updateReaderSettings(settings) });
  },
  setNotificationSettings: async (settings: NotificationSettingsInput) => {
    const requestedSettings = updateNotificationSettings({
      ...get().notificationSettings,
      ...settings,
    });
    set({ notificationSettings: requestedSettings });

    const wantsNotifications =
      requestedSettings.readingReminderEnabled ||
      requestedSettings.insightDigestEnabled ||
      requestedSettings.importCompleteEnabled;
    const syncedSettings = await syncNotificationSchedules(requestedSettings, {
      requestPermission: wantsNotifications,
    });
    const persistedSettings = updateNotificationSettings(syncedSettings);
    set({ notificationSettings: persistedSettings });

    return persistedSettings;
  },
  getBookHighlights: (bookId: string) => listHighlightsForBook(bookId),
  getBookNotes: (bookId: string) => listNotesForBook(bookId),
  createHighlight: (bookId: string, anchor: ReaderAnchor, color = "yellow") => {
    const created = addHighlight({ bookId, anchor, color });
    set({ knowledgeItems: listKnowledgeItems(), counts: getLocalCounts() });
    return created;
  },
  createNote: (bookId: string, anchor: ReaderAnchor, content: string) => {
    const created = addNote({ bookId, anchor, content });
    set({ knowledgeItems: listKnowledgeItems(), counts: getLocalCounts() });
    return created;
  },
  editNote: (noteId: string, content: string) => {
    const updated = updateNote(noteId, content);
    set({ knowledgeItems: listKnowledgeItems(), counts: getLocalCounts() });
    return updated;
  },
  removeNote: (noteId: string) => {
    deleteNote(noteId);
    set({ knowledgeItems: listKnowledgeItems(), counts: getLocalCounts() });
  },
  removeHighlight: (highlightId: string) => {
    deleteHighlight(highlightId);
    set({ knowledgeItems: listKnowledgeItems(), counts: getLocalCounts() });
  },
  setLibrarySearch: (query: string) => set({ librarySearch: query }),
  setKnowledgeSearch: (query: string) => set({ knowledgeSearch: query }),
  clearLocalData: async () => {
    await syncNotificationSchedules({
      ...get().notificationSettings,
      readingReminderEnabled: false,
      insightDigestEnabled: false,
      importCompleteEnabled: false,
    }).catch(() => undefined);
    clearDatabase();
    await clearLumiraStorage();
    await ensureLumiraStorage();
    set({
      books: [],
      folders: [],
      knowledgeItems: [],
      currentBookId: null,
      selectedBookId: null,
      counts: emptyCounts,
      readerSettings: getReaderSettings(),
      notificationSettings: getNotificationSettings(),
    });
  },
}));
