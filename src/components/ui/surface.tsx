import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";

import { useAppTheme } from "@/design/app-theme-provider";
import { radii, shadows, spacing } from "@/design/tokens";

type SurfaceProps = PropsWithChildren<{
  tone?: "default" | "strong" | "quiet" | "glass";
  padded?: boolean;
  style?: StyleProp<ViewStyle>;
}>;

export function Surface({
  tone = "default",
  padded = true,
  style,
  children,
}: SurfaceProps) {
  const { colors: themeColors } = useAppTheme();
  const backgroundColor =
    tone === "strong"
      ? themeColors.background.panelStrong
      : tone === "quiet"
        ? themeColors.surface.soft
        : tone === "glass"
          ? themeColors.surface.glass
          : themeColors.background.panel;

  return (
    <View
      style={[
        {
          backgroundColor,
          borderRadius: radii.xl,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: themeColors.border.subtle,
          boxShadow: tone === "quiet" ? undefined : shadows.soft,
          padding: padded ? spacing[5] : 0,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}
