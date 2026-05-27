import * as Haptics from "expo-haptics";
import type { LucideIcon } from "lucide-react-native";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";
import { Pressable } from "react-native";

import { colors, radii } from "@/design/tokens";

type IconButtonProps = Omit<PressableProps, "style"> & {
  icon: LucideIcon;
  label: string;
  active?: boolean;
  style?: StyleProp<ViewStyle>;
};

export function IconButton({
  icon: Icon,
  label,
  active,
  onPress,
  style,
  ...props
}: IconButtonProps) {
  return (
    <Pressable
      {...props}
      accessibilityLabel={label}
      accessibilityRole="button"
      onPress={(event) => {
        Haptics.selectionAsync().catch(() => undefined);
        onPress?.(event);
      }}
      style={({ pressed }) => [
        {
          width: 46,
          height: 46,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: active ? colors.border.strong : colors.border.subtle,
          backgroundColor: active
            ? "rgba(139, 92, 246, 0.18)"
            : colors.surface.soft,
          opacity: pressed ? 0.72 : 1,
        },
        style,
      ]}
    >
      <Icon
        color={active ? colors.brand.violet : colors.text.secondary}
        size={20}
        strokeWidth={2.1}
      />
    </Pressable>
  );
}
