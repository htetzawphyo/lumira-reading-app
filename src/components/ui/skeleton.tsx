import { View } from "react-native";

import { useAppTheme } from "@/design/app-theme-provider";
import { radii, spacing } from "@/design/tokens";

type SkeletonBlockProps = {
  height: number;
  width?: number | `${number}%`;
  radius?: number;
};

export function SkeletonBlock({ height, width = "100%", radius = radii.md }: SkeletonBlockProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        width,
        height,
        borderRadius: radius,
        backgroundColor: colors.background.panelStrong,
      }}
    />
  );
}

export function ReaderSkeleton() {
  return (
    <View style={{ alignItems: "center", gap: spacing[5] }}>
      <SkeletonBlock width={160} height={236} radius={radii.lg} />
      <View style={{ width: "100%", alignItems: "center", gap: spacing[2] }}>
        <SkeletonBlock width="70%" height={28} />
        <SkeletonBlock width="48%" height={18} />
      </View>
      <SkeletonBlock height={120} radius={radii.lg} />
    </View>
  );
}
