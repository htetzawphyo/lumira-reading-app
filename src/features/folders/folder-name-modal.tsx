import {
  BookOpen,
  Bookmark,
  FileText,
  Folder,
  Star,
  X,
} from "lucide-react-native";
import type { LucideIcon } from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Pressable,
  ScrollView,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { InlineStatus } from "@/components/ui/inline-status";
import { useAppTheme } from "@/design/app-theme-provider";
import { radii, spacing } from "@/design/tokens";

type FolderNameModalProps = {
  visible: boolean;
  title: string;
  initialValue?: string;
  error?: string | null;
  saving?: boolean;
  onClose: () => void;
  onSubmit: (
    name: string,
    options?: { icon: string; accentColor: string }
  ) => void;
};

export function FolderNameModal({
  visible,
  title,
  initialValue = "",
  error,
  saving,
  onClose,
  onSubmit,
}: FolderNameModalProps) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [value, setValue] = useState(initialValue);
  const [selectedIcon, setSelectedIcon] = useState("folder");
  const [selectedAccent, setSelectedAccent] = useState(colors.brand.violet);
  const bottomInset = Math.max(insets.bottom, spacing[4]);
  const isCreate = title.toLowerCase().includes("create");
  const dialogTitle = isCreate ? "New Folder" : title;
  const submitTitle = isCreate ? "Create Folder" : "Save";
  const iconOptions = useMemo<Array<{ id: string; icon: LucideIcon }>>(
    () => [
      { id: "folder", icon: Folder },
      { id: "book", icon: BookOpen },
      { id: "bookmark", icon: Bookmark },
      { id: "file", icon: FileText },
      { id: "star", icon: Star },
    ],
    []
  );
  const accentOptions = useMemo(
    () => [
      colors.brand.violet,
      colors.brand.amber,
      colors.brand.emerald,
      colors.brand.cyan,
      colors.text.tertiary,
    ],
    [colors]
  );

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
      setSelectedIcon("folder");
      setSelectedAccent(colors.brand.violet);
    }
  }, [colors.brand.violet, initialValue, visible]);

  const trimmed = value.trim();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={process.env.EXPO_OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.44)",
            paddingHorizontal: spacing[4],
            paddingBottom: bottomInset,
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Close folder dialog"
            onPress={onClose}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <ScrollView
            keyboardShouldPersistTaps="handled"
            bounces={false}
            contentContainerStyle={{
              flexGrow: 1,
              justifyContent: "center",
              paddingVertical: spacing[8],
            }}
          >
            <View
              style={{
                width: "100%",
                maxWidth: 430,
                alignSelf: "center",
                gap: spacing[4],
                borderRadius: radii.xl,
                borderWidth: 1,
                borderColor: colors.border.subtle,
                backgroundColor: colors.background.elevated,
                padding: spacing[5],
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
                <AppText color="primary" variant="title3" weight="semibold">
                  {dialogTitle}
                </AppText>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Close folder dialog"
                  onPress={onClose}
                  style={({ pressed }) => ({
                    width: 36,
                    height: 36,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: radii.pill,
                    opacity: pressed ? 0.7 : 1,
                  })}
                >
                  <X color={colors.text.secondary} size={21} strokeWidth={2.2} />
                </Pressable>
              </View>
              <View style={{ gap: spacing[2] }}>
                <AppText color="secondary" variant="footnote">
                  Folder Name
                </AppText>
                <TextInput
                  value={value}
                  onChangeText={setValue}
                  autoFocus
                  placeholder="e.g. Thesis Research"
                  placeholderTextColor={colors.text.muted}
                  returnKeyType="done"
                  onSubmitEditing={() => {
                    if (trimmed && !saving) {
                      onSubmit(
                        trimmed,
                        isCreate
                          ? {
                              icon: selectedIcon,
                              accentColor: selectedAccent,
                            }
                          : undefined
                      );
                    }
                  }}
                  style={{
                    minHeight: 50,
                    borderRadius: radii.sm,
                    borderWidth: 1,
                    borderColor: colors.border.default,
                    backgroundColor: colors.background.panel,
                    color: colors.text.primary,
                    paddingHorizontal: spacing[4],
                    fontSize: 16,
                  }}
                />
              </View>
              {isCreate ? (
                <>
                  <View style={{ gap: spacing[2] }}>
                    <AppText color="secondary" variant="footnote">
                      Select Icon
                    </AppText>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
                      {iconOptions.map((option) => {
                        const Icon = option.icon;
                        const selected = selectedIcon === option.id;

                        return (
                          <Pressable
                            key={option.id}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            onPress={() => setSelectedIcon(option.id)}
                            style={({ pressed }) => ({
                              width: 48,
                              height: 48,
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: radii.md,
                              backgroundColor: selected
                                ? colors.brand.violet
                                : colors.surface.soft,
                              opacity: pressed ? 0.72 : 1,
                            })}
                          >
                            <Icon
                              color={selected ? "#FFFFFF" : colors.text.secondary}
                              size={22}
                              strokeWidth={2}
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                  <View style={{ gap: spacing[2] }}>
                    <AppText color="secondary" variant="footnote">
                      Color Accent
                    </AppText>
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[3] }}>
                      {accentOptions.map((accent) => {
                        const selected = selectedAccent === accent;

                        return (
                          <Pressable
                            key={accent}
                            accessibilityRole="button"
                            accessibilityState={{ selected }}
                            onPress={() => setSelectedAccent(accent)}
                            style={({ pressed }) => ({
                              width: 38,
                              height: 38,
                              alignItems: "center",
                              justifyContent: "center",
                              borderRadius: radii.pill,
                              borderWidth: selected ? 3 : 0,
                              borderColor: colors.border.default,
                              opacity: pressed ? 0.72 : 1,
                            })}
                          >
                            <View
                              style={{
                                width: selected ? 26 : 32,
                                height: selected ? 26 : 32,
                                borderRadius: radii.pill,
                                backgroundColor: accent,
                              }}
                            />
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                </>
              ) : null}
              {error ? <InlineStatus tone="warning" message={error} /> : null}
              <View
                style={{
                  flexDirection: "row",
                  justifyContent: "flex-end",
                  gap: spacing[3],
                  paddingTop: spacing[2],
                }}
              >
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={onClose}
                  style={{ minHeight: 42, paddingHorizontal: spacing[4] }}
                />
                <Button
                  title={saving ? "Saving..." : submitTitle}
                  variant="secondary"
                  disabled={!trimmed || saving}
                  onPress={() =>
                    onSubmit(
                      trimmed,
                      isCreate
                        ? {
                            icon: selectedIcon,
                            accentColor: selectedAccent,
                          }
                        : undefined
                    )
                  }
                  style={{ minHeight: 42, paddingHorizontal: spacing[4] }}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
