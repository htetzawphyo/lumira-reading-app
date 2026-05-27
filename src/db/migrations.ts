import { getSqlite, isSQLiteAvailable } from "@/db/client";

let initialized = false;

export function initializeDatabase() {
  if (initialized) {
    return;
  }

  if (!isSQLiteAvailable()) {
    initialized = true;
    return;
  }

  getSqlite().execSync(`
    PRAGMA foreign_keys = ON;
    PRAGMA journal_mode = WAL;

    CREATE TABLE IF NOT EXISTS books (
      id TEXT PRIMARY KEY NOT NULL,
      title TEXT NOT NULL,
      author TEXT,
      description TEXT,
      language TEXT,
      publisher TEXT,
      cover_uri TEXT,
      file_uri TEXT NOT NULL,
      original_file_name TEXT,
      file_type TEXT NOT NULL DEFAULT 'epub',
      progress REAL NOT NULL DEFAULT 0,
      current_location TEXT,
      last_opened_at TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS highlights (
      id TEXT PRIMARY KEY NOT NULL,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      text TEXT NOT NULL,
      cfi_range TEXT,
      color TEXT NOT NULL DEFAULT 'purple',
      note TEXT,
      page_label TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      linked_cfi TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS reading_sessions (
      id TEXT PRIMARY KEY NOT NULL,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      started_at TEXT NOT NULL,
      ended_at TEXT,
      progress REAL NOT NULL DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS books_title_idx ON books(title);
    CREATE INDEX IF NOT EXISTS books_author_idx ON books(author);
    CREATE INDEX IF NOT EXISTS books_last_opened_idx ON books(last_opened_at);
    CREATE INDEX IF NOT EXISTS highlights_book_idx ON highlights(book_id);
    CREATE INDEX IF NOT EXISTS notes_book_idx ON notes(book_id);
    CREATE INDEX IF NOT EXISTS reading_sessions_book_idx ON reading_sessions(book_id);
  `);

  initialized = true;
}
