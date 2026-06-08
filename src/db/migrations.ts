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
      current_chapter_index INTEGER NOT NULL DEFAULT 0,
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
      color TEXT NOT NULL DEFAULT 'yellow',
      note TEXT,
      page_label TEXT,
      chapter_index INTEGER NOT NULL DEFAULT 0,
      start_offset INTEGER,
      end_offset INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY NOT NULL,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      content TEXT NOT NULL,
      linked_cfi TEXT,
      selected_text TEXT,
      chapter_index INTEGER NOT NULL DEFAULT 0,
      start_offset INTEGER,
      end_offset INTEGER,
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

    CREATE TABLE IF NOT EXISTS reader_settings (
      id TEXT PRIMARY KEY NOT NULL,
      app_theme_id TEXT NOT NULL DEFAULT 'lumira-dark',
      theme TEXT NOT NULL DEFAULT 'dark',
      font_size REAL NOT NULL DEFAULT 19,
      reader_font_family TEXT NOT NULL DEFAULT 'noto-serif-myanmar',
      line_height REAL NOT NULL DEFAULT 1.72,
      content_width INTEGER NOT NULL DEFAULT 720,
      musician_auto_scroll_speed REAL NOT NULL DEFAULT 28,
      musician_keep_awake INTEGER NOT NULL DEFAULT 1,
      musician_extra_large_text INTEGER NOT NULL DEFAULT 0,
      musician_high_contrast INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS notification_settings (
      id TEXT PRIMARY KEY NOT NULL,
      reading_reminder_enabled INTEGER NOT NULL DEFAULT 0,
      insight_digest_enabled INTEGER NOT NULL DEFAULT 0,
      import_complete_enabled INTEGER NOT NULL DEFAULT 0,
      reminder_hour INTEGER NOT NULL DEFAULT 20,
      reminder_minute INTEGER NOT NULL DEFAULT 0,
      digest_weekday INTEGER NOT NULL DEFAULT 1,
      digest_hour INTEGER NOT NULL DEFAULT 19,
      digest_minute INTEGER NOT NULL DEFAULT 0,
      quiet_start_hour INTEGER NOT NULL DEFAULT 22,
      quiet_start_minute INTEGER NOT NULL DEFAULT 0,
      quiet_end_hour INTEGER NOT NULL DEFAULT 7,
      quiet_end_minute INTEGER NOT NULL DEFAULT 0,
      permission_status TEXT NOT NULL DEFAULT 'undetermined',
      reading_reminder_notification_id TEXT,
      insight_digest_notification_id TEXT,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS cloud_sync_settings (
      id TEXT PRIMARY KEY NOT NULL,
      cloud_backup_enabled INTEGER NOT NULL DEFAULT 0,
      auto_sync_wifi_only INTEGER NOT NULL DEFAULT 1,
      allow_mobile_data_sync INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT 'folder',
      accent_color TEXT NOT NULL DEFAULT '#8B5CF6',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS folder_books (
      id TEXT PRIMARY KEY NOT NULL,
      folder_id TEXT NOT NULL REFERENCES folders(id) ON DELETE CASCADE,
      book_id TEXT NOT NULL REFERENCES books(id) ON DELETE CASCADE,
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS books_title_idx ON books(title);
    CREATE INDEX IF NOT EXISTS books_author_idx ON books(author);
    CREATE INDEX IF NOT EXISTS books_last_opened_idx ON books(last_opened_at);
    CREATE INDEX IF NOT EXISTS highlights_book_idx ON highlights(book_id);
    CREATE INDEX IF NOT EXISTS notes_book_idx ON notes(book_id);
    CREATE INDEX IF NOT EXISTS reading_sessions_book_idx ON reading_sessions(book_id);
    CREATE UNIQUE INDEX IF NOT EXISTS folders_name_unique_idx ON folders(name);
    CREATE INDEX IF NOT EXISTS folder_books_folder_idx ON folder_books(folder_id);
    CREATE INDEX IF NOT EXISTS folder_books_book_idx ON folder_books(book_id);
    CREATE UNIQUE INDEX IF NOT EXISTS folder_books_folder_book_unique_idx
      ON folder_books(folder_id, book_id);
  `);

  const bookColumns = getSqlite().getAllSync<{ name: string }>(
    "PRAGMA table_info(books)"
  );
  const hasCurrentChapterIndex = bookColumns.some(
    (column) => column.name === "current_chapter_index"
  );

  if (!hasCurrentChapterIndex) {
    getSqlite().execSync(
      "ALTER TABLE books ADD COLUMN current_chapter_index INTEGER NOT NULL DEFAULT 0;"
    );
  }

  const highlightColumns = getSqlite().getAllSync<{ name: string }>(
    "PRAGMA table_info(highlights)"
  );
  const highlightColumnNames = new Set(
    highlightColumns.map((column) => column.name)
  );

  if (!highlightColumnNames.has("chapter_index")) {
    getSqlite().execSync(
      "ALTER TABLE highlights ADD COLUMN chapter_index INTEGER NOT NULL DEFAULT 0;"
    );
  }

  if (!highlightColumnNames.has("start_offset")) {
    getSqlite().execSync(
      "ALTER TABLE highlights ADD COLUMN start_offset INTEGER;"
    );
  }

  if (!highlightColumnNames.has("end_offset")) {
    getSqlite().execSync(
      "ALTER TABLE highlights ADD COLUMN end_offset INTEGER;"
    );
  }

  const noteColumns = getSqlite().getAllSync<{ name: string }>(
    "PRAGMA table_info(notes)"
  );
  const noteColumnNames = new Set(noteColumns.map((column) => column.name));

  if (!noteColumnNames.has("selected_text")) {
    getSqlite().execSync("ALTER TABLE notes ADD COLUMN selected_text TEXT;");
  }

  if (!noteColumnNames.has("chapter_index")) {
    getSqlite().execSync(
      "ALTER TABLE notes ADD COLUMN chapter_index INTEGER NOT NULL DEFAULT 0;"
    );
  }

  if (!noteColumnNames.has("start_offset")) {
    getSqlite().execSync("ALTER TABLE notes ADD COLUMN start_offset INTEGER;");
  }

  if (!noteColumnNames.has("end_offset")) {
    getSqlite().execSync("ALTER TABLE notes ADD COLUMN end_offset INTEGER;");
  }

  const readerSettingsColumns = getSqlite().getAllSync<{ name: string }>(
    "PRAGMA table_info(reader_settings)"
  );
  const readerSettingsColumnNames = new Set(
    readerSettingsColumns.map((column) => column.name)
  );

  if (!readerSettingsColumnNames.has("musician_auto_scroll_speed")) {
    getSqlite().execSync(
      "ALTER TABLE reader_settings ADD COLUMN musician_auto_scroll_speed REAL NOT NULL DEFAULT 28;"
    );
  }

  if (!readerSettingsColumnNames.has("musician_keep_awake")) {
    getSqlite().execSync(
      "ALTER TABLE reader_settings ADD COLUMN musician_keep_awake INTEGER NOT NULL DEFAULT 1;"
    );
  }

  if (!readerSettingsColumnNames.has("musician_extra_large_text")) {
    getSqlite().execSync(
      "ALTER TABLE reader_settings ADD COLUMN musician_extra_large_text INTEGER NOT NULL DEFAULT 0;"
    );
  }

  if (!readerSettingsColumnNames.has("musician_high_contrast")) {
    getSqlite().execSync(
      "ALTER TABLE reader_settings ADD COLUMN musician_high_contrast INTEGER NOT NULL DEFAULT 0;"
    );
  }

  if (!readerSettingsColumnNames.has("app_theme_id")) {
    getSqlite().execSync(
      "ALTER TABLE reader_settings ADD COLUMN app_theme_id TEXT NOT NULL DEFAULT 'lumira-dark';"
    );
  }

  if (!readerSettingsColumnNames.has("reader_font_family")) {
    getSqlite().execSync(
      "ALTER TABLE reader_settings ADD COLUMN reader_font_family TEXT NOT NULL DEFAULT 'noto-serif-myanmar';"
    );
  }

  const cloudSyncSettingsColumns = getSqlite().getAllSync<{ name: string }>(
    "PRAGMA table_info(cloud_sync_settings)"
  );
  const cloudSyncSettingsColumnNames = new Set(
    cloudSyncSettingsColumns.map((column) => column.name)
  );

  if (!cloudSyncSettingsColumnNames.has("cloud_backup_enabled")) {
    getSqlite().execSync(
      "ALTER TABLE cloud_sync_settings ADD COLUMN cloud_backup_enabled INTEGER NOT NULL DEFAULT 0;"
    );
  }

  if (!cloudSyncSettingsColumnNames.has("auto_sync_wifi_only")) {
    getSqlite().execSync(
      "ALTER TABLE cloud_sync_settings ADD COLUMN auto_sync_wifi_only INTEGER NOT NULL DEFAULT 1;"
    );
  }

  if (!cloudSyncSettingsColumnNames.has("allow_mobile_data_sync")) {
    getSqlite().execSync(
      "ALTER TABLE cloud_sync_settings ADD COLUMN allow_mobile_data_sync INTEGER NOT NULL DEFAULT 0;"
    );
  }

  const folderColumns = getSqlite().getAllSync<{ name: string }>(
    "PRAGMA table_info(folders)"
  );
  const folderColumnNames = new Set(folderColumns.map((column) => column.name));

  if (!folderColumnNames.has("icon")) {
    getSqlite().execSync(
      "ALTER TABLE folders ADD COLUMN icon TEXT NOT NULL DEFAULT 'folder';"
    );
  }

  if (!folderColumnNames.has("accent_color")) {
    getSqlite().execSync(
      "ALTER TABLE folders ADD COLUMN accent_color TEXT NOT NULL DEFAULT '#8B5CF6';"
    );
  }

  initialized = true;
}
