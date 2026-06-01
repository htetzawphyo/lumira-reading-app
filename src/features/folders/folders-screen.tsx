import { useRouter } from "expo-router";
import { ChevronRight, Folder, FolderPlus, Plus } from "lucide-react-native";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Surface } from "@/components/ui/surface";
import { useAppTheme } from "@/design/app-theme-provider";
import { useResponsive } from "@/design/responsive";
import { radii, spacing } from "@/design/tokens";
import { useBooksStore } from "@/features/books/books-store";
import type { FolderWithCount } from "@/features/books/types";
import { FolderNameModal } from "@/features/folders/folder-name-modal";
import { formatRelativeTime } from "@/utils/date";

function FolderCard({
  folder,
  width,
  onPress,
}: {
  folder: FolderWithCount;
  width: number | "100%";
  onPress: (folderId: string) => void;
}) {
  const { colors } = useAppTheme();
  const responsive = useResponsive();
  const compact = responsive.isPhone;

  if (compact) {
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Open ${folder.name}`}
        onPress={() => onPress(folder.id)}
        style={({ pressed }) => ({
          width,
          opacity: pressed ? 0.72 : 1,
        })}
      >
        <View
          style={{
            minHeight: 66,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[3],
            borderBottomWidth: 1,
            borderBottomColor: colors.border.subtle,
            paddingVertical: spacing[2],
          }}
        >
          <View
            style={{
              width: 38,
              height: 38,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.md,
              backgroundColor: colors.surface.soft,
            }}
          >
            <Folder color={colors.brand.violet} size={21} strokeWidth={2.1} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: 2 }}>
            <AppText color="primary" variant="body" weight="semibold" numberOfLines={1}>
              {folder.name}
            </AppText>
            <AppText color="secondary" variant="caption" numberOfLines={1}>
              {folder.bookCount} {folder.bookCount === 1 ? "book" : "books"} · Updated{" "}
              {formatRelativeTime(folder.updatedAt)}
            </AppText>
          </View>
          <ChevronRight color={colors.text.tertiary} size={19} strokeWidth={2} />
        </View>
      </Pressable>
    );
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${folder.name}`}
      onPress={() => onPress(folder.id)}
      style={({ pressed }) => ({
        width,
        opacity: pressed ? 0.78 : 1,
      })}
    >
      <Surface
        tone="quiet"
        style={{
          minHeight: 138,
          justifyContent: "space-between",
          gap: spacing[4],
        }}
      >
        <View
          style={{
            width: 46,
            height: 46,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radii.lg,
            backgroundColor: colors.surface.soft,
          }}
        >
          <Folder color={colors.brand.violet} size={24} strokeWidth={2.1} />
        </View>
        <View style={{ gap: spacing[1] }}>
          <AppText
            color="primary"
            variant="bodyLarge"
            weight="semibold"
            numberOfLines={2}
          >
            {folder.name}
          </AppText>
          <AppText color="secondary" variant="footnote">
            {folder.bookCount} {folder.bookCount === 1 ? "book" : "books"}
          </AppText>
          <AppText color="tertiary" variant="caption">
            Updated {formatRelativeTime(folder.updatedAt)}
          </AppText>
        </View>
      </Surface>
    </Pressable>
  );
}

export function FoldersScreen() {
  const router = useRouter();
  const responsive = useResponsive();
  const { colors } = useAppTheme();
  const folders = useBooksStore((state) => state.folders);
  const createFolder = useBooksStore((state) => state.createFolder);
  const [modalVisible, setModalVisible] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const columns = responsive.isPhone ? 1 : responsive.useSidebar ? 3 : 2;
  const gap = responsive.isPhone ? spacing[3] : spacing[4];
  const cardWidth = useMemo<number | "100%">(() => {
    if (responsive.isPhone) {
      return "100%";
    }

    return (responsive.pageWidth - gap * (columns - 1)) / columns;
  }, [columns, gap, responsive.isPhone, responsive.pageWidth]);

  function openCreateFolder() {
    setError(null);
    setModalVisible(true);
  }

  function closeCreateFolder() {
    if (saving) {
      return;
    }

    setModalVisible(false);
    setError(null);
  }

  function handleCreateFolder(name: string) {
    setSaving(true);
    setError(null);

    try {
      const folder = createFolder(name);
      setModalVisible(false);
      router.push(`/folders/${folder.id}`);
    } catch (createError) {
      const message =
        createError instanceof Error
          ? createError.message
          : "Folder could not be created.";
      setError(message);
      Alert.alert("Could not create folder", message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          width: responsive.pageWidth,
          alignSelf: "center",
          paddingTop: responsive.isPhone ? spacing[5] : responsive.gutter,
          paddingBottom: responsive.bottomInsetPadding,
          gap: responsive.isPhone ? spacing[4] : spacing[6],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            justifyContent: "space-between",
            gap: spacing[3],
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText
              color="primary"
              variant={responsive.isPhone ? "title2" : "title1"}
              weight="bold"
              numberOfLines={1}
            >
              Folders
            </AppText>
            <AppText
              color="secondary"
              variant={responsive.isPhone ? "footnote" : "body"}
              numberOfLines={2}
            >
              Organize imported EPUBs without moving local files.
            </AppText>
          </View>
          <Button
            title="Create"
            icon={Plus}
            variant="secondary"
            onPress={openCreateFolder}
            style={{
              minHeight: responsive.touchTarget,
              paddingHorizontal: responsive.isPhone ? spacing[3] : spacing[4],
            }}
          />
        </View>

        <View style={{ height: 1, backgroundColor: colors.border.subtle }} />

        {folders.length > 0 ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: responsive.isPhone ? 0 : gap,
              borderTopWidth: responsive.isPhone ? 1 : 0,
              borderTopColor: colors.border.subtle,
            }}
          >
            {folders.map((folder) => (
              <FolderCard
                key={folder.id}
                folder={folder}
                width={cardWidth}
                onPress={(folderId) => router.push(`/folders/${folderId}`)}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            icon={FolderPlus}
            title="No folders yet"
            body="Create a folder to group books for a project, class, or reading mood."
            compact={responsive.isPhone}
          />
        )}
      </ScrollView>

      <FolderNameModal
        visible={modalVisible}
        title="Create Folder"
        error={error}
        saving={saving}
        onClose={closeCreateFolder}
        onSubmit={handleCreateFolder}
      />
    </>
  );
}
