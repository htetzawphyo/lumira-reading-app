import type { LucideIcon } from "lucide-react-native";
import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useAppTheme } from "@/design/app-theme-provider";
import { spacing } from "@/design/tokens";

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
        minHeight: compact ? 220 : 300,
        alignItems: "center",
        justifyContent: "center",
        gap: compact ? spacing[3] : spacing[4],
        paddingHorizontal: compact ? spacing[5] : spacing[8],
        paddingVertical: compact ? spacing[6] : spacing[8],
      }}
    >
      {Icon ? (
        <Icon color={colors.brand.violet} size={compact ? 34 : 42} strokeWidth={1.9} />
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
