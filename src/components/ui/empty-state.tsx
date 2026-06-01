import type { LucideIcon } from "lucide-react-native";
import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useAppTheme } from "@/design/app-theme-provider";
import { radii, spacing } from "@/design/tokens";

type EmptyStateProps = {
  title: string;
  body: string;
  icon?: LucideIcon;
  compact?: boolean;
};

export function EmptyState({ title, body, icon: Icon, compact }: EmptyStateProps) {
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        alignItems: "center",
        gap: compact ? spacing[3] : spacing[4],
        borderRadius: radii.lg,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.border.subtle,
        backgroundColor: colors.background.canvas,
        paddingHorizontal: compact ? spacing[5] : spacing[8],
        paddingVertical: compact ? spacing[8] : spacing[10],
      }}
    >
      {Icon ? (
        <View
          style={{
            width: compact ? 46 : 56,
            height: compact ? 46 : 56,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radii.md,
            backgroundColor: colors.background.panelStrong,
          }}
        >
          <Icon color={colors.brand.violet} size={compact ? 24 : 28} strokeWidth={2} />
        </View>
      ) : null}
      <AppText color="primary" variant="title3" weight="semibold" align="center">
        {title}
      </AppText>
      <AppText color="secondary" variant="body" align="center">
        {body}
      </AppText>
    </View>
  );
}
