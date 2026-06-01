import { useLocalSearchParams, useRouter } from "expo-router";
import { BookOpen, Sparkles } from "lucide-react-native";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
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

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useAppTheme } from "@/design/app-theme-provider";
import { useResponsive } from "@/design/responsive";
import { radii, spacing } from "@/design/tokens";
import { BookKnowledgeCard } from "@/features/book-detail/book-knowledge-card";
import { useBooksStore } from "@/features/books/books-store";
import type { KnowledgeItem } from "@/features/books/types";

type KnowledgeFilter = "all" | "highlights" | "notes";

const filterOptions: { label: string; value: KnowledgeFilter }[] = [
  { label: "All", value: "all" },
  { label: "Highlights", value: "highlights" },
  { label: "Notes", value: "notes" },
];

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

export function BookKnowledgeScreen() {
  const router = useRouter();
  const responsive = useResponsive();
  const { colors } = useAppTheme();
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
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<KnowledgeFilter>("all");
  const [editingNote, setEditingNote] = useState<KnowledgeItem | null>(null);
  const [noteEditorVisible, setNoteEditorVisible] = useState(false);
  const noteSaveLockRef = useRef(false);
  const noteSaveLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const bookItems = useMemo(
    () => allKnowledgeItems.filter((item) => item.bookId === bookId),
    [allKnowledgeItems, bookId]
  );
  const filteredItems = useMemo(() => {
    const byType =
      filter === "all"
        ? bookItems
        : bookItems.filter((item) => item.type === filter.slice(0, -1));
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return byType;
    }

    return byType.filter(
      (item) =>
        item.text.toLowerCase().includes(normalizedQuery) ||
        (item.note ?? "").toLowerCase().includes(normalizedQuery)
    );
  }, [bookItems, filter, query]);

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
      Alert.alert(
        "Could not save note",
        error instanceof Error ? error.message : "Please try again.",
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
    Alert.alert(
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

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: responsive.isPhone ? spacing[5] : responsive.gutter,
          paddingTop: responsive.isPhone ? spacing[5] : responsive.gutter,
          paddingBottom: responsive.bottomInsetPadding,
        }}
      >
        <View
          style={{
            width: Math.min(
              responsive.pageWidth,
              responsive.isTablet ? 920 : responsive.maxContentWidth
            ),
            alignSelf: "center",
            gap: responsive.isPhone ? spacing[5] : spacing[6],
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back to book detail"
            onPress={() => router.push(`/book/${book.id}`)}
            style={({ pressed }) => ({
              alignSelf: "flex-start",
              opacity: pressed ? 0.72 : 1,
            })}
          >
            <AppText color="secondary" variant="footnote" weight="semibold">
              Back to Book
            </AppText>
          </Pressable>

        <View style={{ gap: spacing[2] }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[2],
            }}
          >
            <Sparkles color={colors.text.secondary} size={20} strokeWidth={2} />
            <AppText
              color="primary"
              variant={responsive.isPhone ? "title2" : "display"}
              weight="bold"
            >
              Notes & Highlights
            </AppText>
          </View>
          <AppText color="secondary" variant="body" numberOfLines={2} style={{ lineHeight: 30 }}>
            {book.title} · {bookItems.length} saved
          </AppText>
        </View>

        <View style={{ gap: spacing[3] }}>
          <SearchField
            compact={responsive.isPhone}
            placeholder="Search this book..."
            value={query}
            onChangeText={setQuery}
          />
          <SegmentedControl
            compact={responsive.isPhone}
            options={filterOptions}
            value={filter}
            onChange={setFilter}
          />
        </View>

        <View style={{ gap: spacing[3] }}>
          {filteredItems.length > 0 ? (
            filteredItems.map((item) => (
              <BookKnowledgeCard
                key={`${item.type}-${item.id}`}
                item={item}
                expanded
                onJump={jumpToKnowledgeItem}
                onEditNote={openNoteEditor}
                onDelete={deleteKnowledgeItem}
              />
            ))
          ) : (
            <EmptyState
              compact
              icon={BookOpen}
              title="Nothing found"
              body="Try a different search or filter."
            />
          )}
        </View>
        </View>
      </ScrollView>
      <NoteEditorModal
        visible={noteEditorVisible}
        initialValue={editingNote?.note ?? ""}
        onClose={closeNoteEditor}
        onSave={saveEditedNote}
      />
    </>
  );
}
