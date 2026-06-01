export const colors = {
  background: {
    base: "#0F0B17",
    canvas: "#151020",
    elevated: "#1A1427",
    panel: "#221A33",
    panelStrong: "#2A2140",
  },
  text: {
    primary: "#F7F3FF",
    secondary: "#C9C1D8",
    tertiary: "#9D92B0",
    muted: "#70657F",
    inverse: "#111111",
  },
  border: {
    subtle: "rgba(255, 255, 255, 0.07)",
    default: "rgba(255, 255, 255, 0.12)",
    strong: "rgba(255, 255, 255, 0.22)",
  },
  brand: {
    primary: "#8B5CF6",
    violet: "#8B5CF6",
    purple: "#A855F7",
    cyan: "#38BDF8",
    amber: "#F59E0B",
    emerald: "#34D399",
  },
  surface: {
    soft: "rgba(255, 255, 255, 0.055)",
    medium: "rgba(255, 255, 255, 0.12)",
    glass: "rgba(8, 8, 8, 0.92)",
  },
  reader: {
    darkPage: "#17151C",
    sepiaPage: "#F3E8D2",
    lightPage: "#FBFAF7",
  },
} as const;

export const spacing = {
  1: 4,
  2: 8,
  3: 12,
  4: 16,
  5: 20,
  6: 24,
  7: 28,
  8: 32,
  10: 40,
  12: 48,
  14: 56,
  16: 64,
  18: 72,
} as const;

export const touch = {
  min: 44,
  comfortable: 48,
  large: 56,
} as const;

export const controls = {
  inputCompactHeight: 50,
  inputHeight: 62,
  rowCompactHeight: 84,
  rowHeight: 96,
} as const;

export const radii = {
  xs: 6,
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  xxl: 30,
  pill: 999,
} as const;

export const typography = {
  size: {
    caption: 12,
    footnote: 13,
    body: 15,
    bodyLarge: 17,
    title3: 20,
    title2: 24,
    title1: 34,
    display: 40,
  },
  lineHeight: {
    caption: 16,
    footnote: 18,
    body: 22,
    bodyLarge: 25,
    title3: 27,
    title2: 31,
    title1: 39,
    display: 48,
  },
  weight: {
    regular: "400",
    medium: "500",
    semibold: "600",
    bold: "700",
  },
} as const;

export const breakpoints = {
  phone: 0,
  smallPhone: 360,
  largePhone: 430,
  tablet: 768,
  tabletLandscape: 1024,
  desktop: 1280,
} as const;

export const layout = {
  phoneMaxWidth: 430,
  tabletMaxWidth: 960,
  desktopMaxWidth: 1180,
  readerPhoneMaxWidth: 620,
  readerTabletMaxWidth: 760,
  settingsTabletMaxWidth: 760,
  knowledgeMaxWidth: 900,
} as const;

export const shadows = {
  soft: "0 10px 28px rgba(0, 0, 0, 0.26)",
  card: "0 18px 48px rgba(0, 0, 0, 0.32)",
  glow: "0 16px 54px rgba(139, 92, 246, 0.2)",
} as const;
