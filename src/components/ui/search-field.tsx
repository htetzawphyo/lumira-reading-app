import { Search } from "lucide-react-native";
import { memo } from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { TextInput, View } from "react-native";

import { useAppTheme } from "@/design/app-theme-provider";
import { getAppFontFamily } from "@/design/fonts";
import { controls, spacing, typography } from "@/design/tokens";

type SearchFieldProps = {
  compact?: boolean;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  style?: StyleProp<ViewStyle>;
};

export const SearchField = memo(function SearchField({
  compact,
  placeholder,
  value,
  onChangeText,
  style,
}: SearchFieldProps) {
  const { colors: themeColors } = useAppTheme();

  return (
    <View
      style={[
        {
          minHeight: compact ? controls.inputCompactHeight : controls.inputHeight,
          flexDirection: "row",
          alignItems: "center",
          gap: compact ? spacing[2] : spacing[3],
          borderRadius: compact ? 16 : 18,
          backgroundColor: themeColors.background.panelStrong,
          paddingHorizontal: compact ? spacing[3] : spacing[4],
        },
        style,
      ]}
    >
      <Search color={themeColors.text.tertiary} size={compact ? 21 : 25} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={themeColors.text.tertiary}
        autoCapitalize="none"
        autoCorrect={false}
        returnKeyType="search"
        style={{
          flex: 1,
          color: themeColors.text.primary,
          fontSize: compact ? typography.size.body : typography.size.bodyLarge,
          lineHeight: compact ? typography.lineHeight.body + 10: typography.lineHeight.bodyLarge + 10,
          fontFamily: getAppFontFamily(typography.weight.medium),
          fontWeight: typography.weight.medium,
          paddingVertical: 0,
        }}
      />
    </View>
  );
});
