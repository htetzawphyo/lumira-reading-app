export const fontFamilies = {
  appRegular: "NotoSansMyanmar-Regular",
  appBold: "NotoSansMyanmar-Bold",
  readerSerif: "NotoSerifMyanmar-Regular",
  readerSerifBold: "NotoSerifMyanmar-Bold",
  padauk: "Padauk-Regular",
  padaukBold: "Padauk-Bold",
} as const;

export type ReaderFontFamily = "noto-serif-myanmar" | "padauk" | "system";

export type ReaderFontOption = {
  value: ReaderFontFamily;
  label: string;
  description: string;
  cssFamily: string;
};

export const defaultReaderFontFamily: ReaderFontFamily = "noto-serif-myanmar";

export const readerFontOptions: ReaderFontOption[] = [
  {
    value: "noto-serif-myanmar",
    label: "Noto Serif Myanmar",
    description: "Myanmar-first serif for long reading.",
    cssFamily:
      '"LumiraNotoSerifMyanmar", "Noto Serif Myanmar", Georgia, "Times New Roman", serif',
  },
  {
    value: "padauk",
    label: "Padauk",
    description: "Readable Myanmar alternative.",
    cssFamily:
      '"LumiraPadauk", "Padauk", "LumiraNotoSerifMyanmar", Georgia, serif',
  },
  {
    value: "system",
    label: "System",
    description: "Use the device default font stack.",
    cssFamily:
      '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
  },
];

export function isReaderFontFamily(
  value: string | null | undefined,
): value is ReaderFontFamily {
  return readerFontOptions.some((option) => option.value === value);
}

export function getReaderFontOption(value: ReaderFontFamily) {
  return (
    readerFontOptions.find((option) => option.value === value) ??
    readerFontOptions[0]
  );
}

export function getReaderFontCss(value: ReaderFontFamily) {
  return getReaderFontOption(value).cssFamily;
}

export function getAppFontFamily(weight?: string | number) {
  const normalized = String(weight ?? "").toLowerCase();

  if (
    normalized === "700" ||
    normalized === "800" ||
    normalized === "900" ||
    normalized === "bold" ||
    normalized === "semibold" ||
    normalized === "600"
  ) {
    return fontFamilies.appBold;
  }

  return fontFamilies.appRegular;
}
