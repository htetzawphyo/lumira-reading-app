import * as DocumentPicker from "expo-document-picker";

import { getBookByOriginalFileName, insertBook } from "@/db/repositories";
import type { ImportBookResult } from "@/features/books/types";
import { copyBookFile } from "@/utils/file-storage";
import { extractEpubMetadata, titleFromFileName } from "@/utils/epub-metadata";
import { createId } from "@/utils/id";
import { nowIso } from "@/utils/date";

function isEpubAsset(asset: DocumentPicker.DocumentPickerAsset) {
  const name = asset.name.toLowerCase();
  return (
    name.endsWith(".epub") ||
    asset.mimeType === "application/epub+zip" ||
    asset.mimeType === "application/octet-stream"
  );
}

export async function pickAndImportBook(): Promise<ImportBookResult | null> {
  const result = await DocumentPicker.getDocumentAsync({
    type: ["application/epub+zip", "application/octet-stream"],
    copyToCacheDirectory: true,
    multiple: false,
  });

  if (result.canceled) {
    return null;
  }

  const asset = result.assets[0];

  if (!asset || !isEpubAsset(asset)) {
    throw new Error("Please choose an EPUB file.");
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

  try {
    metadata = await extractEpubMetadata(fileUri, bookId);
  } catch {
    metadata = {};
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
