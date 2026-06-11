import { useLocalSearchParams, useRouter } from "expo-router";
import {
  BookOpen,
  Cloud,
  Lock,
  Music,
  ScrollText,
  Sparkles,
  X,
} from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  Easing,
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BookCover } from "@/components/books/book-cover";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Surface } from "@/components/ui/surface";
import { showThemedAlert } from "@/components/ui/themed-alert";
import { useAppTheme } from "@/design/app-theme-provider";
import { useResponsive } from "@/design/responsive";
import { radii, spacing } from "@/design/tokens";
import { AiSummaryResultModal } from "@/features/ai/ai-summary-result-modal";
import {
  generateAiSummary,
  getAiSummaryUsage,
  listBookAiSummaries,
  type AiSummary,
  type AiSummaryUsage,
} from "@/features/ai/ai-summary-service";
import {
  htmlToSummaryText,
  truncateSummarySource,
} from "@/features/ai/summary-source";
import { useAuthStore, isPremiumAuthSession } from "@/features/auth/auth-store";
import { BookKnowledgeCard } from "@/features/book-detail/book-knowledge-card";
import { useBooksStore } from "@/features/books/books-store";
import type { Book, KnowledgeItem } from "@/features/books/types";
import {
  loadEpubDocument,
  type EpubChapter,
} from "@/features/reader/epub-parser";
import { formatRelativeTime } from "@/utils/date";

type ReadingMode = "scroll" | "book" | "musician";
type DetailTab = "chapters" | "knowledge";

type ChapterSummarySheetState = {
  chapterIndex: number;
  chapterTitle: string;
  summary: AiSummary | null;
  loading: boolean;
  error: string | null;
};

type ModeOptionProps = {
  title: string;
  status: string;
  icon: typeof ScrollText;
  active?: boolean;
  disabled?: boolean;
  onPress?: () => void;
};

function ModeOption({
  title,
  status,
  icon: Icon,
  active,
  disabled,
  onPress,
}: ModeOptionProps) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 0,
        minHeight: 72,
        alignItems: "center",
        justifyContent: "center",
        gap: spacing[1],
        borderRadius: radii.lg,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: active ? "rgba(139, 92, 246, 0.42)" : "transparent",
        backgroundColor: active ? "rgba(139, 92, 246, 0.18)" : "transparent",
        opacity: disabled ? 0.52 : pressed ? 0.72 : 1,
        paddingHorizontal: spacing[2],
        paddingVertical: spacing[2],
      })}
    >
      <Icon
        color={disabled ? colors.text.tertiary : colors.brand.violet}
        size={19}
        strokeWidth={2.1}
      />
      <AppText
        color={active ? "primary" : disabled ? "tertiary" : "secondary"}
        variant="footnote"
        weight="semibold"
        align="center"
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.82}
      >
        {title}
      </AppText>
      <AppText
        color={disabled ? "muted" : colors.brand.violet}
        variant="caption"
        weight="semibold"
        align="center"
        numberOfLines={1}
      >
        {status}
      </AppText>
    </Pressable>
  );
}

function NoteEditorModal({
  visible,
  initialValue,
  onClose,
  onSave,
}: {
  visible: boolean;
  initialValue: string;
  onClose: () => void;
  onSave: (value: string) => void;
}) {
  const [value, setValue] = useState(initialValue);
  const [saving, setSaving] = useState(false);
  const { height } = useWindowDimensions();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, spacing[8]);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setSaving(false);
    }
  }, [initialValue, visible]);

  function handleSave() {
    const trimmed = value.trim();

    if (!trimmed || saving) {
      return;
    }

    setSaving(true);
    onSave(trimmed);
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.42)",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close note editor"
            onPress={onClose}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            }}
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
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "space-between",
                  gap: spacing[3],
                }}
              >
                <AppText color="primary" variant="title3" weight="semibold">
                  Edit Note
                </AppText>
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={onClose}
                  style={{ minHeight: 36 }}
                />
              </View>
              <TextInput
                value={value}
                onChangeText={setValue}
                multiline
                autoFocus
                textAlignVertical="top"
                placeholder="Write a note..."
                placeholderTextColor={colors.text.muted}
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
                title={saving ? "Saving..." : "Save Note"}
                variant="secondary"
                fullWidth
                disabled={saving || !value.trim()}
                onPress={handleSave}
              />
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function KnowledgePreview({
  items,
  onJump,
  onEditNote,
  onDelete,
  onViewAll,
}: {
  items: KnowledgeItem[];
  onJump: (item: KnowledgeItem) => void;
  onEditNote: (item: KnowledgeItem) => void;
  onDelete: (item: KnowledgeItem) => void;
  onViewAll: () => void;
}) {
  if (items.length === 0) {
    return (
      <EmptyState
        compact
        icon={BookOpen}
        title="No notes yet"
        body="Highlights, notes, and bookmarks saved from this EPUB will appear here."
      />
    );
  }

  const previewItems = items.slice(0, 4);
  const hasMore = items.length > previewItems.length;

  return (
    <View style={{ gap: spacing[3] }}>
      {previewItems.map((item) => (
        <BookKnowledgeCard
          key={`${item.type}-${item.id}`}
          item={item}
          onJump={onJump}
          onEditNote={onEditNote}
          onDelete={onDelete}
        />
      ))}
      {hasMore ? (
        <Button
          title={`View All (${items.length})`}
          variant="ghost"
          fullWidth
          onPress={onViewAll}
        />
      ) : null}
    </View>
  );
}

function BackupStatusRow({
  status,
  onPress,
}: {
  status: string;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Cloud backup status"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 46,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[2],
        alignSelf: "flex-start",
        borderRadius: radii.pill,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        backgroundColor: colors.surface.soft,
        paddingHorizontal: spacing[3],
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <Cloud color={colors.brand.violet} size={17} strokeWidth={2.1} />
      <AppText color="secondary" variant="caption" weight="semibold">
        {status}
      </AppText>
    </Pressable>
  );
}

function DetailTabButton({
  title,
  active,
  onPress,
}: {
  title: string;
  active: boolean;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="tab"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minHeight: 44,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.pill,
        backgroundColor: active ? colors.text.primary : "transparent",
        opacity: pressed ? 0.74 : 1,
        paddingHorizontal: spacing[3],
      })}
    >
      <AppText
        color={active ? colors.text.inverse : "secondary"}
        variant="footnote"
        weight="semibold"
        align="center"
        numberOfLines={1}
      >
        {title}
      </AppText>
    </Pressable>
  );
}

function ChapterList({
  chapters,
  loading,
  error,
  summaryByChapterIndex,
  onReadChapter,
  onSummarizeChapter,
}: {
  chapters: EpubChapter[];
  loading: boolean;
  error: string | null;
  summaryByChapterIndex: Map<number, AiSummary>;
  onReadChapter: (chapterIndex: number) => void;
  onSummarizeChapter: (chapterIndex: number, chapterTitle: string) => void;
}) {
  const { colors } = useAppTheme();

  if (loading) {
    return (
      <Surface tone="quiet" style={{ gap: spacing[1] }}>
        <AppText color="primary" variant="footnote" weight="semibold">
          Loading chapters...
        </AppText>
        <AppText color="secondary" variant="caption">
          Preparing the EPUB table of contents.
        </AppText>
      </Surface>
    );
  }

  if (error) {
    return (
      <EmptyState
        compact
        icon={BookOpen}
        title="Chapters unavailable"
        body={error}
      />
    );
  }

  if (chapters.length === 0) {
    return (
      <EmptyState
        compact
        icon={BookOpen}
        title="No chapters found"
        body="Lumira could not find a readable chapter list for this EPUB."
      />
    );
  }

  return (
    <Surface tone="quiet" padded={false} style={{ overflow: "hidden" }}>
      {chapters.map((chapter, index) => {
        const hasSummary = summaryByChapterIndex.has(index);

        return (
          <View
            key={`${chapter.id}-${index}`}
            style={{
              borderTopWidth: index === 0 ? 0 : 1,
              borderTopColor: colors.border.subtle,
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Read ${chapter.title}`}
              onPress={() => onReadChapter(index)}
              style={({ pressed }) => ({
                minHeight: 64,
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
                paddingHorizontal: spacing[4],
                paddingVertical: spacing[3],
                opacity: pressed ? 0.72 : 1,
              })}
            >
              <View style={{ flex: 1, minWidth: 0, gap: spacing[1] }}>
                <AppText
                  color="primary"
                  variant="body"
                  weight="semibold"
                  numberOfLines={2}
                  style={{ lineHeight: 22 }}
                >
                  {chapter.title}
                </AppText>
                <AppText color="tertiary" variant="caption">
                  Chapter {index + 1}
                </AppText>
              </View>
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Summarize ${chapter.title}`}
                onPress={() => onSummarizeChapter(index, chapter.title)}
                style={({ pressed }) => ({
                  minHeight: 34,
                  alignItems: "center",
                  justifyContent: "center",
                  borderRadius: radii.pill,
                  borderWidth: 1,
                  borderColor: hasSummary
                    ? "rgba(139, 92, 246, 0.34)"
                    : colors.border.subtle,
                  backgroundColor: hasSummary
                    ? "rgba(139, 92, 246, 0.14)"
                    : colors.background.panel,
                  paddingHorizontal: spacing[3],
                  opacity: pressed ? 0.72 : 1,
                })}
              >
                <AppText
                  color={hasSummary ? colors.brand.violet : "secondary"}
                  variant="caption"
                  weight="semibold"
                  numberOfLines={1}
                >
                  Summary
                </AppText>
              </Pressable>
            </Pressable>
          </View>
        );
      })}
    </Surface>
  );
}

function asStringArray(value: string[] | null | undefined) {
  return Array.isArray(value) ? value.filter(Boolean) : [];
}

function ChapterSummarySheet({
  visible,
  chapterTitle,
  summary,
  loading,
  error,
  onClose,
  onReadChapter,
}: {
  visible: boolean;
  chapterTitle: string;
  summary: AiSummary | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onReadChapter: () => void;
}) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bulletPoints = asStringArray(summary?.bulletPoints);
  const takeaways = asStringArray(summary?.keyTakeaways);

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
          justifyContent: "flex-end",
          backgroundColor: "rgba(0,0,0,0.44)",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close chapter summary"
          onPress={onClose}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <View
          style={{
            maxHeight: "78%",
            borderTopLeftRadius: radii.xxl,
            borderTopRightRadius: radii.xxl,
            borderWidth: 1,
            borderColor: colors.border.subtle,
            backgroundColor: colors.background.elevated,
            padding: spacing[5],
            paddingBottom: spacing[5] + Math.max(insets.bottom, spacing[4]),
          }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: spacing[3],
              marginBottom: spacing[4],
            }}
          >
            <View style={{ flex: 1, minWidth: 0, gap: spacing[1] }}>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing[2],
                }}
              >
                <Sparkles
                  color={colors.brand.violet}
                  size={18}
                  strokeWidth={2.1}
                />
                <AppText color="primary" variant="title3" weight="semibold">
                  Chapter Summary
                </AppText>
              </View>
              <AppText color="secondary" variant="footnote" numberOfLines={1}>
                {chapterTitle}
              </AppText>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Close"
              onPress={onClose}
              style={({ pressed }) => ({
                width: 38,
                height: 38,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radii.pill,
                backgroundColor: colors.background.panel,
                opacity: pressed ? 0.72 : 1,
              })}
            >
              <X color={colors.text.secondary} size={18} strokeWidth={2.1} />
            </Pressable>
          </View>

          <ScrollView
            bounces={false}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={{
              gap: spacing[4],
              paddingBottom: spacing[4],
            }}
          >
            {loading ? (
              <Surface tone="quiet" style={{ gap: spacing[1] }}>
                <AppText color="primary" variant="footnote" weight="semibold">
                  Generating summary...
                </AppText>
                <AppText color="secondary" variant="caption">
                  Lumira is reading this chapter and preparing a short summary.
                </AppText>
              </Surface>
            ) : null}

            {error ? (
              <Surface tone="quiet" style={{ gap: spacing[1] }}>
                <AppText
                  color={colors.brand.amber}
                  variant="footnote"
                  weight="semibold"
                >
                  Summary unavailable
                </AppText>
                <AppText color="secondary" variant="caption">
                  {error}
                </AppText>
              </Surface>
            ) : null}

            {summary ? (
              <>
                <View style={{ gap: spacing[2] }}>
                  <AppText color="primary" variant="title3" weight="semibold">
                    {summary.title}
                  </AppText>
                  <AppText
                    color="secondary"
                    variant="body"
                    style={{ lineHeight: 24 }}
                  >
                    {summary.summaryText}
                  </AppText>
                </View>

                {bulletPoints.length ? (
                  <View style={{ gap: spacing[2] }}>
                    <AppText
                      color="primary"
                      variant="footnote"
                      weight="semibold"
                    >
                      Main points
                    </AppText>
                    {bulletPoints.map((point, index) => (
                      <AppText
                        key={`${index}-${point}`}
                        color="secondary"
                        variant="body"
                        style={{ lineHeight: 24 }}
                      >
                        - {point}
                      </AppText>
                    ))}
                  </View>
                ) : null}

                {takeaways.length ? (
                  <View style={{ gap: spacing[2] }}>
                    <AppText
                      color="primary"
                      variant="footnote"
                      weight="semibold"
                    >
                      Key points
                    </AppText>
                    {takeaways.map((point, index) => (
                      <AppText
                        key={`${index}-${point}`}
                        color="secondary"
                        variant="body"
                        style={{ lineHeight: 24 }}
                      >
                        - {point}
                      </AppText>
                    ))}
                  </View>
                ) : null}
              </>
            ) : null}
          </ScrollView>

          <View style={{ flexDirection: "row", gap: spacing[2] }}>
            <Button
              title="Close"
              variant="ghost"
              onPress={onClose}
              style={{ flex: 1, alignSelf: "stretch" }}
            />
            <Button
              title="Read Chapter"
              icon={BookOpen}
              variant="secondary"
              onPress={onReadChapter}
              style={{ flex: 1, alignSelf: "stretch" }}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

function getBookBackupCopy(book: Book) {
  if (book.backupStatus === "backed-up" && !book.syncDirtyAt) {
    return {
      label: "Backed up",
      title: "Cloud Backup",
      body: book.lastSyncedAt
        ? `This EPUB is backed up. Last synced ${formatRelativeTime(
            book.lastSyncedAt
          )}.`
        : "This EPUB is backed up to your cloud library.",
    };
  }

  if (book.backupStatus === "failed") {
    return {
      label: "Sync failed",
      title: "Sync Failed",
      body: "Lumira could not upload this EPUB or its latest reading data. Open Sync & Backup and run Sync Now to retry.",
    };
  }

  if (book.backupStatus === "pending" || book.syncDirtyAt) {
    return {
      label: "Sync pending",
      title: "Sync Pending",
      body: "This EPUB has local changes that have not been synced yet. Open Sync & Backup and run Sync Now when you are ready.",
    };
  }

  return {
    label: "Not backed up",
    title: "Not Backed Up",
    body: "This EPUB is only stored on this device. Use Premium Cloud Backup to keep a cloud copy.",
  };
}

function AiSummarySection({ book }: { book: Book }) {
  const router = useRouter();
  const responsive = useResponsive();
  const { colors } = useAppTheme();
  const session = useAuthStore((state) => state.session);
  const isPremiumUser = isPremiumAuthSession(session);
  const [usage, setUsage] = useState<AiSummaryUsage | null>(null);
  const [summaries, setSummaries] = useState<AiSummary[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeSummary, setActiveSummary] = useState<AiSummary | null>(null);

  useEffect(() => {
    let cancelled = false;

    if (!session) {
      setUsage(null);
      setSummaries([]);
      return;
    }

    setLoading(true);
    setError(null);
    Promise.all([
      isPremiumUser ? getAiSummaryUsage() : Promise.resolve(null),
      listBookAiSummaries(book.id),
    ])
      .then(([nextUsage, nextSummaries]) => {
        if (cancelled) {
          return;
        }

        setUsage(nextUsage);
        setSummaries(nextSummaries);
      })
      .catch((requestError) => {
        if (cancelled) {
          return;
        }

        setError(
          requestError instanceof Error
            ? requestError.message
            : "AI Summary is unavailable right now."
        );
      })
      .finally(() => {
        if (!cancelled) {
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [book.id, isPremiumUser, session]);

  async function summarizeCurrentChapter() {
    if (!isPremiumUser || generating) {
      return;
    }

    setGenerating(true);
    setError(null);

    try {
      const epub = await loadEpubDocument(book.fileUri);
      const chapterIndex = Math.min(
        Math.max(book.currentChapterIndex ?? 0, 0),
        Math.max(epub.chapters.length - 1, 0)
      );
      const chapter = await epub.loadChapter(chapterIndex);
      const sourceText = truncateSummarySource(htmlToSummaryText(chapter.html));

      if (!sourceText) {
        throw new Error(
          "This chapter does not contain enough text to summarize."
        );
      }

      const result = await generateAiSummary({
        bookId: book.id,
        scope: "CHAPTER",
        chapterIndex,
        language: "AUTO",
        sourceTitle: chapter.chapter.title,
        sourceText,
      });

      setUsage(result.usage);
      setSummaries((current) => {
        const withoutDuplicate = current.filter(
          (summary) => summary.id !== result.summary.id
        );
        return [result.summary, ...withoutDuplicate];
      });
      setActiveSummary(result.summary);
    } catch (summaryError) {
      setError(
        summaryError instanceof Error
          ? summaryError.message
          : "Could not generate summary."
      );
    } finally {
      setGenerating(false);
    }
  }

  const remaining = usage
    ? `${usage.remainingCount}/${usage.limitCount} left this month`
    : "Premium feature";

  return (
    <>
      <Surface tone="quiet" style={{ gap: spacing[4] }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: spacing[3],
          }}
        >
          <View style={{ flex: 1, minWidth: 0, gap: spacing[1] }}>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[2],
              }}
            >
              <Sparkles
                color={colors.brand.violet}
                size={18}
                strokeWidth={2.1}
              />
              <AppText color="primary" variant="title3" weight="semibold">
                AI Summary
              </AppText>
            </View>
            <AppText color="secondary" variant="footnote">
              {isPremiumUser
                ? remaining
                : "Chapter and selection summaries are available in Premium."}
            </AppText>
          </View>
          {!isPremiumUser ? (
            <Lock color={colors.text.tertiary} size={18} strokeWidth={2.1} />
          ) : null}
        </View>

        {!isPremiumUser ? (
          <Button
            title="Upgrade to Lumira Pro"
            variant="secondary"
            onPress={() => router.push("/settings/premium")}
            style={{ alignSelf: responsive.isPhone ? "stretch" : "flex-start" }}
          />
        ) : (
          <Button
            title={generating ? "Generating..." : "Summarize Current Chapter"}
            variant="secondary"
            disabled={generating || loading}
            onPress={summarizeCurrentChapter}
            style={{ alignSelf: responsive.isPhone ? "stretch" : "flex-start" }}
          />
        )}

        {error ? (
          <AppText color={colors.brand.amber} variant="footnote">
            {error}
          </AppText>
        ) : null}

        {summaries.length ? (
          <View style={{ gap: spacing[2] }}>
            {summaries.slice(0, 3).map((summary) => (
              <Pressable
                key={summary.id}
                accessibilityRole="button"
                onPress={() => setActiveSummary(summary)}
                style={({ pressed }) => ({
                  gap: spacing[1],
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: colors.border.subtle,
                  backgroundColor: colors.background.panel,
                  padding: spacing[3],
                  opacity: pressed ? 0.72 : 1,
                })}
              >
                <AppText color="primary" variant="footnote" weight="semibold">
                  {summary.title}
                </AppText>
                <AppText color="secondary" variant="caption" numberOfLines={2}>
                  {summary.summaryText}
                </AppText>
              </Pressable>
            ))}
          </View>
        ) : isPremiumUser && !loading ? (
          <AppText color="tertiary" variant="footnote">
            No AI summaries yet. Generate a chapter summary to save it here.
          </AppText>
        ) : null}
      </Surface>

      <AiSummaryResultModal
        visible={Boolean(activeSummary)}
        summary={activeSummary}
        onClose={() => setActiveSummary(null)}
      />
    </>
  );
}

export function BookDetailScreen() {
  const responsive = useResponsive();
  const { colors } = useAppTheme();
  const router = useRouter();
  const params = useLocalSearchParams<{ bookId: string }>();
  const bookId = Array.isArray(params.bookId)
    ? params.bookId[0]
    : params.bookId;
  const book = useBooksStore((state) =>
    state.books.find((item) => item.id === bookId)
  );
  const allKnowledgeItems = useBooksStore((state) => state.knowledgeItems);
  const editNote = useBooksStore((state) => state.editNote);
  const removeNote = useBooksStore((state) => state.removeNote);
  const removeHighlight = useBooksStore((state) => state.removeHighlight);
  const session = useAuthStore((state) => state.session);
  const knowledgeItems = useMemo(
    () => allKnowledgeItems.filter((item) => item.bookId === bookId),
    [allKnowledgeItems, bookId]
  );
  const [editingNote, setEditingNote] = useState<KnowledgeItem | null>(null);
  const [noteEditorVisible, setNoteEditorVisible] = useState(false);
  const noteSaveLockRef = useRef(false);
  const noteSaveLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );
  const coverDropAnimation = useRef(new Animated.Value(0)).current;
  const summaryRequestIdRef = useRef(0);
  const [activeTab, setActiveTab] = useState<DetailTab>("chapters");
  const [chapters, setChapters] = useState<EpubChapter[]>([]);
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const [chaptersError, setChaptersError] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<AiSummary[]>([]);
  const [summarySheet, setSummarySheet] =
    useState<ChapterSummarySheetState | null>(null);
  const restoredMode = useMemo<ReadingMode>(() => {
    if (!book?.currentLocation) {
      return "scroll";
    }

    try {
      const parsed = JSON.parse(book.currentLocation) as { mode?: unknown };

      if (parsed.mode === "book" || parsed.mode === "musician") {
        return parsed.mode;
      }

      return "scroll";
    } catch {
      return "scroll";
    }
  }, [book?.currentLocation]);
  const [selectedMode, setSelectedMode] = useState<ReadingMode>(restoredMode);
  const summaryByChapterIndex = useMemo(() => {
    const next = new Map<number, AiSummary>();

    summaries.forEach((summary) => {
      if (
        summary.scope === "CHAPTER" &&
        typeof summary.chapterIndex === "number"
      ) {
        next.set(summary.chapterIndex, summary);
      }
    });

    return next;
  }, [summaries]);

  useEffect(() => {
    setSelectedMode(restoredMode);
  }, [bookId, restoredMode]);

  useEffect(() => {
    let cancelled = false;

    if (!book?.fileUri) {
      setChapters([]);
      setChaptersLoading(false);
      setChaptersError(null);
      return;
    }

    setChaptersLoading(true);
    setChaptersError(null);

    loadEpubDocument(book.fileUri)
      .then((document) => {
        if (!cancelled) {
          setChapters(document.chapters);
        }
      })
      .catch((error) => {
        if (!cancelled) {
          setChapters([]);
          setChaptersError(
            error instanceof Error
              ? error.message
              : "This EPUB chapter list could not be loaded."
          );
        }
      })
      .finally(() => {
        if (!cancelled) {
          setChaptersLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [book?.fileUri]);

  useEffect(() => {
    let cancelled = false;

    if (!book?.id || !session) {
      setSummaries([]);
      return;
    }

    listBookAiSummaries(book.id)
      .then((nextSummaries) => {
        if (!cancelled) {
          setSummaries(nextSummaries);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setSummaries([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [book?.id, session]);

  useEffect(() => {
    coverDropAnimation.setValue(0);
    Animated.timing(coverDropAnimation, {
      toValue: 1,
      duration: 760,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  }, [bookId, coverDropAnimation]);

  useEffect(() => {
    return () => {
      if (noteSaveLockTimerRef.current) {
        clearTimeout(noteSaveLockTimerRef.current);
      }
    };
  }, []);

  function openNoteEditor(item: KnowledgeItem) {
    if (item.type !== "note" || noteSaveLockRef.current) {
      return;
    }

    setEditingNote(item);
    setNoteEditorVisible(true);
  }

  function closeNoteEditor() {
    if (noteSaveLockRef.current) {
      return;
    }

    setNoteEditorVisible(false);
    setEditingNote(null);
  }

  function saveEditedNote(value: string) {
    const noteId = editingNote?.type === "note" ? editingNote.id : null;

    if (!noteId || noteSaveLockRef.current) {
      return;
    }

    noteSaveLockRef.current = true;
    Keyboard.dismiss();

    try {
      editNote(noteId, value);
      setNoteEditorVisible(false);
      setEditingNote(null);
    } catch (error) {
      showThemedAlert(
        "Could not save note",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      if (noteSaveLockTimerRef.current) {
        clearTimeout(noteSaveLockTimerRef.current);
      }

      noteSaveLockTimerRef.current = setTimeout(() => {
        noteSaveLockRef.current = false;
        noteSaveLockTimerRef.current = null;
      }, 500);
    }
  }

  if (!book) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: responsive.gutter,
        }}
      >
        <EmptyState
          icon={BookOpen}
          title="Book not found"
          body="This EPUB is no longer available in your local library."
        />
      </ScrollView>
    );
  }

  const progressPercent = Math.round(
    Math.min(Math.max(book.progress, 0), 1) * 100
  );
  const actionTitle = book.progress > 0 ? "Continue Reading" : "Start Reading";
  const bookIdForReading = book.id;
  const backupStatus = getBookBackupCopy(book);

  function openSelectedMode(chapterIndex?: number) {
    const params =
      typeof chapterIndex === "number"
        ? { bookId: bookIdForReading, chapterIndex: String(chapterIndex) }
        : { bookId: bookIdForReading };

    if (selectedMode === "book") {
      router.push({ pathname: "/book-reader/[bookId]", params });
      return;
    }

    if (selectedMode === "musician") {
      router.push({ pathname: "/musician-reader/[bookId]", params });
      return;
    }

    router.push({ pathname: "/reader/[bookId]", params });
  }

  function closeSummarySheet() {
    summaryRequestIdRef.current += 1;
    setSummarySheet(null);
  }

  function readSummaryChapter() {
    if (!summarySheet) {
      return;
    }

    const chapterIndex = summarySheet.chapterIndex;
    setSummarySheet(null);
    openSelectedMode(chapterIndex);
  }

  async function summarizeChapter(chapterIndex: number, chapterTitle: string) {
    const existingSummary = summaryByChapterIndex.get(chapterIndex) ?? null;
    const requestId = summaryRequestIdRef.current + 1;
    summaryRequestIdRef.current = requestId;

    setSummarySheet({
      chapterIndex,
      chapterTitle,
      summary: existingSummary,
      loading: !existingSummary,
      error: null,
    });

    if (existingSummary) {
      return;
    }

    if (!session) {
      setSummarySheet({
        chapterIndex,
        chapterTitle,
        summary: null,
        loading: false,
        error: "Sign in to generate and save chapter summaries.",
      });
      return;
    }

    const activeBook = book;

    if (!activeBook) {
      setSummarySheet({
        chapterIndex,
        chapterTitle,
        summary: null,
        loading: false,
        error: "This EPUB is no longer available in your local library.",
      });
      return;
    }

    try {
      const epub = await loadEpubDocument(activeBook.fileUri);
      const chapter = await epub.loadChapter(chapterIndex);
      const sourceText = truncateSummarySource(htmlToSummaryText(chapter.html));

      if (!sourceText) {
        throw new Error(
          "This chapter does not contain enough text to summarize."
        );
      }

      const result = await generateAiSummary({
        bookId: activeBook.id,
        scope: "CHAPTER",
        chapterIndex,
        language: "AUTO",
        sourceTitle: chapter.chapter.title,
        sourceText,
      });

      setSummaries((current) => {
        const withoutDuplicate = current.filter(
          (summary) => summary.id !== result.summary.id
        );
        return [result.summary, ...withoutDuplicate];
      });
      if (summaryRequestIdRef.current !== requestId) {
        return;
      }

      setSummarySheet({
        chapterIndex,
        chapterTitle,
        summary: result.summary,
        loading: false,
        error: null,
      });
    } catch (error) {
      if (summaryRequestIdRef.current !== requestId) {
        return;
      }

      setSummarySheet({
        chapterIndex,
        chapterTitle,
        summary: null,
        loading: false,
        error:
          error instanceof Error
            ? error.message
            : "Could not generate this chapter summary.",
      });
    }
  }

  function jumpToKnowledgeItem(item: KnowledgeItem) {
    router.push({
      pathname: "/reader/[bookId]",
      params: {
        bookId: item.bookId,
        chapterIndex: String(item.chapterIndex),
        offset: String(item.startOffset ?? 0),
      },
    });
  }

  function deleteKnowledgeItem(item: KnowledgeItem) {
    showThemedAlert(
      item.type === "highlight" ? "Delete highlight?" : "Delete note?",
      "This removes it from your local library.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            if (item.type === "note") {
              removeNote(item.id);
              return;
            }

            removeHighlight(item.id);
          },
        },
      ]
    );
  }

  const selectedModeIcon =
    selectedMode === "book"
      ? BookOpen
      : selectedMode === "musician"
      ? Music
      : ScrollText;

  const coverAnimatedStyle = {
    opacity: coverDropAnimation,
    transform: [
      {
        translateY: coverDropAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [-180, 0],
        }),
      },
      {
        scale: coverDropAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [0.94, 1],
        }),
      },
    ],
  };

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: responsive.isPhone
            ? spacing[5]
            : responsive.gutter,
          paddingTop: responsive.isPhone ? spacing[5] : responsive.gutter,
          paddingBottom: responsive.bottomInsetPadding,
        }}
      >
        <View
          style={{
            width: Math.min(
              responsive.pageWidth,
              responsive.isTablet ? 980 : responsive.maxContentWidth
            ),
            alignSelf: "center",
            gap: responsive.isPhone ? spacing[6] : spacing[8],
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to library"
            onPress={() => router.push("/library")}
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              opacity: pressed ? 0.72 : 1,
            })}
          >
            <AppText color="secondary" variant="footnote" weight="semibold">
              Library
            </AppText>
          </Pressable>

          <View
            style={{
              flexDirection: responsive.isPhone ? "column" : "row",
              alignItems: responsive.isPhone ? "center" : "flex-start",
              gap: responsive.isPhone ? spacing[6] : spacing[8],
            }}
          >
            <Animated.View
              style={[
                { width: responsive.isPhone ? 168 : 220 },
                coverAnimatedStyle,
              ]}
            >
              <BookCover
                uri={book.coverUri}
                accent={colors.brand.violet}
                progress={progressPercent}
              />
            </Animated.View>
            <View
              style={{
                flex: 1,
                minWidth: 0,
                width: responsive.isPhone ? "100%" : undefined,
                alignSelf: "stretch",
                gap: spacing[5],
              }}
            >
              <View style={{ gap: spacing[2] }}>
                <AppText
                  color="primary"
                  variant={responsive.isPhone ? "title2" : "display"}
                  weight="bold"
                  align={responsive.isPhone ? "center" : "left"}
                  numberOfLines={responsive.isPhone ? 3 : 4}
                  style={{ lineHeight: responsive.isPhone ? 42 : 66 }}
                >
                  {book.title}
                </AppText>
                <AppText
                  color="secondary"
                  variant="bodyLarge"
                  align={responsive.isPhone ? "center" : "left"}
                >
                  {book.author ?? "Unknown Author"}
                </AppText>
              </View>

              <Surface
                tone="quiet"
                style={{
                  width: "100%",
                  alignSelf: "stretch",
                  justifyContent: "center",
                  gap: spacing[3],
                  minHeight: responsive.isPhone ? 104 : 112,
                }}
              >
                <View
                  style={{
                    flexDirection: "row",
                    justifyContent: "space-between",
                    gap: spacing[3],
                  }}
                >
                  <AppText color="secondary" variant="footnote">
                    Reading progress
                  </AppText>
                  <AppText
                    color="primary"
                    variant="footnote"
                    weight="semibold"
                    style={{ fontVariant: ["tabular-nums"] }}
                  >
                    {progressPercent}%
                  </AppText>
                </View>
                <View
                  style={{
                    height: 6,
                    overflow: "hidden",
                    borderRadius: radii.pill,
                    backgroundColor: colors.background.panelStrong,
                  }}
                >
                  <View
                    style={{
                      width: `${progressPercent}%`,
                      height: "100%",
                      borderRadius: radii.pill,
                      backgroundColor: colors.brand.violet,
                    }}
                  />
                </View>
                <AppText color="tertiary" variant="caption">
                  Last opened {formatRelativeTime(book.lastOpenedAt)}
                </AppText>
              </Surface>

              <BackupStatusRow
                status={backupStatus.label}
                onPress={() =>
                  showThemedAlert(backupStatus.title, backupStatus.body, [
                    { text: "Not now", style: "cancel" },
                    {
                      text: "Open Sync & Backup",
                      onPress: () => router.push("/settings/sync"),
                    },
                  ])
                }
              />

              <Button
                title={actionTitle}
                icon={selectedModeIcon}
                variant="secondary"
                onPress={() => openSelectedMode()}
                style={{
                  alignSelf: responsive.isPhone ? "stretch" : "flex-start",
                }}
              />
            </View>
          </View>

          <View style={{ gap: spacing[3] }}>
            <View
              style={{
                flexDirection: "row",
                justifyContent: "space-between",
                gap: spacing[3],
              }}
            >
              <AppText color="primary" variant="title3" weight="semibold">
                Reading Mode
              </AppText>
              <AppText color="secondary" variant="footnote">
                Choose how this EPUB opens
              </AppText>
            </View>
            <Surface
              tone="quiet"
              padded={false}
              style={{
                borderRadius: radii.xl,
                gap: spacing[2],
                padding: spacing[2],
              }}
            >
              <View style={{ flexDirection: "row", gap: spacing[2] }}>
                <ModeOption
                  title="Scroll"
                  status={selectedMode === "scroll" ? "Selected" : "Ready"}
                  icon={ScrollText}
                  active={selectedMode === "scroll"}
                  onPress={() => setSelectedMode("scroll")}
                />
                <ModeOption
                  title="Book"
                  status={selectedMode === "book" ? "Selected" : "Ready"}
                  icon={BookOpen}
                  active={selectedMode === "book"}
                  onPress={() => setSelectedMode("book")}
                />
                <ModeOption
                  title="Musician"
                  status={selectedMode === "musician" ? "Selected" : "Ready"}
                  icon={Music}
                  active={selectedMode === "musician"}
                  onPress={() => setSelectedMode("musician")}
                />
              </View>
            </Surface>
          </View>

          <View style={{ gap: spacing[4] }}>
            <Surface
              tone="quiet"
              padded={false}
              style={{
                flexDirection: "row",
                gap: spacing[1],
                borderRadius: radii.pill,
                padding: spacing[1],
              }}
            >
              <DetailTabButton
                title="Chapters"
                active={activeTab === "chapters"}
                onPress={() => setActiveTab("chapters")}
              />
              <DetailTabButton
                title="Notes & Highlights"
                active={activeTab === "knowledge"}
                onPress={() => setActiveTab("knowledge")}
              />
            </Surface>

            {activeTab === "chapters" ? (
              <ChapterList
                chapters={chapters}
                loading={chaptersLoading}
                error={chaptersError}
                summaryByChapterIndex={summaryByChapterIndex}
                onReadChapter={(chapterIndex) => openSelectedMode(chapterIndex)}
                onSummarizeChapter={summarizeChapter}
              />
            ) : (
              <KnowledgePreview
                items={knowledgeItems}
                onJump={jumpToKnowledgeItem}
                onEditNote={openNoteEditor}
                onDelete={deleteKnowledgeItem}
                onViewAll={() =>
                  router.push(`/book-knowledge/${bookIdForReading}`)
                }
              />
            )}
          </View>
        </View>
      </ScrollView>
      <ChapterSummarySheet
        visible={Boolean(summarySheet)}
        chapterTitle={summarySheet?.chapterTitle ?? ""}
        summary={summarySheet?.summary ?? null}
        loading={summarySheet?.loading ?? false}
        error={summarySheet?.error ?? null}
        onClose={closeSummarySheet}
        onReadChapter={readSummaryChapter}
      />
      <NoteEditorModal
        visible={noteEditorVisible}
        initialValue={editingNote?.note ?? ""}
        onClose={closeNoteEditor}
        onSave={saveEditedNote}
      />
    </>
  );
}
