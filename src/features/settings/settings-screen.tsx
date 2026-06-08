import { useRouter } from "expo-router";
import {
  Bell,
  ChevronRight,
  Cloud,
  Crown,
  Palette,
  UserRound,
  type LucideIcon,
} from "lucide-react-native";
import { Alert, Pressable, ScrollView, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { getAppTheme } from "@/design/app-themes";
import { useAppTheme } from "@/design/app-theme-provider";
import { useResponsive } from "@/design/responsive";
import { radii, spacing } from "@/design/tokens";
import { useBooksStore } from "@/features/books/books-store";
import { isPremiumAuthSession, useAuthStore } from "@/features/auth/auth-store";

type SettingsRoute =
  | "/settings/profile"
  | "/settings/premium"
  | "/settings/appearance"
  | "/settings/notifications"
  | "/settings/sync";

type SettingItem = {
  title: string;
  value?: string;
  icon: LucideIcon;
  href: SettingsRoute;
  accent?: boolean;
};

const accountItemsBase: SettingItem[] = [
  { title: "Profile", value: "John Doe", icon: UserRound, href: "/settings/profile" },
  { title: "Upgrade to Pro", icon: Crown, href: "/settings/premium", accent: true },
];

const preferenceItemsBase: SettingItem[] = [
  { title: "Appearance", icon: Palette, href: "/settings/appearance" },
  { title: "Notifications", value: "On", icon: Bell, href: "/settings/notifications" },
  { title: "Sync & Backup", value: "Premium", icon: Cloud, href: "/settings/sync" },
];

function SettingsRow({ item, isLast }: { item: SettingItem; isLast?: boolean }) {
  const router = useRouter();
  const responsive = useResponsive();
  const { colors } = useAppTheme();
  const Icon = item.icon;
  const iconSize = responsive.isPhone ? 42 : 58;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title} settings`}
      onPress={() => router.push(item.href)}
      testID={`settings-row-${item.title.toLowerCase().replaceAll(" ", "-")}`}
      style={({ pressed }) => ({
        minHeight: responsive.isPhone ? 70 : 110,
        flexDirection: "row",
        alignItems: "center",
        gap: responsive.isPhone ? spacing[3] : spacing[4],
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border.subtle,
        paddingHorizontal: responsive.isPhone ? spacing[4] : spacing[5],
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <View
        style={{
          width: iconSize,
          height: iconSize,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: responsive.isPhone ? radii.md : radii.lg,
          backgroundColor: item.accent ? colors.brand.purple : colors.background.panelStrong,
        }}
      >
        <Icon
          color={item.accent ? "#FFFFFF" : colors.text.primary}
          size={responsive.isPhone ? 20 : 27}
          strokeWidth={2}
        />
      </View>
      <View style={{ flex: 1 }}>
        <AppText color="primary" variant={responsive.isPhone ? "body" : "bodyLarge"} weight="semibold">
          {item.title}
        </AppText>
        {item.value ? (
          <AppText color="secondary" variant={responsive.isPhone ? "footnote" : "body"}>
            {item.value}
          </AppText>
        ) : null}
      </View>
      <ChevronRight color={colors.text.secondary} size={responsive.isPhone ? 21 : 25} strokeWidth={2} />
    </Pressable>
  );
}

function SettingsGroup({ title, items }: { title: string; items: SettingItem[] }) {
  const responsive = useResponsive();
  const { colors } = useAppTheme();

  return (
    <View style={{ gap: responsive.isPhone ? spacing[3] : spacing[4] }}>
      <AppText color="secondary" variant={responsive.isPhone ? "footnote" : "body"} weight="semibold">
        {title}
      </AppText>
      <View
        style={{
          overflow: "hidden",
          borderRadius: responsive.isPhone ? 16 : 18,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: colors.border.subtle,
          backgroundColor: colors.background.canvas,
        }}
      >
        {items.map((item, index) => (
          <SettingsRow key={item.title} item={item} isLast={index === items.length - 1} />
        ))}
      </View>
    </View>
  );
}

function DebugRow({ label, value }: { label: string; value: string | number }) {
  const responsive = useResponsive();
  const { colors } = useAppTheme();

  return (
    <View
      style={{
        minHeight: responsive.isPhone ? 50 : 58,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
        paddingHorizontal: responsive.isPhone ? spacing[4] : spacing[5],
      }}
    >
      <AppText color="secondary" variant={responsive.isPhone ? "footnote" : "body"}>
        {label}
      </AppText>
      <AppText color="primary" variant={responsive.isPhone ? "footnote" : "body"} weight="semibold">
        {value}
      </AppText>
    </View>
  );
}

function DevelopmentDebugSection() {
  const responsive = useResponsive();
  const { colors } = useAppTheme();
  const counts = useBooksStore((state) => state.counts);
  const clearLocalData = useBooksStore((state) => state.clearLocalData);

  if (!__DEV__) {
    return null;
  }

  function handleClearData() {
    Alert.alert("Clear local data?", "This removes imported book records and local files.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: () => {
          clearLocalData().catch(() => undefined);
        },
      },
    ]);
  }

  return (
    <View style={{ gap: responsive.isPhone ? spacing[3] : spacing[4] }}>
      <AppText color="secondary" variant={responsive.isPhone ? "footnote" : "body"} weight="semibold">
        Development
      </AppText>
      <View
        style={{
          overflow: "hidden",
          borderRadius: responsive.isPhone ? 16 : 18,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: colors.border.subtle,
          backgroundColor: colors.background.canvas,
        }}
      >
        <DebugRow label="Books" value={counts.books} />
        <DebugRow label="Highlights" value={counts.highlights} />
        <DebugRow label="Notes" value={counts.notes} />
        <View style={{ padding: responsive.isPhone ? spacing[4] : spacing[5] }}>
          <Button
            title="Clear Local Data"
            variant="secondary"
            onPress={handleClearData}
            style={responsive.isPhone ? { minHeight: 42, paddingHorizontal: spacing[3] } : undefined}
          />
        </View>
      </View>
    </View>
  );
}

export function SettingsScreen() {
  const responsive = useResponsive();
  const router = useRouter();
  const { colors } = useAppTheme();
  const session = useAuthStore((state) => state.session);
  const appThemeId = useBooksStore((state) => state.readerSettings.appThemeId);
  const notificationSettings = useBooksStore(
    (state) => state.notificationSettings,
  );
  const proCardStacks = responsive.isSmallPhone;
  const isPremiumUser = isPremiumAuthSession(session);
  const notificationsEnabled =
    notificationSettings.readingReminderEnabled ||
    notificationSettings.insightDigestEnabled ||
    notificationSettings.importCompleteEnabled;
  const accountItems = accountItemsBase
    .filter((item) => !isPremiumUser || item.href !== "/settings/premium")
    .map((item) =>
      item.href === "/settings/profile"
        ? { ...item, value: session?.user.name ?? session?.user.email ?? item.value }
        : item,
    );
  const preferenceItems = preferenceItemsBase.map((item) =>
    item.title === "Appearance"
      ? { ...item, value: getAppTheme(appThemeId).name }
      : item.title === "Notifications"
      ? { ...item, value: notificationsEnabled ? "On" : "Off" }
      : item,
  );

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: responsive.isPhone ? spacing[4] : responsive.gutter,
        paddingTop: responsive.isPhone ? spacing[5] : responsive.gutter,
        paddingBottom: responsive.bottomInsetPadding,
      }}
    >
      <View
        style={{
          width: Math.min(responsive.pageWidth, responsive.settingsMaxWidth),
          alignSelf: "center",
          gap: responsive.isPhone ? spacing[6] : spacing[8],
        }}
      >
        <AppText color="primary" variant={responsive.isPhone ? "title2" : "title1"} weight="bold">
          Settings
        </AppText>

        {!isPremiumUser ? (
          <View
            style={{
              flexDirection: proCardStacks ? "column" : "row",
              alignItems: proCardStacks ? "flex-start" : "center",
              gap: responsive.isPhone ? spacing[3] : spacing[5],
              borderRadius: responsive.isPhone ? 16 : 18,
              borderCurve: "continuous",
              borderWidth: 1,
              borderColor: "rgba(168, 85, 247, 0.42)",
              backgroundColor: colors.background.panel,
              padding: responsive.isPhone ? spacing[4] : spacing[6],
            }}
          >
            <View
              style={{
                width: responsive.isPhone ? 48 : 72,
                height: responsive.isPhone ? 48 : 72,
                alignItems: "center",
                justifyContent: "center",
                borderRadius: radii.pill,
                backgroundColor: colors.brand.purple,
              }}
            >
              <Crown color="#FFFFFF" size={responsive.isPhone ? 24 : 36} strokeWidth={2} />
            </View>
            <View style={{ flex: 1, gap: spacing[3] }}>
              <View>
                <AppText color="primary" variant={responsive.isPhone ? "bodyLarge" : "title3"} weight="semibold">
                  Upgrade to Lumira Pro
                </AppText>
                <AppText color="secondary" variant={responsive.isPhone ? "footnote" : "body"}>
                  Cloud backup, premium themes, and AI-powered reading tools
                </AppText>
              </View>
              <Button
                title="Learn More"
                variant="secondary"
                onPress={() => router.push("/settings/premium")}
                style={responsive.isPhone ? { minHeight: 40, paddingHorizontal: spacing[3] } : undefined}
              />
            </View>
          </View>
        ) : null}

        <SettingsGroup title="Account" items={accountItems} />
        <SettingsGroup title="Preferences" items={preferenceItems} />
        <DevelopmentDebugSection />
      </View>
    </ScrollView>
  );
}
