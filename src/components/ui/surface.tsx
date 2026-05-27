import type { PropsWithChildren } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { View } from "react-native";

import { colors, radii, shadows, spacing } from "@/design/tokens";

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
  const backgroundColor =
    tone === "strong"
      ? colors.background.panelStrong
      : tone === "quiet"
        ? colors.surface.soft
        : tone === "glass"
          ? colors.surface.glass
          : colors.background.panel;

  return (
    <View
      style={[
        {
          backgroundColor,
          borderRadius: radii.xl,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: colors.border.subtle,
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
