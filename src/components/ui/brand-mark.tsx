import { Image } from "expo-image";
import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useAppTheme } from "@/design/app-theme-provider";
import { radii, spacing } from "@/design/tokens";

type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact }: BrandMarkProps) {
  const { colors } = useAppTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
      <View
        style={{
          width: compact ? 34 : 40,
          height: compact ? 34 : 40,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.md,
          backgroundColor: colors.background.panelStrong,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.16)",
          overflow: "hidden",
        }}
      >
        <Image
          source={require("../../../assets/lumira.png")}
          contentFit="cover"
          style={{
            width: "100%",
            height: "100%",
          }}
        />
      </View>
      {!compact ? (
        <View>
          <AppText color="primary" variant="title3" weight="semibold">
            Lumira
          </AppText>
          <AppText color="tertiary" variant="caption">
            Offline reading workspace
          </AppText>
        </View>
      ) : null}
    </View>
  );
}
