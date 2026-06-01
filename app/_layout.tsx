import { useFonts } from "expo-font";
import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { ActivityIndicator, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { SafeAreaProvider } from "react-native-safe-area-context";

import { AppThemeProvider, useAppTheme } from "@/design/app-theme-provider";
import { AppBootstrap } from "@/features/books/app-bootstrap";

function ThemedRoot() {
  const { colors, theme } = useAppTheme();
  return (
    <GestureHandlerRootView
      style={{ flex: 1, backgroundColor: colors.background.base }}
    >
      <AppBootstrap>
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.background.base },
          }}
        >
          <Stack.Screen name="index" options={{ title: "Lumira" }} />
          <Stack.Screen name="(main)" options={{ title: "Library" }} />
          <Stack.Screen name="reader/[bookId]" options={{ title: "Reader" }} />
          <Stack.Screen name="book-reader/[bookId]" options={{ title: "Book Reader" }} />
          <Stack.Screen name="musician-reader/[bookId]" options={{ title: "Musician Reader" }} />
        </Stack>
        <StatusBar style={theme.mode === "dark" ? "light" : "dark"} />
      </AppBootstrap>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    "NotoSansMyanmar-Regular": require("../assets/fonts/NotoSansMyanmar-Regular.ttf"),
    "NotoSansMyanmar-Bold": require("../assets/fonts/NotoSansMyanmar-Bold.ttf"),
    "NotoSerifMyanmar-Regular": require("../assets/fonts/NotoSerifMyanmar-Regular.ttf"),
    "NotoSerifMyanmar-Bold": require("../assets/fonts/NotoSerifMyanmar-Bold.ttf"),
    "Padauk-Regular": require("../assets/fonts/Padauk-Regular.ttf"),
    "Padauk-Bold": require("../assets/fonts/Padauk-Bold.ttf"),
  });

  if (!fontsLoaded && !fontError) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#0F0B17",
        }}
      >
        <ActivityIndicator color="#8B5CF6" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <AppThemeProvider>
        <ThemedRoot />
      </AppThemeProvider>
    </SafeAreaProvider>
  );
}
