import { AlertCircle, CheckCircle2, type LucideIcon } from "lucide-react-native";
import { ActivityIndicator, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useAppTheme } from "@/design/app-theme-provider";
import { radii, spacing } from "@/design/tokens";

type StatusTone = "loading" | "success" | "warning";

type InlineStatusProps = {
  tone?: StatusTone;
  message: string;
  icon?: LucideIcon;
};

export function InlineStatus({ tone = "loading", message, icon: IconProp }: InlineStatusProps) {
  const { colors } = useAppTheme();
  const Icon = IconProp ?? (tone === "success" ? CheckCircle2 : AlertCircle);
  const color = tone === "warning" ? colors.brand.amber : colors.brand.violet;

  return (
    <View
      style={{
        minHeight: 44,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[2],
        alignSelf: "flex-start",
        borderRadius: radii.pill,
        backgroundColor: colors.surface.soft,
        paddingHorizontal: spacing[3],
      }}
    >
      {tone === "loading" ? (
        <ActivityIndicator color={color} />
      ) : (
        <Icon color={color} size={17} strokeWidth={2.1} />
      )}
      <AppText color={tone === "warning" ? colors.brand.amber : "secondary"} variant="footnote">
        {message}
      </AppText>
    </View>
  );
}
