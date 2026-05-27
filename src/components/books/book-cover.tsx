import { Image } from "expo-image";
import { BookOpen } from "lucide-react-native";
import { View } from "react-native";

import { colors, radii } from "@/design/tokens";

type BookCoverProps = {
  uri?: string | null;
  accent?: string;
  compact?: boolean;
  progress?: number;
};

export function BookCover({ uri, accent = "#FFFFFF", compact, progress }: BookCoverProps) {
  return (
    <View
      style={{
        width: "100%",
        aspectRatio: 0.68,
        overflow: "hidden",
        borderRadius: compact ? 14 : 18,
        borderCurve: "continuous",
        backgroundColor: colors.background.panelStrong,
        borderWidth: 1,
        borderColor: colors.border.default,
      }}
    >
      {uri ? (
        <Image
          source={{ uri }}
          style={{ flex: 1 }}
          contentFit="cover"
          transition={180}
        />
      ) : (
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: colors.background.panelStrong,
          }}
        >
          <BookOpen color={colors.brand.violet} size={compact ? 28 : 42} strokeWidth={1.8} />
        </View>
      )}
      <View
        style={{
          position: "absolute",
          left: compact ? 8 : 18,
          right: compact ? 8 : 18,
          bottom: compact ? 8 : 16,
          height: compact ? 4 : 5,
          overflow: "hidden",
          borderRadius: radii.pill,
          backgroundColor: compact ? accent : "rgba(255, 255, 255, 0.28)",
        }}
      >
        {typeof progress === "number" ? (
          <View
            style={{
              width: `${progress}%`,
              height: "100%",
              borderRadius: radii.pill,
              backgroundColor: accent,
            }}
          />
        ) : null}
      </View>
    </View>
  );
}
