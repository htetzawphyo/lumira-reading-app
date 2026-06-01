import { useEffect, useState } from "react";
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
  onSubmit: (name: string) => void;
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
  const bottomInset = Math.max(insets.bottom, spacing[8]);

  useEffect(() => {
    if (visible) {
      setValue(initialValue);
    }
  }, [initialValue, visible]);

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
            justifyContent: "flex-end",
            backgroundColor: "rgba(0,0,0,0.44)",
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
              justifyContent: "flex-end",
              paddingTop: spacing[8],
            }}
          >
            <View
              style={{
                gap: spacing[4],
                borderTopLeftRadius: radii.xxl,
                borderTopRightRadius: radii.xxl,
                borderWidth: 1,
                borderColor: colors.border.subtle,
                backgroundColor: colors.background.elevated,
                padding: spacing[5],
                paddingBottom: spacing[5] + bottomInset,
              }}
            >
              <View style={{ gap: spacing[1] }}>
                <AppText color="primary" variant="title3" weight="semibold">
                  {title}
                </AppText>
                <AppText color="secondary" variant="footnote">
                  Books stay in your Library even when folders change.
                </AppText>
              </View>
              <TextInput
                value={value}
                onChangeText={setValue}
                autoFocus
                placeholder="Folder name"
                placeholderTextColor={colors.text.muted}
                returnKeyType="done"
                onSubmitEditing={() => {
                  if (trimmed && !saving) {
                    onSubmit(trimmed);
                  }
                }}
                style={{
                  minHeight: 52,
                  borderRadius: radii.lg,
                  borderWidth: 1,
                  borderColor: colors.border.subtle,
                  backgroundColor: colors.background.panel,
                  color: colors.text.primary,
                  paddingHorizontal: spacing[4],
                  fontSize: 16,
                }}
              />
              {error ? <InlineStatus tone="warning" message={error} /> : null}
              <View style={{ flexDirection: "row", gap: spacing[3] }}>
                <Button
                  title="Cancel"
                  variant="ghost"
                  onPress={onClose}
                  style={{ flex: 1 }}
                />
                <Button
                  title={saving ? "Saving..." : "Save"}
                  variant="secondary"
                  disabled={!trimmed || saving}
                  onPress={() => onSubmit(trimmed)}
                  style={{ flex: 1 }}
                />
              </View>
            </View>
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
