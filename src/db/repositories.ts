import { desc, eq, isNotNull, or, sql } from "drizzle-orm";

import { getDb, getSqlite, isSQLiteAvailable } from "@/db/client";
import { books, highlights, notes, readingSessions } from "@/db/schema";
import type {
  Book,
  HighlightWithBook,
  KnowledgeItem,
  LocalCounts,
  NoteWithBook,
} from "@/features/books/types";
import { createId } from "@/utils/id";

type NewBook = typeof books.$inferInsert;

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
      progress: existing.progress > 0 ? existing.progress : 0.01,
    })
    .where(eq(books.id, bookId))
    .run();

  getDb().insert(readingSessions)
    .values({
      id: createId(),
      bookId,
      startedAt: openedAt,
      progress: existing.progress > 0 ? existing.progress : 0.01,
    })
    .run();

  return getBookById(bookId);
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
      createdAt: notes.createdAt,
      updatedAt: notes.updatedAt,
      bookTitle: books.title,
    })
    .from(notes)
    .innerJoin(books, eq(notes.bookId, books.id))
    .orderBy(desc(notes.createdAt))
    .all();
}

export function listKnowledgeItems(): KnowledgeItem[] {
  const highlightItems = listHighlightsWithBooks().map<KnowledgeItem>((highlight) => ({
    id: highlight.id,
    type: "highlight",
    bookId: highlight.bookId,
    bookTitle: highlight.bookTitle,
    text: highlight.text,
    note: highlight.note,
    pageLabel: highlight.pageLabel,
    createdAt: highlight.createdAt,
  }));
  const noteItems = listNotesWithBooks().map<KnowledgeItem>((note) => ({
    id: note.id,
    type: "note",
    bookId: note.bookId,
    bookTitle: note.bookTitle,
    text: note.content,
    note: null,
    pageLabel: note.linkedCfi,
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
