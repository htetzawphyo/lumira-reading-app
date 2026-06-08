import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Bell,
  BookOpen,
  Check,
  Cloud,
  CreditCard,
  Crown,
  Globe2,
  Lock,
  Mail,
  MessageCircle,
  Moon,
  Palette,
  Shield,
  Sparkles,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { Alert, Modal, Platform, Pressable, ScrollView, Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Surface } from "@/components/ui/surface";
import {
  appThemeGroups,
  canUseAppTheme,
  getAppTheme,
  type AppTheme,
} from "@/design/app-themes";
import { useAppTheme } from "@/design/app-theme-provider";
import { getReaderFontOption } from "@/design/fonts";
import { useResponsive } from "@/design/responsive";
import { radii, spacing } from "@/design/tokens";
import { useBooksStore } from "@/features/books/books-store";
import {
  loginWithGoogleIdToken,
  logoutFromBackend,
  refreshCurrentUser,
} from "@/features/auth/auth-service";
import { isPremiumAuthSession, useAuthStore } from "@/features/auth/auth-store";
import type {
  NotificationSettings,
  NotificationSettingsInput,
} from "@/features/books/types";
import {
  fallbackProPlanConfig,
  proPlanService,
  type ProPlanConfig,
  type ProPlanFeatureCategory,
} from "@/features/settings/pro-plan-service";
import { SyncBackupScreen } from "@/features/sync/sync-backup-screen";

export type SettingsDetailKind =
  | "profile"
  | "premium"
  | "appearance"
  | "notifications"
  | "sync";

type DetailShellProps = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  accent?: string;
  children: ReactNode;
};

type SectionProps = {
  title: string;
  children: ReactNode;
};

type InfoRowProps = {
  label: string;
  value: string;
  icon?: LucideIcon;
  onPress?: () => void;
};

type ChoiceCardProps = {
  title: string;
  subtitle: string;
  icon: LucideIcon;
  selected: boolean;
  onPress: () => void;
};

type ToggleRowProps = {
  title: string;
  subtitle: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
};

function DetailShell({
  title,
  subtitle,
  icon: Icon,
  accent,
  children,
}: DetailShellProps) {
  const responsive = useResponsive();
  const router = useRouter();
  const { colors } = useAppTheme();
  const resolvedAccent = accent ?? colors.brand.violet;

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
            responsive.isTablet ? 860 : responsive.maxContentWidth,
          ),
          alignSelf: "center",
          gap: responsive.isPhone ? spacing[5] : spacing[7],
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: responsive.isPhone ? spacing[3] : spacing[4] }}>
          <IconButton
            icon={ArrowLeft}
            label="Back to settings"
            onPress={() => router.replace("/settings")}
            style={responsive.isPhone ? { width: 40, height: 40 } : undefined}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText color="primary" variant={responsive.isPhone ? "title2" : "title1"} weight="bold" numberOfLines={1}>
              {title}
            </AppText>
            <AppText color="secondary" variant={responsive.isPhone ? "footnote" : "body"} numberOfLines={2}>
              {subtitle}
            </AppText>
          </View>
          {!responsive.isPhone ? (
            <View
              style={{
                width: 58,
                height: 58,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: 18,
                backgroundColor: resolvedAccent,
              }}
            >
              <Icon color="#FFFFFF" size={28} strokeWidth={2.1} />
            </View>
          ) : null}
        </View>

        {children}
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: SectionProps) {
  const responsive = useResponsive();

  return (
    <View style={{ gap: responsive.isPhone ? spacing[3] : spacing[4] }}>
      <AppText color="secondary" variant={responsive.isPhone ? "footnote" : "body"} weight="semibold">
        {title}
      </AppText>
      <Surface padded={false} style={{ overflow: "hidden", borderRadius: responsive.isPhone ? 16 : 18 }}>
        {children}
      </Surface>
    </View>
  );
}

function InfoRow({ label, value, icon: Icon, onPress }: InfoRowProps) {
  const responsive = useResponsive();
  const { colors } = useAppTheme();
  const iconSize = responsive.isPhone ? 34 : 42;
  const rowStyle = {
    minHeight: responsive.isPhone ? 62 : 82,
    flexDirection: "row" as const,
    alignItems: "center" as const,
    gap: responsive.isPhone ? spacing[3] : spacing[4],
    borderBottomWidth: 1,
    borderBottomColor: colors.border.subtle,
    paddingHorizontal: responsive.isPhone ? spacing[4] : spacing[5],
  };
  const content = (
    <>
      {Icon ? (
        <View
          style={{
            width: iconSize,
            height: iconSize,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radii.md,
            backgroundColor: colors.background.panelStrong,
          }}
        >
          <Icon color={colors.text.secondary} size={responsive.isPhone ? 17 : 21} strokeWidth={2} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText color="secondary" variant={responsive.isPhone ? "caption" : "footnote"}>
          {label}
        </AppText>
        <AppText color="primary" variant={responsive.isPhone ? "body" : "bodyLarge"} weight="semibold" numberOfLines={1}>
          {value}
        </AppText>
      </View>
      {onPress ? (
        <AppText color={colors.brand.violet} variant="caption" weight="semibold">
          Edit
        </AppText>
      ) : null}
    </>
  );

  if (onPress) {
    return (
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [rowStyle, { opacity: pressed ? 0.72 : 1 }]}
      >
        {content}
      </Pressable>
    );
  }

  return <View style={rowStyle}>{content}</View>;
}

function ChoiceCard({
  title,
  subtitle,
  icon: Icon,
  selected,
  onPress,
}: ChoiceCardProps) {
  const responsive = useResponsive();
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: responsive.isPhone ? undefined : 1,
        width: responsive.isPhone ? "100%" : undefined,
        minWidth: responsive.isPhone ? 0 : 190,
        gap: responsive.isPhone ? spacing[3] : spacing[4],
        borderRadius: responsive.isPhone ? 16 : 18,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: selected ? colors.brand.violet : colors.border.subtle,
        backgroundColor: selected ? colors.surface.soft : colors.background.panel,
        padding: responsive.isPhone ? spacing[4] : spacing[5],
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing[3] }}>
        <View
          style={{
            width: responsive.isPhone ? 40 : 46,
            height: responsive.isPhone ? 40 : 46,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radii.md,
            backgroundColor: colors.background.panelStrong,
          }}
        >
          <Icon color={selected ? colors.brand.violet : colors.text.secondary} size={responsive.isPhone ? 20 : 23} />
        </View>
        {selected ? <Check color={colors.brand.violet} size={responsive.isPhone ? 19 : 22} strokeWidth={2.4} /> : null}
      </View>
      <View style={{ gap: spacing[1] }}>
        <AppText color="primary" variant={responsive.isPhone ? "body" : "bodyLarge"} weight="semibold">
          {title}
        </AppText>
        <AppText color="secondary" variant={responsive.isPhone ? "caption" : "footnote"}>
          {subtitle}
        </AppText>
      </View>
    </Pressable>
  );
}

function ToggleRow({
  title,
  subtitle,
  value,
  onValueChange,
  disabled,
}: ToggleRowProps) {
  const responsive = useResponsive();
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        minHeight: responsive.isPhone ? 72 : 92,
        flexDirection: "row",
        alignItems: "center",
        gap: responsive.isPhone ? spacing[3] : spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
        paddingHorizontal: responsive.isPhone ? spacing[4] : spacing[5],
        opacity: disabled ? 0.62 : 1,
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText color="primary" variant={responsive.isPhone ? "body" : "bodyLarge"} weight="semibold">
          {title}
        </AppText>
        <AppText color="secondary" variant={responsive.isPhone ? "caption" : "footnote"} numberOfLines={2}>
          {subtitle}
        </AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        disabled={disabled}
        trackColor={{
          false: colors.background.panelStrong,
          true: "rgba(139, 92, 246, 0.55)",
        }}
        thumbColor={value ? colors.text.primary : colors.text.secondary}
      />
    </View>
  );
}

function isConfiguredGoogleClientId(clientId: string) {
  return (
    clientId.endsWith(".apps.googleusercontent.com") &&
    !clientId.includes("client-id.apps.googleusercontent.com")
  );
}

function ProfileDetail() {
  const responsive = useResponsive();
  const { colors } = useAppTheme();
  const session = useAuthStore((state) => state.session);
  const hydrateAuth = useAuthStore((state) => state.hydrate);
  const [authLoading, setAuthLoading] = useState(false);
  const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ?? "";
  const googleIosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID ?? "";
  const user = session?.user;

  useEffect(() => {
    hydrateAuth()
      .then((session) => {
        if (session) {
          return refreshCurrentUser();
        }
        return null;
      })
      .catch(() => undefined);
  }, [hydrateAuth]);

  async function handleGoogleSignIn() {
    if (!isConfiguredGoogleClientId(googleClientId)) {
      Alert.alert(
        "Google Client ID missing",
        "Add the Web OAuth client ID to EXPO_PUBLIC_GOOGLE_CLIENT_ID, then restart Expo.",
      );
      return;
    }

    if (Platform.OS === "web") {
      Alert.alert(
        "Google sign-in unavailable",
        "Web Google sign-in is not configured for this app yet.",
      );
      return;
    }

    if (Platform.OS === "ios" && !isConfiguredGoogleClientId(googleIosClientId)) {
      Alert.alert(
        "iOS Google Client ID missing",
        "Add EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID from Google Cloud Console, then restart Expo.",
      );
      return;
    }

    setAuthLoading(true);
    try {
      if (__DEV__) {
        console.log("Lumira Google Sign-In", {
          platform: Platform.OS,
          webClientId: googleClientId,
          iosClientId: googleIosClientId || null,
        });
      }

      const { GoogleSignin } = await import("@react-native-google-signin/google-signin");

      GoogleSignin.configure({
        webClientId: googleClientId,
        iosClientId: googleIosClientId || undefined,
        offlineAccess: false,
        scopes: ["profile", "email"],
      });

      if (Platform.OS === "android") {
        await GoogleSignin.hasPlayServices({
          showPlayServicesUpdateDialog: true,
        });
      }

      const signInResponse = await GoogleSignin.signIn();

      if (signInResponse.type === "cancelled") {
        return;
      }

      const idToken = signInResponse.data.idToken;

      if (!idToken) {
        Alert.alert("Google sign-in failed", "Google did not return an ID token.");
        return;
      }

      await loginWithGoogleIdToken(idToken);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Could not sign in with Google.";
      Alert.alert(
        "Google sign-in unavailable",
        message.includes("RNGoogleSignin") || message.includes("native module")
          ? "The Google Sign-In native module is not in this app build yet. Rebuild the development app, then try again."
          : message,
      );
    } finally {
      setAuthLoading(false);
    }
  }

  async function handleSignOut() {
    setAuthLoading(true);
    try {
      const { GoogleSignin } = await import("@react-native-google-signin/google-signin");
      await GoogleSignin.signOut().catch(() => undefined);
      await logoutFromBackend();
    } finally {
      setAuthLoading(false);
    }
  }

  return (
    <DetailShell
      title="Profile"
      subtitle="Local account identity for your reading workspace."
      icon={UserRound}
    >
      <Surface
        style={{
          flexDirection: responsive.isSmallPhone ? "column" : "row",
          alignItems: responsive.isSmallPhone ? "flex-start" : "center",
          gap: responsive.isPhone ? spacing[3] : spacing[5],
          backgroundColor: colors.background.panel,
          padding: responsive.isPhone ? spacing[4] : spacing[5],
        }}
      >
        <View
          style={{
            width: responsive.isPhone ? 54 : 82,
            height: responsive.isPhone ? 54 : 82,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radii.pill,
            backgroundColor: colors.background.panelStrong,
          }}
        >
          <UserRound color={colors.text.primary} size={responsive.isPhone ? 26 : 38} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, gap: spacing[2], minWidth: 0 }}>
          <AppText color="primary" variant={responsive.isPhone ? "bodyLarge" : "title3"} weight="semibold" numberOfLines={1}>
            {user?.name ?? "Lumira Reader"}
          </AppText>
          <AppText color="secondary" variant={responsive.isPhone ? "footnote" : "body"} numberOfLines={1} selectable>
            {user?.email ?? "Not signed in"}
          </AppText>
          <Button
            title={
              authLoading
                ? "Working..."
                : user
                  ? "Sign Out"
                  : "Sign in with Google"
            }
            variant="secondary"
            onPress={user ? handleSignOut : handleGoogleSignIn}
            style={responsive.isPhone ? { minHeight: 40, paddingHorizontal: spacing[3] } : undefined}
          />
        </View>
      </Surface>

      <Section title="Account">
        <InfoRow label="Display name" value={user?.name ?? "Not set"} icon={UserRound} />
        <InfoRow label="Email" value={user?.email ?? "Not signed in"} icon={Mail} />
        <InfoRow label="Plan" value={user?.plan ?? "Local only"} icon={Crown} />
        <InfoRow label="Privacy" value="Offline-first, optional cloud backup" icon={Shield} />
      </Section>
    </DetailShell>
  );
}

function priceDisplay(
  price:
    | ProPlanConfig["prices"]["mm"]
    | ProPlanConfig["prices"]["international"],
) {
  return price.display || "Price unavailable";
}

function aiLimitDisplay(value: number | null, fallback: string) {
  return typeof value === "number" && value > 0
    ? value.toLocaleString()
    : fallback;
}

function featureIcon(category: ProPlanFeatureCategory) {
  switch (category) {
    case "appearance":
      return Palette;
    case "reading":
      return BookOpen;
    case "cloud":
      return Cloud;
    case "ai":
      return Sparkles;
    default:
      return Check;
  }
}

function PremiumDetail() {
  const router = useRouter();
  const [config, setConfig] = useState<ProPlanConfig>(fallbackProPlanConfig);
  const [selectedRegion, setSelectedRegion] = useState<"MM" | "international">(
    "MM",
  );
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [selectedPaymentMethodId, setSelectedPaymentMethodId] = useState<
    string | null
  >(null);
  const responsive = useResponsive();
  const { colors } = useAppTheme();
  const selectedMethods = config.paymentMethods.filter((method) =>
    selectedRegion === "MM"
      ? method.region === "MM"
      : method.region === "international",
  );

  useEffect(() => {
    let active = true;

    proPlanService
      .getProPlanConfig()
      .then((nextConfig) => {
        if (active) {
          setConfig(nextConfig);
        }
      })
      .catch(() => {
        if (active) {
          setConfig(fallbackProPlanConfig);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const chooseRegion = (region: "MM" | "international") => {
    setSelectedRegion(region);
    setSelectedPaymentMethodId(null);
  };

  const openPaymentModal = () => {
    const firstAvailableMethod = selectedMethods.find((method) => method.enabled);

    setSelectedPaymentMethodId(firstAvailableMethod?.id ?? null);
    setPaymentModalVisible(true);
  };

  const continuePayment = () => {
    const selectedMethod = selectedMethods.find(
      (method) => method.id === selectedPaymentMethodId && method.enabled,
    );

    if (!selectedMethod) {
      return;
    }

    setPaymentModalVisible(false);
    router.push({
      pathname: "/settings/payment-instructions",
      params: { method: selectedMethod.id },
    });
  };

  return (
    <DetailShell
      title={config.planName}
      subtitle={config.subtitle}
      icon={Crown}
      accent={colors.brand.purple}
    >
      <Surface
        style={{
          gap: responsive.isPhone ? spacing[4] : spacing[5],
          borderColor: "rgba(168, 85, 247, 0.42)",
          backgroundColor: colors.background.panel,
          padding: responsive.isPhone ? spacing[4] : spacing[5],
        }}
      >
        <View
          style={{
            flexDirection: responsive.isSmallPhone ? "column" : "row",
            alignItems: responsive.isSmallPhone ? "flex-start" : "center",
            gap: responsive.isPhone ? spacing[3] : spacing[4],
          }}
        >
          <View
            style={{
              width: responsive.isPhone ? 52 : 66,
              height: responsive.isPhone ? 52 : 66,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.pill,
              backgroundColor: colors.brand.purple,
            }}
          >
            <Sparkles color="#FFFFFF" size={responsive.isPhone ? 25 : 31} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText color="primary" variant={responsive.isPhone ? "bodyLarge" : "title3"} weight="semibold">
              Read better with Lumira Pro
            </AppText>
            <AppText color="secondary" variant={responsive.isPhone ? "footnote" : "body"} numberOfLines={3}>
              {config.heroText}
            </AppText>
          </View>
        </View>

        <View
          style={{
            flexDirection: responsive.isPhone ? "column" : "row",
            gap: responsive.isPhone ? spacing[3] : spacing[4],
          }}
        >
          <ChoiceCard
            title={priceDisplay(config.prices.mm)}
            subtitle="Myanmar price · Manual transfer with local wallets"
            icon={Crown}
            selected={selectedRegion === "MM"}
            onPress={() => chooseRegion("MM")}
          />
          <ChoiceCard
            title={priceDisplay(config.prices.international)}
            subtitle="International price · Card payment coming soon"
            icon={Globe2}
            selected={selectedRegion === "international"}
            onPress={() => chooseRegion("international")}
          />
        </View>

        <Button
          title="Upgrade to Lumira Pro"
          icon={Crown}
          variant="secondary"
          fullWidth
          onPress={openPaymentModal}
          style={responsive.isPhone ? { minHeight: 42, paddingHorizontal: spacing[3] } : undefined}
        />
      </Surface>

      <View style={{ gap: responsive.isPhone ? spacing[3] : spacing[4] }}>
        <AppText color="secondary" variant={responsive.isPhone ? "footnote" : "body"} weight="semibold">
          Included
        </AppText>
        <Surface padded={false} style={{ overflow: "hidden" }}>
          {config.features.map((feature) => {
            const Icon = featureIcon(feature.category);

            return (
              <View
                key={feature.id}
                style={{
                  minHeight: responsive.isPhone ? 74 : 86,
                  flexDirection: "row",
                  alignItems: "center",
                  gap: responsive.isPhone ? spacing[3] : spacing[4],
                  borderBottomWidth:
                    feature.id === config.features.at(-1)?.id ? 0 : 1,
                  borderBottomColor: colors.border.subtle,
                  paddingHorizontal: responsive.isPhone ? spacing[4] : spacing[5],
                  paddingVertical: responsive.isPhone ? spacing[3] : spacing[4],
                }}
              >
                <View
                  style={{
                    width: responsive.isPhone ? 38 : 44,
                    height: responsive.isPhone ? 38 : 44,
                    alignItems: "center",
                    justifyContent: "center",
                    borderRadius: radii.md,
                    backgroundColor: colors.surface.soft,
                  }}
                >
                  <Icon color={colors.brand.violet} size={responsive.isPhone ? 19 : 22} strokeWidth={2.1} />
                </View>
                <View style={{ flex: 1, minWidth: 0, gap: spacing[1] }}>
                  <AppText color="primary" variant="body" weight="semibold" numberOfLines={1}>
                    {feature.title}
                  </AppText>
                  <AppText color="secondary" variant={responsive.isPhone ? "caption" : "footnote"} numberOfLines={2}>
                    {feature.description}
                  </AppText>
                </View>
                <Check color={colors.brand.emerald} size={responsive.isPhone ? 18 : 20} strokeWidth={2.4} />
              </View>
            );
          })}
        </Surface>
      </View>

      <Surface
        tone="quiet"
        style={{
          gap: responsive.isPhone ? spacing[3] : spacing[4],
          padding: responsive.isPhone ? spacing[4] : spacing[5],
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
          <View
            style={{
              width: responsive.isPhone ? 40 : 46,
              height: responsive.isPhone ? 40 : 46,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.md,
              backgroundColor: colors.background.panelStrong,
            }}
          >
            <MessageCircle color={colors.brand.violet} size={responsive.isPhone ? 20 : 23} strokeWidth={2.1} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText color="primary" variant={responsive.isPhone ? "body" : "bodyLarge"} weight="semibold">
              AI features include monthly usage limits.
            </AppText>
            <AppText color="secondary" variant={responsive.isPhone ? "caption" : "footnote"} numberOfLines={2}>
              Limits help keep Lumira Pro affordable and stable.
            </AppText>
          </View>
        </View>

        <View
          style={{
            flexDirection: responsive.isSmallPhone ? "column" : "row",
            gap: spacing[3],
          }}
        >
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText color="primary" variant="footnote" weight="semibold">
              AI Book Summary
            </AppText>
            <AppText color="secondary" variant="caption">
              Monthly limit: {aiLimitDisplay(config.aiLimits.summariesPerMonth, "50")} summaries / month
            </AppText>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText color="primary" variant="footnote" weight="semibold">
              Discuss with AI
            </AppText>
            <AppText color="secondary" variant="caption">
              Monthly limit: {aiLimitDisplay(config.aiLimits.chatMessagesPerMonth, "300")} messages / month
            </AppText>
          </View>
        </View>

        <AppText color="tertiary" variant="caption">
          {config.promotionalText}
        </AppText>
      </Surface>

      <Section title="Payment methods">
        <InfoRow
          label="Myanmar"
          value="AYA Pay, Wave Pay, UAB Pay manual transfer"
          icon={CreditCard}
        />
        <InfoRow
          label="International"
          value="Card payment with Stripe is coming soon"
          icon={Globe2}
        />
        <InfoRow
          label="Privacy"
          value="Your imported EPUB files stay local unless you choose cloud backup"
          icon={Lock}
        />
      </Section>

      <Modal
        animationType="fade"
        transparent
        visible={paymentModalVisible}
        onRequestClose={() => setPaymentModalVisible(false)}
      >
        <View
          style={{
            flex: 1,
            justifyContent: "center",
            backgroundColor: "rgba(0, 0, 0, 0.58)",
            padding: responsive.isPhone ? spacing[4] : spacing[8],
          }}
        >
          <Surface
            style={{
              width: "100%",
              maxWidth: 520,
              alignSelf: "center",
              gap: responsive.isPhone ? spacing[4] : spacing[5],
              padding: responsive.isPhone ? spacing[4] : spacing[5],
            }}
          >
            <View style={{ gap: spacing[1] }}>
              <AppText color="primary" variant={responsive.isPhone ? "title3" : "title2"} weight="bold">
                {selectedRegion === "MM" ? "Choose Payment Method" : "International Payment"}
              </AppText>
              <AppText color="secondary" variant={responsive.isPhone ? "footnote" : "body"}>
                {selectedRegion === "MM"
                  ? "Choose a local payment method to continue."
                  : "Card payment with Stripe is coming soon."}
              </AppText>
            </View>

            <View style={{ gap: spacing[2] }}>
              {selectedMethods.map((method) => {
                const selected = selectedPaymentMethodId === method.id;
                const disabled = !method.enabled;

                return (
                  <Pressable
                    key={method.id}
                    accessibilityRole="button"
                    accessibilityState={{ selected, disabled }}
                    disabled={disabled}
                    onPress={() => setSelectedPaymentMethodId(method.id)}
                    style={({ pressed }) => ({
                      minHeight: responsive.isPhone ? 54 : 62,
                      flexDirection: "row",
                      alignItems: "center",
                      justifyContent: "space-between",
                      gap: spacing[3],
                      borderRadius: radii.lg,
                      borderWidth: 1,
                      borderColor: selected
                        ? colors.brand.violet
                        : colors.border.subtle,
                      backgroundColor: selected
                        ? colors.surface.medium
                        : colors.surface.soft,
                      paddingHorizontal: responsive.isPhone
                        ? spacing[3]
                        : spacing[4],
                      opacity: disabled ? 0.48 : pressed ? 0.78 : 1,
                    })}
                  >
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <AppText color="primary" variant="body" weight="semibold">
                        {method.name}
                      </AppText>
                      <AppText color="secondary" variant="caption">
                        {method.enabled ? "Available" : "Coming soon"}
                      </AppText>
                    </View>
                    {selected ? (
                      <Check
                        color={colors.brand.violet}
                        size={18}
                        strokeWidth={2.5}
                      />
                    ) : (
                      <AppText
                        color="tertiary"
                        variant="caption"
                        weight="semibold"
                      >
                        {method.comingSoon ? "Soon" : "Ready"}
                      </AppText>
                    )}
                  </Pressable>
                );
              })}
            </View>

            {selectedRegion === "MM" ? (
              <Button
                title="Continue"
                variant="primary"
                fullWidth
                disabled={!selectedPaymentMethodId}
                onPress={continuePayment}
                style={[
                  responsive.isPhone
                    ? { minHeight: 42, paddingHorizontal: spacing[3] }
                    : undefined,
                  !selectedPaymentMethodId ? { opacity: 0.48 } : null,
                ]}
              />
            ) : null}

            <Button
              title="Close"
              variant={selectedRegion === "MM" ? "ghost" : "secondary"}
              fullWidth
              onPress={() => setPaymentModalVisible(false)}
              style={responsive.isPhone ? { minHeight: 42, paddingHorizontal: spacing[3] } : undefined}
            />
          </Surface>
        </View>
      </Modal>
    </DetailShell>
  );
}

function ThemePreview({ theme }: { theme: AppTheme }) {
  return (
    <View style={{ flexDirection: "row", gap: spacing[1] }}>
      {[
        theme.colors.background.base,
        theme.colors.background.panelStrong,
        theme.colors.brand.primary,
        theme.colors.brand.cyan,
      ].map((swatch) => (
        <View
          key={swatch}
          style={{
            width: 18,
            height: 18,
            borderRadius: radii.pill,
            borderWidth: 1,
            borderColor: theme.colors.border.default,
            backgroundColor: swatch,
          }}
        />
      ))}
    </View>
  );
}

function ThemeChoiceCard({
  theme,
  selected,
  onPress,
  isPremiumUser,
}: {
  theme: AppTheme;
  selected: boolean;
  onPress: () => void;
  isPremiumUser: boolean;
}) {
  const responsive = useResponsive();
  const { colors } = useAppTheme();
  const canUseTheme = canUseAppTheme(theme.id, isPremiumUser);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected, disabled: !canUseTheme }}
      disabled={!canUseTheme}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: responsive.isPhone ? undefined : 1,
        width: responsive.isPhone ? "100%" : undefined,
        minWidth: responsive.isPhone ? undefined : 260,
        gap: spacing[3],
        borderRadius: responsive.isPhone ? 16 : 18,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: selected ? colors.brand.violet : colors.border.subtle,
        backgroundColor: selected ? colors.surface.soft : colors.background.panel,
        padding: responsive.isPhone ? spacing[4] : spacing[5],
        opacity: !canUseTheme ? 0.62 : pressed ? 0.74 : 1,
      })}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: spacing[3],
        }}
      >
        <ThemePreview theme={theme} />
        {selected ? (
          <Check color={colors.brand.violet} size={20} strokeWidth={2.4} />
        ) : !canUseTheme ? (
          <Lock color={colors.text.tertiary} size={18} strokeWidth={2.2} />
        ) : null}
      </View>
      <View style={{ gap: spacing[1] }}>
        <AppText color="primary" variant="body" weight="semibold">
          {theme.name}
        </AppText>
        <AppText color="secondary" variant="caption" numberOfLines={2}>
          {theme.description}
        </AppText>
      </View>
      <AppText color="tertiary" variant="caption" weight="semibold">
        {theme.mode === "dark" ? "Dark UI" : "Light UI"}
        {theme.isPremium ? " · Premium" : " · Free"}
      </AppText>
    </Pressable>
  );
}

function formatClock(hour: number, minute: number) {
  const date = new Date();
  date.setHours(hour, minute, 0, 0);

  return new Intl.DateTimeFormat(undefined, {
    hour: "numeric",
    minute: "2-digit",
  }).format(date);
}

function weekdayName(weekday: number) {
  const normalizedWeekday = Math.min(Math.max(weekday, 1), 7);
  const sunday = new Date(2026, 5, 7 + (normalizedWeekday - 1));

  return new Intl.DateTimeFormat(undefined, { weekday: "short" }).format(
    sunday,
  );
}

const hourOptions = Array.from({ length: 24 }, (_, index) => index);
const minuteOptions = Array.from({ length: 60 }, (_, index) => index);

function twoDigit(value: number) {
  return value.toString().padStart(2, "0");
}

function formatHour(hour: number) {
  const date = new Date();
  date.setHours(hour, 0, 0, 0);

  return new Intl.DateTimeFormat(undefined, { hour: "numeric" }).format(date);
}

function TimePickerColumn({
  label,
  value,
  options,
  formatValue,
  onChange,
}: {
  label: string;
  value: number;
  options: number[];
  formatValue: (value: number) => string;
  onChange: (value: number) => void;
}) {
  const responsive = useResponsive();
  const { colors } = useAppTheme();
  const itemHeight = responsive.isPhone ? 38 : 42;
  const selectedOffset = Math.max(value - 2, 0) * (itemHeight + spacing[1]);

  return (
    <View style={{ flex: 1, minWidth: 0, gap: spacing[2] }}>
      <AppText color="secondary" variant="caption" weight="semibold">
        {label}
      </AppText>
      <ScrollView
        nestedScrollEnabled
        showsVerticalScrollIndicator={false}
        contentOffset={{ x: 0, y: selectedOffset }}
        contentContainerStyle={{ gap: spacing[1], paddingVertical: spacing[1] }}
        style={{
          maxHeight: responsive.isPhone ? 184 : 224,
          borderRadius: radii.lg,
          borderWidth: 1,
          borderColor: colors.border.subtle,
          backgroundColor: colors.background.panel,
        }}
      >
        {options.map((option) => {
          const selected = option === value;

          return (
            <Pressable
              key={option}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(option)}
              style={({ pressed }) => ({
                minHeight: itemHeight,
                alignItems: "center",
                justifyContent: "center",
                marginHorizontal: spacing[1],
                borderRadius: radii.md,
                backgroundColor: selected
                  ? colors.surface.soft
                  : "transparent",
                opacity: pressed ? 0.72 : 1,
              })}
            >
              <AppText
                color={selected ? "primary" : "secondary"}
                variant="body"
                weight={selected ? "bold" : "semibold"}
              >
                {formatValue(option)}
              </AppText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

function ExactTimePicker({
  label,
  hour,
  minute,
  onChange,
}: {
  label: string;
  hour: number;
  minute: number;
  onChange: (value: { hour: number; minute: number }) => void;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={{ gap: spacing[3] }}>
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          gap: spacing[3],
        }}
      >
        <AppText color="secondary" variant="footnote" weight="semibold">
          {label}
        </AppText>
        <AppText color={colors.brand.violet} variant="body" weight="bold">
          {formatClock(hour, minute)}
        </AppText>
      </View>
      <View style={{ flexDirection: "row", gap: spacing[3] }}>
        <TimePickerColumn
          label="Hour"
          value={hour}
          options={hourOptions}
          formatValue={formatHour}
          onChange={(nextHour) => onChange({ hour: nextHour, minute })}
        />
        <TimePickerColumn
          label="Minute"
          value={minute}
          options={minuteOptions}
          formatValue={twoDigit}
          onChange={(nextMinute) => onChange({ hour, minute: nextMinute })}
        />
      </View>
    </View>
  );
}

function WeekdayPicker({
  value,
  onChange,
}: {
  value: number;
  onChange: (weekday: number) => void;
}) {
  const { colors } = useAppTheme();

  return (
    <View style={{ gap: spacing[3] }}>
      <AppText color="secondary" variant="footnote" weight="semibold">
        Digest Day
      </AppText>
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[2] }}>
        {[1, 2, 3, 4, 5, 6, 7].map((weekday) => {
          const selected = value === weekday;

          return (
            <Pressable
              key={weekday}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => onChange(weekday)}
              style={({ pressed }) => ({
                minWidth: 52,
                minHeight: 40,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radii.pill,
                borderWidth: 1,
                borderColor: selected ? colors.brand.violet : colors.border.subtle,
                backgroundColor: selected ? colors.surface.soft : colors.background.panel,
                opacity: pressed ? 0.72 : 1,
                paddingHorizontal: spacing[3],
              })}
            >
              <AppText
                color={selected ? "primary" : "secondary"}
                variant="footnote"
                weight="semibold"
              >
                {weekdayName(weekday)}
              </AppText>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

type ScheduleEditorKind = "reminder" | "digest" | "quiet";

function ScheduleEditorModal({
  kind,
  settings,
  saving,
  onClose,
  onSave,
}: {
  kind: ScheduleEditorKind | null;
  settings: NotificationSettings;
  saving: boolean;
  onClose: () => void;
  onSave: (settings: NotificationSettingsInput) => Promise<void>;
}) {
  const responsive = useResponsive();
  const { colors } = useAppTheme();
  const bodyMaxHeight = Math.round(responsive.height * 0.58);
  const [draft, setDraft] = useState({
    reminderHour: settings.reminderHour,
    reminderMinute: settings.reminderMinute,
    digestWeekday: settings.digestWeekday,
    digestHour: settings.digestHour,
    digestMinute: settings.digestMinute,
    quietStartHour: settings.quietStartHour,
    quietStartMinute: settings.quietStartMinute,
    quietEndHour: settings.quietEndHour,
    quietEndMinute: settings.quietEndMinute,
  });

  useEffect(() => {
    if (!kind) {
      return;
    }

    setDraft({
      reminderHour: settings.reminderHour,
      reminderMinute: settings.reminderMinute,
      digestWeekday: settings.digestWeekday,
      digestHour: settings.digestHour,
      digestMinute: settings.digestMinute,
      quietStartHour: settings.quietStartHour,
      quietStartMinute: settings.quietStartMinute,
      quietEndHour: settings.quietEndHour,
      quietEndMinute: settings.quietEndMinute,
    });
  }, [kind, settings]);

  if (!kind) {
    return null;
  }

  const title =
    kind === "reminder"
      ? "Reminder Time"
      : kind === "digest"
      ? "Weekly Digest"
      : "Quiet Hours";
  const subtitle =
    kind === "reminder"
      ? "Choose when Lumira should nudge you to read."
      : kind === "digest"
      ? "Choose the day and time for your review reminder."
      : "Lumira will keep scheduled reminders outside this window.";

  const handleSave = async () => {
    if (kind === "reminder") {
      await onSave({
        reminderHour: draft.reminderHour,
        reminderMinute: draft.reminderMinute,
      });
      return;
    }

    if (kind === "digest") {
      await onSave({
        digestWeekday: draft.digestWeekday,
        digestHour: draft.digestHour,
        digestMinute: draft.digestMinute,
      });
      return;
    }

    await onSave({
      quietStartHour: draft.quietStartHour,
      quietStartMinute: draft.quietStartMinute,
      quietEndHour: draft.quietEndHour,
      quietEndMinute: draft.quietEndMinute,
    });
  };

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onClose}>
      <View
        style={{
          flex: 1,
          justifyContent: "flex-end",
          backgroundColor: "rgba(0, 0, 0, 0.46)",
        }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Close schedule editor"
          onPress={onClose}
          style={{ position: "absolute", top: 0, right: 0, bottom: 0, left: 0 }}
        />
        <View
          style={{
            maxWidth: responsive.isTablet ? 560 : undefined,
            maxHeight: Math.round(responsive.height * 0.88),
            width: "100%",
            alignSelf: "center",
            gap: spacing[5],
            borderTopLeftRadius: radii.xxl,
            borderTopRightRadius: radii.xxl,
            borderWidth: 1,
            borderColor: colors.border.subtle,
            backgroundColor: colors.background.elevated,
            padding: responsive.isPhone ? spacing[5] : spacing[6],
            paddingBottom: responsive.isPhone ? spacing[7] : spacing[6],
          }}
        >
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: spacing[4] }}>
            <View style={{ flex: 1, gap: spacing[1] }}>
              <AppText color="primary" variant="title3" weight="semibold">
                {title}
              </AppText>
              <AppText color="secondary" variant="footnote">
                {subtitle}
              </AppText>
            </View>
            <Button
              title="Done"
              variant="ghost"
              onPress={onClose}
              style={{ minHeight: 38, paddingHorizontal: spacing[3] }}
            />
          </View>

          <ScrollView
            nestedScrollEnabled
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            style={{ maxHeight: bodyMaxHeight }}
            contentContainerStyle={{ gap: spacing[5], paddingBottom: spacing[1] }}
          >
            {kind === "reminder" ? (
              <ExactTimePicker
                label="Reading Reminder"
                hour={draft.reminderHour}
                minute={draft.reminderMinute}
                onChange={(value) =>
                  setDraft((current) => ({
                    ...current,
                    reminderHour: value.hour,
                    reminderMinute: value.minute,
                  }))
                }
              />
            ) : null}

            {kind === "digest" ? (
              <>
                <WeekdayPicker
                  value={draft.digestWeekday}
                  onChange={(digestWeekday) =>
                    setDraft((current) => ({ ...current, digestWeekday }))
                  }
                />
                <ExactTimePicker
                  label="Digest Time"
                  hour={draft.digestHour}
                  minute={draft.digestMinute}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      digestHour: value.hour,
                      digestMinute: value.minute,
                    }))
                  }
                />
              </>
            ) : null}

            {kind === "quiet" ? (
              <>
                <ExactTimePicker
                  label="Quiet Start"
                  hour={draft.quietStartHour}
                  minute={draft.quietStartMinute}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      quietStartHour: value.hour,
                      quietStartMinute: value.minute,
                    }))
                  }
                />
                <ExactTimePicker
                  label="Quiet End"
                  hour={draft.quietEndHour}
                  minute={draft.quietEndMinute}
                  onChange={(value) =>
                    setDraft((current) => ({
                      ...current,
                      quietEndHour: value.hour,
                      quietEndMinute: value.minute,
                    }))
                  }
                />
              </>
            ) : null}
          </ScrollView>

          <Button
            title={saving ? "Saving..." : "Save Schedule"}
            variant="secondary"
            fullWidth
            disabled={saving}
            onPress={handleSave}
          />
        </View>
      </View>
    </Modal>
  );
}

function AppearanceDetail() {
  const responsive = useResponsive();
  const isPremiumUser = useAuthStore((state) => isPremiumAuthSession(state.session));
  const currentAppThemeId = useBooksStore(
    (state) => state.readerSettings.appThemeId,
  );
  const readerSettings = useBooksStore((state) => state.readerSettings);
  const activeAppThemeId = getAppTheme(currentAppThemeId, isPremiumUser).id;
  const setReaderSettings = useBooksStore((state) => state.setReaderSettings);

  return (
    <DetailShell
      title="Appearance"
      subtitle="Choose the Lumira app shell. Reader page themes stay separate."
      icon={Palette}
    >
      {appThemeGroups.map((group) => (
        <View key={group.title} style={{ gap: spacing[3] }}>
          <AppText color="secondary" variant="footnote" weight="semibold">
            {group.title}
          </AppText>
          <View
            style={{
              flexDirection: "row",
              flexWrap: "wrap",
              gap: responsive.isPhone ? spacing[3] : spacing[4],
            }}
          >
            {group.themes.map((theme) => (
              <ThemeChoiceCard
                key={theme.id}
                theme={theme}
                selected={activeAppThemeId === theme.id}
                onPress={() => setReaderSettings({ appThemeId: theme.id })}
                isPremiumUser={isPremiumUser}
              />
            ))}
          </View>
        </View>
      ))}

      <Section title="Typography">
        <InfoRow
          label="Reader font"
          value={getReaderFontOption(readerSettings.readerFontFamily).label}
        />
        <InfoRow
          label="Text size"
          value={`${Math.round(readerSettings.fontSize)} px`}
        />
        <InfoRow
          label="Line height"
          value={`${Math.round(readerSettings.lineHeight * 100)}%`}
        />
      </Section>
    </DetailShell>
  );
}

function NotificationsDetail() {
  const notificationSettings = useBooksStore(
    (state) => state.notificationSettings,
  );
  const setNotificationSettings = useBooksStore(
    (state) => state.setNotificationSettings,
  );
  const [updatingKey, setUpdatingKey] = useState<string | null>(null);
  const [scheduleEditor, setScheduleEditor] =
    useState<ScheduleEditorKind | null>(null);
  const disabled = Boolean(updatingKey);
  const permissionLabel =
    notificationSettings.permissionStatus === "granted"
      ? "Allowed"
      : notificationSettings.permissionStatus === "denied"
      ? "Blocked"
      : "Not requested";
  const quietHours = `${formatClock(
    notificationSettings.quietStartHour,
    notificationSettings.quietStartMinute,
  )} - ${formatClock(
    notificationSettings.quietEndHour,
    notificationSettings.quietEndMinute,
  )}`;

  const updateToggle = async (
    key:
      | "readingReminderEnabled"
      | "insightDigestEnabled"
      | "importCompleteEnabled",
    value: boolean,
  ) => {
    setUpdatingKey(key);

    try {
      const updatedSettings = await setNotificationSettings({ [key]: value });

      if (value && updatedSettings.permissionStatus !== "granted") {
        Alert.alert(
          "Notifications are blocked",
          "Enable Lumira notifications in your device settings to use reminders.",
        );
      }
    } catch (error) {
      Alert.alert(
        "Notifications unavailable",
        error instanceof Error
          ? error.message
          : "Lumira could not update notification settings.",
      );
    } finally {
      setUpdatingKey(null);
    }
  };

  const updateSchedule = async (settings: NotificationSettingsInput) => {
    setUpdatingKey("schedule");

    try {
      await setNotificationSettings(settings);
      setScheduleEditor(null);
    } catch (error) {
      Alert.alert(
        "Schedule unavailable",
        error instanceof Error
          ? error.message
          : "Lumira could not update your notification schedule.",
      );
    } finally {
      setUpdatingKey(null);
    }
  };

  return (
    <>
      <DetailShell
        title="Notifications"
        subtitle="Quiet reminders for reading rhythm and knowledge review."
        icon={Bell}
      >
        <Section title="Reading">
          <ToggleRow
            title="Reading reminders"
            subtitle="A gentle nudge when your daily reading window starts."
            value={notificationSettings.readingReminderEnabled}
            onValueChange={(value) =>
              updateToggle("readingReminderEnabled", value)
            }
            disabled={disabled}
          />
          <ToggleRow
            title="Insight digest"
            subtitle="A weekly local reminder to review highlights and notes."
            value={notificationSettings.insightDigestEnabled}
            onValueChange={(value) =>
              updateToggle("insightDigestEnabled", value)
            }
            disabled={disabled}
          />
          <ToggleRow
            title="Import complete"
            subtitle="Notify when EPUB processing finishes."
            value={notificationSettings.importCompleteEnabled}
            onValueChange={(value) =>
              updateToggle("importCompleteEnabled", value)
            }
            disabled={disabled}
          />
        </Section>

        <Section title="Schedule">
          <InfoRow label="Permission" value={permissionLabel} icon={Shield} />
          <InfoRow
            label="Reminder time"
            value={formatClock(
              notificationSettings.reminderHour,
              notificationSettings.reminderMinute,
            )}
            icon={Bell}
            onPress={() => setScheduleEditor("reminder")}
          />
          <InfoRow
            label="Weekly digest"
            value={`${weekdayName(notificationSettings.digestWeekday)} ${formatClock(
              notificationSettings.digestHour,
              notificationSettings.digestMinute,
            )}`}
            icon={Mail}
            onPress={() => setScheduleEditor("digest")}
          />
          <InfoRow
            label="Quiet hours"
            value={quietHours}
            icon={Moon}
            onPress={() => setScheduleEditor("quiet")}
          />
        </Section>
      </DetailShell>

      <ScheduleEditorModal
        kind={scheduleEditor}
        settings={notificationSettings}
        saving={updatingKey === "schedule"}
        onClose={() => setScheduleEditor(null)}
        onSave={updateSchedule}
      />
    </>
  );
}

function SyncDetail() {
  const { colors } = useAppTheme();

  return (
    <DetailShell
      title="Sync & Backup"
      subtitle="Premium cloud backup and restore for your EPUB workspace."
      icon={Cloud}
      accent={colors.brand.violet}
    >
      <SyncBackupScreen />
    </DetailShell>
  );
}

export function SettingsDetailScreen({ kind }: { kind: SettingsDetailKind }) {
  if (kind === "profile") {
    return <ProfileDetail />;
  }

  if (kind === "premium") {
    return <PremiumDetail />;
  }

  if (kind === "appearance") {
    return <AppearanceDetail />;
  }

  if (kind === "notifications") {
    return <NotificationsDetail />;
  }

  return <SyncDetail />;
}
