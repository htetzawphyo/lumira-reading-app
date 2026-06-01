export type ThemeMode = "dark" | "light";

export type AppThemeId =
  | "lumira-dark"
  | "paper-light"
  | "night-purple"
  | "warm-sepia"
  | "sage-calm"
  | "soft-lavender";

export type AppThemeColors = {
  background: {
    base: string;
    canvas: string;
    elevated: string;
    panel: string;
    panelStrong: string;
  };
  text: {
    primary: string;
    secondary: string;
    tertiary: string;
    muted: string;
    inverse: string;
  };
  border: {
    subtle: string;
    default: string;
    strong: string;
  };
  brand: {
    primary: string;
    violet: string;
    purple: string;
    cyan: string;
    amber: string;
    emerald: string;
  };
  surface: {
    soft: string;
    medium: string;
    glass: string;
  };
};

export type AppTheme = {
  id: AppThemeId;
  name: string;
  description: string;
  mode: ThemeMode;
  colors: AppThemeColors;
  isPremium: boolean;
};

export const defaultAppThemeId: AppThemeId = "lumira-dark";

export const appThemes: AppTheme[] = [
  {
    id: "lumira-dark",
    name: "Lumira Dark",
    description: "A softer dark shell with Lumira violet accents.",
    mode: "dark",
    isPremium: false,
    colors: {
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
        subtle: "rgba(255,255,255,0.07)",
        default: "rgba(255,255,255,0.12)",
        strong: "rgba(255,255,255,0.22)",
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
        soft: "rgba(255,255,255,0.055)",
        medium: "rgba(255,255,255,0.12)",
        glass: "rgba(15,11,23,0.92)",
      },
    },
  },
  {
    id: "paper-light",
    name: "Paper Light",
    description: "Warm paper-inspired daylight interface.",
    mode: "light",
    isPremium: false,
    colors: {
      background: {
        base: "#F6F2EC",
        canvas: "#FAF7F2",
        elevated: "#FFFFFF",
        panel: "#FFFFFF",
        panelStrong: "#F1EBE3",
      },
      text: {
        primary: "#2B2238",
        secondary: "#5F556D",
        tertiary: "#847891",
        muted: "#A39AAA",
        inverse: "#FFFFFF",
      },
      border: {
        subtle: "rgba(43,34,56,0.07)",
        default: "rgba(43,34,56,0.12)",
        strong: "rgba(43,34,56,0.22)",
      },
      brand: {
        primary: "#8B5CF6",
        violet: "#8B5CF6",
        purple: "#A855F7",
        cyan: "#0891B2",
        amber: "#D97706",
        emerald: "#059669",
      },
      surface: {
        soft: "rgba(43,34,56,0.045)",
        medium: "rgba(43,34,56,0.09)",
        glass: "rgba(255,255,255,0.92)",
      },
    },
  },
  {
    id: "night-purple",
    name: "Night Purple",
    description: "Deep violet surfaces with premium purple glow.",
    mode: "dark",
    isPremium: true,
    colors: {
      background: {
        base: "#120A20",
        canvas: "#1A102D",
        elevated: "#24163B",
        panel: "#2C1A48",
        panelStrong: "#38225D",
      },
      text: {
        primary: "#FBF7FF",
        secondary: "#D8C9F0",
        tertiary: "#B29DCF",
        muted: "#837095",
        inverse: "#160E24",
      },
      border: {
        subtle: "rgba(255,255,255,0.08)",
        default: "rgba(202,173,255,0.16)",
        strong: "rgba(202,173,255,0.28)",
      },
      brand: {
        primary: "#A855F7",
        violet: "#A855F7",
        purple: "#C084FC",
        cyan: "#67E8F9",
        amber: "#FBBF24",
        emerald: "#6EE7B7",
      },
      surface: {
        soft: "rgba(168,85,247,0.13)",
        medium: "rgba(192,132,252,0.18)",
        glass: "rgba(18,10,32,0.92)",
      },
    },
  },
  {
    id: "warm-sepia",
    name: "Warm Sepia",
    description: "Warm beige surfaces inspired by paper books.",
    mode: "light",
    isPremium: true,
    colors: {
      background: {
        base: "#EFE0C8",
        canvas: "#F8ECD8",
        elevated: "#FFF8EC",
        panel: "#FFF3E3",
        panelStrong: "#EAD4B5",
      },
      text: {
        primary: "#332419",
        secondary: "#6A5540",
        tertiary: "#8E795F",
        muted: "#AA967C",
        inverse: "#FFFFFF",
      },
      border: {
        subtle: "rgba(51,36,25,0.07)",
        default: "rgba(51,36,25,0.13)",
        strong: "rgba(51,36,25,0.22)",
      },
      brand: {
        primary: "#8B5CF6",
        violet: "#8B5CF6",
        purple: "#7C3AED",
        cyan: "#0E7490",
        amber: "#B45309",
        emerald: "#047857",
      },
      surface: {
        soft: "rgba(51,36,25,0.045)",
        medium: "rgba(51,36,25,0.09)",
        glass: "rgba(255,248,236,0.92)",
      },
    },
  },
  {
    id: "sage-calm",
    name: "Sage Calm",
    description: "Calm green-gray surfaces for focused reading.",
    mode: "light",
    isPremium: true,
    colors: {
      background: {
        base: "#EEF4EA",
        canvas: "#F7FAF4",
        elevated: "#FFFFFF",
        panel: "#FFFFFF",
        panelStrong: "#E2EAD9",
      },
      text: {
        primary: "#263126",
        secondary: "#566350",
        tertiary: "#75806F",
        muted: "#99A292",
        inverse: "#FFFFFF",
      },
      border: {
        subtle: "rgba(38,49,38,0.07)",
        default: "rgba(38,49,38,0.12)",
        strong: "rgba(38,49,38,0.22)",
      },
      brand: {
        primary: "#8B5CF6",
        violet: "#8B5CF6",
        purple: "#7C3AED",
        cyan: "#0891B2",
        amber: "#C27803",
        emerald: "#047857",
      },
      surface: {
        soft: "rgba(38,49,38,0.045)",
        medium: "rgba(38,49,38,0.09)",
        glass: "rgba(255,255,255,0.92)",
      },
    },
  },
  {
    id: "soft-lavender",
    name: "Soft Lavender",
    description: "Bright lavender-tinted Lumira interface.",
    mode: "light",
    isPremium: true,
    colors: {
      background: {
        base: "#F7F3FF",
        canvas: "#FBF9FF",
        elevated: "#FFFFFF",
        panel: "#FFFFFF",
        panelStrong: "#EEE7FF",
      },
      text: {
        primary: "#2B2238",
        secondary: "#625571",
        tertiary: "#877A96",
        muted: "#A69CB0",
        inverse: "#FFFFFF",
      },
      border: {
        subtle: "rgba(74,45,120,0.07)",
        default: "rgba(74,45,120,0.13)",
        strong: "rgba(74,45,120,0.22)",
      },
      brand: {
        primary: "#8B5CF6",
        violet: "#8B5CF6",
        purple: "#9333EA",
        cyan: "#0EA5E9",
        amber: "#D97706",
        emerald: "#059669",
      },
      surface: {
        soft: "rgba(74,45,120,0.045)",
        medium: "rgba(74,45,120,0.09)",
        glass: "rgba(255,255,255,0.92)",
      },
    },
  },
];

const appThemeIds = new Set<AppThemeId>(appThemes.map((theme) => theme.id));

export const appThemeGroups = [
  {
    title: "Free",
    themes: appThemes.filter((theme) => !theme.isPremium),
  },
  {
    title: "Premium",
    themes: appThemes.filter((theme) => theme.isPremium),
  },
];

export function migrateAppThemeId(value?: string | null): AppThemeId {
  if (value === "dark") {
    return "lumira-dark";
  }

  if (value === "light") {
    return "paper-light";
  }

  if (value === "lavender-light") {
    return "soft-lavender";
  }

  if (value === "system") {
    return defaultAppThemeId;
  }

  if (value && appThemeIds.has(value as AppThemeId)) {
    return value as AppThemeId;
  }

  return defaultAppThemeId;
}

export function canUseAppTheme(themeId: AppThemeId, isPremiumUser: boolean) {
  const theme = appThemes.find((item) => item.id === themeId);

  return Boolean(theme && (!theme.isPremium || isPremiumUser));
}

export function getAppTheme(themeId?: string | null, isPremiumUser = false) {
  const migratedThemeId = migrateAppThemeId(themeId);
  const theme =
    appThemes.find((item) => item.id === migratedThemeId) ?? appThemes[0];

  if (!canUseAppTheme(theme.id, isPremiumUser)) {
    return appThemes.find((item) => item.id === defaultAppThemeId) ?? appThemes[0];
  }

  return theme;
}
