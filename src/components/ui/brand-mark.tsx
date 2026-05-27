import { Sparkles } from "lucide-react-native";
import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { colors, radii, spacing } from "@/design/tokens";

type BrandMarkProps = {
  compact?: boolean;
};

export function BrandMark({ compact }: BrandMarkProps) {
  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
      <View
        style={{
          width: compact ? 34 : 40,
          height: compact ? 34 : 40,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.md,
          backgroundColor: colors.brand.violet,
          borderWidth: 1,
          borderColor: "rgba(255, 255, 255, 0.16)",
        }}
      >
        <Sparkles color={colors.text.primary} size={compact ? 17 : 19} />
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
