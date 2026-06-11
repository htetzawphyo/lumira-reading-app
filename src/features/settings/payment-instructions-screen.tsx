import * as Clipboard from "expo-clipboard";
import * as DocumentPicker from "expo-document-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Image as ImageIcon,
  Upload,
  WalletCards,
} from "lucide-react-native";
import { useMemo, useState } from "react";
import { ScrollView, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Surface } from "@/components/ui/surface";
import { showThemedAlert } from "@/components/ui/themed-alert";
import { useAppTheme } from "@/design/app-theme-provider";
import { useResponsive } from "@/design/responsive";
import { radii, spacing } from "@/design/tokens";

const paymentAccountNumber = "09428786611";
const paymentAccountName = "Htet Zaw Phyo";

const paymentMethodNames: Record<string, string> = {
  "aya-pay": "AYA Pay",
  "wave-pay": "Wave Pay",
  "uab-pay": "UAB Pay",
};

export function PaymentInstructionsScreen() {
  const router = useRouter();
  const responsive = useResponsive();
  const { colors } = useAppTheme();
  const params = useLocalSearchParams<{ method?: string }>();
  const [proofFile, setProofFile] =
    useState<DocumentPicker.DocumentPickerAsset | null>(null);

  const paymentMethod = useMemo(() => {
    const method = typeof params.method === "string" ? params.method : "";

    return paymentMethodNames[method] ?? "MMK Payment";
  }, [params.method]);

  const copyAccountNumber = async () => {
    await Clipboard.setStringAsync(paymentAccountNumber);
    showThemedAlert("Copied", "Account number copied.");
  };

  const choosePaymentProof = async () => {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*"],
      copyToCacheDirectory: true,
      multiple: false,
    });

    if (result.canceled || !result.assets?.[0]) {
      return;
    }

    setProofFile(result.assets[0]);
  };

  const submitProof = () => {
    if (!proofFile) {
      return;
    }

    showThemedAlert(
      "Payment proof selected",
      "Your screenshot is ready. The backend payment verification upload endpoint can be connected next.",
    );
  };

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
          width: Math.min(
            responsive.pageWidth,
            responsive.isTablet ? 760 : responsive.maxContentWidth,
          ),
          alignSelf: "center",
          gap: responsive.isPhone ? spacing[5] : spacing[7],
        }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: responsive.isPhone ? spacing[3] : spacing[4],
          }}
        >
          <IconButton
            icon={ArrowLeft}
            label="Back to premium"
            onPress={() => router.replace("/settings/premium")}
            style={responsive.isPhone ? { width: 40, height: 40 } : undefined}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText
              color="primary"
              variant={responsive.isPhone ? "title2" : "title1"}
              weight="bold"
              numberOfLines={1}
            >
              Payment Details
            </AppText>
            <AppText
              color="secondary"
              variant={responsive.isPhone ? "footnote" : "body"}
              numberOfLines={2}
            >
              Transfer with {paymentMethod}, then upload your payment screenshot.
            </AppText>
          </View>
        </View>

        <Surface
          style={{
            gap: responsive.isPhone ? spacing[4] : spacing[5],
            padding: responsive.isPhone ? spacing[4] : spacing[5],
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
            <View
              style={{
                width: responsive.isPhone ? 44 : 52,
                height: responsive.isPhone ? 44 : 52,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radii.pill,
                backgroundColor: colors.brand.violet,
              }}
            >
              <WalletCards
                color="#FFFFFF"
                size={responsive.isPhone ? 22 : 26}
                strokeWidth={2.2}
              />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText color="primary" variant="bodyLarge" weight="semibold">
                {paymentMethod}
              </AppText>
              <AppText color="secondary" variant="footnote">
                Lumira Pro manual transfer
              </AppText>
            </View>
          </View>

          <View
            style={{
              gap: spacing[3],
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.border.subtle,
              backgroundColor: colors.surface.soft,
              padding: responsive.isPhone ? spacing[4] : spacing[5],
            }}
          >
            <View style={{ gap: spacing[1] }}>
              <AppText color="secondary" variant="caption" weight="semibold">
                Account Number
              </AppText>
              <View
                style={{
                  flexDirection: responsive.isSmallPhone ? "column" : "row",
                  alignItems: responsive.isSmallPhone ? "stretch" : "center",
                  justifyContent: "space-between",
                  gap: spacing[3],
                }}
              >
                <AppText
                  color="primary"
                  variant={responsive.isPhone ? "title3" : "title2"}
                  weight="bold"
                >
                  {paymentAccountNumber}
                </AppText>
                <Button
                  title="Copy"
                  icon={Copy}
                  variant="ghost"
                  onPress={copyAccountNumber}
                  style={{
                    minHeight: 38,
                    paddingHorizontal: spacing[3],
                    borderColor: colors.border.subtle,
                    backgroundColor: colors.background.panel,
                    alignSelf: responsive.isSmallPhone ? "flex-start" : "center",
                  }}
                />
              </View>
            </View>

            <View style={{ gap: spacing[1] }}>
              <AppText color="secondary" variant="caption" weight="semibold">
                Account Name
              </AppText>
              <AppText color="primary" variant="bodyLarge" weight="semibold">
                {paymentAccountName}
              </AppText>
            </View>
          </View>

          <AppText color="tertiary" variant="caption">
            Please transfer the exact subscription amount, then upload your
            payment screenshot for review.
          </AppText>
        </Surface>

        <Surface
          tone="quiet"
          style={{
            gap: responsive.isPhone ? spacing[4] : spacing[5],
            padding: responsive.isPhone ? spacing[4] : spacing[5],
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
            <View
              style={{
                width: 42,
                height: 42,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radii.md,
                backgroundColor: colors.background.panelStrong,
              }}
            >
              <ImageIcon color={colors.brand.violet} size={21} strokeWidth={2.1} />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <AppText color="primary" variant="body" weight="semibold">
                Payment Screenshot
              </AppText>
              <AppText color="secondary" variant="caption" numberOfLines={2}>
                Upload a clear screenshot after sending the payment.
              </AppText>
            </View>
          </View>

          {proofFile ? (
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing[3],
                borderRadius: radii.lg,
                borderWidth: 1,
                borderColor: colors.border.subtle,
                backgroundColor: colors.background.panel,
                padding: spacing[3],
              }}
            >
              <CheckCircle2 color={colors.brand.emerald} size={20} strokeWidth={2.2} />
              <View style={{ flex: 1, minWidth: 0 }}>
                <AppText color="primary" variant="footnote" weight="semibold" numberOfLines={1}>
                  {proofFile.name}
                </AppText>
                <AppText color="secondary" variant="caption">
                  Screenshot selected
                </AppText>
              </View>
            </View>
          ) : null}

          <Button
            title={proofFile ? "Change Screenshot" : "Upload Screenshot"}
            icon={Upload}
            variant="secondary"
            fullWidth
            onPress={choosePaymentProof}
            style={responsive.isPhone ? { minHeight: 42 } : undefined}
          />

          <Button
            title="Submit Payment Proof"
            variant="primary"
            fullWidth
            disabled={!proofFile}
            onPress={submitProof}
            style={[
              responsive.isPhone ? { minHeight: 42 } : undefined,
              !proofFile ? { opacity: 0.48 } : null,
            ]}
          />
        </Surface>
      </View>
    </ScrollView>
  );
}
