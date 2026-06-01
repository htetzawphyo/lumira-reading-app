import * as Haptics from "expo-haptics";
import type { LucideIcon } from "lucide-react-native";
import type { PropsWithChildren } from "react";
import type { PressableProps, StyleProp, ViewStyle } from "react-native";
import { Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { useAppTheme } from "@/design/app-theme-provider";
import { radii, spacing } from "@/design/tokens";

type ButtonVariant = "primary" | "secondary" | "ghost";

type ButtonProps = PropsWithChildren<
  Omit<PressableProps, "style"> & {
    title?: string;
    icon?: LucideIcon;
    variant?: ButtonVariant;
    fullWidth?: boolean;
    style?: StyleProp<ViewStyle>;
  }
>;

export function Button({
  title,
  children,
  icon: Icon,
  variant = "primary",
  fullWidth,
  onPress,
  style,
  ...props
}: ButtonProps) {
  const { colors: themeColors } = useAppTheme();
  const variants = {
    primary: {
      backgroundColor: themeColors.brand.violet,
      borderColor: themeColors.border.default,
      color: "#FFFFFF",
    },
    secondary: {
      backgroundColor: themeColors.text.primary,
      borderColor: themeColors.text.primary,
      color: themeColors.text.inverse,
    },
    ghost: {
      backgroundColor: "transparent",
      borderColor: "transparent",
      color: themeColors.text.secondary,
    },
  } as const;
  const theme = variants[variant];

  return (
    <Pressable
      {...props}
      accessibilityRole="button"
      onPress={(event) => {
        if (process.env.EXPO_OS === "ios") {
          Haptics.selectionAsync().catch(() => undefined);
        }

        onPress?.(event);
      }}
      style={({ pressed }) => [
        {
          minHeight: 46,
          alignSelf: fullWidth ? "stretch" : "flex-start",
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.pill,
          borderWidth: 1,
          borderColor: theme.borderColor,
          backgroundColor: theme.backgroundColor,
          paddingHorizontal: spacing[4],
          opacity: pressed ? 0.78 : 1,
          transform: [{ scale: pressed ? 0.985 : 1 }],
        },
        style,
      ]}
    >
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
        {Icon ? <Icon color={theme.color} size={18} strokeWidth={2.2} /> : null}
        {title ? (
          <AppText color={theme.color} variant="body" weight="semibold">
            {title}
          </AppText>
        ) : (
          children
        )}
      </View>
    </Pressable>
  );
}
