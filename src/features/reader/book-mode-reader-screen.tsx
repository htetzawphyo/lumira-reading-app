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
import type {
  ReaderSettings,
  ReaderSettingsInput,
  ReaderTheme,
} from "@/features/books/types";
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
  type ReaderSelection,
} from "@/features/reader/reader-annotations";
import { ReaderFontSelector } from "@/features/reader/reader-font-selector";

type BookModeLocation = {
  mode: "scroll" | "book";
  chapterIndex: number;
  pageIndex: number;
  pageCount: number;
  scrollProgress: number;
};

type BookModeMessage =
  | {
      type: "ready" | "page";
      pageIndex: number;
      pageCount: number;
    }
  | {
      type: "tapControls" | "turnStart" | "nextChapter" | "previousChapter";
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

type PendingPageRestore = number | "last" | { ratio: number };

const defaultReaderSettings: ReaderSettingsInput = {
  theme: "dark",
  fontSize: 19,
  readerFontFamily: defaultReaderFontFamily,
  lineHeight: 1.72,
  contentWidth: 720,
  musicianAutoScrollSpeed: 28,
  musicianKeepAwake: true,
  musicianExtraLargeText: false,
  musicianHighContrast: false,
};

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);
const keepAwakeTag = "lumira-book-reader";

function parseBookLocation(value?: string | null): BookModeLocation {
  if (!value) {
    return {
      mode: "book",
      chapterIndex: 0,
      pageIndex: 0,
      pageCount: 1,
      scrollProgress: 0,
    };
  }

  try {
    const parsed = JSON.parse(value) as {
      mode?: unknown;
      chapterIndex?: unknown;
      pageIndex?: unknown;
      pageCount?: unknown;
      scrollProgress?: unknown;
    };

    return {
      mode: parsed.mode === "book" ? "book" : "scroll",
      chapterIndex:
        typeof parsed.chapterIndex === "number" ? Math.max(0, parsed.chapterIndex) : 0,
      pageIndex:
        typeof parsed.pageIndex === "number" ? Math.max(0, parsed.pageIndex) : 0,
      pageCount:
        typeof parsed.pageCount === "number" ? Math.max(1, parsed.pageCount) : 1,
      scrollProgress:
        typeof parsed.scrollProgress === "number"
          ? Math.min(Math.max(parsed.scrollProgress, 0), 1)
          : 0,
    };
  } catch {
    return {
      mode: "book",
      chapterIndex: 0,
      pageIndex: 0,
      pageCount: 1,
      scrollProgress: 0,
    };
  }
}

function chapterPageProgress(pageIndex: number, pageCount: number) {
  if (pageCount <= 1) {
    return 0;
  }

  return clamp(pageIndex / (pageCount - 1), 0, 1);
}

function overallProgress(chapterIndex: number, chapterCount: number, chapterProgress: number) {
  if (chapterCount <= 0) {
    return 0;
  }

  return clamp((chapterIndex + chapterProgress) / chapterCount, 0, 1);
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
  const payload = JSON.stringify(readerCssPayload(settings)).replace(/</g, "\\u003c");

  return `
    if (window.__setReaderSettings) {
      window.__setReaderSettings(${payload});
    }
    true;
  `;
}

function getPagePaddingX(width: number, height: number) {
  const isLandscape = width > height;

  if (width >= 1024 && isLandscape) {
    return 96;
  }

  if (width >= 768) {
    return 72;
  }

  if (isLandscape) {
    return 56;
  }

  return width < 360 ? 22 : 28;
}

function buildBookLayoutScript({
  safeTop,
  safeBottom,
  paddingX,
}: {
  safeTop: number;
  safeBottom: number;
  paddingX: number;
}) {
  const safeTopValue = Math.max(0, Math.round(safeTop));
  const safeBottomValue = Math.max(0, Math.round(safeBottom));
  const safePaddingX = Math.max(18, Math.round(paddingX));

  return `
    document.documentElement.style.setProperty("--book-safe-top", "${safeTopValue}px");
    document.documentElement.style.setProperty("--book-safe-bottom", "${safeBottomValue}px");
    document.documentElement.style.setProperty("--book-padding-x", "${safePaddingX}px");
    true;
  `;
}

function buildBookModeScript({
  initialPageIndex,
  safeTop,
  safeBottom,
  paddingX,
}: {
  initialPageIndex: number;
  safeTop: number;
  safeBottom: number;
  paddingX: number;
}) {
  const safeInitialPageIndex = Math.max(0, Math.floor(initialPageIndex));
  const safeTopValue = Math.max(0, Math.round(safeTop));
  const safeBottomValue = Math.max(0, Math.round(safeBottom));
  const safePaddingX = Math.max(18, Math.round(paddingX));

  return `
    (function () {
      if (window.__lumiraBookModeReady) {
        return true;
      }

      window.__lumiraBookModeReady = true;

      var pageIndex = ${safeInitialPageIndex};
      var pageCount = 1;
      var viewportWidth = Math.max(window.innerWidth || 1, 1);
      var main = null;
      var lastPagePayload = "";
      var lastTapSent = 0;
      var lastTouchHandled = 0;
      var touchStartX = 0;
      var touchStartY = 0;
      var touchMoved = false;
      var touchStartAt = 0;

      function post(payload) {
        window.ReactNativeWebView.postMessage(JSON.stringify(payload));
      }

      function clampPage(index) {
        return Math.max(0, Math.min(index, Math.max(pageCount - 1, 0)));
      }

      function ensureStyle() {
        main = document.querySelector("main") || document.body;

        ${buildBookLayoutScript({
          safeTop: safeTopValue,
          safeBottom: safeBottomValue,
          paddingX: safePaddingX,
        })}

        var existing = document.getElementById("lumira-book-mode-style");
        if (existing) {
          return;
        }

        var style = document.createElement("style");
        style.id = "lumira-book-mode-style";
        style.textContent =
          "html, body {" +
            "width: 100% !important;" +
            "height: 100% !important;" +
            "min-height: 100% !important;" +
            "margin: 0 !important;" +
            "padding: 0 !important;" +
            "overflow: hidden !important;" +
            "overscroll-behavior: none !important;" +
            "background: var(--reader-bg) !important;" +
            "touch-action: manipulation;" +
          "}" +
          "main, main * {" +
            "-webkit-user-select: text;" +
            "user-select: text;" +
          "}" +
          "main {" +
            "display: block !important;" +
            "width: calc(100vw - (var(--book-padding-x) * 2)) !important;" +
            "max-width: none !important;" +
            "height: calc(100vh - var(--book-safe-top) - var(--book-safe-bottom) - (var(--reader-padding-y) * 2)) !important;" +
            "min-height: 0 !important;" +
            "margin: calc(var(--book-safe-top) + var(--reader-padding-y)) var(--book-padding-x) calc(var(--book-safe-bottom) + var(--reader-padding-y)) var(--book-padding-x) !important;" +
            "padding: 0 !important;" +
            "column-width: calc(100vw - (var(--book-padding-x) * 2)) !important;" +
            "column-gap: calc(var(--book-padding-x) * 2) !important;" +
            "column-fill: auto !important;" +
            "overflow: visible !important;" +
            "will-change: transform;" +
          "}" +
          "main, main * {" +
            "max-width: calc(100vw - (var(--book-padding-x) * 2)) !important;" +
          "}" +
          "p, div, span, li, blockquote, section, article, aside, dd, dt, figcaption, td, th, pre, code, em, strong, small {" +
            "line-height: var(--reader-line-height) !important;" +
          "}" +
          "img, svg {" +
            "max-width: 100% !important;" +
            "max-height: 68vh !important;" +
            "height: auto !important;" +
            "object-fit: contain !important;" +
            "break-inside: avoid;" +
          "}" +
          "table {" +
            "max-width: 100% !important;" +
            "break-inside: avoid;" +
          "}";
        document.head.appendChild(style);
      }

      function measurePageCount() {
        ensureStyle();

        viewportWidth = Math.max(window.innerWidth || document.documentElement.clientWidth || 1, 1);

        var gap = ${safePaddingX * 2};
        var scrollWidth = Math.max(
          main.scrollWidth || 0,
          document.documentElement.scrollWidth || 0,
          document.body.scrollWidth || 0,
          viewportWidth
        );
        pageCount = Math.max(1, Math.ceil((scrollWidth + gap * 0.35) / viewportWidth));
        pageIndex = clampPage(pageIndex);
      }

      function sendPage(type) {
        var payload = JSON.stringify({
          type: type || "page",
          pageIndex: pageIndex,
          pageCount: pageCount
        });

        if (payload === lastPagePayload && type !== "ready") {
          return;
        }

        lastPagePayload = payload;
        window.ReactNativeWebView.postMessage(payload);
      }

      function applyPage(animate) {
        ensureStyle();
        main.style.transition = animate ? "transform 180ms ease-out" : "none";
        main.style.transform = "translate3d(" + (-pageIndex * viewportWidth) + "px, 0, 0)";
        sendPage("page");
      }

      function repaginate(ratio) {
        measurePageCount();

        if (typeof ratio === "number" && isFinite(ratio)) {
          pageIndex = clampPage(Math.round(Math.max(0, Math.min(ratio, 1)) * Math.max(pageCount - 1, 0)));
        } else {
          pageIndex = clampPage(pageIndex);
        }

        applyPage(false);
        sendPage("ready");
      }

      function scheduleRepaginate(ratio) {
        setTimeout(function () { repaginate(ratio); }, 80);
        setTimeout(function () { repaginate(ratio); }, 260);
      }

      function goToPage(index, animate) {
        measurePageCount();
        pageIndex = clampPage(index);
        applyPage(animate !== false);
      }

      function nextPage() {
        post({ type: "turnStart" });
        measurePageCount();

        if (pageIndex < pageCount - 1) {
          pageIndex += 1;
          applyPage(true);
          return;
        }

        post({ type: "nextChapter" });
      }

      function previousPage() {
        post({ type: "turnStart" });
        measurePageCount();

        if (pageIndex > 0) {
          pageIndex -= 1;
          applyPage(true);
          return;
        }

        post({ type: "previousChapter" });
      }

      function sendTapControls() {
        var now = Date.now();

        if (now - lastTapSent < 320) {
          return;
        }

        lastTapSent = now;
        post({ type: "tapControls" });
      }

      function handleTap(clientX) {
        var selection = window.getSelection && window.getSelection();
        if (selection && String(selection.toString() || "").trim()) {
          return;
        }

        var width = Math.max(window.innerWidth || 1, 1);

        if (clientX > width * 0.65) {
          nextPage();
          return;
        }

        if (clientX < width * 0.35) {
          previousPage();
          return;
        }

        sendTapControls();
      }

      window.__goToBookPage = function (index, animate) {
        goToPage(index, animate);
        return true;
      };

      window.__repaginateBook = function (ratio) {
        scheduleRepaginate(ratio);
        return true;
      };

      window.addEventListener("resize", function () {
        var ratio = pageCount > 1 ? pageIndex / (pageCount - 1) : 0;
        scheduleRepaginate(ratio);
      });

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

      window.addEventListener("touchend", function (event) {
        lastTouchHandled = Date.now();

        var touch = event.changedTouches && event.changedTouches[0];
        var endX = touch ? touch.clientX : touchStartX;
        var endY = touch ? touch.clientY : touchStartY;
        var deltaX = endX - touchStartX;
        var deltaY = endY - touchStartY;
        var pressDuration = Date.now() - touchStartAt;

        if (pressDuration < 420 && Math.abs(deltaX) > 42 && Math.abs(deltaX) > Math.abs(deltaY) * 1.2) {
          if (deltaX < 0) {
            nextPage();
          } else {
            previousPage();
          }
          return;
        }

        if (!touchMoved && pressDuration < 420) {
          handleTap(endX);
        }
      }, { passive: true });

      window.addEventListener("click", function (event) {
        if (Date.now() - lastTouchHandled < 450) {
          return;
        }

        var selection = window.getSelection && window.getSelection();
        if (selection && String(selection.toString() || "").trim()) {
          return;
        }

        if (Date.now() - lastTapSent > 320) {
          handleTap(event.clientX || 0);
        }
      });

      scheduleRepaginate();
    })();
    true;
  `;
}

function buildGoToPageScript(pageIndex: number, animate = false) {
  return `
    if (window.__goToBookPage) {
      window.__goToBookPage(${Math.max(0, Math.floor(pageIndex))}, ${animate ? "true" : "false"});
    }
    true;
  `;
}

function buildRepaginateScript(ratio: number) {
  return `
    if (window.__repaginateBook) {
      window.__repaginateBook(${clamp(ratio, 0, 1)});
    }
    true;
  `;
}

function ReaderLoading({ message }: { message: string }) {
  return (
    <View style={{ flex: 1, justifyContent: "center", gap: spacing[5], padding: spacing[6] }}>
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
  onClose,
  onSave,
}: {
  visible: boolean;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  const { height } = useWindowDimensions();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, spacing[8]);

  useEffect(() => {
    if (visible) {
      setValue("");
    }
  }, [visible]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View
          style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0, 0, 0, 0.42)" }}
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
                  Add Note
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
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
            style={isLandscape ? { flex: 1, gap: spacing[4] } : { gap: spacing[4] }}
          >
            <ScrollView
              bounces={false}
              nestedScrollEnabled
              showsVerticalScrollIndicator={false}
              style={
                isLandscape
                  ? { flex: 1 }
                  : { maxHeight: portraitMaxHeight - safeBottomInset - spacing[18] }
              }
              contentContainerStyle={{ gap: spacing[4], paddingBottom: scrollContentBottomPadding }}
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
                onDecrease={() => onUpdate({ lineHeight: settings.lineHeight - 0.08 })}
                onIncrease={() => onUpdate({ lineHeight: settings.lineHeight + 0.08 })}
              />
              <ToggleRow
                title="Keep Screen Awake"
                value={settings.musicianKeepAwake}
                onChange={(value) => onUpdate({ musicianKeepAwake: value })}
              />
              <ToggleRow
                title="Extra-Large Text"
                value={settings.musicianExtraLargeText}
                onChange={(value) => onUpdate({ musicianExtraLargeText: value })}
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

export function BookModeReaderScreen() {
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ bookId: string }>();
  const bookId = Array.isArray(params.bookId) ? params.bookId[0] : params.bookId;
  const book = useBooksStore((state) => state.books.find((item) => item.id === bookId));
  const selectBook = useBooksStore((state) => state.selectBook);
  const saveReadingState = useBooksStore((state) => state.saveReadingState);
  const readerSettings = useBooksStore((state) => state.readerSettings);
  const setReaderSettings = useBooksStore((state) => state.setReaderSettings);
  const getBookHighlights = useBooksStore((state) => state.getBookHighlights);
  const getBookNotes = useBooksStore((state) => state.getBookNotes);
  const createHighlight = useBooksStore((state) => state.createHighlight);
  const createNote = useBooksStore((state) => state.createNote);
  const { width, height } = useWindowDimensions();
  const [epubDocument, setEpubDocument] = useState<EpubDocument | null>(null);
  const [chapter, setChapter] = useState<EpubRenderedChapter | null>(null);
  const [chapterIndex, setChapterIndex] = useState(0);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageCount, setPageCount] = useState(1);
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
  const controlsHideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readerReadyFallbackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const controlsVisibleRef = useRef(false);
  const progressSaveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flushProgressOnUnmountRef = useRef<() => void>(() => undefined);
  const pendingPageProgressRef = useRef<{
    pageIndex: number;
    pageCount: number;
  } | null>(null);
  const pageIndexRef = useRef(0);
  const pageCountRef = useRef(1);
  const pendingPageRestoreRef = useRef<PendingPageRestore | null>(null);
  const readerSettingsRef = useRef(readerSettings);
  const activeBookId = book?.id;
  const activeFileUri = book?.fileUri;
  const initialLocation = useMemo(
    () => parseBookLocation(book?.currentLocation),
    [book?.id],
  );
  const surface = themeSurface(
    readerSettings.theme,
    readerSettings.musicianHighContrast
  );
  const chapterCount = epubDocument?.chapters.length ?? 0;
  const chapterProgress = chapterPageProgress(pageIndex, pageCount);
  const progress = overallProgress(chapterIndex, chapterCount, chapterProgress);
  const pagePaddingX = getPagePaddingX(width, height);
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
  }, [clearControlsHideTimer, controlsOpacity, controlsVisible, settingsVisible]);

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
          initialLocation.chapterIndex,
          0,
          document.chapters.length - 1,
        );
        const restoredPageIndex = initialLocation.mode === "book" ? initialLocation.pageIndex : 0;

        pendingPageRestoreRef.current =
          initialLocation.mode === "book"
            ? restoredPageIndex
            : { ratio: initialLocation.scrollProgress };
        pageIndexRef.current = restoredPageIndex;
        pageCountRef.current = Math.max(1, initialLocation.pageCount);
        setPageIndex(restoredPageIndex);
        setPageCount(Math.max(1, initialLocation.pageCount));
        setEpubDocument(document);
        setChapterIndex(restoredChapterIndex);
      })
      .catch((error) => {
        if (active) {
          setReaderError(
            error instanceof Error ? error.message : "This EPUB could not be opened.",
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
  }, [activeFileUri, initialLocation.chapterIndex, initialLocation.mode, initialLocation.pageCount, initialLocation.pageIndex]);

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
            error instanceof Error ? error.message : "This chapter could not be rendered.",
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
    const ratio = chapterPageProgress(pageIndexRef.current, pageCountRef.current);

    webViewRef.current?.injectJavaScript(
      `${buildReaderSettingsScript(readerSettings)}\n${buildRepaginateScript(ratio)}`,
    );
  }, [readerSettings]);

  useEffect(() => {
    webViewRef.current?.injectJavaScript(
      buildApplyAnnotationsScript(chapterAnnotations)
    );
  }, [chapterAnnotations, readerContentReady]);

  useEffect(() => {
    const ratio = chapterPageProgress(pageIndexRef.current, pageCountRef.current);
    webViewRef.current?.injectJavaScript(
      `${buildBookLayoutScript({
        safeTop: insets.top,
        safeBottom: insets.bottom,
        paddingX: pagePaddingX,
      })}\n${buildRepaginateScript(ratio)}`,
    );
  }, [height, insets.bottom, insets.top, pagePaddingX, width]);

  const writeProgress = useCallback(
    (nextPageIndex: number, nextPageCount: number) => {
      if (!activeBookId || !epubDocument) {
        return;
      }

      const nextChapterProgress = chapterPageProgress(nextPageIndex, nextPageCount);

      try {
        saveReadingState(
          activeBookId,
          chapterIndex,
          overallProgress(chapterIndex, epubDocument.chapters.length, nextChapterProgress),
          nextChapterProgress,
          {
            mode: "book",
            pageIndex: nextPageIndex,
            pageCount: nextPageCount,
          },
        );
      } catch {
        // Progress persistence should never interrupt reading.
      }
    },
    [activeBookId, chapterIndex, epubDocument, saveReadingState],
  );

  const clearProgressSaveTimer = useCallback(() => {
    if (progressSaveTimerRef.current) {
      clearTimeout(progressSaveTimerRef.current);
      progressSaveTimerRef.current = null;
    }
  }, []);

  const flushProgress = useCallback(
    (
      nextPageIndex = pageIndexRef.current,
      nextPageCount = pageCountRef.current,
    ) => {
      clearProgressSaveTimer();
      pendingPageProgressRef.current = null;
      writeProgress(nextPageIndex, nextPageCount);
    },
    [clearProgressSaveTimer, writeProgress],
  );

  const persistProgress = useCallback(
    (nextPageIndex: number, nextPageCount: number, force = false) => {
      if (force) {
        flushProgress(nextPageIndex, nextPageCount);
        return;
      }

      pendingPageProgressRef.current = {
        pageIndex: nextPageIndex,
        pageCount: nextPageCount,
      };

      if (progressSaveTimerRef.current) {
        return;
      }

      progressSaveTimerRef.current = setTimeout(() => {
        progressSaveTimerRef.current = null;
        const pendingProgress = pendingPageProgressRef.current;
        pendingPageProgressRef.current = null;

        if (pendingProgress) {
          writeProgress(pendingProgress.pageIndex, pendingProgress.pageCount);
        }
      }, 4000);
    },
    [flushProgress, writeProgress],
  );

  useEffect(() => {
    flushProgressOnUnmountRef.current = () => {
      flushProgress(pageIndexRef.current, pageCountRef.current);
    };
  }, [flushProgress]);

  useEffect(() => {
    return () => {
      flushProgressOnUnmountRef.current();
    };
  }, []);

  const goToNextChapter = useCallback(() => {
    if (!epubDocument || chapterIndex >= epubDocument.chapters.length - 1) {
      showControls();
      return;
    }

    flushProgress(pageIndexRef.current, pageCountRef.current);
    pendingPageRestoreRef.current = 0;
    pageIndexRef.current = 0;
    pageCountRef.current = 1;
    setPageIndex(0);
    setPageCount(1);
    hideControls();
    setChapterIndex((currentIndex) =>
      Math.min(currentIndex + 1, epubDocument.chapters.length - 1),
    );
  }, [chapterIndex, epubDocument, flushProgress, hideControls, showControls]);

  const goToPreviousChapter = useCallback(() => {
    if (chapterIndex <= 0) {
      showControls();
      return;
    }

    flushProgress(pageIndexRef.current, pageCountRef.current);
    pendingPageRestoreRef.current = "last";
    pageIndexRef.current = 0;
    pageCountRef.current = 1;
    setPageIndex(0);
    setPageCount(1);
    hideControls();
    setChapterIndex((currentIndex) => Math.max(currentIndex - 1, 0));
  }, [chapterIndex, flushProgress, hideControls, showControls]);

  const openChapterList = useCallback(() => {
    hideControls();
    setChapterListVisible(true);
  }, [hideControls]);

  const handleSelectChapter = useCallback(
    (nextChapterIndex: number) => {
      if (!epubDocument) {
        return;
      }

      flushProgress(pageIndexRef.current, pageCountRef.current);
      pendingPageRestoreRef.current = 0;
      pageIndexRef.current = 0;
      pageCountRef.current = 1;
      setPageIndex(0);
      setPageCount(1);
      setChapterIndex(
        clamp(nextChapterIndex, 0, epubDocument.chapters.length - 1),
      );
    },
    [epubDocument, flushProgress],
  );

  const handlePagePayload = useCallback(
    (payload: Extract<BookModeMessage, { type: "ready" | "page" }>) => {
      const safePageCount = Math.max(1, Math.floor(payload.pageCount));
      let safePageIndex = clamp(Math.floor(payload.pageIndex), 0, safePageCount - 1);
      const pendingRestore = pendingPageRestoreRef.current;

      if (payload.type === "ready" && pendingRestore !== null) {
        safePageIndex =
          pendingRestore === "last"
            ? Math.max(safePageCount - 1, 0)
            : typeof pendingRestore === "number"
              ? clamp(pendingRestore, 0, safePageCount - 1)
              : clamp(
                  Math.round(pendingRestore.ratio * Math.max(safePageCount - 1, 0)),
                  0,
                  safePageCount - 1,
                );
        pendingPageRestoreRef.current = null;
        webViewRef.current?.injectJavaScript(buildGoToPageScript(safePageIndex, false));
      }

      const pageIndexChanged = pageIndexRef.current !== safePageIndex;
      const pageCountChanged = pageCountRef.current !== safePageCount;

      pageIndexRef.current = safePageIndex;
      pageCountRef.current = safePageCount;

      if (pageIndexChanged) {
        setPageIndex(safePageIndex);
      }
      if (pageCountChanged) {
        setPageCount(safePageCount);
      }

      persistProgress(safePageIndex, safePageCount);

      if (payload.type === "ready") {
        setTimeout(() => {
          setReaderContentReady(true);
        }, pendingRestore !== null ? 80 : 0);
      }
    },
    [persistProgress],
  );

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
        const payload = JSON.parse(event.nativeEvent.data) as BookModeMessage;

        if (payload.type === "tapControls") {
          toggleControls();
          return;
        }

        if (payload.type === "turnStart") {
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

        if (payload.type === "nextChapter") {
          goToNextChapter();
          return;
        }

        if (payload.type === "previousChapter") {
          goToPreviousChapter();
          return;
        }

        if (payload.type === "ready" || payload.type === "page") {
          handlePagePayload(payload);
        }
      } catch {
        // Ignore malformed messages from WebView.
      }
    },
    [
      goToNextChapter,
      goToPreviousChapter,
      handlePagePayload,
      hideControls,
      activeBookId,
      chapterIndex,
      createHighlight,
      refreshAnnotations,
      toggleControls,
    ],
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

  const canGoPrevious = chapterIndex > 0 || pageIndex > 0;
  const canGoNext = epubDocument
    ? chapterIndex < epubDocument.chapters.length - 1 || pageIndex < pageCount - 1
    : false;
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

    if (!chapter || isChapterLoading) {
      return (
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <ActivityIndicator color={colors.brand.violet} />
        </View>
      );
    }

    return (
      <WebView
        ref={webViewRef}
        key={`${activeBookId}-book-${chapterIndex}`}
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
          readerSettingsRef.current,
        )}\n${buildBookModeScript({
          initialPageIndex: pageIndexRef.current,
          safeTop: insets.top,
          safeBottom: insets.bottom,
          paddingX: pagePaddingX,
        })}`}
        onMessage={handleMessage}
        onError={(event) => {
          setChapterError(event.nativeEvent.description || "The chapter failed to render.");
        }}
        onLoadEnd={() => {
          webViewRef.current?.injectJavaScript(
            `${buildReaderSettingsScript(readerSettingsRef.current)}\n${buildBookLayoutScript({
              safeTop: insets.top,
              safeBottom: insets.bottom,
              paddingX: pagePaddingX,
            })}\n${buildApplyAnnotationsScript(chapterAnnotations)}`,
          );
          if (readerReadyFallbackTimerRef.current) {
            clearTimeout(readerReadyFallbackTimerRef.current);
          }
          readerReadyFallbackTimerRef.current = setTimeout(() => {
            setReaderContentReady(true);
          }, 1000);
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
    insets.bottom,
    insets.top,
    isChapterLoading,
    isParsing,
    pagePaddingX,
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
            flushProgress(pageIndexRef.current, pageCountRef.current);
            router.back();
          }}
          style={{ backgroundColor: surface.chrome, borderColor: surface.border }}
        />
        <View
          pointerEvents="none"
          style={{
            minHeight: 34,
            maxWidth: "44%",
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radii.pill,
            borderWidth: 1,
            borderColor: surface.border,
            backgroundColor: surface.chrome,
            paddingHorizontal: spacing[3],
          }}
        >
          <AppText
            color={surface.text}
            variant="caption"
            weight="semibold"
            numberOfLines={1}
            style={{ fontVariant: ["tabular-nums"] }}
          >
            Page {pageIndex + 1} / {pageCount}
          </AppText>
        </View>
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
            <List color={surface.text} size={17} strokeWidth={2.1} />
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
            <Settings2 color={surface.text} size={17} strokeWidth={2.1} />
            <AppText color={surface.text} variant="footnote" weight="semibold">
              Adjust
            </AppText>
          </Pressable>
        </View>
      </Animated.View>

      <Animated.View
        pointerEvents={controlsVisible ? "box-none" : "none"}
        style={{
          position: "absolute",
          left: spacing[4],
          right: spacing[4],
          bottom: insets.bottom + spacing[4],
          alignItems: "center",
          opacity: controlsOpacity,
        }}
      >
        <View
          style={{
            minHeight: 34,
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "center",
            gap: spacing[2],
            borderRadius: radii.pill,
            borderWidth: 1,
            borderColor: surface.border,
            backgroundColor: surface.chrome,
            paddingHorizontal: spacing[3],
          }}
        >
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: radii.pill,
              backgroundColor: canGoPrevious ? colors.brand.violet : colors.text.muted,
              opacity: canGoPrevious ? 1 : 0.42,
            }}
          />
          <AppText
            color={surface.text}
            variant="caption"
            weight="semibold"
            style={{ fontVariant: ["tabular-nums"] }}
          >
            {Math.round(progress * 100)}%
          </AppText>
          <View
            style={{
              width: 7,
              height: 7,
              borderRadius: radii.pill,
              backgroundColor: canGoNext ? colors.brand.violet : colors.text.muted,
              opacity: canGoNext ? 1 : 0.42,
            }}
          />
        </View>
      </Animated.View>

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
        onReset={() => setReaderSettings(defaultReaderSettings)}
        onUpdate={setReaderSettings}
      />
    </View>
  );
}
