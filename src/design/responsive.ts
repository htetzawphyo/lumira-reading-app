import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

import { breakpoints, controls, layout, spacing, touch } from "@/design/tokens";

export type DeviceClass =
  | "smallPhone"
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

  if (width < breakpoints.smallPhone) {
    return "smallPhone";
  }

  return "phone";
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

export function useResponsive() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const deviceClass = getDeviceClass(width, height);
    const isLandscape = width > height;
    const isPhone = width < breakpoints.tablet;
    const isSmallPhone = width < breakpoints.smallPhone;
    const isLargePhone = width >= breakpoints.largePhone && isPhone;
    const isTablet = width >= breakpoints.tablet;
    const isTabletPortrait = isTablet && !isLandscape;
    const isTabletLandscape =
      width >= breakpoints.tabletLandscape && isLandscape;
    const useSidebar = isTabletLandscape || width >= breakpoints.desktop;
    const gutter =
      width >= breakpoints.desktop
        ? spacing[10]
        : isTablet
        ? spacing[8]
        : isSmallPhone
        ? spacing[4]
        : spacing[5];
    const contentWidth = Math.max(0, width - gutter * 2);
    const maxContentWidth =
      width >= breakpoints.desktop
        ? layout.desktopMaxWidth
        : isTablet
        ? layout.tabletMaxWidth
        : layout.phoneMaxWidth;
    const pageWidth = Math.min(contentWidth, maxContentWidth);
    const libraryColumns = isPhone ? 3 : 5;
    const gridGap = isPhone
      ? isSmallPhone
        ? spacing[2]
        : spacing[3]
      : spacing[4];
    const rowGap = isPhone ? spacing[5] : spacing[6];
    const readerMaxWidth = isTablet
      ? layout.readerTabletMaxWidth
      : layout.readerPhoneMaxWidth;
    const bottomInsetPadding = useSidebar ? gutter : spacing[18];
    const listBatchSize = isPhone ? libraryColumns * 4 : libraryColumns * 3;

    return {
      width,
      height,
      deviceClass,
      isSmallPhone,
      isPhone,
      isLargePhone,
      isTablet,
      isTabletPortrait,
      isTabletLandscape,
      isLandscape,
      useSidebar,
      gutter,
      contentWidth,
      pageWidth,
      libraryColumns,
      gridGap,
      rowGap,
      touchTarget: touch.min,
      comfortableTouchTarget: touch.comfortable,
      inputHeight: isPhone ? controls.inputCompactHeight : controls.inputHeight,
      rowHeight: isPhone ? controls.rowCompactHeight : controls.rowHeight,
      bottomInsetPadding,
      readerMaxWidth,
      knowledgeMaxWidth: layout.knowledgeMaxWidth,
      settingsMaxWidth: layout.settingsTabletMaxWidth,
      maxContentWidth,
      sidebarWidth: width >= breakpoints.desktop ? 280 : 248,
      readableLineWidth: clamp(width - gutter * 2, 300, readerMaxWidth),
      listPerformance: {
        initialNumToRender: listBatchSize,
        maxToRenderPerBatch: listBatchSize,
        updateCellsBatchingPeriod: isPhone ? 48 : 32,
        windowSize: isPhone ? 7 : 9,
        removeClippedSubviews: true,
      },
    };
  }, [height, width]);
}
