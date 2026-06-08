import { useEffect } from "react";
import type { ReactNode } from "react";
import { ActivityIndicator, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useAppTheme } from "@/design/app-theme-provider";
import { spacing } from "@/design/tokens";
import { useBooksStore } from "@/features/books/books-store";
import { refreshCurrentUser } from "@/features/auth/auth-service";
import { useAuthStore } from "@/features/auth/auth-store";
import { runAutoSyncIfNeeded } from "@/features/sync/cloud-backup-service";

type AppBootstrapProps = {
  children: ReactNode;
};

export function AppBootstrap({ children }: AppBootstrapProps) {
  const { colors } = useAppTheme();
  const dbReady = useBooksStore((state) => state.dbReady);
  const dbError = useBooksStore((state) => state.dbError);
  const initialize = useBooksStore((state) => state.initialize);
  const hydrateAuth = useAuthStore((state) => state.hydrate);

  useEffect(() => {
    initialize();
    hydrateAuth()
      .then((session) => {
        if (session) {
          return refreshCurrentUser().then(() => runAutoSyncIfNeeded());
        }
        return null;
      })
      .catch(() => undefined);
  }, [hydrateAuth, initialize]);

  if (dbError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: spacing[3],
          backgroundColor: colors.background.base,
          padding: spacing[6],
        }}
      >
        <AppText color="primary" variant="title3" weight="semibold" align="center">
          Local library could not start
        </AppText>
        <AppText color="secondary" variant="body" align="center">
          {dbError}
        </AppText>
      </View>
    );
  }

  if (!dbReady) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          gap: spacing[4],
          backgroundColor: colors.background.base,
        }}
      >
        <ActivityIndicator color={colors.brand.violet} />
        <AppText color="secondary" variant="body">
          Preparing local library...
        </AppText>
      </View>
    );
  }

  return children;
}
