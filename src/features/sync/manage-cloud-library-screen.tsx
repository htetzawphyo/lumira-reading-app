import { useRouter } from "expo-router";
import {
  ArrowLeft,
  BookOpen,
  Cloud,
  DownloadCloud,
  Eye,
  Trash2,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";

import { BookCover } from "@/components/books/book-cover";
import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { IconButton } from "@/components/ui/icon-button";
import { Surface } from "@/components/ui/surface";
import { useAppTheme } from "@/design/app-theme-provider";
import { useResponsive } from "@/design/responsive";
import { radii, spacing } from "@/design/tokens";
import { useBooksStore } from "@/features/books/books-store";
import {
  deleteCloudBook,
  listCloudBooks,
} from "@/features/sync/cloud-backup-service";
import type { CloudBookItem } from "@/features/sync/cloud-backup-types";
import { formatRelativeTime } from "@/utils/date";

function formatFileSize(bytes: number) {
  if (bytes >= 1024 * 1024) {
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  }

  return `${Math.round(bytes / 1024)} KB`;
}

function statusLabel(status: CloudBookItem["backupStatus"]) {
  switch (status) {
    case "backed-up":
      return "Backed up";
    case "pending":
      return "Sync pending";
    case "failed":
      return "Sync failed";
    case "cloud-only":
      return "Restore available";
    default:
      return "Not backed up";
  }
}

function CloudBookRow({ item }: { item: CloudBookItem }) {
  const responsive = useResponsive();
  const { colors } = useAppTheme();

  function confirmDelete() {
    Alert.alert(
      "Remove cloud backup?",
      "This removes the cloud backup only. Your local book remains on this device.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Remove Backup",
          style: "destructive",
          onPress: async () => {
            const result = await deleteCloudBook();
            Alert.alert(result.ok ? "Backup removed" : "Cloud unavailable", result.message);
          },
        },
      ],
    );
  }

  return (
    <Surface
      style={{
        flexDirection: "row",
        gap: spacing[3],
        padding: responsive.isPhone ? spacing[3] : spacing[4],
      }}
    >
      <View style={{ width: responsive.isPhone ? 58 : 72 }}>
        <BookCover
          compact
          uri={item.coverUri}
          progress={item.backupStatus === "backed-up" ? 100 : 0}
          accent={colors.brand.violet}
        />
      </View>
      <View style={{ flex: 1, minWidth: 0, gap: spacing[2] }}>
        <View>
          <AppText color="primary" variant="body" weight="semibold" numberOfLines={2}>
            {item.title}
          </AppText>
          <AppText color="secondary" variant="footnote" numberOfLines={1}>
            {item.author ?? "Unknown Author"}
          </AppText>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
          <View
            style={{
              borderRadius: radii.pill,
              backgroundColor: colors.surface.soft,
              paddingHorizontal: spacing[2],
              paddingVertical: 3,
            }}
          >
            <AppText color="secondary" variant="caption" weight="semibold">
              {statusLabel(item.backupStatus)}
            </AppText>
          </View>
          <AppText color="tertiary" variant="caption">
            {formatFileSize(item.fileSizeBytes)}
          </AppText>
          <AppText color="tertiary" variant="caption">
            {item.lastSyncedAt ? formatRelativeTime(item.lastSyncedAt) : "Not synced"}
          </AppText>
        </View>
        <View style={{ flexDirection: responsive.isSmallPhone ? "column" : "row", gap: spacing[2] }}>
          <Button title="Restore" icon={DownloadCloud} variant="ghost" onPress={() => Alert.alert("Restore book", "Single-book restore will connect to the future cloud API.")} style={{ minHeight: 34, paddingHorizontal: spacing[3] }} />
          <Button title="Details" icon={Eye} variant="ghost" onPress={() => Alert.alert(item.title, "Cloud backup metadata will appear here when backend sync is connected.")} style={{ minHeight: 34, paddingHorizontal: spacing[3] }} />
          <Button title="Remove" icon={Trash2} variant="ghost" onPress={confirmDelete} style={{ minHeight: 34, paddingHorizontal: spacing[3] }} />
        </View>
      </View>
    </Surface>
  );
}

export function ManageCloudLibraryScreen() {
  const router = useRouter();
  const responsive = useResponsive();
  const books = useBooksStore((state) => state.books);
  const knowledgeCount = useBooksStore((state) => state.knowledgeItems.length);
  const [items, setItems] = useState<CloudBookItem[]>([]);
  const [loading, setLoading] = useState(true);
  const context = useMemo(
    () => ({ books, knowledgeCount }),
    [books, knowledgeCount],
  );

  useEffect(() => {
    let active = true;

    setLoading(true);
    listCloudBooks(context)
      .then((nextItems) => {
        if (active) {
          setItems(nextItems);
        }
      })
      .catch(() => {
        if (active) {
          setItems([]);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [context]);

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
          width: Math.min(responsive.pageWidth, responsive.isTablet ? 920 : responsive.maxContentWidth),
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
              Manage Cloud Library
            </AppText>
            <AppText color="secondary" variant={responsive.isPhone ? "footnote" : "body"}>
              Review cloud backups without changing local books.
            </AppText>
          </View>
        </View>

        <Surface tone="quiet" style={{ flexDirection: "row", gap: spacing[3] }}>
          <Cloud color="#8B5CF6" size={20} strokeWidth={2.1} />
          <View style={{ flex: 1 }}>
            <AppText color="primary" variant="footnote" weight="semibold">
              Local books are safe
            </AppText>
            <AppText color="secondary" variant="caption">
              Deleting a cloud backup does not delete the EPUB stored on this device.
            </AppText>
          </View>
        </Surface>

        {loading ? (
          <EmptyState compact icon={Cloud} title="Loading cloud library" body="Checking future cloud backup records..." />
        ) : items.length > 0 ? (
          <View style={{ gap: spacing[3] }}>
            {items.map((item) => (
              <CloudBookRow key={item.id} item={item} />
            ))}
          </View>
        ) : (
          <EmptyState
            compact
            icon={BookOpen}
            title="No cloud books yet"
            body="Your backed up EPUB books will appear here after Premium Cloud Backup is connected."
          />
        )}
      </View>
    </ScrollView>
  );
}
