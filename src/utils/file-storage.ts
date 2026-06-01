import * as FileSystem from "expo-file-system/legacy";

const rootDirectory = FileSystem.documentDirectory;

export type LocalFileInfo = {
  exists: boolean;
  size: number | null;
  uri: string;
};

function assertStorageAvailable() {
  if (!rootDirectory) {
    throw new Error("Local file storage is not available on this platform.");
  }
}

export function getBooksDirectory() {
  assertStorageAvailable();
  return `${rootDirectory}books/`;
}

export function getCoversDirectory() {
  assertStorageAvailable();
  return `${rootDirectory}covers/`;
}

export async function ensureLumiraStorage() {
  if (!rootDirectory) {
    return;
  }

  const directories = [getBooksDirectory(), getCoversDirectory()];

  await Promise.all(
    directories.map(async (directory) => {
      const info = await FileSystem.getInfoAsync(directory);

      if (!info.exists) {
        await FileSystem.makeDirectoryAsync(directory, { intermediates: true });
      }
    }),
  );
}

export async function copyBookFile(sourceUri: string, bookId: string) {
  await ensureLumiraStorage();
  const destination = `${getBooksDirectory()}${bookId}.epub`;
  await FileSystem.copyAsync({ from: sourceUri, to: destination });
  return destination;
}

export async function writeCoverFile({
  bookId,
  base64,
  extension,
}: {
  bookId: string;
  base64: string;
  extension: "jpg" | "png";
}) {
  await ensureLumiraStorage();
  const destination = `${getCoversDirectory()}${bookId}.${extension}`;
  await FileSystem.writeAsStringAsync(destination, base64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  return destination;
}

export async function readFileAsBase64(fileUri: string) {
  return FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.Base64,
  });
}

export async function getLocalFileInfo(fileUri: string): Promise<LocalFileInfo> {
  const info = await FileSystem.getInfoAsync(fileUri);

  return {
    exists: info.exists,
    size: info.exists && typeof info.size === "number" ? info.size : null,
    uri: fileUri,
  };
}

export async function fileExists(fileUri: string) {
  const info = await getLocalFileInfo(fileUri);
  return info.exists;
}

export async function clearLumiraStorage() {
  if (!rootDirectory) {
    return;
  }

  const directories = [getBooksDirectory(), getCoversDirectory()];

  await Promise.all(
    directories.map(async (directory) => {
      const info = await FileSystem.getInfoAsync(directory);

      if (info.exists) {
        await FileSystem.deleteAsync(directory, { idempotent: true });
      }
    }),
  );
}
