import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useAppTheme } from "@/design/app-theme-provider";
import { radii, spacing, touch } from "@/design/tokens";

type Option<T extends string> = {
  label: string;
  value: T;
};

type SegmentedControlProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (value: T) => void;
  compact?: boolean;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  compact,
}: SegmentedControlProps<T>) {
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        flexDirection: "row",
        flexWrap: "wrap",
        alignSelf: "flex-start",
        gap: compact ? spacing[2] : spacing[3],
        borderRadius: radii.pill,
        backgroundColor: "transparent",
      }}
    >
      {options.map((option) => {
        const selected = option.value === value;

        return (
          <Pressable
            key={option.value}
            onPress={() => onChange(option.value)}
            style={({ pressed }) => ({
              minHeight: touch.min,
              justifyContent: "center",
              borderRadius: radii.pill,
              backgroundColor: selected ? colors.text.primary : colors.background.panelStrong,
              paddingHorizontal: compact ? spacing[3] : spacing[5],
              opacity: pressed ? 0.74 : 1,
            })}
          >
            <AppText
              color={selected ? colors.text.inverse : colors.text.primary}
              variant={compact ? "caption" : "body"}
              weight="semibold"
            >
              {option.label}
            </AppText>
          </Pressable>
        );
      })}
    </View>
  );
}
