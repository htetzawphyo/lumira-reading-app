import { useRouter } from "expo-router";
import { BookOpen, Clock3 } from "lucide-react-native";
import { Pressable, ScrollView, View } from "react-native";

import { BookCover } from "@/components/books/book-cover";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { useResponsive } from "@/design/responsive";
import { colors, radii, shadows, spacing } from "@/design/tokens";
import { useBooksStore } from "@/features/books/books-store";
import type { Book } from "@/features/books/types";
import { formatRelativeTime } from "@/utils/date";

function MiniContinueCard({ book, onPress }: { book: Book; onPress: () => void }) {
  const progress = Math.round(book.progress * 100);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Continue ${book.title}`}
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 96,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[4],
        borderRadius: 18,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.border.subtle,
        backgroundColor: colors.background.canvas,
        padding: spacing[4],
        opacity: pressed ? 0.78 : 1,
      })}
    >
      <View style={{ width: 68 }}>
        <BookCover
          uri={book.coverUri}
          accent={colors.brand.purple}
          progress={progress}
          compact
        />
      </View>
      <View style={{ flex: 1, gap: spacing[2] }}>
        <View>
          <AppText color="primary" variant="bodyLarge" weight="semibold" numberOfLines={1}>
            {book.title}
          </AppText>
          <AppText color="secondary" variant="body" numberOfLines={1}>
            {book.author ?? "Unknown Author"}
          </AppText>
        </View>
        <View
          style={{
            height: 5,
            overflow: "hidden",
            borderRadius: radii.pill,
            backgroundColor: colors.background.panelStrong,
          }}
        >
          <View
            style={{
              width: `${progress}%`,
              height: "100%",
              borderRadius: radii.pill,
              backgroundColor: colors.brand.purple,
            }}
          />
        </View>
      </View>
    </Pressable>
  );
}

function ReaderPlaceholder({ book }: { book: Book }) {
  const progress = Math.round(book.progress * 100);

  return (
    <View style={{ gap: spacing[6], alignSelf: "stretch" }}>
      <View
        style={{
          alignItems: "center",
          gap: spacing[5],
          borderRadius: 24,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: colors.border.subtle,
          backgroundColor: colors.background.canvas,
          padding: spacing[6],
        }}
      >
        <View style={{ width: 160 }}>
          <BookCover
            uri={book.coverUri}
            accent={colors.brand.purple}
            progress={progress}
          />
        </View>
        <View style={{ alignItems: "center", gap: spacing[2] }}>
          <AppText color="primary" variant="title2" weight="semibold" align="center">
            {book.title}
          </AppText>
          <AppText color="secondary" variant="body" align="center">
            {book.author ?? "Unknown Author"}
          </AppText>
          <AppText color="tertiary" variant="footnote" align="center">
            {progress}% complete
          </AppText>
        </View>
      </View>
      <View
        style={{
          gap: spacing[3],
          borderRadius: 18,
          borderCurve: "continuous",
          backgroundColor: colors.background.panel,
          padding: spacing[5],
        }}
      >
        <AppText color="primary" variant="title3" weight="semibold">
          Reader engine coming next
        </AppText>
        <AppText color="secondary" variant="body">
          This V1 flow stores your EPUB locally and keeps the reader screen ready
          for epub.js or a native rendering engine.
        </AppText>
      </View>
    </View>
  );
}

export function ReadingScreen() {
  const responsive = useResponsive();
  const router = useRouter();
  const books = useBooksStore((state) => state.books);
  const currentBookId = useBooksStore((state) => state.currentBookId);
  const selectBook = useBooksStore((state) => state.selectBook);
  const currentBook = books.find((book) => book.id === currentBookId);
  const recentBooks = books
    .filter((book) => book.lastOpenedAt)
    .sort((first, second) => {
      const firstTime = new Date(first.lastOpenedAt ?? first.createdAt).getTime();
      const secondTime = new Date(second.lastOpenedAt ?? second.createdAt).getTime();
      return secondTime - firstTime;
    })
    .slice(0, 5);

  function handleSelectBook(bookId: string) {
    selectBook(bookId);
  }

  if (currentBook) {
    return (
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        contentContainerStyle={{
          paddingHorizontal: responsive.isPhone ? spacing[6] : responsive.gutter,
          paddingTop: responsive.gutter,
          paddingBottom: responsive.useSidebar ? responsive.gutter : spacing[18],
        }}
      >
        <View
          style={{
            width: responsive.isPhone ? responsive.contentWidth - spacing[2] : "100%",
            maxWidth: 620,
            alignSelf: "center",
            gap: spacing[6],
          }}
        >
          <View>
            <AppText color="primary" variant="title1" weight="bold">
              Reading
            </AppText>
            <AppText color="secondary" variant="body">
              Last opened {formatRelativeTime(currentBook.lastOpenedAt)}
            </AppText>
          </View>
          <ReaderPlaceholder book={currentBook} />
        </View>
      </ScrollView>
    );
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        flexGrow: 1,
        justifyContent: "center",
        paddingHorizontal: responsive.isPhone ? spacing[6] : responsive.gutter,
        paddingTop: responsive.gutter,
        paddingBottom: responsive.useSidebar ? responsive.gutter : spacing[18],
      }}
    >
      <View
        style={{
          width: responsive.isPhone ? responsive.contentWidth - spacing[2] : "100%",
          maxWidth: 540,
          alignSelf: "center",
          alignItems: "center",
          gap: spacing[8],
        }}
      >
        <View style={{ alignItems: "center", gap: spacing[6] }}>
          <View
            style={{
              width: 108,
              height: 108,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 28,
              backgroundColor: "#21102F",
              boxShadow: shadows.glow,
            }}
          >
            <BookOpen color={colors.brand.violet} size={58} strokeWidth={2.1} />
          </View>
          <View style={{ alignItems: "center", gap: spacing[3] }}>
            <AppText color="primary" variant="title1" weight="bold" align="center">
              No Book Selected
            </AppText>
            <AppText color="secondary" variant="bodyLarge" align="center">
              Choose a book from your library to start reading
            </AppText>
          </View>
          <Button
            title="Browse Library"
            variant="secondary"
            onPress={() => router.push("/library")}
          />
        </View>

        <View style={{ alignSelf: "stretch", gap: spacing[4] }}>
          <View
            style={{
              flexDirection: "row",
              justifyContent: "center",
              alignItems: "center",
              gap: spacing[2],
            }}
          >
            <Clock3 color={colors.text.secondary} size={18} strokeWidth={1.9} />
            <AppText color="secondary" variant="body" weight="semibold">
              Continue Reading
            </AppText>
          </View>
          {recentBooks.length > 0 ? (
            recentBooks.map((book) => (
              <MiniContinueCard
                key={book.id}
                book={book}
                onPress={() => handleSelectBook(book.id)}
              />
            ))
          ) : (
            <AppText color="tertiary" variant="body" align="center">
              Books you open from Library will appear here.
            </AppText>
          )}
        </View>
      </View>
    </ScrollView>
  );
}
