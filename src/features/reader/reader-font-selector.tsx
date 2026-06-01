import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { readerFontOptions } from "@/design/fonts";
import { colors, radii, spacing } from "@/design/tokens";
import type { ReaderSettings } from "@/features/books/types";

type ReaderFontSelectorProps = {
  selectedFont: ReaderSettings["readerFontFamily"];
  onSelect: (fontFamily: ReaderSettings["readerFontFamily"]) => void;
};

export function ReaderFontSelector({
  selectedFont,
  onSelect,
}: ReaderFontSelectorProps) {
  return (
    <View style={{ gap: spacing[3] }}>
      <AppText color="secondary" variant="footnote" weight="semibold">
        Reader Font
      </AppText>
      <View
        style={{
          flexDirection: "row",
          flexWrap: "wrap",
          gap: spacing[2],
        }}
      >
        {readerFontOptions.map((option) => {
          const selected = selectedFont === option.value;

          return (
            <Pressable
              key={option.value}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onSelect(option.value)}
              style={({ pressed }) => ({
                flexGrow: 1,
                flexBasis: 132,
                minHeight: 58,
                justifyContent: "center",
                gap: spacing[1],
                borderRadius: radii.lg,
                borderCurve: "continuous",
                borderWidth: 1,
                borderColor: selected
                  ? colors.brand.violet
                  : colors.border.subtle,
                backgroundColor: selected
                  ? "rgba(139, 92, 246, 0.16)"
                  : colors.background.panel,
                opacity: pressed ? 0.74 : 1,
                paddingHorizontal: spacing[3],
                paddingVertical: spacing[2],
              })}
            >
              <AppText
                color={selected ? "primary" : "secondary"}
                variant="footnote"
                weight="semibold"
                numberOfLines={1}
              >
                {option.label}
              </AppText>
              <AppText color="tertiary" variant="caption" numberOfLines={1}>
                {option.description}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
