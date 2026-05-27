import { usePathname, useRouter } from "expo-router";
import type { PropsWithChildren } from "react";
import { Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { BrandMark } from "@/components/ui/brand-mark";
import { Button } from "@/components/ui/button";
import { colors, radii, shadows, spacing } from "@/design/tokens";
import { useResponsive } from "@/design/responsive";
import { navItems, type NavItem } from "@/navigation/nav-items";

function ShellNavItem({
  item,
  compact,
}: {
  item: NavItem;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const selected = pathname === item.href || pathname.startsWith(`${item.href}/`);
  const Icon = item.icon;
  const tabId = `tab-${item.label.toLowerCase()}`;

  return (
    <Pressable
      accessibilityLabel={`${item.label} tab`}
      accessibilityRole="button"
      onPress={() => {
        if (!selected) {
          router.push(item.href);
        }
      }}
      testID={tabId}
      style={({ pressed }) => ({
        minHeight: compact ? 62 : 46,
        flex: compact ? 1 : undefined,
        minWidth: compact ? 0 : undefined,
        width: compact ? undefined : "100%",
        flexDirection: compact ? "column" : "row",
        alignItems: "center",
        justifyContent: compact ? "center" : "flex-start",
        gap: compact ? spacing[1] : spacing[3],
        borderRadius: compact ? radii.md : radii.lg,
        borderCurve: "continuous",
        borderWidth: compact && selected ? 1 : 0,
        borderColor: selected ? colors.border.strong : "transparent",
        backgroundColor: selected
          ? compact
            ? "rgba(255, 255, 255, 0.07)"
            : colors.background.panel
          : "transparent",
        paddingHorizontal: compact ? 0 : spacing[4],
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <Icon
        color={selected ? colors.text.primary : colors.text.tertiary}
        size={compact ? 26 : 20}
        strokeWidth={2.1}
      />
      <AppText
        color={selected ? colors.text.primary : colors.text.tertiary}
        variant="caption"
        weight={selected ? "semibold" : "medium"}
        numberOfLines={1}
        style={compact ? { fontSize: 12, maxWidth: 76 } : undefined}
      >
        {item.label}
      </AppText>
    </Pressable>
  );
}

function Sidebar({ width }: { width: number }) {
  return (
    <View
      style={{
        width,
        borderRightWidth: 1,
        borderRightColor: colors.border.subtle,
        backgroundColor: colors.background.canvas,
        padding: spacing[5],
        gap: spacing[7],
      }}
    >
      <BrandMark />
      <View style={{ gap: spacing[2] }}>
        {navItems.map((item) => (
          <ShellNavItem key={item.label} item={item} />
        ))}
      </View>
      <View style={{ flex: 1 }} />
      <View
        style={{
          gap: spacing[3],
          borderRadius: radii.xl,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: colors.border.subtle,
          backgroundColor: colors.surface.soft,
          padding: spacing[4],
        }}
      >
        <AppText color="primary" variant="footnote" weight="semibold">
          Lumira Pro
        </AppText>
        <AppText color="tertiary" variant="caption">
          AI summaries, idea links, and richer reading analytics.
        </AppText>
        <Button title="Upgrade" />
      </View>
    </View>
  );
}

function BottomNav() {
  const responsive = useResponsive();

  return (
    <View
      style={{
        borderTopWidth: 1,
        borderTopColor: colors.border.subtle,
        backgroundColor: "rgba(8, 8, 8, 0.96)",
        paddingHorizontal: spacing[3],
        paddingTop: spacing[2],
        boxShadow: shadows.soft,
      }}
    >
      <View
        style={{
          width: responsive.contentWidth,
          alignSelf: "center",
          flexDirection: "row",
          alignItems: "center",
          gap: spacing[1],
        }}
      >
        {navItems.map((item) => (
          <ShellNavItem key={item.label} item={item} compact />
        ))}
      </View>
    </View>
  );
}

export function AdaptiveAppShell({ children }: PropsWithChildren) {
  const responsive = useResponsive();

  return (
    <SafeAreaView
      edges={["top", "right", "bottom", "left"]}
      style={{ flex: 1, backgroundColor: colors.background.base }}
    >
      {responsive.useSidebar ? (
        <View style={{ flex: 1, flexDirection: "row" }}>
          <Sidebar width={responsive.sidebarWidth} />
          <View style={{ flex: 1 }}>{children}</View>
        </View>
      ) : (
        <View style={{ flex: 1 }}>
          <View style={{ flex: 1 }}>{children}</View>
          <BottomNav />
        </View>
      )}
    </SafeAreaView>
  );
}
