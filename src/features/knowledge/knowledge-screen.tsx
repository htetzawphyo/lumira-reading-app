import { memo, useMemo, useState } from "react";
import { BookOpen, CalendarDays } from "lucide-react-native";
import type { ListRenderItem } from "react-native";
import { FlatList, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchField } from "@/components/ui/search-field";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useAppTheme } from "@/design/app-theme-provider";
import { useResponsive } from "@/design/responsive";
import { spacing } from "@/design/tokens";
import { useBooksStore } from "@/features/books/books-store";
import type { KnowledgeItem } from "@/features/books/types";
import { useDebouncedValue } from "@/hooks/use-debounced-value";
import { formatRelativeTime } from "@/utils/date";

type KnowledgeFilter = "all" | "highlights" | "notes" | "summaries";

const filters: Array<{ label: string; value: KnowledgeFilter }> = [
  { label: "All", value: "all" },
  { label: "Highlights", value: "highlights" },
  { label: "Notes", value: "notes" },
  { label: "Summaries", value: "summaries" },
];

function EmptyKnowledge({
  filter,
  compact,
}: {
  filter: KnowledgeFilter;
  compact?: boolean;
}) {
  const title =
    filter === "summaries"
      ? "Summaries are coming later"
      : "No knowledge saved yet";
  const body =
    filter === "summaries"
      ? "V1 keeps summaries empty while the local reader and highlight system come online."
      : "Highlights and notes you save from imported books will appear here.";

  return (
    <EmptyState compact={compact} title={title} body={body} icon={BookOpen} />
  );
}

const KnowledgeCard = memo(function KnowledgeCard({
  item,
  width,
  compact,
}: {
  item: KnowledgeItem;
  width: number;
  compact?: boolean;
}) {
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        width,
        gap: compact ? spacing[3] : spacing[4],
        borderRadius: 18,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.border.subtle,
        backgroundColor: colors.background.canvas,
        paddingHorizontal: compact ? spacing[5] : spacing[7],
        paddingVertical: compact ? spacing[5] : spacing[7],
      }}
    >
      <AppText
        color="primary"
        variant={compact ? "body" : "bodyLarge"}
        style={{ lineHeight: compact ? 28 : 32 }}
      >
        {item.text}
      </AppText>
      {item.note ? (
        <View
          style={{
            borderRadius: 10,
            backgroundColor: colors.background.panel,
            padding: spacing[4],
          }}
        >
          <AppText color="secondary" variant="body">
            {item.note}
          </AppText>
        </View>
      ) : null}
      <View
        style={{
          minHeight: 28,
          flexDirection: "row",
          flexWrap: "wrap",
          alignItems: "center",
          gap: spacing[4],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[1],
            flexShrink: 1,
          }}
        >
          <BookOpen
            color={colors.text.secondary}
            size={15}
            style={{ flexShrink: 0 }}
          />
          <AppText
            color="secondary"
            variant="footnote"
            numberOfLines={1}
            style={{ flexShrink: 1, lineHeight: 28 }}
          >
            {item.bookTitle}
          </AppText>
        </View>
        {item.pageLabel ? (
          <AppText
            color="secondary"
            variant="footnote"
            style={{ lineHeight: 28 }}
          >
            {item.pageLabel}
          </AppText>
        ) : null}
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[1],
          }}
        >
          <CalendarDays
            color={colors.text.secondary}
            size={15}
            style={{ flexShrink: 0 }}
          />
          <AppText
            color="secondary"
            variant="footnote"
            style={{ lineHeight: 28 }}
          >
            {formatRelativeTime(item.createdAt)}
          </AppText>
        </View>
      </View>
    </View>
  );
});

export function KnowledgeScreen() {
  const responsive = useResponsive();
  const { colors } = useAppTheme();
  const [filter, setFilter] = useState<KnowledgeFilter>("all");
  const knowledgeItems = useBooksStore((state) => state.knowledgeItems);
  const search = useBooksStore((state) => state.knowledgeSearch);
  const debouncedSearch = useDebouncedValue(search, 120);
  const setKnowledgeSearch = useBooksStore((state) => state.setKnowledgeSearch);
  const compact = responsive.isPhone;
  const columns = responsive.isTabletLandscape ? 2 : 1;
  const listWidth = Math.min(
    responsive.pageWidth,
    responsive.knowledgeMaxWidth
  );
  const itemWidth = (listWidth - responsive.gridGap * (columns - 1)) / columns;
  const items = useMemo(() => {
    const byType =
      filter === "all"
        ? knowledgeItems
        : filter === "summaries"
        ? []
        : knowledgeItems.filter((item) => item.type === filter.slice(0, -1));
    const query = debouncedSearch.trim().toLowerCase();

    if (!query) {
      return byType;
    }

    return byType.filter((item) => {
      return (
        item.text.toLowerCase().includes(query) ||
        item.bookTitle.toLowerCase().includes(query) ||
        (item.note ?? "").toLowerCase().includes(query)
      );
    });
  }, [debouncedSearch, filter, knowledgeItems]);

  const renderItem = useMemo<ListRenderItem<KnowledgeItem>>(
    () =>
      ({ item }) =>
        <KnowledgeCard item={item} width={itemWidth} compact={compact} />,
    [compact, itemWidth]
  );

  const header = (
    <View style={{ gap: spacing[5], marginBottom: responsive.rowGap }}>
      <AppText
        color="primary"
        variant={responsive.isPhone ? "title2" : "title1"}
        weight="bold"
      >
        Knowledge
      </AppText>
      <SearchField
        compact={compact}
        value={search}
        onChangeText={setKnowledgeSearch}
        placeholder="Search highlights and notes..."
      />
      <SegmentedControl
        compact={compact}
        options={filters}
        value={filter}
        onChange={setFilter}
      />
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
      key={`knowledge-${columns}`}
      data={items}
      renderItem={renderItem}
      keyExtractor={(item) => `${item.type}-${item.id}`}
      numColumns={columns}
      ListHeaderComponent={header}
      ListEmptyComponent={<EmptyKnowledge filter={filter} compact={compact} />}
      contentInsetAdjustmentBehavior="automatic"
      showsVerticalScrollIndicator={false}
      columnWrapperStyle={
        columns > 1
          ? {
              gap: responsive.gridGap,
              marginBottom: responsive.rowGap,
            }
          : undefined
      }
      ItemSeparatorComponent={
        columns === 1
          ? () => <View style={{ height: responsive.rowGap }} />
          : undefined
      }
      contentContainerStyle={{
        width: listWidth,
        alignSelf: "center",
        paddingTop: responsive.isPhone ? spacing[6] : responsive.gutter,
        paddingBottom: responsive.bottomInsetPadding,
      }}
      {...responsive.listPerformance}
    />
  );
}
