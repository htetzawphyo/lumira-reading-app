import { colors } from "@/design/tokens";
import type { ReaderTheme } from "@/features/books/types";

export type ReaderThemeOption = {
  label: string;
  value: ReaderTheme;
  description: string;
  background: string;
  text: string;
  isPremium: boolean;
};

export const defaultReaderTheme: ReaderTheme = "dark";

export const readerThemeOptions: ReaderThemeOption[] = [
  {
    label: "Paper",
    value: "paper",
    description: "Clean paper background for daytime reading",
    background: "#F7F1E4",
    text: "#24201A",
    isPremium: false,
  },
  {
    label: "Sepia",
    value: "sepia",
    description: "Warm classic book-like reading experience",
    background: colors.reader.sepiaPage,
    text: "#2F261C",
    isPremium: false,
  },
  {
    label: "Dark",
    value: "dark",
    description: "Comfortable dark reading environment",
    background: colors.reader.darkPage,
    text: "#F7F3FF",
    isPremium: false,
  },
  {
    label: "OLED",
    value: "oled",
    description: "Pure black AMOLED optimized theme",
    background: "#000000",
    text: "#FFFFFF",
    isPremium: true,
  },
  {
    label: "Warm",
    value: "warm",
    description: "Soft warm amber reading tone",
    background: "#F2DFC2",
    text: "#302419",
    isPremium: true,
  },
  {
    label: "Sage",
    value: "sage",
    description: "Calm green-gray reading surface",
    background: "#DDE8D5",
    text: "#1F2B21",
    isPremium: true,
  },
  {
    label: "Slate",
    value: "slate",
    description: "Blue-gray professional reading theme",
    background: "#20242D",
    text: "#E9EDF2",
    isPremium: true,
  },
  {
    label: "Night Purple",
    value: "night-purple",
    description: "Premium violet night reading experience",
    background: "#191027",
    text: "#F8F2FF",
    isPremium: true,
  },
];

const readerThemeIds = new Set<ReaderTheme>(
  readerThemeOptions.map((option) => option.value),
);

export const readerThemeGroups = [
  {
    title: "Free",
    themes: readerThemeOptions.filter((option) => !option.isPremium),
  },
  {
    title: "Premium",
    themes: readerThemeOptions.filter((option) => option.isPremium),
  },
];

export function migrateReaderTheme(value?: string | null): ReaderTheme {
  if (value === "light") {
    return "paper";
  }

  if (value && readerThemeIds.has(value as ReaderTheme)) {
    return value as ReaderTheme;
  }

  return defaultReaderTheme;
}

export function canUseReaderTheme(theme: ReaderTheme, isPremiumUser: boolean) {
  const option = readerThemeOptions.find((item) => item.value === theme);

  return Boolean(option && (!option.isPremium || isPremiumUser));
}

export function isDarkReaderTheme(theme: ReaderTheme) {
  return (
    theme === "dark" ||
    theme === "slate" ||
    theme === "oled" ||
    theme === "night-purple"
  );
}

export function getReaderThemeSurface(theme: ReaderTheme, highContrast = false) {
  if (highContrast) {
    return {
      background: "#000000",
      text: "#FFFFFF",
      chrome: "rgba(0, 0, 0, 0.86)",
      border: "rgba(255, 255, 255, 0.28)",
    };
  }

  const option =
    readerThemeOptions.find((item) => item.value === theme) ??
    readerThemeOptions.find((item) => item.value === defaultReaderTheme) ??
    readerThemeOptions[0];
  const dark = isDarkReaderTheme(option.value);

  return {
    background: option.background,
    text: option.text,
    chrome: dark ? "rgba(8, 8, 8, 0.74)" : `${option.background}E8`,
    border: dark ? "rgba(255, 255, 255, 0.12)" : "rgba(37, 31, 24, 0.13)",
  };
}
