import { useRouter } from "expo-router";
import {
  ArrowLeft,
  BookOpen,
  Bookmark,
  FileText,
  EllipsisVertical,
  Folder,
  FolderPlus,
  Plus,
  Star,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchField } from "@/components/ui/search-field";
import { useAppTheme } from "@/design/app-theme-provider";
import { useResponsive } from "@/design/responsive";
import { radii, spacing } from "@/design/tokens";
import { useBooksStore } from "@/features/books/books-store";
import type { FolderWithCount } from "@/features/books/types";
import { FolderNameModal } from "@/features/folders/folder-name-modal";

const folderIcons = {
  folder: Folder,
  book: BookOpen,
  bookmark: Bookmark,
  file: FileText,
  star: Star,
} as const;

function getFolderIcon(icon: string) {
  return folderIcons[icon as keyof typeof folderIcons] ?? Folder;
}

function IconButton({
  label,
  onPress,
  children,
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={({ pressed }) => ({
        width: 42,
        height: 42,
        alignItems: "center",
        justifyContent: "center",
        borderRadius: radii.pill,
        opacity: pressed ? 0.68 : 1,
      })}
    >
      {children}
    </Pressable>
  );
}

function FolderGridCard({
  folder,
  width,
  onPress,
  onMore,
}: {
  folder: FolderWithCount;
  width: number;
  onPress: (folderId: string) => void;
  onMore: (folder: FolderWithCount) => void;
}) {
  const { colors } = useAppTheme();
  const responsive = useResponsive();
  const FolderIcon = getFolderIcon(folder.icon);
  const accentColor = folder.accentColor || colors.brand.violet;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Open ${folder.name}`}
      onPress={() => onPress(folder.id)}
      style={({ pressed }) => ({
        width,
        opacity: pressed ? 0.74 : 1,
      })}
    >
      <View
        style={{
          minHeight: responsive.isPhone ? 124 : 142,
          justifyContent: "space-between",
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border.default,
          backgroundColor: colors.background.elevated,
          padding: responsive.isPhone ? spacing[3] : spacing[4],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "flex-start",
            justifyContent: "space-between",
            gap: spacing[2],
          }}
        >
          <FolderIcon
            color={accentColor}
            size={responsive.isPhone ? 27 : 31}
            strokeWidth={2.1}
          />
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`More options for ${folder.name}`}
            onPress={(event) => {
              event.stopPropagation();
              onMore(folder);
            }}
            hitSlop={10}
            style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1 })}
          >
            <EllipsisVertical
              color={colors.text.tertiary}
              size={20}
              strokeWidth={2.2}
            />
          </Pressable>
        </View>

        <View style={{ gap: spacing[1] }}>
          <AppText
            color="primary"
            variant={responsive.isPhone ? "body" : "bodyLarge"}
            weight="semibold"
            numberOfLines={2}
          >
            {folder.name}
          </AppText>
          <AppText color="secondary" variant="footnote" numberOfLines={1}>
            {folder.bookCount} {folder.bookCount === 1 ? "item" : "items"}
          </AppText>
        </View>
      </View>
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
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const columns = responsive.isPhone ? 2 : responsive.isTabletLandscape ? 4 : 3;
  const gap = responsive.isPhone ? spacing[3] : spacing[4];
  const cardWidth = useMemo(() => {
    return (responsive.pageWidth - gap * (columns - 1)) / columns;
  }, [columns, gap, responsive.pageWidth]);
  const visibleFolders = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return folders;
    }

    return folders.filter((folder) =>
      folder.name.toLowerCase().includes(normalizedQuery)
    );
  }, [folders, query]);

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

  function handleCreateFolder(
    name: string,
    options?: { icon: string; accentColor: string }
  ) {
    setSaving(true);
    setError(null);

    try {
      const folder = createFolder({
        name,
        icon: options?.icon,
        accentColor: options?.accentColor,
      });
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

  function openFolderOptions(folder: FolderWithCount) {
    Alert.alert(
      folder.name,
      `${folder.bookCount} item${folder.bookCount === 1 ? "" : "s"}`,
      [
        { text: "Open", onPress: () => router.push(`/folders/${folder.id}`) },
        { text: "Cancel", style: "cancel" },
      ]
    );
  }

  return (
    <View style={{ flex: 1 }}>
      <ScrollView
        contentInsetAdjustmentBehavior="automatic"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{
          width: responsive.pageWidth,
          alignSelf: "center",
          paddingTop: responsive.isPhone ? spacing[4] : responsive.gutter,
          paddingBottom: responsive.bottomInsetPadding + spacing[8],
          gap: responsive.isPhone ? spacing[4] : spacing[6],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[2],
          }}
        >
          {/* <IconButton
            label="Back to Library"
            onPress={() => router.push("/library")}
          >
            <ArrowLeft
              color={colors.brand.violet}
              size={24}
              strokeWidth={2.1}
            />
          </IconButton> */}
          <AppText
            color="primary"
            variant={responsive.isPhone ? "title2" : "title1"}
            weight="bold"
            numberOfLines={1}
            style={{ flex: 1 }}
          >
            Folders
          </AppText>
          <IconButton
            label="Folder options"
            onPress={() =>
              Alert.alert("Folders", "Folder tools are coming soon.")
            }
          >
            <EllipsisVertical
              color={colors.brand.violet}
              size={23}
              strokeWidth={2.2}
            />
          </IconButton>
        </View>

        {visibleFolders.length > 0 ? (
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap,
            }}
          >
            {visibleFolders.map((folder) => (
              <FolderGridCard
                key={folder.id}
                folder={folder}
                width={cardWidth}
                onPress={(folderId) => router.push(`/folders/${folderId}`)}
                onMore={openFolderOptions}
              />
            ))}
          </View>
        ) : (
          <EmptyState
            compact={responsive.isPhone}
            icon={FolderPlus}
            title={query.trim() ? "No folders found" : "No folders yet"}
            body={
              query.trim()
                ? "Try another folder name or create a new one."
                : "Create a folder to organize books by project, class, or reading mood."
            }
          />
        )}

        {!query.trim() && visibleFolders.length > 0 ? (
          <View
            style={{
              minHeight: responsive.isPhone ? 128 : 150,
              alignItems: "center",
              justifyContent: "center",
              overflow: "hidden",
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.border.subtle,
              backgroundColor: colors.surface.soft,
              padding: spacing[5],
            }}
          >
            <AppText
              color="secondary"
              variant={responsive.isPhone ? "body" : "bodyLarge"}
              weight="semibold"
              align="center"
            >
              Your sanctuary awaits.
            </AppText>
            <AppText
              color="tertiary"
              variant={responsive.isPhone ? "footnote" : "body"}
              align="center"
              style={{ maxWidth: 340 }}
            >
              Keep your library tidy for a clearer mind.
            </AppText>
          </View>
        ) : null}
      </ScrollView>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Create folder"
        onPress={openCreateFolder}
        style={({ pressed }) => ({
          position: "absolute",
          right: responsive.gutter,
          bottom: responsive.bottomInsetPadding - spacing[4],
          width: responsive.isPhone ? 58 : 64,
          height: responsive.isPhone ? 58 : 64,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: radii.lg,
          backgroundColor: colors.brand.violet,
          opacity: pressed ? 0.76 : 1,
          shadowColor: "#000000",
          shadowOpacity: 0.22,
          shadowRadius: 18,
          shadowOffset: { width: 0, height: 10 },
          elevation: 8,
        })}
      >
        <Plus color="#FFFFFF" size={29} strokeWidth={2.4} />
      </Pressable>

      <FolderNameModal
        visible={modalVisible}
        title="Create Folder"
        error={error}
        saving={saving}
        onClose={closeCreateFolder}
        onSubmit={handleCreateFolder}
      />
    </View>
  );
}
