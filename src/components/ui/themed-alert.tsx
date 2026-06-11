import type { ReactNode } from "react";
import { createContext, useCallback, useContext, useMemo, useState } from "react";
import { Modal, Pressable, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { AppText } from "@/components/ui/app-text";
import { useAppTheme } from "@/design/app-theme-provider";
import { radii, spacing } from "@/design/tokens";

export type ThemedAlertButton = {
  text?: string;
  style?: "default" | "cancel" | "destructive";
  onPress?: () => void;
};

type ThemedAlertState = {
  title: string;
  message?: string;
  buttons: ThemedAlertButton[];
};

type ThemedAlertContextValue = {
  showAlert: (
    title: string,
    message?: string,
    buttons?: ThemedAlertButton[],
  ) => void;
};

let alertPresenter: ThemedAlertContextValue["showAlert"] | null = null;

const ThemedAlertContext = createContext<ThemedAlertContextValue>({
  showAlert: (title, message) => {
    console.warn("ThemedAlertProvider is not mounted", title, message);
  },
});

export function showThemedAlert(
  title: string,
  message?: string,
  buttons?: ThemedAlertButton[],
) {
  alertPresenter?.(title, message, buttons);
}

export function ThemedAlertProvider({ children }: { children: ReactNode }) {
  const { colors } = useAppTheme();
  const insets = useSafeAreaInsets();
  const [alertState, setAlertState] = useState<ThemedAlertState | null>(null);

  const showAlert = useCallback<ThemedAlertContextValue["showAlert"]>(
    (title, message, buttons) => {
      setAlertState({
        title,
        message,
        buttons: buttons?.length ? buttons : [{ text: "OK", style: "default" }],
      });
    },
    [],
  );

  alertPresenter = showAlert;

  const value = useMemo(() => ({ showAlert }), [showAlert]);

  function closeAlert(button?: ThemedAlertButton) {
    setAlertState(null);
    requestAnimationFrame(() => {
      button?.onPress?.();
    });
  }

  const cancelButton =
    alertState?.buttons.find((button) => button.style === "cancel") ??
    alertState?.buttons[0];

  return (
    <ThemedAlertContext.Provider value={value}>
      {children}
      <Modal
        visible={Boolean(alertState)}
        transparent
        animationType="fade"
        onRequestClose={() => closeAlert(cancelButton)}
      >
        <View
          style={{
            flex: 1,
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "rgba(0,0,0,0.48)",
            paddingHorizontal: spacing[5],
            paddingBottom: Math.max(insets.bottom, spacing[4]),
            paddingTop: Math.max(insets.top, spacing[4]),
          }}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Dismiss alert"
            onPress={() => closeAlert(cancelButton)}
            style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
          />
          <View
            style={{
              width: "100%",
              maxWidth: 420,
              gap: spacing[4],
              borderRadius: radii.xxl,
              borderWidth: 1,
              borderColor: colors.border.default,
              backgroundColor: colors.background.elevated,
              padding: spacing[5],
              shadowColor: "#000",
              shadowOpacity: 0.24,
              shadowRadius: 24,
              shadowOffset: { width: 0, height: 14 },
              elevation: 12,
            }}
          >
            <View style={{ gap: spacing[2] }}>
              <AppText color="primary" variant="title3" weight="semibold">
                {alertState?.title ?? ""}
              </AppText>
              {alertState?.message ? (
                <AppText color="secondary" variant="body" style={{ lineHeight: 23 }}>
                  {alertState.message}
                </AppText>
              ) : null}
            </View>

            <View
              style={{
                flexDirection: "row",
                justifyContent: "flex-end",
                flexWrap: "wrap",
                gap: spacing[2],
              }}
            >
              {alertState?.buttons.map((button, index) => {
                const isCancel = button.style === "cancel";
                const isDestructive = button.style === "destructive";

                return (
                  <Pressable
                    key={`${button.text ?? "OK"}-${index}`}
                    accessibilityRole="button"
                    onPress={() => closeAlert(button)}
                    style={({ pressed }) => ({
                      minHeight: 42,
                      minWidth: 88,
                      alignItems: "center",
                      justifyContent: "center",
                      borderRadius: radii.pill,
                      borderWidth: 1,
                      borderColor: isCancel
                        ? colors.border.subtle
                        : isDestructive
                          ? "rgba(248, 113, 113, 0.35)"
                          : colors.text.primary,
                      backgroundColor: isCancel
                        ? "transparent"
                        : isDestructive
                          ? "rgba(248, 113, 113, 0.14)"
                          : colors.text.primary,
                      paddingHorizontal: spacing[4],
                      opacity: pressed ? 0.72 : 1,
                    })}
                  >
                    <AppText
                      color={
                        isCancel
                          ? "secondary"
                          : isDestructive
                            ? "#FCA5A5"
                            : colors.text.inverse
                      }
                      variant="footnote"
                      weight="semibold"
                    >
                      {button.text ?? "OK"}
                    </AppText>
                  </Pressable>
                );
              })}
            </View>
          </View>
        </View>
      </Modal>
    </ThemedAlertContext.Provider>
  );
}

export function useThemedAlert() {
  return useContext(ThemedAlertContext);
}
