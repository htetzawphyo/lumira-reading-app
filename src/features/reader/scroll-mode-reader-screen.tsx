import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { useLocalSearchParams, useRouter } from "expo-router";
import { setStatusBarHidden, StatusBar } from "expo-status-bar";
import { AlertCircle, ChevronLeft, List, Lock, Settings2 } from "lucide-react-native";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { WebView, type WebViewMessageEvent } from "react-native-webview";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { InlineStatus } from "@/components/ui/inline-status";
import { ReaderSkeleton } from "@/components/ui/skeleton";
import {
  defaultReaderFontFamily,
  getReaderFontCss,
} from "@/design/fonts";
import { colors, radii, spacing } from "@/design/tokens";
import { useBooksStore } from "@/features/books/books-store";
import type { ReaderSettings, ReaderTheme } from "@/features/books/types";
import { ChapterListPanel } from "@/features/reader/chapter-list-panel";
import {
  loadEpubDocument,
  type EpubDocument,
  type EpubRenderedChapter,
} from "@/features/reader/epub-parser";
import {
  canUseReaderTheme,
  getReaderThemeSurface,
  isDarkReaderTheme,
  readerThemeOptions,
} from "@/features/reader/reader-theme-options";
import {
  annotationsForChapter,
  buildApplyAnnotationsScript,
  buildScrollToOffsetScript,
  type ReaderSelection,
} from "@/features/reader/reader-annotations";
import { ReaderFontSelector } from "@/features/reader/reader-font-selector";

type WebViewReaderMessage =
  | {
      type: "scroll";
      scrollProgress: number;
      atTop: boolean;
      atEnd: boolean;
    }
  | {
      type: "scrollStart" | "tap" | "ready";
    }
  | {
      type: "selection";
      selectedText: string;
      startOffset: number;
      endOffset: number;
      rect?: { top: number; left: number; width: number; height: number };
    }
  | {
      type: "selectionAction";
      action: "highlight" | "note" | "copy";
      selectedText: string;
      startOffset: number;
      endOffset: number;
      rect?: { top: number; left: number; width: number; height: number };
    };

const clamp = (value: number, min: number, max: number) =>
  Math.min(Math.max(value, min), max);
const keepAwakeTag = "lumira-scroll-reader";

function parseCurrentLocation(value?: string | null) {
  if (!value) {
    return {
      chapterIndex: 0,
      scrollProgress: 0,
    };
  }

  try {
    const parsed = JSON.parse(value) as {
      chapterIndex?: unknown;
      scrollProgress?: unknown;
    };

    return {
      chapterIndex:
        typeof parsed.chapterIndex === "number"
          ? Math.max(0, parsed.chapterIndex)
          : 0,
      scrollProgress:
        typeof parsed.scrollProgress === "number"
          ? Math.min(Math.max(parsed.scrollProgress, 0), 1)
          : 0,
    };
  } catch {
    return {
      chapterIndex: 0,
      scrollProgress: 0,
    };
  }
}

function overallProgress(
  chapterIndex: number,
  chapterCount: number,
  scrollProgress: number
) {
  if (chapterCount <= 0) {
    return 0;
  }

  return clamp((chapterIndex + scrollProgress) / chapterCount, 0, 1);
}

function themeSurface(theme: ReaderTheme, highContrast = false) {
  return getReaderThemeSurface(theme, highContrast);
}

function readerCssPayload(settings: ReaderSettings) {
  const surface = themeSurface(settings.theme, settings.musicianHighContrast);
  const fontSize = settings.fontSize + (settings.musicianExtraLargeText ? 4 : 0);

  return {
    colorScheme:
      isDarkReaderTheme(settings.theme) || settings.musicianHighContrast
        ? "dark"
        : "light",
    backgroundColor: surface.background,
    textColor: surface.text,
    headingColor: surface.text,
    linkColor: settings.musicianHighContrast
      ? surface.text
      : isDarkReaderTheme(settings.theme)
      ? "#C4A7FF"
      : colors.brand.violet,
    fontSize,
    fontFamily: getReaderFontCss(settings.readerFontFamily),
    lineHeight: settings.lineHeight,
    paddingX: 24,
    paddingY: 28,
    contentWidth: settings.contentWidth,
  };
}

function buildReaderSettingsScript(settings: ReaderSettings) {
  const payload = JSON.stringify(readerCssPayload(settings)).replace(
    /</g,
    "\\u003c"
  );

  return `
    if (window.__setReaderSettings) {
      window.__setReaderSettings(${payload});
    }
    true;
  `;
}

function buildScrollScript(initialScrollProgress: number) {
  const safeProgress = clamp(initialScrollProgress, 0, 1);

  return `
    (function () {
      var restoreProgress = ${safeProgress};
      var lastSent = 0;
      var lastProgress = -1;
      var lastAtTop = null;
      var lastAtEnd = null;
      var lastScrollStartSent = 0;
      var lastTapSent = 0;
      var scrollEndTimer = null;
      var touchMoved = false;
      var touchStartX = 0;
      var touchStartY = 0;
      var touchStartAt = 0;

      function post(payload) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }

      function sendScrollStart() {
        var now = Date.now();

        if (now - lastScrollStartSent < 240) {
          return;
        }

        lastScrollStartSent = now;
        post({ type: "scrollStart" });
      }

      function sendTap() {
        var now = Date.now();

        if (now - lastTapSent < 350) {
          return;
        }

        var selection = window.getSelection && window.getSelection();
        if (selection && String(selection.toString() || "").trim()) {
          return;
        }

        lastTapSent = now;
        post({ type: "tap" });
      }

      function getMetrics() {
        var scrollTop = window.scrollY || document.documentElement.scrollTop || document.body.scrollTop || 0;
        var scrollHeight = Math.max(
          document.documentElement.scrollHeight || 0,
          document.body.scrollHeight || 0
        );
        var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
        var maxScroll = Math.max(scrollHeight - viewportHeight, 1);
        var progress = Math.min(Math.max(scrollTop / maxScroll, 0), 1);
        var atTop = scrollTop <= 24 || progress <= 0.015;
        var atEnd = progress >= 0.985 || scrollTop + viewportHeight >= scrollHeight - 24;

        return {
          type: "scroll",
          scrollProgress: progress,
          atTop: atTop,
          atEnd: atEnd
        };
      }

      function send(force) {
        var now = Date.now();
        var payload = getMetrics();
        var boundaryChanged = payload.atTop !== lastAtTop || payload.atEnd !== lastAtEnd;

        if (!force && !boundaryChanged && now - lastSent < 700 && Math.abs(payload.scrollProgress - lastProgress) < 0.015) {
          return;
        }

        lastSent = now;
        lastProgress = payload.scrollProgress;
        lastAtTop = payload.atTop;
        lastAtEnd = payload.atEnd;
        post(payload);
      }

      function restore() {
        var scrollHeight = Math.max(
          document.documentElement.scrollHeight || 0,
          document.body.scrollHeight || 0
        );
        var viewportHeight = window.innerHeight || document.documentElement.clientHeight || 1;
        var maxScroll = Math.max(scrollHeight - viewportHeight, 0);

        window.scrollTo(0, maxScroll * restoreProgress);
        setTimeout(function () { send(true); }, 120);
      }

      function restoreAndReveal() {
        restore();
        setTimeout(function () {
          send(true);
          post({ type: "ready" });
        }, 80);
      }

      window.addEventListener("scroll", function () {
        sendScrollStart();
        send(false);
        if (scrollEndTimer) {
          clearTimeout(scrollEndTimer);
        }
        scrollEndTimer = setTimeout(function () { send(true); }, 140);
      }, { passive: true });
      window.addEventListener("resize", function () { send(true); });
      window.addEventListener("touchstart", function (event) {
        var touch = event.touches && event.touches[0];
        touchMoved = false;
        touchStartX = touch ? touch.clientX : 0;
        touchStartY = touch ? touch.clientY : 0;
        touchStartAt = Date.now();
      }, { passive: true });
      window.addEventListener("touchmove", function (event) {
        var touch = event.touches && event.touches[0];

        if (!touch) {
          return;
        }

        if (Math.abs(touch.clientX - touchStartX) > 8 || Math.abs(touch.clientY - touchStartY) > 8) {
          touchMoved = true;
        }
      }, { passive: true });
      window.addEventListener("touchend", function () {
        var pressDuration = Date.now() - touchStartAt;

        if (!touchMoved && pressDuration < 420) {
          sendTap();
        } else {
          setTimeout(function () { send(true); }, 90);
        }
      }, { passive: true });
      window.addEventListener("click", function () {
        var selection = window.getSelection && window.getSelection();
        if (selection && String(selection.toString() || "").trim()) {
          return;
        }

        if (Date.now() - lastTapSent > 350) {
          sendTap();
        }
      });
      setTimeout(restore, 60);
      setTimeout(restore, 180);
      setTimeout(restoreAndReveal, 320);
      setTimeout(function () { post({ type: "ready" }); }, 760);
    })();
    true;
  `;
}

function ReaderLoading({ message }: { message: string }) {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        gap: spacing[5],
        padding: spacing[6],
      }}
    >
      <InlineStatus tone="loading" message={message} />
      <ReaderSkeleton />
    </View>
  );
}

function ReaderError({
  title,
  body,
  onRetry,
}: {
  title: string;
  body: string;
  onRetry?: () => void;
}) {
  return (
    <View style={{ flex: 1, justifyContent: "center", padding: spacing[6] }}>
      <EmptyState icon={AlertCircle} title={title} body={body} />
      {onRetry ? (
        <Button
          title="Try Again"
          variant="secondary"
          onPress={onRetry}
          style={{ alignSelf: "center", marginTop: spacing[5] }}
        />
      ) : null}
    </View>
  );
}

function SettingStepper({
  title,
  value,
  onDecrease,
  onIncrease,
}: {
  title: string;
  value: string;
  onDecrease: () => void;
  onIncrease: () => void;
}) {
  return (
    <View
      style={{
        minHeight: 46,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing[4],
      }}
    >
      <View
        style={{
          flex: 1,
          flexDirection: "row",
          alignItems: "baseline",
          gap: spacing[2],
          minWidth: 0,
        }}
      >
        <AppText color="primary" variant="body" weight="semibold">
          {title}
        </AppText>
        <AppText color="secondary" variant="footnote" numberOfLines={1}>
          {value}
        </AppText>
      </View>
      <View style={{ flexDirection: "row", gap: spacing[2] }}>
        <Button
          title="-"
          variant="ghost"
          onPress={onDecrease}
          style={{ minHeight: 38, paddingHorizontal: spacing[3] }}
        />
        <Button
          title="+"
          variant="ghost"
          onPress={onIncrease}
          style={{ minHeight: 38, paddingHorizontal: spacing[3] }}
        />
      </View>
    </View>
  );
}

function ToggleRow({
  title,
  value,
  onChange,
}: {
  title: string;
  value: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={({ pressed }) => ({
        minHeight: 46,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing[4],
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <AppText color="primary" variant="body" weight="semibold">
        {title}
      </AppText>
      <View
        style={{
          width: 50,
          height: 30,
          justifyContent: "center",
          borderRadius: radii.pill,
          backgroundColor: value
            ? colors.brand.violet
            : colors.background.panelStrong,
          paddingHorizontal: 3,
        }}
      >
        <View
          style={{
            width: 24,
            height: 24,
            alignSelf: value ? "flex-end" : "flex-start",
            borderRadius: radii.pill,
            backgroundColor: colors.text.primary,
          }}
        />
      </View>
    </Pressable>
  );
}

function NoteEditorModal({
  visible,
  initialValue = "",
  title = "Add Note",
  onClose,
  onSave,
}: {
  visible: boolean;
  initialValue?: string;
  title?: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, spacing[8]);

  useEffect(() => {
    setValue(initialValue);
  }, [initialValue, visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
        style={{
          flex: 1,
        }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0, 0, 0, 0.42)",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close note editor"
            onPress={onClose}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <ScrollView
            bounces={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "flex-end",
              paddingTop: spacing[6],
            }}
          >
            <View
              style={{
                maxHeight: height * 0.78,
                gap: spacing[4],
                borderTopLeftRadius: radii.xxl,
                borderTopRightRadius: radii.xxl,
                borderWidth: 1,
                borderColor: colors.border.subtle,
                backgroundColor: colors.background.elevated,
                padding: spacing[5],
                paddingBottom: spacing[5] + bottomInset,
              }}
            >
              <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing[3] }}>
                <AppText color="primary" variant="title3" weight="semibold">
                  {title}
                </AppText>
                <Button title="Cancel" variant="ghost" onPress={onClose} style={{ minHeight: 36 }} />
              </View>
              <TextInput
                value={value}
                onChangeText={setValue}
                placeholder="Write a note..."
                placeholderTextColor={colors.text.muted}
                multiline
                autoFocus
                textAlignVertical="top"
                style={{
                  minHeight: 118,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: colors.border.subtle,
                  backgroundColor: colors.background.panel,
                  color: colors.text.primary,
                  padding: spacing[4],
                  fontSize: 16,
                  lineHeight: 22,
                }}
              />
              <Button
                title="Save Note"
                variant="secondary"
                fullWidth
                onPress={() => onSave(value.trim())}
                disabled={!value.trim()}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function ReaderSettingsModal({
  visible,
  settings,
  onClose,
  onReset,
  onUpdate,
}: {
  visible: boolean;
  settings: ReaderSettings;
  onClose: () => void;
  onReset: () => void;
  onUpdate: (settings: Partial<ReaderSettings>) => void;
}) {
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const slideProgress = useRef(new Animated.Value(1)).current;
  const isLandscape = width > height;
  const isTabletWidth = width >= 768;
  const sideSheetWidth = Math.min(420, Math.max(320, width * 0.35));
  const safeBottomInset = Math.max(insets.bottom, spacing[8]);
  const safeRightInset = Math.max(insets.right, isLandscape ? spacing[5] : 0);
  const scrollContentBottomPadding =
    spacing[3] + (isLandscape ? safeBottomInset : 0);
  const portraitMaxHeight = Math.round(
    Math.min(height * (isTabletWidth ? 0.44 : 0.56), height - insets.top - spacing[6])
  );
  const panelOffset = slideProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, isLandscape ? sideSheetWidth : 28],
  });

  useEffect(() => {
    if (!visible) {
      return;
    }

    slideProgress.setValue(1);
    Animated.timing(slideProgress, {
      toValue: 0,
      duration: 180,
      useNativeDriver: true,
    }).start();
  }, [slideProgress, visible]);

  const panelStyle = isLandscape
    ? {
        width: sideSheetWidth,
        height: "100%" as const,
        borderTopLeftRadius: radii.xxl,
        borderBottomLeftRadius: radii.xxl,
        paddingTop: insets.top + spacing[4],
        paddingBottom: safeBottomInset + spacing[4],
        marginRight: safeRightInset,
        paddingHorizontal: spacing[5],
      }
    : {
        width: "100%" as const,
        maxWidth: isTabletWidth ? 560 : undefined,
        maxHeight: portraitMaxHeight,
        alignSelf: isTabletWidth ? ("center" as const) : ("stretch" as const),
        borderTopLeftRadius: radii.xxl,
        borderTopRightRadius: radii.xxl,
        paddingTop: spacing[4],
        paddingBottom: safeBottomInset + spacing[4],
        paddingHorizontal: spacing[5],
      };
  const animatedStyle = isLandscape
    ? { transform: [{ translateX: panelOffset }] }
    : { transform: [{ translateY: panelOffset }] };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View
        style={{
          flex: 1,
          justifyContent: isLandscape ? "center" : "flex-end",
          alignItems: isLandscape ? "flex-end" : "stretch",
          backgroundColor: "rgba(0, 0, 0, 0.42)",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close reader settings"
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
          style={{
            ...panelStyle,
            backgroundColor: colors.background.elevated,
            borderWidth: 1,
            borderColor: colors.border.subtle,
            ...animatedStyle,
          }}
        >
          <View
            style={
              isLandscape ? { flex: 1, gap: spacing[4] } : { gap: spacing[4] }
            }
          >
            <ScrollView
              bounces={false}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={
                isLandscape
                  ? { flex: 1 }
                  : {
                      maxHeight:
                        portraitMaxHeight - safeBottomInset - spacing[18],
                    }
              }
              contentContainerStyle={{
                gap: spacing[4],
                paddingBottom: scrollContentBottomPadding,
              }}
              keyboardShouldPersistTaps="always"
            >
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "flex-start",
                  justifyContent: "space-between",
                  gap: spacing[4],
                }}
              >
                <View style={{ flex: 1, gap: spacing[1] }}>
                  <AppText color="primary" variant="title3" weight="semibold">
                    Adjust
                  </AppText>
                  <AppText color="secondary" variant="footnote">
                    Changes apply instantly.
                  </AppText>
                </View>
                <Button
                  title="Done"
                  variant="ghost"
                  onPress={onClose}
                  style={{ minHeight: 38, paddingHorizontal: spacing[3] }}
                />
              </View>

              <View style={{ gap: spacing[3] }}>
                <AppText color="secondary" variant="footnote" weight="semibold">
                  Background
                </AppText>
                <ScrollView
                  horizontal
                  bounces={false}
                  nestedScrollEnabled
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ gap: spacing[2], paddingRight: spacing[1] }}
                >
                  {readerThemeOptions.map((option) => {
                    const selected = settings.theme === option.value;
                    const canUseTheme = canUseReaderTheme(option.value, false);

                    return (
                      <Pressable
                        key={option.value}
                        accessibilityRole="button"
                        accessibilityState={{ selected, disabled: !canUseTheme }}
                        disabled={!canUseTheme}
                        onPress={() => onUpdate({ theme: option.value })}
                        style={({ pressed }) => ({
                          width: 86,
                          minHeight: 68,
                          alignItems: "center",
                          justifyContent: "center",
                          gap: spacing[2],
                          borderRadius: radii.lg,
                          borderCurve: "continuous",
                          borderWidth: 1,
                          borderColor: selected
                            ? colors.brand.violet
                            : colors.border.subtle,
                          backgroundColor: selected
                            ? "rgba(139, 92, 246, 0.16)"
                            : colors.background.panel,
                          opacity: !canUseTheme ? 0.56 : pressed ? 0.72 : 1,
                          paddingHorizontal: spacing[2],
                        })}
                      >
                        <View
                          style={{
                            width: 30,
                            height: 30,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: radii.pill,
                            borderWidth: 1,
                            borderColor: colors.border.subtle,
                            backgroundColor: option.background,
                          }}
                        >
                          <AppText color={option.text} variant="caption" weight="bold">
                            Aa
                          </AppText>
                        </View>
                        <View
                          style={{
                            maxWidth: "100%",
                            flexDirection: "row",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: spacing[1],
                          }}
                        >
                          {!canUseTheme ? (
                            <Lock
                              color={colors.text.tertiary}
                              size={10}
                              strokeWidth={2.2}
                            />
                          ) : null}
                          <AppText
                            color={selected ? "primary" : "secondary"}
                            variant="caption"
                            weight="semibold"
                            numberOfLines={1}
                          >
                            {option.label}
                          </AppText>
                        </View>
                      </Pressable>
                    );
                  })}
                </ScrollView>
              </View>

              <ReaderFontSelector
                selectedFont={settings.readerFontFamily}
                onSelect={(readerFontFamily) => onUpdate({ readerFontFamily })}
              />

              <SettingStepper
                title="Font Size"
                value={`${Math.round(settings.fontSize)} px`}
                onDecrease={() => onUpdate({ fontSize: settings.fontSize - 1 })}
                onIncrease={() => onUpdate({ fontSize: settings.fontSize + 1 })}
              />
              <SettingStepper
                title="Line Height"
                value={`${Math.round(settings.lineHeight * 100)}%`}
                onDecrease={() =>
                  onUpdate({ lineHeight: settings.lineHeight - 0.08 })
                }
                onIncrease={() =>
                  onUpdate({ lineHeight: settings.lineHeight + 0.08 })
                }
              />
              <ToggleRow
                title="Keep Screen Awake"
                value={settings.musicianKeepAwake}
                onChange={(value) => onUpdate({ musicianKeepAwake: value })}
              />
              <ToggleRow
                title="Extra-Large Text"
                value={settings.musicianExtraLargeText}
                onChange={(value) =>
                  onUpdate({ musicianExtraLargeText: value })
                }
              />
              <ToggleRow
                title="High Contrast"
                value={settings.musicianHighContrast}
                onChange={(value) => onUpdate({ musicianHighContrast: value })}
              />
            </ScrollView>
            <Button
              title="Restore to Defaults"
              variant="ghost"
              onPress={onReset}
              style={{
                minHeight: 42,
                alignSelf: "stretch",
                borderColor: colors.border.subtle,
                backgroundColor: colors.background.panel,
              }}
            />
          </View>
        </Animated.View>
      </View>
    </Modal>
  );
}

export function ScrollModeReaderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{
    bookId: string;
    chapterIndex?: string;
    offset?: string;
  }>();
  const bookId = Array.isArray(params.bookId)
    ? params.bookId[0]
    : params.bookId;
  const jumpChapterParam = Array.isArray(params.chapterIndex)
    ? params.chapterIndex[0]
    : params.chapterIndex;
  const jumpOffsetParam = Array.isArray(params.offset)
    ? params.offset[0]
    : params.offset;
  const book = useBooksStore((state) =>
    state.books.find((item) => item.id === bookId)
  );
  const selectBook = useBooksStore((state) => state.selectBook);
  const saveReadingState = useBooksStore((state) => state.saveReadingState);
  const readerSettings = useBooksStore((state) => state.readerSettings);
  const setReaderSettings = useBooksStore((state) => state.setReaderSettings);
  const getBookHighlights = useBooksStore((state) => state.getBookHighlights);
  const getBookNotes = useBooksStore((state) => state.getBookNotes);
  const createHighlight = useBooksStore((state) => state.createHighlight);
  const createNote = useBooksStore((state) => state.createNote);
  const [epubDocument, setEpubDocument] = useState<EpubDocument | null>(null);
  const [chapter, setChapter] = useState<EpubRenderedChapter | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [scrollProgress, setScrollProgress] = useState(0);
  const [atTop, setAtTop] = useState(true);
  const [atEnd, setAtEnd] = useState(false);
  const [isParsing, setIsParsing] = useState(true);
  const [isChapterLoading, setIsChapterLoading] = useState(false);
  const [chapterReloadKey, setChapterReloadKey] = useState(0);
  const [readerError, setReaderError] = useState<string | null>(null);
  const [chapterError, setChapterError] = useState<string | null>(null);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [chapterListVisible, setChapterListVisible] = useState(false);
  const [noteEditorVisible, setNoteEditorVisible] = useState(false);
  const [selection, setSelection] = useState<ReaderSelection | null>(null);
  const [bookHighlights, setBookHighlights] = useState(() =>
    bookId ? getBookHighlights(bookId) : []
  );
  const [bookNotes, setBookNotes] = useState(() =>
    bookId ? getBookNotes(bookId) : []
  );
  const [controlsVisible, setControlsVisible] = useState(false);
  const [readerContentReady, setReaderContentReady] = useState(false);
  const webViewRef = useRef<WebView>(null);
  const controlsOpacity = useRef(new Animated.Value(0)).current;
  const controlsHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const readerReadyFallbackTimerRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const controlsVisibleRef = useRef(false);
  const progressSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const flushProgressOnUnmountRef = useRef<() => void>(() => undefined);
  const pendingScrollProgressRef = useRef<number | null>(null);
  const lastScrollProgressStateAtRef = useRef(0);
  const scrollProgressStateRef = useRef(0);
  const atTopRef = useRef(true);
  const atEndRef = useRef(false);
  const readerSettingsRef = useRef(readerSettings);
  const scrollProgressRef = useRef(0);
  const activeBookId = book?.id;
  const activeFileUri = book?.fileUri;
  const initialLocation = useMemo(
    () => parseCurrentLocation(book?.currentLocation),
    [book?.id]
  );
  const jumpChapterIndex = Number.isFinite(Number(jumpChapterParam))
    ? Math.max(0, Number(jumpChapterParam))
    : undefined;
  const jumpOffset = Number.isFinite(Number(jumpOffsetParam))
    ? Math.max(0, Number(jumpOffsetParam))
    : undefined;
  const surface = themeSurface(
    readerSettings.theme,
    readerSettings.musicianHighContrast
  );
  const chapterCount = epubDocument?.chapters.length ?? 0;
  const progress = overallProgress(chapterIndex, chapterCount, scrollProgress);
  const chapterAnnotations = useMemo(
    () =>
      annotationsForChapter({
        highlights: bookHighlights,
        notes: bookNotes,
        chapterIndex,
      }),
    [bookHighlights, bookNotes, chapterIndex]
  );

  useEffect(() => {
    if (!readerSettings.musicianKeepAwake) {
      deactivateKeepAwake(keepAwakeTag).catch(() => undefined);
      return;
    }

    activateKeepAwakeAsync(keepAwakeTag).catch(() => undefined);

    return () => {
      deactivateKeepAwake(keepAwakeTag).catch(() => undefined);
    };
  }, [readerSettings.musicianKeepAwake]);

  useEffect(() => {
    setStatusBarHidden(true, "fade");

    return () => {
      if (controlsHideTimerRef.current) {
        clearTimeout(controlsHideTimerRef.current);
      }

      if (readerReadyFallbackTimerRef.current) {
        clearTimeout(readerReadyFallbackTimerRef.current);
      }

      setStatusBarHidden(false, "fade");
    };
  }, []);

  const clearControlsHideTimer = useCallback(() => {
    if (controlsHideTimerRef.current) {
      clearTimeout(controlsHideTimerRef.current);
      controlsHideTimerRef.current = null;
    }
  }, []);

  const hideControls = useCallback(() => {
    clearControlsHideTimer();
    setControlsVisible((visible) => (visible ? false : visible));
  }, [clearControlsHideTimer]);

  const showControls = useCallback(() => {
    setControlsVisible(true);
  }, []);

  const toggleControls = useCallback(() => {
    if (controlsVisibleRef.current) {
      hideControls();
      return;
    }

    showControls();
  }, [hideControls, showControls]);

  useEffect(() => {
    controlsVisibleRef.current = controlsVisible;

    Animated.timing(controlsOpacity, {
      toValue: controlsVisible ? 1 : 0,
      duration: controlsVisible ? 160 : 130,
      useNativeDriver: true,
    }).start();

    if (!controlsVisible || settingsVisible) {
      clearControlsHideTimer();
      return;
    }

    clearControlsHideTimer();
    controlsHideTimerRef.current = setTimeout(() => {
      setControlsVisible(false);
    }, 2600);
  }, [
    clearControlsHideTimer,
    controlsOpacity,
    controlsVisible,
    settingsVisible,
  ]);

  useEffect(() => {
    if (bookId) {
      selectBook(bookId);
      setBookHighlights(getBookHighlights(bookId));
      setBookNotes(getBookNotes(bookId));
    }
  }, [bookId, getBookHighlights, getBookNotes, selectBook]);

  const parseBook = useCallback(() => {
    let active = true;

    if (!activeFileUri) {
      setReaderError("This EPUB is no longer available in your local library.");
      setIsParsing(false);
      return () => {
        active = false;
      };
    }

    setIsParsing(true);
    setReaderError(null);
    setChapterError(null);
    setChapter(null);
    setEpubDocument(null);
    if (readerReadyFallbackTimerRef.current) {
      clearTimeout(readerReadyFallbackTimerRef.current);
      readerReadyFallbackTimerRef.current = null;
    }
    setReaderContentReady(false);

    loadEpubDocument(activeFileUri)
      .then((document) => {
        if (!active) {
          return;
        }

        const restoredChapterIndex = clamp(
          jumpChapterIndex ?? initialLocation.chapterIndex,
          0,
          document.chapters.length - 1
        );

        setEpubDocument(document);
        setChapterIndex(restoredChapterIndex);
        scrollProgressRef.current = jumpChapterIndex !== undefined ? 0 : initialLocation.scrollProgress;
        scrollProgressStateRef.current = scrollProgressRef.current;
        setScrollProgress(scrollProgressRef.current);
      })
      .catch((error) => {
        if (active) {
          setReaderError(
            error instanceof Error
              ? error.message
              : "This EPUB could not be opened."
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsParsing(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    activeFileUri,
    initialLocation.chapterIndex,
    initialLocation.scrollProgress,
    jumpChapterIndex,
  ]);

  useEffect(() => {
    return parseBook();
  }, [parseBook]);

  useEffect(() => {
    let active = true;

    if (!activeBookId || !epubDocument) {
      return () => {
        active = false;
      };
    }

    setIsChapterLoading(true);
    setChapterError(null);
    setChapter(null);
    if (readerReadyFallbackTimerRef.current) {
      clearTimeout(readerReadyFallbackTimerRef.current);
      readerReadyFallbackTimerRef.current = null;
    }
    setReaderContentReady(false);

    epubDocument
      .loadChapter(chapterIndex)
      .then((loadedChapter) => {
        if (active) {
          setChapter(loadedChapter);
        }
      })
      .catch((error) => {
        if (active) {
          setChapterError(
            error instanceof Error
              ? error.message
              : "This chapter could not be rendered."
          );
        }
      })
      .finally(() => {
        if (active) {
          setIsChapterLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [activeBookId, chapterIndex, chapterReloadKey, epubDocument]);

  useEffect(() => {
    readerSettingsRef.current = readerSettings;
    webViewRef.current?.injectJavaScript(
      buildReaderSettingsScript(readerSettings)
    );
  }, [readerSettings]);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(
      buildApplyAnnotationsScript(chapterAnnotations)
    );
  }, [chapterAnnotations, readerContentReady]);

  useEffect(() => {
    if (!readerContentReady || jumpOffset === undefined) {
      return;
    }

    webViewRef.current?.injectJavaScript(buildScrollToOffsetScript(jumpOffset));
  }, [jumpOffset, readerContentReady]);

  const updateVisibleScrollProgress = useCallback(
    (nextScrollProgress: number, force = false) => {
      const now = Date.now();
      const progressChanged =
        Math.abs(nextScrollProgress - scrollProgressStateRef.current) >= 0.04;
      const atBoundary = nextScrollProgress <= 0 || nextScrollProgress >= 1;

      if (
        !force &&
        !atBoundary &&
        now - lastScrollProgressStateAtRef.current < 260 &&
        !progressChanged
      ) {
        return;
      }

      scrollProgressStateRef.current = nextScrollProgress;
      lastScrollProgressStateAtRef.current = now;
      setScrollProgress(nextScrollProgress);
    },
    []
  );

  const writeProgress = useCallback(
    (nextScrollProgress: number) => {
      if (!activeBookId || !epubDocument) {
        return;
      }

      try {
        saveReadingState(
          activeBookId,
          chapterIndex,
          overallProgress(
            chapterIndex,
            epubDocument.chapters.length,
            nextScrollProgress
          ),
          nextScrollProgress
        );
      } catch {
        // Progress persistence should never interrupt reading.
      }
    },
    [activeBookId, chapterIndex, epubDocument, saveReadingState]
  );

  const clearProgressSaveTimer = useCallback(() => {
    if (progressSaveTimerRef.current) {
      clearTimeout(progressSaveTimerRef.current);
      progressSaveTimerRef.current = null;
    }
  }, []);

  const flushProgress = useCallback(
    (nextScrollProgress = scrollProgressRef.current) => {
      clearProgressSaveTimer();
      pendingScrollProgressRef.current = null;
      writeProgress(nextScrollProgress);
    },
    [clearProgressSaveTimer, writeProgress]
  );

  const persistProgress = useCallback(
    (nextScrollProgress: number, force = false) => {
      if (force) {
        flushProgress(nextScrollProgress);
        return;
      }

      pendingScrollProgressRef.current = nextScrollProgress;

      if (progressSaveTimerRef.current) {
        return;
      }

      progressSaveTimerRef.current = setTimeout(() => {
        progressSaveTimerRef.current = null;
        const pendingProgress = pendingScrollProgressRef.current;
        pendingScrollProgressRef.current = null;

        if (typeof pendingProgress === "number") {
          writeProgress(pendingProgress);
        }
      }, 4000);
    },
    [flushProgress, writeProgress]
  );

  useEffect(() => {
    flushProgressOnUnmountRef.current = () => {
      flushProgress(scrollProgressRef.current);
    };
  }, [flushProgress]);

  useEffect(() => {
    return () => {
      flushProgressOnUnmountRef.current();
    };
  }, []);

  const refreshAnnotations = useCallback(() => {
    if (!activeBookId) {
      return;
    }

    const nextHighlights = getBookHighlights(activeBookId);
    const nextNotes = getBookNotes(activeBookId);
    setBookHighlights(nextHighlights);
    setBookNotes(nextNotes);
    webViewRef.current?.injectJavaScript(
      buildApplyAnnotationsScript(
        annotationsForChapter({
          highlights: nextHighlights,
          notes: nextNotes,
          chapterIndex,
        })
      )
    );
  }, [activeBookId, chapterIndex, getBookHighlights, getBookNotes]);

  const handleMessage = useCallback(
    (event: WebViewMessageEvent) => {
      try {
        const payload = JSON.parse(
          event.nativeEvent.data
        ) as WebViewReaderMessage;

        if (payload.type === "ready") {
          setReaderContentReady(true);
          return;
        }

        if (payload.type === "tap") {
          toggleControls();
          return;
        }

        if (payload.type === "scrollStart") {
          hideControls();
          setSelection(null);
          return;
        }

        if (payload.type === "selection") {
          setSelection({
            chapterIndex,
            selectedText: payload.selectedText,
            startOffset: payload.startOffset,
            endOffset: payload.endOffset,
            rect: payload.rect,
          });
          setControlsVisible(false);
          return;
        }

        if (payload.type === "selectionAction") {
          const anchor: ReaderSelection = {
            chapterIndex,
            selectedText: payload.selectedText,
            startOffset: payload.startOffset,
            endOffset: payload.endOffset,
            rect: payload.rect,
          };

          setSelection(anchor);
          setControlsVisible(false);

          if (payload.action === "highlight") {
            if (activeBookId) {
              createHighlight(activeBookId, anchor);
              setSelection(null);
              refreshAnnotations();
            }
            return;
          }

          if (payload.action === "note") {
            setNoteEditorVisible(true);
            return;
          }

          if (payload.action === "copy") {
            setSelection(null);
          }

          return;
        }

        if (payload.type !== "scroll") {
          return;
        }

        hideControls();
        if (atTopRef.current !== payload.atTop) {
          atTopRef.current = payload.atTop;
          setAtTop(payload.atTop);
        }
        if (atEndRef.current !== payload.atEnd) {
          atEndRef.current = payload.atEnd;
          setAtEnd(payload.atEnd);
        }
        scrollProgressRef.current = payload.scrollProgress;
        updateVisibleScrollProgress(payload.scrollProgress);
        persistProgress(payload.scrollProgress);
      } catch {
        // Ignore malformed messages from WebView.
      }
    },
    [
      activeBookId,
      chapterIndex,
      createHighlight,
      hideControls,
      persistProgress,
      refreshAnnotations,
      toggleControls,
      updateVisibleScrollProgress,
    ]
  );

  const clearSelection = useCallback(() => {
    setSelection(null);
    webViewRef.current?.injectJavaScript(
      "if (window.__clearLumiraSelection) window.__clearLumiraSelection(); true;"
    );
  }, []);

  const saveNote = useCallback(
    (content: string) => {
      if (!activeBookId || !selection || !content.trim()) {
        return;
      }

      createNote(activeBookId, selection, content.trim());
      setNoteEditorVisible(false);
      clearSelection();
      refreshAnnotations();
    },
    [activeBookId, clearSelection, createNote, refreshAnnotations, selection]
  );

  const goToNextChapter = useCallback(() => {
    if (!epubDocument) {
      return;
    }

    flushProgress(scrollProgressRef.current);
    scrollProgressRef.current = 0;
    scrollProgressStateRef.current = 0;
    setScrollProgress(0);
    atTopRef.current = true;
    atEndRef.current = false;
    setAtTop(true);
    setAtEnd(false);
    setChapterIndex((currentIndex) =>
      Math.min(currentIndex + 1, epubDocument.chapters.length - 1)
    );
  }, [epubDocument, flushProgress]);

  const goToPreviousChapter = useCallback(() => {
    flushProgress(scrollProgressRef.current);
    scrollProgressRef.current = 0;
    scrollProgressStateRef.current = 0;
    setScrollProgress(0);
    atTopRef.current = true;
    atEndRef.current = false;
    setAtTop(true);
    setAtEnd(false);
    setChapterIndex((currentIndex) => Math.max(currentIndex - 1, 0));
  }, [flushProgress]);

  const canGoPrevious = chapterIndex > 0;
  const canGoNext = epubDocument
    ? chapterIndex < epubDocument.chapters.length - 1
    : false;
  const openChapterList = useCallback(() => {
    hideControls();
    setChapterListVisible(true);
  }, [hideControls]);
  const handleSelectChapter = useCallback(
    (nextChapterIndex: number) => {
      if (!epubDocument) {
        return;
      }

      flushProgress(scrollProgressRef.current);
      scrollProgressRef.current = 0;
      scrollProgressStateRef.current = 0;
      setScrollProgress(0);
      atTopRef.current = true;
      atEndRef.current = false;
      setAtTop(true);
      setAtEnd(false);
      setChapterIndex(
        clamp(nextChapterIndex, 0, epubDocument.chapters.length - 1)
      );
    },
    [epubDocument, flushProgress]
  );
  const openReaderSettings = useCallback(() => {
    hideControls();
    setSettingsVisible(true);
  }, [hideControls]);

  const body = useMemo(() => {
    if (!activeBookId) {
      return (
        <ReaderError
          title="Book not found"
          body="This EPUB is no longer available in your local library."
        />
      );
    }

    if (isParsing) {
      return <ReaderLoading message="Opening EPUB from local storage..." />;
    }

    if (readerError) {
      return (
        <ReaderError
          title="EPUB could not be opened"
          body={readerError}
          onRetry={parseBook}
        />
      );
    }

    if (chapterError) {
      return (
        <ReaderError
          title="Chapter unavailable"
          body={chapterError}
          onRetry={() => setChapterReloadKey((key) => key + 1)}
        />
      );
    }

    if (!chapter) {
      return (
        <View
          style={{ flex: 1, alignItems: "center", justifyContent: "center" }}
        >
          <ActivityIndicator color={colors.brand.violet} />
        </View>
      );
    }

    return (
      <WebView
        ref={webViewRef}
        key={`${activeBookId}-${chapterIndex}`}
        source={{ html: chapter.html }}
        originWhitelist={["*"]}
        allowFileAccess
        allowFileAccessFromFileURLs
        allowUniversalAccessFromFileURLs
        javaScriptEnabled
        domStorageEnabled={false}
        setSupportMultipleWindows={false}
        allowsBackForwardNavigationGestures={false}
        injectedJavaScript={`${buildReaderSettingsScript(
          readerSettingsRef.current
        )}\n${buildScrollScript(
          chapterIndex === initialLocation.chapterIndex
            ? scrollProgressRef.current || initialLocation.scrollProgress
            : scrollProgressRef.current
        )}`}
        onMessage={handleMessage}
        onError={(event) => {
          setChapterError(
            event.nativeEvent.description || "The chapter failed to render."
          );
        }}
        onLoadEnd={() => {
          webViewRef.current?.injectJavaScript(
            `${buildReaderSettingsScript(
              readerSettingsRef.current
            )}\n${buildApplyAnnotationsScript(chapterAnnotations)}`
          );
          if (readerReadyFallbackTimerRef.current) {
            clearTimeout(readerReadyFallbackTimerRef.current);
          }
          readerReadyFallbackTimerRef.current = setTimeout(() => {
            setReaderContentReady(true);
          }, 900);
        }}
        style={{
          flex: 1,
          backgroundColor: "transparent",
          opacity: readerContentReady ? 1 : 0,
        }}
        containerStyle={{
          backgroundColor: "transparent",
        }}
      />
    );
  }, [
    activeBookId,
    chapter,
    chapterError,
    chapterIndex,
    chapterAnnotations,
    handleMessage,
    initialLocation.chapterIndex,
    initialLocation.scrollProgress,
    isParsing,
    parseBook,
    readerError,
    readerContentReady,
  ]);

  return (
    <View style={{ flex: 1, backgroundColor: surface.background }}>
      <StatusBar hidden />
      {body}

      <Animated.View
        pointerEvents={controlsVisible ? "box-none" : "none"}
        style={{
          position: "absolute",
          top: insets.top + spacing[2],
          left: spacing[3],
          right: spacing[3],
          flexDirection: "row",
          justifyContent: "space-between",
          alignItems: "center",
          opacity: controlsOpacity,
        }}
      >
        <IconButton
          icon={ChevronLeft}
          label="Back to book detail"
          onPress={() => {
            flushProgress(scrollProgressRef.current);
            router.back();
          }}
          style={{
            backgroundColor: surface.chrome,
            borderColor: surface.border,
          }}
        />
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open chapter list"
            onPress={openChapterList}
            style={({ pressed }) => ({
              width: 44,
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: surface.border,
              backgroundColor: surface.chrome,
              opacity: pressed ? 0.72 : 1,
            })}
          >
            <List color={surface.text} size={18} strokeWidth={2.1} />
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Open reader settings"
            onPress={openReaderSettings}
            style={({ pressed }) => ({
              minHeight: 44,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[2],
              borderRadius: radii.pill,
              borderWidth: 1,
              borderColor: surface.border,
              backgroundColor: surface.chrome,
              paddingHorizontal: spacing[3],
              opacity: pressed ? 0.72 : 1,
            })}
          >
            <Settings2 color={surface.text} size={18} strokeWidth={2} />
            <AppText color={surface.text} variant="caption" weight="semibold">
              {Math.round(progress * 100)}%
            </AppText>
          </Pressable>
        </View>
      </Animated.View>

      {isChapterLoading ? (
        <View
          style={{
            position: "absolute",
            top: insets.top + spacing[16],
            alignSelf: "center",
          }}
        >
          <InlineStatus tone="loading" message="Loading chapter..." />
        </View>
      ) : null}

      {controlsVisible && canGoPrevious && atTop ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Previous chapter"
          onPress={goToPreviousChapter}
          style={({ pressed }) => ({
            position: "absolute",
            top: insets.top + spacing[14],
            alignSelf: "center",
            minHeight: 40,
            justifyContent: "center",
            borderRadius: radii.pill,
            backgroundColor: surface.chrome,
            borderWidth: 1,
            borderColor: surface.border,
            paddingHorizontal: spacing[4],
            opacity: pressed ? 0.72 : 1,
          })}
        >
          <AppText color={surface.text} variant="footnote" weight="semibold">
            Previous chapter
          </AppText>
        </Pressable>
      ) : null}

      {controlsVisible && canGoNext && atEnd ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Next chapter"
          onPress={goToNextChapter}
          style={({ pressed }) => ({
            position: "absolute",
            bottom: insets.bottom + spacing[5],
            alignSelf: "center",
            minHeight: 44,
            justifyContent: "center",
            borderRadius: radii.pill,
            backgroundColor: surface.chrome,
            borderWidth: 1,
            borderColor: surface.border,
            paddingHorizontal: spacing[5],
            opacity: pressed ? 0.72 : 1,
          })}
        >
          <AppText color={surface.text} variant="footnote" weight="semibold">
            Next chapter
          </AppText>
        </Pressable>
      ) : null}

      <NoteEditorModal
        visible={noteEditorVisible}
        onClose={() => setNoteEditorVisible(false)}
        onSave={saveNote}
      />

      <ChapterListPanel
        visible={chapterListVisible}
        chapters={epubDocument?.chapters ?? []}
        currentIndex={chapterIndex}
        surface={surface}
        onClose={() => setChapterListVisible(false)}
        onSelectChapter={handleSelectChapter}
      />

      <ReaderSettingsModal
        visible={settingsVisible}
        settings={readerSettings}
        onClose={() => setSettingsVisible(false)}
        onReset={() =>
          setReaderSettings({
            theme: "dark",
            fontSize: 19,
            readerFontFamily: defaultReaderFontFamily,
            lineHeight: 1.72,
            contentWidth: 720,
            musicianAutoScrollSpeed: 28,
            musicianKeepAwake: true,
            musicianExtraLargeText: false,
            musicianHighContrast: false,
          })
        }
        onUpdate={setReaderSettings}
      />
    </View>
  );
}
