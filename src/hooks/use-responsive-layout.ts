import { useMemo } from "react";
import { useWindowDimensions } from "react-native";

export function useResponsiveLayout() {
  const { width, height } = useWindowDimensions();

  return useMemo(() => {
    const orientation = width >= height ? "landscape" : "portrait";

    return {
      width,
      height,
      isPhone: width < 768,
      isTablet: width >= 768,
      isLargeTablet: width >= 1024,
      orientation,
    } as const;
  }, [height, width]);
}
