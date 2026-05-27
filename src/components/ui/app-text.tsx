import type { PropsWithChildren } from "react";
import type { StyleProp, TextProps, TextStyle } from "react-native";
import { Text } from "react-native";

import { colors, typography } from "@/design/tokens";

type TextVariant =
  | "display"
  | "title1"
  | "title2"
  | "title3"
  | "bodyLarge"
  | "body"
  | "footnote"
  | "caption";

type AppTextProps = PropsWithChildren<
  TextProps & {
    variant?: TextVariant;
    color?: keyof typeof colors.text | string;
    weight?: keyof typeof typography.weight;
    align?: TextStyle["textAlign"];
    style?: StyleProp<TextStyle>;
  }
>;

const variants: Record<TextVariant, TextStyle> = {
  display: {
    fontSize: typography.size.display,
    lineHeight: typography.lineHeight.display,
    fontWeight: typography.weight.bold,
  },
  title1: {
    fontSize: typography.size.title1,
    lineHeight: typography.lineHeight.title1,
    fontWeight: typography.weight.bold,
  },
  title2: {
    fontSize: typography.size.title2,
    lineHeight: typography.lineHeight.title2,
    fontWeight: typography.weight.semibold,
  },
  title3: {
    fontSize: typography.size.title3,
    lineHeight: typography.lineHeight.title3,
    fontWeight: typography.weight.semibold,
  },
  bodyLarge: {
    fontSize: typography.size.bodyLarge,
    lineHeight: typography.lineHeight.bodyLarge,
    fontWeight: typography.weight.regular,
  },
  body: {
    fontSize: typography.size.body,
    lineHeight: typography.lineHeight.body,
    fontWeight: typography.weight.regular,
  },
  footnote: {
    fontSize: typography.size.footnote,
    lineHeight: typography.lineHeight.footnote,
    fontWeight: typography.weight.medium,
  },
  caption: {
    fontSize: typography.size.caption,
    lineHeight: typography.lineHeight.caption,
    fontWeight: typography.weight.medium,
  },
};

function resolveColor(color: AppTextProps["color"]) {
  if (!color) {
    return colors.text.primary;
  }

  if (color in colors.text) {
    return colors.text[color as keyof typeof colors.text];
  }

  return color;
}

export function AppText({
  variant = "body",
  color = "primary",
  weight,
  align,
  style,
  children,
  ...props
}: AppTextProps) {
  return (
    <Text
      {...props}
      style={[
        {
          color: resolveColor(color),
          letterSpacing: 0,
          textAlign: align,
        },
        variants[variant],
        weight ? { fontWeight: typography.weight[weight] } : null,
        style,
      ]}
    >
      {children}
    </Text>
  );
}
