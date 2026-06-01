import { View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { Surface } from "@/components/ui/surface";
import { spacing } from "@/design/tokens";
import type { KnowledgeItem } from "@/features/books/types";
import { formatRelativeTime } from "@/utils/date";

type BookKnowledgeCardProps = {
  item: KnowledgeItem;
  onJump: (item: KnowledgeItem) => void;
  onEditNote: (item: KnowledgeItem) => void;
  onDelete: (item: KnowledgeItem) => void;
  expanded?: boolean;
};

export function BookKnowledgeCard({
  item,
  onJump,
  onEditNote,
  onDelete,
  expanded,
}: BookKnowledgeCardProps) {
  return (
    <Surface tone="quiet" style={{ gap: spacing[2] }}>
      <AppText
        color="primary"
        variant="body"
        numberOfLines={expanded ? undefined : 3}
        style={{  lineHeight: 30 } }
      >
        {item.text}
      </AppText>
      {item.note ? (
        <AppText
          color="secondary"
          variant="footnote"
          numberOfLines={expanded ? undefined : 2}
          style={{  lineHeight: 30 } }
        >
          {item.note}
        </AppText>
      ) : null}
      <AppText color="tertiary" variant="caption">
        {item.type === "highlight" ? "Highlight" : "Note"} · Chapter{" "}
        {item.chapterIndex + 1} · {formatRelativeTime(item.createdAt)}
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
        <Button
          title="Open"
          variant="ghost"
          onPress={() => onJump(item)}
          style={{ minHeight: 34, paddingHorizontal: spacing[3] }}
        />
        {item.type === "note" ? (
          <Button
            title="Edit"
            variant="ghost"
            onPress={() => onEditNote(item)}
            style={{ minHeight: 34, paddingHorizontal: spacing[3] }}
          />
        ) : null}
        <Button
          title="Delete"
          variant="ghost"
          onPress={() => onDelete(item)}
          style={{ minHeight: 34, paddingHorizontal: spacing[3] }}
        />
      </View>
    </Surface>
  );
}
