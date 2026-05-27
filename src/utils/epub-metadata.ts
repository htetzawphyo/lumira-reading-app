import { XMLParser } from "fast-xml-parser";
import JSZip from "jszip";

import { readFileAsBase64, writeCoverFile } from "@/utils/file-storage";

type ParsedEpubMetadata = {
  title?: string;
  author?: string;
  description?: string;
  language?: string;
  publisher?: string;
  coverUri?: string;
};

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: "@_",
  removeNSPrefix: true,
});

function asArray<T>(value: T | T[] | undefined | null): T[] {
  if (!value) {
    return [];
  }

  return Array.isArray(value) ? value : [value];
}

function textValue(value: unknown): string | undefined {
  if (typeof value === "string" || typeof value === "number") {
    return String(value).trim() || undefined;
  }

  if (value && typeof value === "object" && "#text" in value) {
    return textValue((value as { "#text": unknown })["#text"]);
  }

  if (Array.isArray(value)) {
    return textValue(value[0]);
  }

  return undefined;
}

function getDirectory(filePath: string) {
  const index = filePath.lastIndexOf("/");
  return index >= 0 ? filePath.slice(0, index + 1) : "";
}

function normalizeZipPath(path: string) {
  const parts: string[] = [];

  path.split("/").forEach((part) => {
    if (!part || part === ".") {
      return;
    }

    if (part === "..") {
      parts.pop();
      return;
    }

    parts.push(part);
  });

  return parts.join("/");
}

function resolveZipPath(basePath: string, relativePath: string) {
  if (!relativePath) {
    return relativePath;
  }

  if (relativePath.startsWith("/")) {
    return normalizeZipPath(relativePath.slice(1));
  }

  return normalizeZipPath(`${getDirectory(basePath)}${relativePath}`);
}

function getCoverExtension(mediaType?: string, href?: string): "jpg" | "png" {
  if (mediaType?.includes("png") || href?.toLowerCase().endsWith(".png")) {
    return "png";
  }

  return "jpg";
}

function findCoverItem(manifestItems: Record<string, unknown>[], metadata: Record<string, unknown>) {
  const coverId = asArray(metadata.meta)
    .map((meta) => meta as Record<string, unknown>)
    .find((meta) => meta["@_name"] === "cover")?.["@_content"];

  return (
    manifestItems.find((item) => {
      const properties = String(item["@_properties"] ?? "");
      return properties.split(/\s+/).includes("cover-image");
    }) ??
    manifestItems.find((item) => item["@_id"] === coverId) ??
    manifestItems.find((item) => {
      const id = String(item["@_id"] ?? "").toLowerCase();
      const href = String(item["@_href"] ?? "").toLowerCase();
      const type = String(item["@_media-type"] ?? "").toLowerCase();
      return type.startsWith("image/") && (id.includes("cover") || href.includes("cover"));
    })
  );
}

export async function extractEpubMetadata(fileUri: string, bookId: string): Promise<ParsedEpubMetadata> {
  const base64 = await readFileAsBase64(fileUri);
  const zip = await JSZip.loadAsync(base64, { base64: true });
  const containerXml = await zip.file("META-INF/container.xml")?.async("string");

  if (!containerXml) {
    return {};
  }

  const container = parser.parse(containerXml);
  const rootFile = asArray(container?.container?.rootfiles?.rootfile)[0] as
    | Record<string, unknown>
    | undefined;
  const opfPath = String(rootFile?.["@_full-path"] ?? "");
  const opfXml = opfPath ? await zip.file(opfPath)?.async("string") : undefined;

  if (!opfXml) {
    return {};
  }

  const opf = parser.parse(opfXml);
  const packageNode = opf?.package ?? {};
  const metadata = (packageNode.metadata ?? {}) as Record<string, unknown>;
  const manifestItems = asArray(packageNode.manifest?.item).map(
    (item) => item as Record<string, unknown>,
  );
  const coverItem = findCoverItem(manifestItems, metadata);
  const coverHref = String(coverItem?.["@_href"] ?? "");
  const coverPath = coverHref ? resolveZipPath(opfPath, coverHref) : undefined;
  const coverEntry = coverPath ? zip.file(coverPath) : undefined;
  const coverExtension = getCoverExtension(
    String(coverItem?.["@_media-type"] ?? ""),
    coverHref,
  );
  let coverUri: string | undefined;

  if (coverEntry) {
    try {
      coverUri = await writeCoverFile({
        bookId,
        base64: await coverEntry.async("base64"),
        extension: coverExtension,
      });
    } catch {
      coverUri = undefined;
    }
  }

  return {
    title: textValue(metadata.title),
    author: textValue(metadata.creator),
    description: textValue(metadata.description),
    language: textValue(metadata.language),
    publisher: textValue(metadata.publisher),
    coverUri,
  };
}

export function titleFromFileName(name?: string | null) {
  const fallback = name?.replace(/\.[^/.]+$/, "").replace(/[-_]+/g, " ").trim();
  return fallback || "Untitled Book";
}
