import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

import { breakpoints, spacing } from "@/design/tokens";

export type DeviceClass =
  | "phone"
  | "largePhone"
  | "tabletPortrait"
  | "tabletLandscape"
  | "desktop";

export function getDeviceClass(width: number, height: number): DeviceClass {
  const landscape = width > height;

  if (width >= breakpoints.desktop) {
    return "desktop";
  }

  if (width >= breakpoints.tabletLandscape && landscape) {
    return "tabletLandscape";
  }

  if (width >= breakpoints.tablet) {
    return "tabletPortrait";
  }

  if (width >= breakpoints.largePhone) {
    return "largePhone";
  }

  return "phone";
}

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const deviceClass = getDeviceClass(width, height);
    const isLandscape = width > height;
    const isPhone = width < breakpoints.tablet;
    const isTablet = width >= breakpoints.tablet;
    const isTabletPortrait = isTablet && !isLandscape;
    const isTabletLandscape = width >= breakpoints.tabletLandscape && isLandscape;
    const useSidebar = isTabletLandscape || width >= breakpoints.desktop;
    const gutter = width >= breakpoints.desktop
      ? spacing[10]
      : isTablet
        ? spacing[8]
        : spacing[5];
    const contentWidth = Math.max(0, width - gutter * 2);
    const libraryColumns = isPhone ? 3 : 5;

    return {
      width,
      height,
      deviceClass,
      isPhone,
      isTablet,
      isTabletPortrait,
      isTabletLandscape,
      isLandscape,
      useSidebar,
      gutter,
      contentWidth,
      libraryColumns,
      maxContentWidth: width >= breakpoints.desktop ? 1200 : 960,
      sidebarWidth: width >= breakpoints.desktop ? 280 : 248,
    };
  }, [height, width]);
}
