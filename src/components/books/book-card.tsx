import { Clock3 } from "lucide-react-native";
import { Pressable, View } from "react-native";

import { BookCover } from "@/components/books/book-cover";
import { AppText } from "@/components/ui/app-text";
import { Surface } from "@/components/ui/surface";
import { useAppTheme } from "@/design/app-theme-provider";
import { useResponsive } from "@/design/responsive";
import { radii, spacing } from "@/design/tokens";
import type { Book } from "@/features/books/types";
import { formatRelativeTime } from "@/utils/date";

type BookCardProps = {
  book: Book;
  layout?: "list" | "grid";
  onPress?: (book: Book) => void;
};

function ProgressBar({ progress, accent }: { progress: number; accent: string }) {
  const { colors: themeColors } = useAppTheme();

  return (
    <View
      style={{
        height: 5,
        overflow: "hidden",
        borderRadius: radii.pill,
        backgroundColor: themeColors.surface.medium,
      }}
    >
      <View
        style={{
          width: `${progress}%`,
          height: "100%",
          borderRadius: radii.pill,
          backgroundColor: accent,
        }}
      />
    </View>
  );
}

export function BookCard({ book, layout = "grid", onPress }: BookCardProps) {
  const { colors: themeColors } = useAppTheme();
  const responsive = useResponsive();
  const compactList = layout === "list" && responsive.isPhone;
  const progress = Math.round(book.progress * 100);
  const author = book.author ?? "Unknown Author";
  const lastRead = formatRelativeTime(book.lastOpenedAt ?? book.createdAt);

  if (layout === "list") {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={() => onPress?.(book)}
        style={({ pressed }) => ({ opacity: pressed ? 0.82 : 1 })}
      >
        <Surface
          tone="default"
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: compactList ? spacing[3] : spacing[4],
            padding: compactList ? spacing[3] : spacing[4],
          }}
        >
          <View style={{ width: compactList ? 56 : 82 }}>
            <BookCover uri={book.coverUri} accent={themeColors.brand.purple} compact />
          </View>
          <View
            style={{
              flex: 1,
              minWidth: 0,
              gap: compactList ? spacing[2] : spacing[3],
              justifyContent: "space-between",
            }}
          >
            <View style={{ gap: spacing[1] }}>
              <AppText
                color="primary"
                variant={compactList ? "body" : "bodyLarge"}
                weight="semibold"
                numberOfLines={2}
              >
                {book.title}
              </AppText>
              <AppText
                color="secondary"
                variant={compactList ? "caption" : "footnote"}
                numberOfLines={1}
              >
                {author}
              </AppText>
            </View>
            <View style={{ flexDirection: "row", gap: spacing[3], flexWrap: "wrap" }}>
              <AppText color="tertiary" variant="caption" numberOfLines={1}>
                {lastRead}
              </AppText>
            </View>
            <ProgressBar progress={progress} accent={themeColors.brand.purple} />
          </View>
        </Surface>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() => onPress?.(book)}
      style={({ pressed }) => ({
        flex: 1,
        opacity: pressed ? 0.82 : 1,
      })}
    >
      <View style={{ gap: spacing[3] }}>
        <BookCover uri={book.coverUri} accent={themeColors.brand.purple} />
        <View style={{ gap: spacing[2] }}>
          <View style={{ gap: spacing[1] }}>
            <AppText color="primary" variant="bodyLarge" weight="semibold" numberOfLines={2}>
              {book.title}
            </AppText>
            <AppText color="tertiary" variant="caption" numberOfLines={1}>
              {author}
            </AppText>
          </View>
          <ProgressBar progress={progress} accent={themeColors.brand.purple} />
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
              <Clock3 color={themeColors.text.tertiary} size={13} />
              <AppText color="tertiary" variant="caption" numberOfLines={1}>
                {lastRead}
              </AppText>
            </View>
          </View>
        </View>
      </View>
    </Pressable>
  );
}
