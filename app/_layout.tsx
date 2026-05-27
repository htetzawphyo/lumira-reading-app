import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import * as SystemUI from "expo-system-ui";
import { useEffect } from "react";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { colors } from "@/design/tokens";
import { AppBootstrap } from "@/features/books/app-bootstrap";

export default function RootLayout() {
  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background.base);
  }, []);

  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background.base }}
    >
      <SafeAreaProvider>
        <AppBootstrap>
          <Stack
            screenOptions={{
              headerShown: false,
              contentStyle: { backgroundColor: colors.background.base },
            }}
          >
            <Stack.Screen name="index" options={{ title: "Lumira" }} />
            <Stack.Screen name="(main)" options={{ title: "Library" }} />
          </Stack>
          <StatusBar style="light" />
        </AppBootstrap>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}
