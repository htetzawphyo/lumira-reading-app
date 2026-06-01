import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

import { breakpoints } from "@/design/tokens";

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const orientation = width >= height ? "landscape" : "portrait";

    return {
      width,
      height,
      isPhone: width < breakpoints.tablet,
      isTablet: width >= breakpoints.tablet,
      isLargeTablet: width >= breakpoints.tabletLandscape,
      orientation,
    } as const;
  }, [height, width]);
}
