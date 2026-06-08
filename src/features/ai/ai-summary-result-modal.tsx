import * as Clipboard from "expo-clipboard";
import { Copy, Sparkles, X } from "lucide-react-native";
import { Modal, Pressable, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { useAppTheme } from "@/design/app-theme-provider";
import { radii, spacing } from "@/design/tokens";
import type { AiSummary } from "@/features/ai/ai-summary-service";

function asStringArray(value: string[] | null) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

export function AiSummaryResultModal({
  visible,
  summary,
  onClose,
}: {
  visible: boolean;
  summary: AiSummary | null;
  onClose: () => void;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bulletPoints = asStringArray(summary?.bulletPoints ?? null);
  const takeaways = asStringArray(summary?.keyTakeaways ?? null);

  async function copySummary() {
    if (!summary) {
      return;
    }

    await Clipboard.setStringAsync(
      [
        summary.title,
        "",
        summary.summaryText,
        "",
        ...bulletPoints.map((point) => `- ${point}`),
        takeaways.length ? "\nKey takeaways:" : "",
        ...takeaways.map((point) => `- ${point}`),
      ]
        .filter(Boolean)
        .join("\n"),
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.44)",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close AI summary"
          onPress={onClose}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <View
          style={{
            maxHeight: "78%",
            borderTopLeftRadius: radii.xxl,
            borderTopRightRadius: radii.xxl,
            borderWidth: 1,
            borderColor: colors.border.subtle,
            backgroundColor: colors.background.elevated,
            padding: spacing[5],
            paddingBottom: spacing[5] + Math.max(insets.bottom, spacing[4]),
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: spacing[3],
              marginBottom: spacing[4],
            }}
          >
            <View style={{ flex: 1, minWidth: 0, gap: spacing[1] }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
                <Sparkles color={colors.brand.violet} size={18} strokeWidth={2.1} />
                <AppText color="primary" variant="title3" weight="semibold">
                  AI Summary
                </AppText>
              </View>
              <AppText color="secondary" variant="footnote" numberOfLines={1}>
                {summary?.model ?? "Lumira"}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radii.pill,
                backgroundColor: colors.background.panel,
                opacity: pressed ? 0.72 : 1,
              })}
            >
              <X color={colors.text.secondary} size={18} strokeWidth={2.1} />
            </Pressable>
          </View>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{ gap: spacing[4], paddingBottom: spacing[4] }}
          >
            <View style={{ gap: spacing[2] }}>
              <AppText color="primary" variant="title3" weight="semibold">
                {summary?.title ?? "Summary"}
              </AppText>
              <AppText color="secondary" variant="body" style={{ lineHeight: 24 }}>
                {summary?.summaryText ?? ""}
              </AppText>
            </View>

            {bulletPoints.length ? (
              <View style={{ gap: spacing[2] }}>
                <AppText color="primary" variant="footnote" weight="semibold">
                  Main points
                </AppText>
                {bulletPoints.map((point, index) => (
                  <AppText
                    key={`${index}-${point}`}
                    color="secondary"
                    variant="body"
                    style={{ lineHeight: 24 }}
                  >
                    - {point}
                  </AppText>
                ))}
              </View>
            ) : null}

            {takeaways.length ? (
              <View style={{ gap: spacing[2] }}>
                <AppText color="primary" variant="footnote" weight="semibold">
                  Key takeaways
                </AppText>
                {takeaways.map((point, index) => (
                  <AppText
                    key={`${index}-${point}`}
                    color="secondary"
                    variant="body"
                    style={{ lineHeight: 24 }}
                  >
                    - {point}
                  </AppText>
                ))}
              </View>
            ) : null}
          </ScrollView>

          <Button
            title="Copy Summary"
            icon={Copy}
            variant="secondary"
            fullWidth
            onPress={copySummary}
          />
        </View>
      </View>
    </Modal>
  );
}
