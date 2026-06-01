import { memo, useCallback, useMemo } from "react";
import { useRouter } from "expo-router";
import { BookOpen, Clock3, Plus } from "lucide-react-native";
import type { ListRenderItem } from "react-native";
import { Alert, FlatList, Pressable, View } from "react-native";

import { BookCover } from "@/components/books/book-cover";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineStatus } from "@/components/ui/inline-status";
import { SearchField } from "@/components/ui/search-field";
import { useAppTheme } from "@/design/app-theme-provider";
import { useResponsive } from "@/design/responsive";
import { spacing, typography } from "@/design/tokens";
import { useBooksStore } from "@/features/books/books-store";
import type { Book } from "@/features/books/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatRelativeTime } from "@/utils/date";

type BookTileProps = {
  book: Book;
  compact?: boolean;
  width: number;
  onSelectBook: (bookId: string) => void;
};

const BookTile = memo(function BookTile({
  book,
  compact,
  width,
  onSelectBook,
}: BookTileProps) {
  const { colors } = useAppTheme();
  const progress = Math.round(Math.min(Math.max(book.progress, 0), 1) * 100);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${book.title}`}
      onPress={() => onSelectBook(book.id)}
      style={({ pressed }) => ({
        width,
        gap: compact ? spacing[2] : spacing[3],
        opacity: pressed ? 0.78 : 1,
      })}
    >
      <BookCover
        uri={book.coverUri}
        accent={colors.brand.violet}
        progress={progress}
        compact={compact}
      />
      <View style={{ gap: compact ? spacing[1] : spacing[2] }}>
        <AppText
          color="primary"
          variant={compact ? "footnote" : "title3"}
          weight={compact ? "semibold" : "regular"}
          numberOfLines={2}
          style={{
            lineHeight: compact
              ? typography.lineHeight.footnote + 2
              : typography.lineHeight.title3 + 4,
          }}
        >
          {book.title}
        </AppText>
        <AppText
          color="secondary"
          variant={compact ? "footnote" : "bodyLarge"}
          numberOfLines={2}
          style={{
            lineHeight: compact ? 20 : typography.lineHeight.bodyLarge + 4,
          }}
        >
          {book.author ?? "Unknown Author"}
        </AppText>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
          <Clock3
            color={colors.text.secondary}
            size={compact ? 11 : 14}
            strokeWidth={1.9}
          />
          <AppText
            color="secondary"
            variant={compact ? "caption" : "footnote"}
            numberOfLines={1}
            style={compact ? { fontSize: 11, lineHeight: 14 } : undefined}
          >
            {formatRelativeTime(book.lastOpenedAt ?? book.createdAt)}
          </AppText>
        </View>
      </View>
    </Pressable>
  );
});

function EmptyLibrary({
  compact,
  hasSearch,
}: {
  compact?: boolean;
  hasSearch: boolean;
}) {
  return (
    <EmptyState
      compact={compact}
      icon={BookOpen}
      title={hasSearch ? "No books found" : "Your library is empty"}
      body={
        hasSearch
          ? "Try searching by another title or author."
          : "Import an EPUB to start building your offline reading workspace."
      }
    />
  );
}

export function LibraryScreen() {
  const responsive = useResponsive();
  const { colors } = useAppTheme();
  const router = useRouter();
  const books = useBooksStore((state) => state.books);
  const search = useBooksStore((state) => state.librarySearch);
  const debouncedSearch = useDebouncedValue(search, 120);
  const importState = useBooksStore((state) => state.importState);
  const importError = useBooksStore((state) => state.importError);
  const importBook = useBooksStore((state) => state.importBook);
  const setLibrarySearch = useBooksStore((state) => state.setLibrarySearch);
  const compact = responsive.libraryColumns >= 3;
  const gridWidth = responsive.pageWidth;
  const itemWidth =
    (gridWidth - responsive.gridGap * (responsive.libraryColumns - 1)) /
    responsive.libraryColumns;
  const hasSearch = search.trim().length > 0;
  const visibleBooks = useMemo(() => {
    const query = debouncedSearch.trim().toLowerCase();

    if (!query) {
      return books;
    }

    return books.filter((book) => {
      const author = book.author ?? "Unknown Author";
      return (
        book.title.toLowerCase().includes(query) ||
        author.toLowerCase().includes(query)
      );
    });
  }, [books, debouncedSearch]);

  const handleImportBook = useCallback(async () => {
    try {
      const result = await importBook();

      if (!result) {
        return;
      }

      Alert.alert(
        result.duplicate ? "Already imported" : "Book imported",
        result.book.title,
      );
    } catch (error) {
      Alert.alert(
        "Import failed",
        error instanceof Error ? error.message : "Please try another EPUB file.",
      );
    }
  }, [importBook]);

  const handleSelectBook = useCallback(
    (bookId: string) => {
      router.push(`/book/${bookId}`);
    },
    [router],
  );

  const renderBook = useCallback<ListRenderItem<Book>>(
    ({ item }) => (
      <BookTile
        book={item}
        compact={compact}
        width={itemWidth}
        onSelectBook={handleSelectBook}
      />
    ),
    [compact, handleSelectBook, itemWidth],
  );

  const header = (
    <View style={{ gap: compact ? spacing[4] : spacing[5], marginBottom: responsive.rowGap }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing[3],
        }}
      >
        <AppText color="primary" variant="title1" weight="bold" numberOfLines={1}>
          Library
        </AppText>
        <Button
          title={importState === "loading" ? "Importing" : "Import Book"}
          icon={Plus}
          variant="secondary"
          disabled={importState === "loading"}
          onPress={handleImportBook}
          style={{ minHeight: responsive.touchTarget, paddingHorizontal: spacing[3] }}
        />
      </View>

      <SearchField
        compact={compact}
        value={search}
        onChangeText={setLibrarySearch}
        placeholder="Search books..."
      />
      {importState === "loading" ? (
        <InlineStatus tone="loading" message="Copying EPUB into local storage..." />
      ) : null}
      {importError ? <InlineStatus tone="warning" message={importError} /> : null}

      <View
        style={{
          height: 1,
          backgroundColor: colors.border.subtle,
        }}
      />
    </View>
  );

  return (
    <FlatList
      key={`library-${responsive.libraryColumns}`}
      data={visibleBooks}
      renderItem={renderBook}
      keyExtractor={(book) => book.id}
      numColumns={responsive.libraryColumns}
      ListHeaderComponent={header}
      ListEmptyComponent={<EmptyLibrary compact={compact} hasSearch={hasSearch} />}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      columnWrapperStyle={{
        gap: responsive.gridGap,
        marginBottom: responsive.rowGap,
      }}
      contentContainerStyle={{
        width: gridWidth,
        alignSelf: "center",
        paddingTop: responsive.isPhone ? spacing[5] : responsive.gutter,
        paddingBottom: responsive.bottomInsetPadding,
      }}
      {...responsive.listPerformance}
    />
  );
}
