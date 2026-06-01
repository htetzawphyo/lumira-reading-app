import { usePathname, useRouter } from "expo-router";
import type { PropsWithChildren } from "react";
import { memo, useEffect, useRef } from "react";
import { Animated, Easing, Pressable, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { BrandMark } from "@/components/ui/brand-mark";
import { Button } from "@/components/ui/button";
import { useAppTheme } from "@/design/app-theme-provider";
import { radii, spacing } from "@/design/tokens";
import { useResponsive } from "@/design/responsive";
import { navItems, type NavItem } from "@/navigation/nav-items";

function isNavItemSelected(pathname: string, item: NavItem) {
  return (
    pathname === item.href ||
    pathname.startsWith(`${item.href}/`) ||
    (item.href === "/library" &&
      (pathname.startsWith("/book/") ||
        pathname.startsWith("/book-knowledge/")))
  );
}

type ShellNavItemProps = {
  item: NavItem;
  selected: boolean;
  compact?: boolean;
  compactSize?: "phone" | "tablet";
  useAnimatedIndicator?: boolean;
};

const ShellNavItem = memo(function ShellNavItem({
  item,
  selected,
  compact,
  compactSize = "tablet",
  useAnimatedIndicator,
}: ShellNavItemProps) {
  const { colors } = useAppTheme();
  const router = useRouter();
  const Icon = item.icon;
  const tabId = `tab-${item.label.toLowerCase()}`;

  if (compact) {
    const phoneCompact = compactSize === "phone";
    const activeSize = phoneCompact ? 40 : 58;
    const inactiveSize = phoneCompact ? 28 : 42;
    const activeLift = phoneCompact ? -14 : -18;
    const inactiveLift = phoneCompact ? 0 : -3;
    const selectedLabelOffset = phoneCompact ? -8 : -13;

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
          minHeight: phoneCompact ? 54 : 82,
          flex: 1,
          minWidth: 0,
          alignItems: "center",
          justifyContent: "center",
          opacity: pressed ? 0.72 : 1,
          zIndex: 1,
        })}
      >
        <View
          style={{
            width: selected ? activeSize : inactiveSize,
            height: selected ? activeSize : inactiveSize,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radii.pill,
            borderWidth:
              selected && !useAnimatedIndicator ? (phoneCompact ? 3 : 6) : 0,
            borderColor: colors.background.base,
            backgroundColor:
              selected && !useAnimatedIndicator
                ? colors.brand.violet
                : "transparent",
            transform: [{ translateY: selected ? activeLift : inactiveLift }],
          }}
        >
          <Icon
            color={selected ? "#FFFFFF" : colors.text.secondary}
            size={phoneCompact ? (selected ? 19 : 18) : selected ? 25 : 24}
            strokeWidth={selected ? 2.25 : 2}
          />
        </View>
        <AppText
          color={selected ? colors.text.primary : colors.text.tertiary}
          variant="caption"
          weight={selected ? "semibold" : "medium"}
          numberOfLines={1}
          style={{
            marginTop: selected ? selectedLabelOffset : phoneCompact ? -2 : -3,
            fontSize: phoneCompact ? 10.5 : 12,
            lineHeight: phoneCompact ? 13 : undefined,
            maxWidth: 78,
          }}
        >
          {item.label}
        </AppText>
      </Pressable>
    );
  }

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
        minHeight: 46,
        width: "100%",
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: spacing[3],
        borderRadius: radii.lg,
        borderCurve: "continuous",
        borderWidth: 0,
        borderColor: selected ? colors.border.strong : "transparent",
        backgroundColor: selected ? colors.background.panel : "transparent",
        paddingHorizontal: spacing[4],
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <Icon
        color={selected ? colors.text.primary : colors.text.tertiary}
        size={20}
        strokeWidth={2.1}
      />
      <AppText
        color={selected ? colors.text.primary : colors.text.tertiary}
        variant="caption"
        weight={selected ? "semibold" : "medium"}
        numberOfLines={1}
      >
        {item.label}
      </AppText>
    </Pressable>
  );
});

function Sidebar({ width }: { width: number }) {
  const { colors } = useAppTheme();
  const pathname = usePathname();

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
          <ShellNavItem
            key={item.label}
            item={item}
            selected={isNavItemSelected(pathname, item)}
          />
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
  const { colors } = useAppTheme();
  const phoneCompact = responsive.isPhone;
  const pathname = usePathname();
  const activeIndex = Math.max(
    0,
    navItems.findIndex((item) => isNavItemSelected(pathname, item))
  );
  const navWidth = Math.min(responsive.pageWidth, phoneCompact ? 336 : 430);
  const navPaddingHorizontal = phoneCompact ? spacing[1] : spacing[3];
  const indicatorTrackWidth = navWidth - navPaddingHorizontal * 2;
  const itemWidth = indicatorTrackWidth / navItems.length;
  const activeSize = phoneCompact ? 40 : 58;
  const indicatorX = useRef(
    new Animated.Value(activeIndex * itemWidth)
  ).current;
  const showBottomNav = navItems.some(
    (item) =>
      pathname === item.href ||
      (item.href === "/folders" && pathname.startsWith("/folders/"))
  );

  useEffect(() => {
    Animated.timing(indicatorX, {
      toValue: activeIndex * itemWidth,
      duration: 280,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [activeIndex, indicatorX, itemWidth]);

  if (!showBottomNav) {
    return null;
  }

  return (
    <View
      style={{
        backgroundColor: colors.background.base,
        paddingHorizontal: phoneCompact ? spacing[4] : spacing[5],
        paddingTop: phoneCompact ? 0 : spacing[2],
        paddingBottom: phoneCompact ? 0 : spacing[2],
      }}
    >
      <View
        style={{
          width: navWidth,
          height: phoneCompact ? 58 : 88,
          alignSelf: "center",
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-around",
          borderRadius: phoneCompact ? 24 : 34,
          borderCurve: "continuous",
          backgroundColor: colors.background.panel,
          paddingHorizontal: navPaddingHorizontal,
          boxShadow: phoneCompact
            ? "0 10px 24px rgba(0, 0, 0, 0.34)"
            : "0 14px 34px rgba(0, 0, 0, 0.36)",
        }}
      >
        <Animated.View
          pointerEvents="none"
          style={{
            position: "absolute",
            left: navPaddingHorizontal + (itemWidth - activeSize) / 2,
            top: phoneCompact ? -5 : -3,
            width: activeSize,
            height: activeSize,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radii.pill,
            borderWidth: phoneCompact ? 3 : 6,
            borderColor: colors.background.base,
            backgroundColor: colors.brand.violet,
            transform: [{ translateX: indicatorX }],
            zIndex: 0,
          }}
        />
        {navItems.map((item) => (
          <ShellNavItem
            key={item.label}
            item={item}
            selected={isNavItemSelected(pathname, item)}
            compact
            compactSize={phoneCompact ? "phone" : "tablet"}
            useAnimatedIndicator
          />
        ))}
      </View>
    </View>
  );
}

export function AdaptiveAppShell({ children }: PropsWithChildren) {
  const responsive = useResponsive();
  const { colors } = useAppTheme();

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
