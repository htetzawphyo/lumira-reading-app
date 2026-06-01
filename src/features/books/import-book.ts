import * as DocumentPicker from "expo-document-picker";

import { getBookByOriginalFileName, insertBook } from "@/db/repositories";
import type { ImportBookResult } from "@/features/books/types";
import { copyBookFile } from "@/utils/file-storage";
import { extractEpubMetadata, titleFromFileName } from "@/utils/epub-metadata";
import { createId } from "@/utils/id";
import { nowIso } from "@/utils/date";

const METADATA_EXTRACTION_LIMIT_BYTES = 32 * 1024 * 1024;
const EPUB_MIME_TYPES = ["application/epub+zip", "application/x-epub+zip"];

function isEpubAsset(asset: DocumentPicker.DocumentPickerAsset) {
  const name = asset.name.toLowerCase();
  const mimeType = asset.mimeType?.toLowerCase();

  return name.endsWith(".epub") || EPUB_MIME_TYPES.includes(mimeType ?? "");
}

export async function pickAndImportBook(): Promise<ImportBookResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: EPUB_MIME_TYPES,
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];

  if (!asset || !isEpubAsset(asset)) {
    throw new Error("Please choose a .epub file. Lumira only supports EPUB import for now.");
  }

  const existing = getBookByOriginalFileName(asset.name);

  if (existing) {
    return {
      book: existing,
      duplicate: true,
    };
  }

  const bookId = createId();
  const fileUri = await copyBookFile(asset.uri, bookId);
  const createdAt = nowIso();
  let metadata: Awaited<ReturnType<typeof extractEpubMetadata>> = {};
  const shouldExtractMetadata =
    typeof asset.size !== "number" || asset.size <= METADATA_EXTRACTION_LIMIT_BYTES;

  if (shouldExtractMetadata) {
    try {
      await new Promise((resolve) => setTimeout(resolve, 0));
      metadata = await extractEpubMetadata(fileUri, bookId);
    } catch {
      metadata = {};
    }
  }

  const book = insertBook({
    id: bookId,
    title: metadata.title ?? titleFromFileName(asset.name),
    author: metadata.author ?? null,
    description: metadata.description ?? null,
    language: metadata.language ?? null,
    publisher: metadata.publisher ?? null,
    coverUri: metadata.coverUri ?? null,
    fileUri,
    originalFileName: asset.name,
    fileType: "epub",
    progress: 0,
    currentChapterIndex: 0,
    currentLocation: null,
    lastOpenedAt: null,
    createdAt,
    updatedAt: createdAt,
  });

  return {
    book,
    duplicate: false,
  };
}
