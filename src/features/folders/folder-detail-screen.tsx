import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  Bookmark,
  BookOpen,
  Check,
  EllipsisVertical,
  FileText,
  FolderOpen,
  Grid2X2,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { BookCover } from "@/components/books/book-cover";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchField } from "@/components/ui/search-field";
import { Surface } from "@/components/ui/surface";
import { useAppTheme } from "@/design/app-theme-provider";
import { useResponsive } from "@/design/responsive";
import { radii, spacing } from "@/design/tokens";
import { useBooksStore } from "@/features/books/books-store";
import type { Book } from "@/features/books/types";
import { FolderNameModal } from "@/features/folders/folder-name-modal";

const folderIcons = {
  folder: FolderOpen,
  book: BookOpen,
  bookmark: Bookmark,
  file: FileText,
  star: Star,
} as const;

function getFolderIcon(icon: string) {
  return folderIcons[icon as keyof typeof folderIcons] ?? FolderOpen;
}
import { formatRelativeTime } from "@/utils/date";

function AddBooksModal({
  visible,
  books,
  libraryBookCount,
  selectedBookIds,
  query,
  saving,
  onQueryChange,
  onToggleBook,
  onClose,
  onSubmit,
}: {
  visible: boolean;
  books: Book[];
  libraryBookCount: number;
  selectedBookIds: string[];
  query: string;
  saving?: boolean;
  onQueryChange: (query: string) => void;
  onToggleBook: (bookId: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const responsive = useResponsive();
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const bottomInset = Math.max(insets.bottom, spacing[8]);
  const selectedSet = useMemo(
    () => new Set(selectedBookIds),
    [selectedBookIds]
  );
  const filteredBooks = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return books;
    }

    return books.filter((book) => {
      const author = book.author ?? "Unknown Author";
      return (
        book.title.toLowerCase().includes(normalizedQuery) ||
        author.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [books, query]);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
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
            backgroundColor: "rgba(0,0,0,0.44)",
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close add books"
            onPress={onClose}
            style={{
              position: "absolute",
              top: 0,
              right: 0,
              bottom: 0,
              left: 0,
            }}
          />
          <View
            style={{
              maxHeight: responsive.height * (responsive.isPhone ? 0.78 : 0.82),
              gap: responsive.isPhone ? spacing[3] : spacing[4],
              borderTopLeftRadius: radii.xxl,
              borderTopRightRadius: radii.xxl,
              borderWidth: 1,
              borderColor: colors.border.subtle,
              backgroundColor: colors.background.elevated,
              padding: responsive.isPhone ? spacing[4] : spacing[5],
              paddingBottom:
                (responsive.isPhone ? spacing[4] : spacing[5]) + bottomInset,
            }}
          >
            <View style={{ gap: spacing[1] }}>
              <AppText color="primary" variant="title3" weight="semibold">
                Add Books
              </AppText>
              <AppText color="secondary" variant="footnote">
                Add existing imported books. This does not duplicate files.
              </AppText>
            </View>

            <SearchField
              compact={responsive.isPhone}
              value={query}
              onChangeText={onQueryChange}
              placeholder="Search library..."
            />

            <ScrollView
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{
                gap: spacing[3],
                paddingBottom: spacing[2],
              }}
            >
              {filteredBooks.length > 0 ? (
                filteredBooks.map((book) => {
                  const selected = selectedSet.has(book.id);

                  return (
                    <Pressable
                      key={book.id}
                      accessibilityRole="checkbox"
                      accessibilityState={{ checked: selected }}
                      onPress={() => onToggleBook(book.id)}
                      style={({ pressed }) => ({
                        opacity: pressed ? 0.78 : 1,
                      })}
                    >
                      <Surface
                        tone="quiet"
                        style={{
                          minHeight: responsive.isPhone ? 68 : 82,
                          flexDirection: "row",
                          alignItems: "center",
                          gap: responsive.isPhone ? spacing[2] : spacing[3],
                          padding: responsive.isPhone ? spacing[2] : spacing[3],
                        }}
                      >
                        <View style={{ width: responsive.isPhone ? 44 : 52 }}>
                          <BookCover
                            uri={book.coverUri}
                            accent={colors.brand.violet}
                            compact
                          />
                        </View>
                        <View style={{ flex: 1, minWidth: 0 }}>
                          <AppText
                            color="primary"
                            variant={responsive.isPhone ? "footnote" : "body"}
                            weight="semibold"
                            numberOfLines={2}
                          >
                            {book.title}
                          </AppText>
                          <AppText
                            color="secondary"
                            variant="caption"
                            numberOfLines={1}
                          >
                            {book.author ?? "Unknown Author"}
                          </AppText>
                        </View>
                        <View
                          style={{
                            width: responsive.isPhone ? 24 : 28,
                            height: responsive.isPhone ? 24 : 28,
                            alignItems: "center",
                            justifyContent: "center",
                            borderRadius: radii.pill,
                            borderWidth: 1,
                            borderColor: selected
                              ? colors.brand.violet
                              : colors.border.default,
                            backgroundColor: selected
                              ? colors.brand.violet
                              : "transparent",
                          }}
                        >
                          {selected ? (
                            <Check
                              color="#FFFFFF"
                              size={responsive.isPhone ? 14 : 16}
                              strokeWidth={2.4}
                            />
                          ) : null}
                        </View>
                      </Surface>
                    </Pressable>
                  );
                })
              ) : (
                <EmptyState
                  compact
                  icon={BookOpen}
                  title={
                    libraryBookCount === 0
                      ? "No books available"
                      : books.length === 0
                      ? "All books added"
                      : "No matches"
                  }
                  body={
                    libraryBookCount === 0
                      ? "Import EPUBs from Library before adding them to folders."
                      : books.length === 0
                      ? "All library books are already in this folder."
                      : "Try another title or author."
                  }
                />
              )}
            </ScrollView>

            <View style={{ flexDirection: "row", gap: spacing[3] }}>
              <Button
                title="Cancel"
                variant="ghost"
                onPress={onClose}
                style={{ flex: 1 }}
              />
              <Button
                title={saving ? "Adding..." : `Add (${selectedBookIds.length})`}
                variant="secondary"
                disabled={saving || selectedBookIds.length === 0}
                onPress={onSubmit}
                style={{ flex: 1 }}
              />
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function FolderBookRow({
  book,
  onOpen,
  onRemove,
}: {
  book: Book;
  onOpen: (book: Book) => void;
  onRemove: (bookId: string) => void;
}) {
  const { colors } = useAppTheme();

  return (
    <Surface tone="quiet" style={{ padding: spacing[2] }}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${book.title}`}
        onPress={() => onOpen(book)}
        style={({ pressed }) => ({
          flexDirection: "row",
          alignItems: "center",
          gap: spacing[3],
          opacity: pressed ? 0.72 : 1,
        })}
      >
        <View style={{ width: 68 }}>
          <BookCover uri={book.coverUri} accent={colors.brand.violet} compact />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: spacing[1] }}>
          <AppText
            color="primary"
            variant="bodyLarge"
            weight="semibold"
            numberOfLines={1}
          >
            {book.title}
          </AppText>
          <AppText color="secondary" variant="footnote" numberOfLines={1}>
            {book.author ?? "Unknown Author"}
          </AppText>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
            <View
              style={{
                borderRadius: radii.sm,
                backgroundColor: colors.surface.soft,
                paddingHorizontal: spacing[2],
                paddingVertical: 2,
              }}
            >
              <AppText color="secondary" variant="caption" weight="bold">
                EPUB
              </AppText>
            </View>
            <AppText color="tertiary" variant="caption" numberOfLines={1}>
              {formatRelativeTime(book.lastOpenedAt ?? book.createdAt)}
            </AppText>
          </View>
        </View>
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${book.title} from folder`}
        onPress={() => onRemove(book.id)}
        style={({ pressed }) => ({
          position: "absolute",
          right: spacing[2],
          top: spacing[2],
          width: 36,
          height: 36,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.pill,
          opacity: pressed ? 0.72 : 1,
        })}
      >
        <EllipsisVertical color={colors.text.tertiary} size={20} strokeWidth={2.1} />
      </Pressable>
    </Surface>
  );
}

export function FolderDetailScreen() {
  const router = useRouter();
  const responsive = useResponsive();
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ folderId: string }>();
  const folderId = Array.isArray(params.folderId)
    ? params.folderId[0]
    : params.folderId;
  const folders = useBooksStore((state) => state.folders);
  const libraryBookCount = useBooksStore((state) => state.books.length);
  const getFolderBooks = useBooksStore((state) => state.getFolderBooks);
  const getAvailableBooksForFolder = useBooksStore(
    (state) => state.getAvailableBooksForFolder
  );
  const renameFolder = useBooksStore((state) => state.renameFolder);
  const deleteFolder = useBooksStore((state) => state.deleteFolder);
  const addBooksToFolder = useBooksStore((state) => state.addBooksToFolder);
  const removeBookFromFolder = useBooksStore(
    (state) => state.removeBookFromFolder
  );
  const folder = folders.find((item) => item.id === folderId);
  const folderBooks = useMemo(
    () => (folderId ? getFolderBooks(folderId) : []),
    [folderId, folders, getFolderBooks]
  );
  const availableBooks = useMemo(
    () => (folderId ? getAvailableBooksForFolder(folderId) : []),
    [folderId, folders, getAvailableBooksForFolder]
  );
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renameSaving, setRenameSaving] = useState(false);
  const [addVisible, setAddVisible] = useState(false);
  const [addQuery, setAddQuery] = useState("");
  const [bookQuery, setBookQuery] = useState("");
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [addSaving, setAddSaving] = useState(false);
  const visibleFolderBooks = useMemo(() => {
    const normalizedQuery = bookQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return folderBooks;
    }

    return folderBooks.filter((book) => {
      const author = book.author ?? "Unknown Author";
      return (
        book.title.toLowerCase().includes(normalizedQuery) ||
        author.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [bookQuery, folderBooks]);

  if (!folder || !folderId) {
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
          icon={FolderOpen}
          title="Folder not found"
          body="This folder was deleted or is no longer available."
        />
        <Button
          title="Back to Folders"
          variant="secondary"
          onPress={() => router.replace("/folders")}
          style={{ alignSelf: "center", marginTop: spacing[4] }}
        />
      </ScrollView>
    );
  }
  const activeFolder = folder;
  const ActiveFolderIcon = getFolderIcon(activeFolder.icon);
  const activeFolderAccent = activeFolder.accentColor || colors.brand.violet;

  function handleRename(name: string) {
    if (!folderId) {
      return;
    }

    setRenameSaving(true);
    setRenameError(null);

    try {
      renameFolder(folderId, name);
      setRenameVisible(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Folder could not be renamed.";
      setRenameError(message);
      Alert.alert("Could not rename folder", message);
    } finally {
      setRenameSaving(false);
    }
  }

  function handleDeleteFolder() {
    Alert.alert(
      "Delete folder?",
      "Books inside this folder will remain in your Library.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: () => {
            try {
              deleteFolder(activeFolder.id);
              router.replace("/folders");
            } catch (error) {
              Alert.alert(
                "Could not delete folder",
                error instanceof Error ? error.message : "Please try again."
              );
            }
          },
        },
      ]
    );
  }

  function toggleBook(bookId: string) {
    setSelectedBookIds((current) =>
      current.includes(bookId)
        ? current.filter((item) => item !== bookId)
        : [...current, bookId]
    );
  }

  function openAddBooks() {
    setAddQuery("");
    setSelectedBookIds([]);
    setAddVisible(true);
  }

  function handleAddBooks() {
    setAddSaving(true);

    try {
      addBooksToFolder(activeFolder.id, selectedBookIds);
      setAddVisible(false);
      setSelectedBookIds([]);
      setAddQuery("");
    } catch (error) {
      Alert.alert(
        "Could not add books",
        error instanceof Error ? error.message : "Please try again."
      );
    } finally {
      setAddSaving(false);
    }
  }

  function handleRemoveBook(bookId: string) {
    try {
      removeBookFromFolder(activeFolder.id, bookId);
    } catch (error) {
      Alert.alert(
        "Could not remove book",
        error instanceof Error ? error.message : "Please try again."
      );
    }
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          width: Math.min(
            responsive.pageWidth,
            responsive.isTablet ? 920 : responsive.maxContentWidth
          ),
          alignSelf: "center",
          paddingTop: responsive.isPhone ? spacing[5] : responsive.gutter,
          paddingBottom: responsive.bottomInsetPadding,
          gap: responsive.isPhone ? spacing[4] : spacing[6],
        }}
      >
        <View style={{ gap: spacing[4] }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              gap: spacing[2],
            }}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Back to folders"
              onPress={() => router.push("/folders")}
              style={({ pressed }) => ({
                width: 42,
                height: 42,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radii.pill,
                opacity: pressed ? 0.72 : 1,
              })}
            >
              <ArrowLeft color={colors.brand.violet} size={24} strokeWidth={2.1} />
            </Pressable>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText color="secondary" variant="caption" numberOfLines={1}>
                Library &gt; {activeFolder.name}
              </AppText>
              <View
                style={{
                  flexDirection: "row",
                  alignItems: "center",
                  gap: spacing[2],
                }}
              >
                <ActiveFolderIcon
                  color={activeFolderAccent}
                  size={responsive.isPhone ? 21 : 25}
                  strokeWidth={2.1}
                />
                <AppText
                  color="primary"
                  variant={responsive.isPhone ? "title2" : "title1"}
                  weight="bold"
                  numberOfLines={1}
                  style={{ flex: 1, minWidth: 0 }}
                >
                  {activeFolder.name}
                </AppText>
              </View>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Search in folder"
              onPress={() => undefined}
              style={({ pressed }) => ({
                width: 42,
                height: 42,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radii.pill,
                opacity: pressed ? 0.72 : 1,
              })}
            >
              <Search color={colors.brand.violet} size={23} strokeWidth={2.1} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Folder options"
              onPress={() =>
                Alert.alert(activeFolder.name, "Folder actions", [
                  {
                    text: "Rename",
                    onPress: () => {
                      setRenameError(null);
                      setRenameVisible(true);
                    },
                  },
                  { text: "Delete", style: "destructive", onPress: handleDeleteFolder },
                  { text: "Cancel", style: "cancel" },
                ])
              }
              style={({ pressed }) => ({
                width: 42,
                height: 42,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radii.pill,
                opacity: pressed ? 0.72 : 1,
              })}
            >
              <EllipsisVertical color={colors.brand.violet} size={23} strokeWidth={2.2} />
            </Pressable>
          </View>
          <SearchField
            compact={responsive.isPhone}
            value={bookQuery}
            onChangeText={setBookQuery}
            placeholder={`Search in ${activeFolder.name}`}
          />
        </View>

        <View style={{ gap: responsive.isPhone ? spacing[2] : spacing[3] }}>
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "space-between",
              gap: spacing[3],
            }}
          >
            <AppText
              color="primary"
              variant={responsive.isPhone ? "bodyLarge" : "title3"}
              weight="semibold"
            >
              Books
            </AppText>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
              <SlidersHorizontal color={colors.text.secondary} size={22} strokeWidth={2.1} />
              <Grid2X2 color={colors.text.secondary} size={22} strokeWidth={2.1} />
            </View>
          </View>

          {visibleFolderBooks.length > 0 ? (
            <View style={{ gap: spacing[3] }}>
              {visibleFolderBooks.map((book) => (
                <FolderBookRow
                  key={book.id}
                  book={book}
                  onOpen={(selectedBook) => router.push(`/book/${selectedBook.id}`)}
                  onRemove={(bookId) =>
                    Alert.alert("Remove from folder?", "The book stays in your Library.", [
                      { text: "Cancel", style: "cancel" },
                      {
                        text: "Remove",
                        style: "destructive",
                        onPress: () => handleRemoveBook(bookId),
                      },
                    ])
                  }
                />
              ))}
            </View>
          ) : (
            <EmptyState
              compact={responsive.isPhone}
              icon={BookOpen}
              title={folderBooks.length === 0 ? "No books in this folder" : "No matches"}
              body={
                folderBooks.length === 0
                  ? "Add books from your local Library. EPUB files will stay where they are."
                  : "Try another title or author."
              }
            />
          )}
        </View>
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add books"
        onPress={openAddBooks}
        style={({ pressed }) => ({
          position: "absolute",
          right: responsive.gutter,
          bottom: responsive.bottomInsetPadding - spacing[4],
          width: responsive.isPhone ? 58 : 64,
          height: responsive.isPhone ? 58 : 64,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.lg,
          backgroundColor: colors.brand.violet,
          opacity: pressed ? 0.76 : 1,
        })}
      >
        <Plus color="#FFFFFF" size={29} strokeWidth={2.4} />
      </Pressable>

      <FolderNameModal
        visible={renameVisible}
        title="Rename Folder"
        initialValue={activeFolder.name}
        error={renameError}
        saving={renameSaving}
        onClose={() => {
          if (!renameSaving) {
            setRenameVisible(false);
            setRenameError(null);
          }
        }}
        onSubmit={handleRename}
      />

      <AddBooksModal
        visible={addVisible}
        books={availableBooks}
        libraryBookCount={libraryBookCount}
        selectedBookIds={selectedBookIds}
        query={addQuery}
        saving={addSaving}
        onQueryChange={setAddQuery}
        onToggleBook={toggleBook}
        onClose={() => {
          if (!addSaving) {
            setAddVisible(false);
          }
        }}
        onSubmit={handleAddBooks}
      />
    </View>
  );
}
