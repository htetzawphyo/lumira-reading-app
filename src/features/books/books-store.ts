import { create } from "zustand";

import { clearDatabase, getLocalCounts, listBooks, listKnowledgeItems, markBookOpened } from "@/db/repositories";
import { initializeDatabase } from "@/db/migrations";
import { pickAndImportBook } from "@/features/books/import-book";
import type { Book, ImportBookResult, KnowledgeItem, LocalCounts } from "@/features/books/types";
import { clearLumiraStorage, ensureLumiraStorage } from "@/utils/file-storage";
import { nowIso } from "@/utils/date";

type ImportState = "idle" | "loading" | "success" | "error";

type BooksStore = {
  books: Book[];
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
  initialize: () => Promise<void>;
  refreshBooks: () => void;
  refreshKnowledge: () => void;
  importBook: () => Promise<ImportBookResult | null>;
  selectBook: (bookId: string) => void;
  setLibrarySearch: (query: string) => void;
  setKnowledgeSearch: (query: string) => void;
  clearLocalData: () => Promise<void>;
};

const emptyCounts: LocalCounts = {
  books: 0,
  highlights: 0,
  notes: 0,
};

export const useBooksStore = create<BooksStore>((set, get) => ({
  books: [],
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
  initialize: async () => {
    try {
      initializeDatabase();
      await ensureLumiraStorage();
      set({
        books: listBooks(),
        knowledgeItems: listKnowledgeItems(),
        counts: getLocalCounts(),
        dbReady: true,
        dbError: null,
      });
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
      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : "Book import failed.";
      set({ importState: "error", importError: message });
      return Promise.reject(error);
    }
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
  setLibrarySearch: (query: string) => set({ librarySearch: query }),
  setKnowledgeSearch: (query: string) => set({ knowledgeSearch: query }),
  clearLocalData: async () => {
    clearDatabase();
    await clearLumiraStorage();
    await ensureLumiraStorage();
    set({
      books: [],
      knowledgeItems: [],
      currentBookId: null,
      selectedBookId: null,
      counts: emptyCounts,
    });
  },
}));
