import type { AppThemeId } from "@/design/app-themes";
import type { ReaderFontFamily } from "@/design/fonts";

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
  currentChapterIndex: number;
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
  chapterIndex: number;
  startOffset: number | null;
  endOffset: number | null;
  createdAt: string;
  updatedAt: string;
};

export type Note = {
  id: string;
  bookId: string;
  content: string;
  linkedCfi: string | null;
  selectedText: string | null;
  chapterIndex: number;
  startOffset: number | null;
  endOffset: number | null;
  createdAt: string;
  updatedAt: string;
};

export type HighlightColor = "yellow";

export type ReaderAnchor = {
  chapterIndex: number;
  selectedText: string;
  startOffset: number;
  endOffset: number;
};

export type ReadingSession = {
  id: string;
  bookId: string;
  startedAt: string;
  endedAt: string | null;
  progress: number;
};

export type Folder = {
  id: string;
  name: string;
  createdAt: string;
  updatedAt: string;
};

export type FolderWithCount = Folder & {
  bookCount: number;
};

export type FolderBook = {
  id: string;
  folderId: string;
  bookId: string;
  createdAt: string;
};

export type ReaderTheme =
  | "paper"
  | "sepia"
  | "warm"
  | "sage"
  | "slate"
  | "dark"
  | "oled"
  | "night-purple";

export type ReaderSettings = {
  id: string;
  appThemeId: AppThemeId;
  theme: ReaderTheme;
  fontSize: number;
  readerFontFamily: ReaderFontFamily;
  lineHeight: number;
  contentWidth: number;
  musicianAutoScrollSpeed: number;
  musicianKeepAwake: boolean;
  musicianExtraLargeText: boolean;
  musicianHighContrast: boolean;
  updatedAt: string;
};

export type ReaderSettingsInput = Partial<
  Pick<
    ReaderSettings,
    | "appThemeId"
    | "theme"
    | "fontSize"
    | "readerFontFamily"
    | "lineHeight"
    | "contentWidth"
    | "musicianAutoScrollSpeed"
    | "musicianKeepAwake"
    | "musicianExtraLargeText"
    | "musicianHighContrast"
  >
>;

export type NotificationPermissionStatus =
  | "granted"
  | "denied"
  | "undetermined";

export type NotificationSettings = {
  id: string;
  readingReminderEnabled: boolean;
  insightDigestEnabled: boolean;
  importCompleteEnabled: boolean;
  reminderHour: number;
  reminderMinute: number;
  digestWeekday: number;
  digestHour: number;
  digestMinute: number;
  quietStartHour: number;
  quietStartMinute: number;
  quietEndHour: number;
  quietEndMinute: number;
  permissionStatus: NotificationPermissionStatus;
  readingReminderNotificationId: string | null;
  insightDigestNotificationId: string | null;
  updatedAt: string;
};

export type NotificationSettingsInput = Partial<
  Pick<
    NotificationSettings,
    | "readingReminderEnabled"
    | "insightDigestEnabled"
    | "importCompleteEnabled"
    | "reminderHour"
    | "reminderMinute"
    | "digestWeekday"
    | "digestHour"
    | "digestMinute"
    | "quietStartHour"
    | "quietStartMinute"
    | "quietEndHour"
    | "quietEndMinute"
    | "permissionStatus"
    | "readingReminderNotificationId"
    | "insightDigestNotificationId"
  >
>;

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
      color: string;
      note: string | null;
      pageLabel: string | null;
      chapterIndex: number;
      startOffset: number | null;
      endOffset: number | null;
      createdAt: string;
    }
  | {
      id: string;
      type: "note";
      bookId: string;
      bookTitle: string;
      text: string;
      note: string | null;
      pageLabel: string | null;
      chapterIndex: number;
      startOffset: number | null;
      endOffset: number | null;
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
