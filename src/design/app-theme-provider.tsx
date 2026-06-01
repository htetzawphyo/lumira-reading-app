import * as SystemUI from "expo-system-ui";
import type { ReactNode } from "react";
import { createContext, useContext, useEffect, useMemo } from "react";

import {
  canUseAppTheme,
  defaultAppThemeId,
  getAppTheme,
  type AppTheme,
  type AppThemeColors,
  type AppThemeId,
} from "@/design/app-themes";
import { colors } from "@/design/tokens";
import { useBooksStore } from "@/features/books/books-store";

type AppThemeContextValue = {
  theme: AppTheme;
  colors: AppThemeColors;
  setAppThemeId: (themeId: AppThemeId) => void;
};

const fallbackTheme = getAppTheme(defaultAppThemeId);

const AppThemeContext = createContext<AppThemeContextValue>({
  theme: fallbackTheme,
  colors: fallbackTheme.colors,
  setAppThemeId: () => undefined,
});

function applyAppThemeColors(themeColors: AppThemeColors) {
  Object.assign(colors.background, themeColors.background);
  Object.assign(colors.text, themeColors.text);
  Object.assign(colors.border, themeColors.border);
  Object.assign(colors.brand, themeColors.brand);
  Object.assign(colors.surface, themeColors.surface);
}

export function AppThemeProvider({ children }: { children: ReactNode }) {
  const appThemeId = useBooksStore(
    (state) => state.readerSettings.appThemeId ?? defaultAppThemeId,
  );
  const setReaderSettings = useBooksStore((state) => state.setReaderSettings);
  const theme = getAppTheme(appThemeId);

  applyAppThemeColors(theme.colors);

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(theme.colors.background.base).catch(
      () => undefined,
    );
  }, [theme.colors.background.base]);

  const value = useMemo<AppThemeContextValue>(
    () => ({
      theme,
      colors: theme.colors,
      setAppThemeId: (themeId) => {
        if (canUseAppTheme(themeId, false)) {
          setReaderSettings({ appThemeId: themeId });
        }
      },
    }),
    [setReaderSettings, theme],
  );

  return (
    <AppThemeContext.Provider value={value}>
      {children}
    </AppThemeContext.Provider>
  );
}

export function useAppTheme() {
  return useContext(AppThemeContext);
}
