import { useMemo, useState } from "react";
import { BookOpen, CalendarDays, Search } from "lucide-react-native";
import { ScrollView, TextInput, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { SegmentedControl } from "@/components/ui/segmented-control";
import { useResponsive } from "@/design/responsive";
import { colors, spacing } from "@/design/tokens";
import { useBooksStore } from "@/features/books/books-store";
import type { KnowledgeItem } from "@/features/books/types";
import { formatRelativeTime } from "@/utils/date";

type KnowledgeFilter = "all" | "highlights" | "notes" | "summaries";

const filters: Array<{ label: string; value: KnowledgeFilter }> = [
  { label: "All", value: "all" },
  { label: "Highlights", value: "highlights" },
  { label: "Notes", value: "notes" },
  { label: "Summaries", value: "summaries" },
];

function SearchField({
  value,
  onChangeText,
}: {
  value: string;
  onChangeText: (value: string) => void;
}) {
  return (
    <View
      style={{
        minHeight: 66,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[3],
        borderRadius: 18,
        backgroundColor: colors.background.panelStrong,
        paddingHorizontal: spacing[4],
      }}
    >
      <Search color={colors.text.tertiary} size={26} strokeWidth={2} />
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder="Search highlights and notes..."
        placeholderTextColor={colors.text.tertiary}
        autoCapitalize="none"
        autoCorrect={false}
        style={{
          flex: 1,
          color: colors.text.primary,
          fontSize: 17,
          lineHeight: 25,
          fontWeight: "500",
          paddingVertical: 0,
        }}
      />
    </View>
  );
}

function EmptyKnowledge({ filter }: { filter: KnowledgeFilter }) {
  const title = filter === "summaries" ? "Summaries are coming later" : "No knowledge saved yet";
  const body =
    filter === "summaries"
      ? "V1 keeps summaries empty while the local reader and highlight system come online."
      : "Highlights and notes you save from imported books will appear here.";

  return (
    <View
      style={{
        gap: spacing[3],
        borderRadius: 18,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.border.subtle,
        backgroundColor: colors.background.canvas,
        paddingHorizontal: spacing[8],
        paddingVertical: spacing[10],
      }}
    >
      <AppText color="primary" variant="title3" weight="semibold" align="center">
        {title}
      </AppText>
      <AppText color="secondary" variant="body" align="center">
        {body}
      </AppText>
    </View>
  );
}

function KnowledgeCard({ item }: { item: KnowledgeItem }) {
  return (
    <View
      style={{
        gap: spacing[4],
        borderRadius: 18,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: colors.border.subtle,
        backgroundColor: colors.background.canvas,
        paddingHorizontal: spacing[8],
        paddingVertical: spacing[8],
      }}
    >
      <AppText color="primary" variant="bodyLarge" style={{ lineHeight: 34 }}>
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
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[5] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
          <BookOpen color={colors.text.secondary} size={15} />
          <AppText color="secondary" variant="footnote">
            {item.bookTitle}
          </AppText>
        </View>
        {item.pageLabel ? (
          <AppText color="secondary" variant="footnote">
            {item.pageLabel}
          </AppText>
        ) : null}
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[1] }}>
          <CalendarDays color={colors.text.secondary} size={15} />
          <AppText color="secondary" variant="footnote">
            {formatRelativeTime(item.createdAt)}
          </AppText>
        </View>
      </View>
    </View>
  );
}

export function KnowledgeScreen() {
  const responsive = useResponsive();
  const [filter, setFilter] = useState<KnowledgeFilter>("all");
  const knowledgeItems = useBooksStore((state) => state.knowledgeItems);
  const search = useBooksStore((state) => state.knowledgeSearch);
  const setKnowledgeSearch = useBooksStore((state) => state.setKnowledgeSearch);
  const items = useMemo(() => {
    const byType =
      filter === "all"
        ? knowledgeItems
        : filter === "summaries"
          ? []
          : knowledgeItems.filter((item) => item.type === filter.slice(0, -1));
    const query = search.trim().toLowerCase();

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
  }, [filter, knowledgeItems, search]);

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: responsive.isPhone ? spacing[5] : responsive.gutter,
        paddingTop: responsive.isPhone ? spacing[7] : responsive.gutter,
        paddingBottom: responsive.useSidebar ? responsive.gutter : spacing[18],
      }}
    >
      <View
        style={{
          width: responsive.isPhone ? responsive.contentWidth : "100%",
          maxWidth: responsive.maxContentWidth,
          alignSelf: "center",
          gap: spacing[6],
        }}
      >
        <AppText color="primary" variant="title1" weight="bold">
          Knowledge
        </AppText>
        <SearchField value={search} onChangeText={setKnowledgeSearch} />
        <SegmentedControl options={filters} value={filter} onChange={setFilter} />
        <View
          style={{
            height: 1,
            backgroundColor: colors.border.subtle,
            marginHorizontal: -spacing[5],
          }}
        />

        <View style={{ gap: spacing[6] }}>
          {items.length > 0 ? (
            items.map((item) => <KnowledgeCard key={`${item.type}-${item.id}`} item={item} />)
          ) : (
            <EmptyKnowledge filter={filter} />
          )}
        </View>
      </View>
    </ScrollView>
  );
}
