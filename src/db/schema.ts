import { real, sqliteTable, text } from "drizzle-orm/sqlite-core";

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
  color: text("color").notNull().default("purple"),
  note: text("note"),
  pageLabel: text("page_label"),
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

export const schema = {
  books,
  highlights,
  notes,
  readingSessions,
};
