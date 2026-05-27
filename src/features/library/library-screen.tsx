import { useMemo } from "react";
import { useRouter } from "expo-router";
import { Clock3, Plus, Search } from "lucide-react-native";
import { ActivityIndicator, Alert, Pressable, ScrollView, TextInput, View } from "react-native";

import { BookCover } from "@/components/books/book-cover";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { useResponsive } from "@/design/responsive";
import { colors, spacing } from "@/design/tokens";
import { useBooksStore } from "@/features/books/books-store";
import type { Book } from "@/features/books/types";
import { formatRelativeTime } from "@/utils/date";

function SearchField({
  compact,
  value,
  onChangeText,
}: {
  compact?: boolean;
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View
      style={{
        minHeight: compact ? 54 : 66,
        flexDirection: "row",
        alignItems: "center",
        gap: compact ? spacing[2] : spacing[3],
        borderRadius: compact ? 16 : 18,
        backgroundColor: colors.background.panelStrong,
        paddingHorizontal: compact ? spacing[3] : spacing[4],
      }}
    >
      <Search color={colors.text.tertiary} size={compact ? 22 : 26} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search books..."
        placeholderTextColor={colors.text.tertiary}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          flex: 1,
          color: colors.text.primary,
          fontSize: compact ? 15 : 17,
          lineHeight: compact ? 21 : 25,
          fontWeight: "500",
          paddingVertical: 0,
        }}
      />
    </View>
  );
}

function BookTile({
  book,
  compact,
  onPress,
}: {
  book: Book;
  compact?: boolean;
  onPress: () => void;
}) {
  const progress = Math.round(book.progress * 100);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${book.title}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        gap: compact ? spacing[2] : spacing[3],
        minWidth: 0,
        opacity: pressed ? 0.78 : 1,
      })}
    >
      <BookCover
        uri={book.coverUri}
        accent="#FFFFFF"
        progress={progress}
        compact={compact}
      />
      <View style={{ gap: compact ? spacing[1] : spacing[2] }}>
        <AppText
          color="primary"
          variant={compact ? "footnote" : "title3"}
          weight={compact ? "semibold" : "regular"}
          numberOfLines={1}
        >
          {book.title}
        </AppText>
        <AppText
          color="secondary"
          variant={compact ? "caption" : "bodyLarge"}
          numberOfLines={1}
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
        {book.progress > 0 ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
            <AppText color="tertiary" variant="caption" numberOfLines={1}>
              {progress}% complete
            </AppText>
          </View>
        ) : null}
      </View>
    </Pressable>
  );
}

function BookGrid({
  books,
  columns,
  onSelectBook,
}: {
  books: Book[];
  columns: number;
  onSelectBook: (bookId: string) => void;
}) {
  const rows: Book[][] = [];
  const compact = columns >= 3;
  const columnGap = columns >= 5 ? spacing[4] : compact ? spacing[3] : spacing[7];
  const rowGap = compact ? spacing[6] : spacing[8];

  for (let index = 0; index < books.length; index += columns) {
    rows.push(books.slice(index, index + columns));
  }

  return (
    <View style={{ gap: rowGap }}>
      {rows.map((row) => (
        <View
          key={row.map((book) => book.id).join("-")}
          style={{ flexDirection: "row", gap: columnGap }}
        >
          {row.map((book) => (
            <BookTile
              key={book.id}
              book={book}
              compact={compact}
              onPress={() => onSelectBook(book.id)}
            />
          ))}
          {Array.from({ length: columns - row.length }).map((_, index) => (
            <View key={`empty-${index}`} style={{ flex: 1 }} />
          ))}
        </View>
      ))}
    </View>
  );
}

function EmptyLibrary() {
  return (
    <View
      style={{
        alignItems: "center",
        gap: spacing[3],
        borderRadius: 18,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.border.subtle,
        backgroundColor: colors.background.canvas,
        paddingHorizontal: spacing[6],
        paddingVertical: spacing[10],
      }}
    >
      <AppText color="primary" variant="title3" weight="semibold" align="center">
        Your library is empty
      </AppText>
      <AppText color="secondary" variant="body" align="center">
        Import an EPUB to start building your offline reading workspace.
      </AppText>
    </View>
  );
}

export function LibraryScreen() {
  const responsive = useResponsive();
  const router = useRouter();
  const books = useBooksStore((state) => state.books);
  const search = useBooksStore((state) => state.librarySearch);
  const importState = useBooksStore((state) => state.importState);
  const importError = useBooksStore((state) => state.importError);
  const importBook = useBooksStore((state) => state.importBook);
  const selectBook = useBooksStore((state) => state.selectBook);
  const setLibrarySearch = useBooksStore((state) => state.setLibrarySearch);
  const compact = responsive.libraryColumns >= 3;
  const visibleBooks = useMemo(() => {
    const query = search.trim().toLowerCase();

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
  }, [books, search]);

  async function handleImportBook() {
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
  }

  function handleSelectBook(bookId: string) {
    selectBook(bookId);
    router.push("/reading");
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: responsive.isPhone ? spacing[4] : responsive.gutter,
        paddingTop: responsive.isPhone ? spacing[5] : responsive.gutter,
        paddingBottom: responsive.useSidebar ? responsive.gutter : spacing[18],
      }}
    >
      <View
        style={{
          width: responsive.isPhone ? responsive.contentWidth : "100%",
          maxWidth: responsive.maxContentWidth,
          alignSelf: "center",
          gap: compact ? spacing[5] : spacing[6],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: spacing[4],
          }}
        >
          <AppText color="primary" variant="title1" weight="bold">
            Library
          </AppText>
          <Button
            title={importState === "loading" ? "Importing" : "Import Book"}
            icon={Plus}
            variant="secondary"
            disabled={importState === "loading"}
            onPress={handleImportBook}
            style={compact ? { minHeight: 42, paddingHorizontal: spacing[3] } : undefined}
          />
        </View>

        <SearchField compact={compact} value={search} onChangeText={setLibrarySearch} />
        {importState === "loading" ? (
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
            <ActivityIndicator color={colors.brand.violet} />
            <AppText color="secondary" variant="footnote">
              Copying EPUB into local storage...
            </AppText>
          </View>
        ) : null}
        {importError ? (
          <AppText color={colors.brand.amber} variant="footnote">
            {importError}
          </AppText>
        ) : null}

        <View
          style={{
            height: 1,
            backgroundColor: colors.border.subtle,
            marginHorizontal: -spacing[5],
          }}
        />

        {visibleBooks.length > 0 ? (
          <BookGrid
            books={visibleBooks}
            columns={responsive.libraryColumns}
            onSelectBook={handleSelectBook}
          />
        ) : (
          <EmptyLibrary />
        )}
      </View>
    </ScrollView>
  );
}
