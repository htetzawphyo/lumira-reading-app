import { X } from "lucide-react-native";
import { useCallback, useEffect } from "react";
import {
  FlatList,
  Pressable,
  useWindowDimensions,
  View,
  type ListRenderItemInfo,
} from "react-native";
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { colors, radii, spacing } from "@/design/tokens";
import type { EpubChapter } from "@/features/reader/epub-parser";

type ReaderSurface = {
  background: string;
  text: string;
  chrome: string;
  border: string;
};

type ChapterListPanelProps = {
  visible: boolean;
  chapters: EpubChapter[];
  currentIndex: number;
  surface: ReaderSurface;
  onClose: () => void;
  onSelectChapter: (chapterIndex: number) => void;
};

export function ChapterListPanel({
  visible,
  chapters,
  currentIndex,
  surface,
  onClose,
  onSelectChapter,
}: ChapterListPanelProps) {
  const { width, height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const panelWidth = Math.min(
    width >= 768 ? 420 : 360,
    Math.round(width * 0.86)
  );
  const progress = useSharedValue(visible ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(visible ? 1 : 0, {
      duration: visible ? 280 : 220,
      easing: visible ? Easing.out(Easing.cubic) : Easing.in(Easing.cubic),
    });
  }, [progress, visible]);

  const backdropAnimatedStyle = useAnimatedStyle(() => ({
    opacity: progress.value,
  }));

  const panelAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: (1 - progress.value) * panelWidth }],
  }));

  const renderChapter = useCallback(
    ({ item: chapter, index }: ListRenderItemInfo<EpubChapter>) => {
      const active = index === currentIndex;
      const title = chapter.title?.trim() || `Chapter ${index + 1}`;

      return (
        <Pressable
          accessibilityRole="button"
          accessibilityState={{ selected: active }}
          accessibilityLabel={`Open ${title}`}
          onPress={() => {
            onSelectChapter(index);
            onClose();
          }}
          style={({ pressed }) => ({
            minHeight: 48,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[3],
            borderRadius: radii.lg,
            borderWidth: 1,
            borderColor: active ? colors.brand.violet : surface.border,
            backgroundColor: active ? colors.brand.violet : surface.chrome,
            paddingHorizontal: spacing[3],
            paddingVertical: spacing[3],
            opacity: pressed ? 0.76 : 1,
          })}
        >
          <View
            style={{
              width: 28,
              height: 28,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.pill,
              backgroundColor: active
                ? "rgba(255,255,255,0.18)"
                : "rgba(255,255,255,0.08)",
            }}
          >
            <AppText
              color={active ? "#FFFFFF" : surface.text}
              variant="caption"
              weight="semibold"
              style={{ opacity: active ? 1 : 0.78 }}
            >
              {index + 1}
            </AppText>
          </View>
          <AppText
            color={active ? "#FFFFFF" : surface.text}
            variant="footnote"
            weight={active ? "semibold" : "medium"}
            numberOfLines={2}
            style={{ flex: 1, lineHeight: 23 }}
          >
            {title}
          </AppText>
        </Pressable>
      );
    },
    [
      currentIndex,
      onClose,
      onSelectChapter,
      surface.border,
      surface.chrome,
      surface.text,
    ]
  );

  return (
    <View
      pointerEvents={visible ? "box-none" : "none"}
      style={{
        position: "absolute",
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
        zIndex: 40,
        elevation: 40,
        flexDirection: "row",
        justifyContent: "flex-end",
      }}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          {
            position: "absolute",
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            backgroundColor: "rgba(0, 0, 0, 0.28)",
          },
          backdropAnimatedStyle,
        ]}
      />
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Close chapter list"
        onPress={onClose}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
        }}
      />
      <Animated.View
        style={[
          {
            width: panelWidth,
            maxWidth: "92%",
            minHeight: height,
            borderLeftWidth: 1,
            borderLeftColor: surface.border,
            backgroundColor: surface.background,
            paddingTop: insets.top + spacing[4],
            paddingBottom: Math.max(insets.bottom, spacing[5]),
            marginRight: Math.max(
              insets.right,
              width > height ? spacing[4] : 0
            ),
            paddingHorizontal: spacing[4],
            boxShadow: "0 18px 36px rgba(0, 0, 0, 0.28)",
          },
          panelAnimatedStyle,
        ]}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: spacing[3],
            paddingBottom: spacing[4],
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText color={surface.text} variant="title3" weight="semibold">
              Chapters
            </AppText>
            <AppText
              color={surface.text}
              variant="caption"
              style={{ opacity: 0.68 }}
            >
              {chapters.length} {chapters.length === 1 ? "chapter" : "chapters"}
            </AppText>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close chapters"
            onPress={onClose}
            style={({ pressed }) => ({
              width: 40,
              height: 40,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: surface.border,
              backgroundColor: surface.chrome,
              opacity: pressed ? 0.72 : 1,
            })}
          >
            <X color={surface.text} size={18} strokeWidth={2.2} />
          </Pressable>
        </View>

        <FlatList
          data={chapters}
          keyExtractor={(chapter, index) => `${chapter.id}-${index}`}
          renderItem={renderChapter}
          showsVerticalScrollIndicator={false}
          ItemSeparatorComponent={() => <View style={{ height: spacing[2] }} />}
          contentContainerStyle={{ paddingBottom: spacing[5] }}
          initialNumToRender={8}
          maxToRenderPerBatch={6}
          windowSize={5}
          removeClippedSubviews
        />
      </Animated.View>
    </View>
  );
}
