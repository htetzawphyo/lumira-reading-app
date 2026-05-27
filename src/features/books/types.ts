export type Book = {
  id: string;
  title: string;
  author: string | null;
  description: string | null;
  language: string | null;
  publisher: string | null;
  coverUri: string | null;
  fileUri: string;
  originalFileName: string | null;
  fileType: string;
  progress: number;
  currentLocation: string | null;
  lastOpenedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Highlight = {
  id: string;
  bookId: string;
  text: string;
  cfiRange: string | null;
  color: string;
  note: string | null;
  pageLabel: string | null;
  createdAt: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  bookId: string;
  content: string;
  linkedCfi: string | null;
  createdAt: string;
  updatedAt: string;
};

export type ReadingSession = {
  id: string;
  bookId: string;
  startedAt: string;
  endedAt: string | null;
  progress: number;
};

export type HighlightWithBook = Highlight & {
  bookTitle: string;
};

export type NoteWithBook = Note & {
  bookTitle: string;
};

export type KnowledgeItem =
  | {
      id: string;
      type: "highlight";
      bookId: string;
      bookTitle: string;
      text: string;
      note: string | null;
      pageLabel: string | null;
      createdAt: string;
    }
  | {
      id: string;
      type: "note";
      bookId: string;
      bookTitle: string;
      text: string;
      note: null;
      pageLabel: string | null;
      createdAt: string;
    };

export type ImportBookResult = {
  book: Book;
  duplicate: boolean;
};

export type LocalCounts = {
  books: number;
  highlights: number;
  notes: number;
};
