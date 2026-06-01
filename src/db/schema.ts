import {
  integer,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const books = sqliteTable("books", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  author: text("author"),
  description: text("description"),
  language: text("language"),
  publisher: text("publisher"),
  coverUri: text("cover_uri"),
  fileUri: text("file_uri").notNull(),
  originalFileName: text("original_file_name"),
  fileType: text("file_type").notNull().default("epub"),
  progress: real("progress").notNull().default(0),
  currentChapterIndex: integer("current_chapter_index").notNull().default(0),
  currentLocation: text("current_location"),
  lastOpenedAt: text("last_opened_at"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const highlights = sqliteTable("highlights", {
  id: text("id").primaryKey(),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  text: text("text").notNull(),
  cfiRange: text("cfi_range"),
  color: text("color").notNull().default("yellow"),
  note: text("note"),
  pageLabel: text("page_label"),
  chapterIndex: integer("chapter_index").notNull().default(0),
  startOffset: integer("start_offset"),
  endOffset: integer("end_offset"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const notes = sqliteTable("notes", {
  id: text("id").primaryKey(),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  linkedCfi: text("linked_cfi"),
  selectedText: text("selected_text"),
  chapterIndex: integer("chapter_index").notNull().default(0),
  startOffset: integer("start_offset"),
  endOffset: integer("end_offset"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

export const readingSessions = sqliteTable("reading_sessions", {
  id: text("id").primaryKey(),
  bookId: text("book_id")
    .notNull()
    .references(() => books.id, { onDelete: "cascade" }),
  startedAt: text("started_at").notNull(),
  endedAt: text("ended_at"),
  progress: real("progress").notNull().default(0),
});

export const readerSettings = sqliteTable("reader_settings", {
  id: text("id").primaryKey(),
  appThemeId: text("app_theme_id").notNull().default("lumira-dark"),
  theme: text("theme").notNull().default("dark"),
  fontSize: real("font_size").notNull().default(19),
  readerFontFamily: text("reader_font_family")
    .notNull()
    .default("noto-serif-myanmar"),
  lineHeight: real("line_height").notNull().default(1.72),
  contentWidth: integer("content_width").notNull().default(720),
  musicianAutoScrollSpeed: real("musician_auto_scroll_speed").notNull().default(28),
  musicianKeepAwake: integer("musician_keep_awake", { mode: "boolean" })
    .notNull()
    .default(true),
  musicianExtraLargeText: integer("musician_extra_large_text", { mode: "boolean" })
    .notNull()
    .default(false),
  musicianHighContrast: integer("musician_high_contrast", { mode: "boolean" })
    .notNull()
    .default(false),
  updatedAt: text("updated_at").notNull(),
});

export const notificationSettings = sqliteTable("notification_settings", {
  id: text("id").primaryKey(),
  readingReminderEnabled: integer("reading_reminder_enabled", {
    mode: "boolean",
  })
    .notNull()
    .default(false),
  insightDigestEnabled: integer("insight_digest_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  importCompleteEnabled: integer("import_complete_enabled", { mode: "boolean" })
    .notNull()
    .default(false),
  reminderHour: integer("reminder_hour").notNull().default(20),
  reminderMinute: integer("reminder_minute").notNull().default(0),
  digestWeekday: integer("digest_weekday").notNull().default(1),
  digestHour: integer("digest_hour").notNull().default(19),
  digestMinute: integer("digest_minute").notNull().default(0),
  quietStartHour: integer("quiet_start_hour").notNull().default(22),
  quietStartMinute: integer("quiet_start_minute").notNull().default(0),
  quietEndHour: integer("quiet_end_hour").notNull().default(7),
  quietEndMinute: integer("quiet_end_minute").notNull().default(0),
  permissionStatus: text("permission_status").notNull().default("undetermined"),
  readingReminderNotificationId: text("reading_reminder_notification_id"),
  insightDigestNotificationId: text("insight_digest_notification_id"),
  updatedAt: text("updated_at").notNull(),
});

export const folders = sqliteTable(
  "folders",
  {
    id: text("id").primaryKey(),
    name: text("name").notNull(),
    createdAt: text("created_at").notNull(),
    updatedAt: text("updated_at").notNull(),
  },
  (table) => [uniqueIndex("folders_name_unique_idx").on(table.name)],
);

export const folderBooks = sqliteTable(
  "folder_books",
  {
    id: text("id").primaryKey(),
    folderId: text("folder_id")
      .notNull()
      .references(() => folders.id, { onDelete: "cascade" }),
    bookId: text("book_id")
      .notNull()
      .references(() => books.id, { onDelete: "cascade" }),
    createdAt: text("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("folder_books_folder_book_unique_idx").on(
      table.folderId,
      table.bookId,
    ),
  ],
);

export const schema = {
  books,
  highlights,
  notes,
  readingSessions,
  readerSettings,
  notificationSettings,
  folders,
  folderBooks,
};
