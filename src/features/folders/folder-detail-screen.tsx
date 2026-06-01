import { useLocalSearchParams, useRouter } from "expo-router";
import {
  BookOpen,
  ChevronRight,
  Check,
  FolderOpen,
  Pencil,
  Plus,
  Trash2,
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

import { BookCard } from "@/components/books/book-card";
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
    <View
      style={{
        minHeight: 70,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
        paddingVertical: spacing[2],
      }}
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${book.title}`}
        onPress={() => onOpen(book)}
        style={({ pressed }) => ({
          flex: 1,
          minWidth: 0,
          flexDirection: "row",
          alignItems: "center",
          gap: spacing[3],
          opacity: pressed ? 0.72 : 1,
        })}
      >
        <View style={{ width: 42 }}>
          <BookCover uri={book.coverUri} accent={colors.brand.violet} compact />
        </View>
        <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
          <AppText
            color="primary"
            variant="body"
            weight="semibold"
            numberOfLines={1}
          >
            {book.title}
          </AppText>
          <AppText color="secondary" variant="caption" numberOfLines={1}>
            {book.author ?? "Unknown Author"} ·{" "}
            {formatRelativeTime(book.lastOpenedAt ?? book.createdAt)}
          </AppText>
        </View>
        <ChevronRight color={colors.text.tertiary} size={18} strokeWidth={2} />
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Remove ${book.title} from folder`}
        onPress={() => onRemove(book.id)}
        style={({ pressed }) => ({
          minHeight: 36,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.pill,
          opacity: pressed ? 0.72 : 1,
          paddingHorizontal: spacing[2],
        })}
      >
        <AppText color="tertiary" variant="caption" weight="semibold">
          Remove
        </AppText>
      </Pressable>
    </View>
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
  const [selectedBookIds, setSelectedBookIds] = useState<string[]>([]);
  const [addSaving, setAddSaving] = useState(false);

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
    <>
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
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to folders"
          onPress={() => router.push("/folders")}
          style={({ pressed }) => ({
            alignSelf: "flex-start",
            opacity: pressed ? 0.72 : 1,
          })}
        >
          <AppText color="secondary" variant="footnote" weight="semibold">
            Folders
          </AppText>
        </Pressable>

        <Surface
          tone="quiet"
          style={{
            gap: responsive.isPhone ? spacing[3] : spacing[4],
            padding: responsive.isPhone ? spacing[4] : spacing[5],
          }}
        >
          <View
            style={{
              gap: spacing[1],
            }}
          >
            <View style={{ minWidth: 0, gap: spacing[1] }}>
              <AppText
                color="primary"
                variant={responsive.isPhone ? "title2" : "title1"}
                weight="bold"
                numberOfLines={1}
                style={{ lineHeight: 38 }}
              >
                {activeFolder.name}
              </AppText>
              <AppText
                color="secondary"
                variant={responsive.isPhone ? "footnote" : "body"}
              >
                {activeFolder.bookCount}{" "}
                {activeFolder.bookCount === 1 ? "book" : "books"}
              </AppText>
            </View>
          </View>

          <View style={{ height: 1, backgroundColor: colors.border.subtle }} />

          <View
            style={{
              flexDirection: "row",
              gap: spacing[2],
            }}
          >
            <Button
              title="Delete"
              icon={Trash2}
              variant="ghost"
              onPress={handleDeleteFolder}
              style={{
                flexShrink: 0,
                minHeight: responsive.isPhone ? 38 : 42,
                paddingHorizontal: responsive.isPhone ? spacing[2] : spacing[3],
              }}
            />
            <Button
              title="Rename"
              icon={Pencil}
              variant="ghost"
              onPress={() => {
                setRenameError(null);
                setRenameVisible(true);
              }}
              style={{
                flexShrink: 0,
                minHeight: responsive.isPhone ? 38 : 42,
                paddingHorizontal: responsive.isPhone ? spacing[2] : spacing[3],
              }}
            />
            <Button
              title="Add Books"
              icon={Plus}
              variant="secondary"
              onPress={openAddBooks}
              style={{
                flexShrink: 0,
                minHeight: responsive.isPhone ? 38 : 42,
                paddingHorizontal: responsive.isPhone ? spacing[2] : spacing[3],
              }}
            />
          </View>
        </Surface>

        <View style={{ gap: responsive.isPhone ? spacing[2] : spacing[3] }}>
          <AppText
            color="primary"
            variant={responsive.isPhone ? "bodyLarge" : "title3"}
            weight="semibold"
          >
            Books
          </AppText>
          {folderBooks.length > 0 ? (
            responsive.isPhone ? (
              <View
                style={{
                  borderTopWidth: 1,
                  borderTopColor: colors.border.subtle,
                }}
              >
                {folderBooks.map((book) => (
                  <FolderBookRow
                    key={book.id}
                    book={book}
                    onOpen={(selectedBook) =>
                      router.push(`/book/${selectedBook.id}`)
                    }
                    onRemove={handleRemoveBook}
                  />
                ))}
              </View>
            ) : (
              <View style={{ gap: spacing[3] }}>
                {folderBooks.map((book) => (
                  <View key={book.id} style={{ gap: spacing[2] }}>
                    <BookCard
                      book={book}
                      layout="list"
                      onPress={(selectedBook) =>
                        router.push(`/book/${selectedBook.id}`)
                      }
                    />
                    <Button
                      title="Remove from folder"
                      variant="ghost"
                      onPress={() => handleRemoveBook(book.id)}
                      style={{
                        alignSelf: "flex-end",
                        minHeight: 34,
                        paddingHorizontal: spacing[3],
                      }}
                    />
                  </View>
                ))}
              </View>
            )
          ) : (
            <EmptyState
              compact={responsive.isPhone}
              icon={BookOpen}
              title="No books in this folder"
              body="Add books from your local Library. EPUB files will stay where they are."
            />
          )}
        </View>
      </ScrollView>

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
    </>
  );
}
