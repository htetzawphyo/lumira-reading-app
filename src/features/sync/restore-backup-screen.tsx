import { useRouter } from "expo-router";
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Cloud,
  HardDrive,
  RotateCcw,
  ShieldCheck,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { Alert, ScrollView, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Surface } from "@/components/ui/surface";
import { useAppTheme } from "@/design/app-theme-provider";
import { useResponsive } from "@/design/responsive";
import { spacing } from "@/design/tokens";
import { useBooksStore } from "@/features/books/books-store";
import { restoreBackup } from "@/features/sync/cloud-backup-service";
import type { RestoreSummary } from "@/features/sync/cloud-backup-types";
import { formatRelativeTime } from "@/utils/date";

function SummaryRow({ label, value }: { label: string; value: string | number }) {
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        minHeight: 52,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        gap: spacing[3],
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
      }}
    >
      <AppText color="secondary" variant="footnote">
        {label}
      </AppText>
      <AppText color="primary" variant="footnote" weight="semibold">
        {value}
      </AppText>
    </View>
  );
}

function RestoreResult({ summary }: { summary: RestoreSummary }) {
  return (
    <Surface style={{ gap: spacing[3] }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
        <CheckCircle2 color="#34D399" size={22} strokeWidth={2.2} />
        <AppText color="primary" variant="bodyLarge" weight="semibold">
          Restore summary
        </AppText>
      </View>
      <SummaryRow label="Books restored" value={summary.booksRestored} />
      <SummaryRow label="Notes restored" value={summary.notesRestored} />
      <SummaryRow label="Highlights restored" value={summary.highlightsRestored} />
      <SummaryRow label="Skipped duplicates" value={summary.skippedDuplicates} />
      <SummaryRow label="Failed items" value={summary.failedItems} />
    </Surface>
  );
}

export function RestoreBackupScreen() {
  const router = useRouter();
  const responsive = useResponsive();
  const books = useBooksStore((state) => state.books);
  const knowledgeCount = useBooksStore((state) => state.knowledgeItems.length);
  const [restoring, setRestoring] = useState(false);
  const [summary, setSummary] = useState<RestoreSummary | null>(null);
  const latestBookDate = useMemo(() => {
    const firstDate = books
      .map((book) => book.lastOpenedAt ?? book.createdAt)
      .filter(Boolean)
      .sort()
      .at(-1);

    return firstDate ?? null;
  }, [books]);

  async function handleRestore() {
    if (restoring) {
      return;
    }

    setRestoring(true);

    try {
      const result = await restoreBackup();
      setSummary(result);
      Alert.alert(
        "Restore prepared",
        "Backend restore is not connected yet. Existing local books were not changed.",
      );
    } catch {
      Alert.alert(
        "Restore unavailable",
        "Couldn't connect to cloud backup. Your local data is safe.",
      );
    } finally {
      setRestoring(false);
    }
  }

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: responsive.isPhone ? spacing[4] : responsive.gutter,
        paddingTop: responsive.isPhone ? spacing[4] : responsive.gutter,
        paddingBottom: responsive.bottomInsetPadding,
      }}
    >
      <View
        style={{
          width: Math.min(responsive.pageWidth, responsive.isTablet ? 860 : responsive.maxContentWidth),
          alignSelf: "center",
          gap: responsive.isPhone ? spacing[5] : spacing[7],
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
          <IconButton
            icon={ArrowLeft}
            label="Back to Sync and Backup"
            onPress={() => router.replace("/settings/sync")}
            style={responsive.isPhone ? { width: 40, height: 40 } : undefined}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText color="primary" variant={responsive.isPhone ? "title2" : "title1"} weight="bold">
              Restore from Backup
            </AppText>
            <AppText color="secondary" variant={responsive.isPhone ? "footnote" : "body"}>
              Merge cloud books and reading data into this device.
            </AppText>
          </View>
        </View>

        <Surface style={{ gap: spacing[4] }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
            <RotateCcw color="#8B5CF6" size={24} strokeWidth={2.2} />
            <View style={{ flex: 1 }}>
              <AppText color="primary" variant="bodyLarge" weight="semibold">
                Safe restore
              </AppText>
              <AppText color="secondary" variant="footnote">
                Restore will add cloud books and reading data to this device. Existing local books will not be deleted.
              </AppText>
            </View>
          </View>
          <SummaryRow label="Cloud backup status" value="Backend pending" />
          <SummaryRow label="Backed up books" value={books.length} />
          <SummaryRow label="Notes and highlights" value={knowledgeCount} />
          <SummaryRow label="Last backup" value={latestBookDate ? formatRelativeTime(latestBookDate) : "Not available"} />
          <SummaryRow label="Storage used" value={`${Math.max(1, books.length * 18)} MB estimated`} />
        </Surface>

        <Surface style={{ gap: spacing[3] }}>
          <View style={{ flexDirection: "row", gap: spacing[3] }}>
            <ShieldCheck color="#34D399" size={21} strokeWidth={2.2} />
            <View style={{ flex: 1 }}>
              <AppText color="primary" variant="body" weight="semibold">
                Duplicate handling
              </AppText>
              <AppText color="secondary" variant="footnote">
                V2 safe default: keep local copies, skip duplicate cloud items, and show a restore summary.
              </AppText>
            </View>
          </View>
          <Button
            title={restoring ? "Restoring..." : "Restore Backup"}
            icon={RotateCcw}
            variant="secondary"
            fullWidth
            disabled={restoring}
            onPress={handleRestore}
          />
        </Surface>

        {summary ? <RestoreResult summary={summary} /> : null}

        {books.length === 0 ? (
          <EmptyState
            compact
            icon={BookOpen}
            title="No local books yet"
            body="Cloud restore will merge future backups into this empty library."
          />
        ) : null}

        <Surface tone="quiet" style={{ flexDirection: "row", gap: spacing[3] }}>
          <Cloud color="#8B5CF6" size={20} strokeWidth={2.1} />
          <View style={{ flex: 1 }}>
            <AppText color="primary" variant="footnote" weight="semibold">
              Backend integration point
            </AppText>
            <AppText color="secondary" variant="caption">
              This screen is wired for a future cloud restore API. It does not mutate local data until that API exists.
            </AppText>
          </View>
          <HardDrive color="#8B5CF6" size={20} strokeWidth={2.1} />
        </Surface>
      </View>
    </ScrollView>
  );
}
