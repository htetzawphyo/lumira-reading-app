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
import { useResponsive } from "@/design/responsive";
import { colors, radii, spacing } from "@/design/tokens";
import { useBooksStore } from "@/features/books/books-store";

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

const accountItems: SettingItem[] = [
  { title: "Profile", value: "John Doe", icon: UserRound, href: "/settings/profile" },
  { title: "Upgrade to Pro", icon: Crown, href: "/settings/premium", accent: true },
];

const preferenceItems: SettingItem[] = [
  { title: "Appearance", value: "Dark", icon: Palette, href: "/settings/appearance" },
  { title: "Notifications", value: "On", icon: Bell, href: "/settings/notifications" },
  { title: "Sync", value: "Automatic", icon: Cloud, href: "/settings/sync" },
];

function SettingsRow({ item, isLast }: { item: SettingItem; isLast?: boolean }) {
  const router = useRouter();
  const Icon = item.icon;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${item.title} settings`}
      onPress={() => router.push(item.href)}
      testID={`settings-row-${item.title.toLowerCase().replaceAll(" ", "-")}`}
      style={({ pressed }) => ({
        minHeight: 110,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[4],
        borderBottomWidth: isLast ? 0 : 1,
        borderBottomColor: colors.border.subtle,
        paddingHorizontal: spacing[5],
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <View
        style={{
          width: 58,
          height: 58,
          alignItems: "center",
          justifyContent: "center",
          borderRadius: 18,
          backgroundColor: item.accent ? colors.brand.purple : colors.background.panelStrong,
        }}
      >
        <Icon color={colors.text.primary} size={27} strokeWidth={2} />
      </View>
      <View style={{ flex: 1 }}>
        <AppText color="primary" variant="bodyLarge" weight="semibold">
          {item.title}
        </AppText>
        {item.value ? (
          <AppText color="secondary" variant="body">
            {item.value}
          </AppText>
        ) : null}
      </View>
      <ChevronRight color={colors.text.secondary} size={25} strokeWidth={2} />
    </Pressable>
  );
}

function SettingsGroup({ title, items }: { title: string; items: SettingItem[] }) {
  return (
    <View style={{ gap: spacing[4] }}>
      <AppText color="secondary" variant="body" weight="semibold">
        {title}
      </AppText>
      <View
        style={{
          overflow: "hidden",
          borderRadius: 18,
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
  return (
    <View
      style={{
        minHeight: 58,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
        paddingHorizontal: spacing[5],
      }}
    >
      <AppText color="secondary" variant="body">
        {label}
      </AppText>
      <AppText color="primary" variant="body" weight="semibold">
        {value}
      </AppText>
    </View>
  );
}

function DevelopmentDebugSection() {
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
    <View style={{ gap: spacing[4] }}>
      <AppText color="secondary" variant="body" weight="semibold">
        Development
      </AppText>
      <View
        style={{
          overflow: "hidden",
          borderRadius: 18,
          borderCurve: "continuous",
          borderWidth: 1,
          borderColor: colors.border.subtle,
          backgroundColor: colors.background.canvas,
        }}
      >
        <DebugRow label="Books" value={counts.books} />
        <DebugRow label="Highlights" value={counts.highlights} />
        <DebugRow label="Notes" value={counts.notes} />
        <View style={{ padding: spacing[5] }}>
          <Button title="Clear Local Data" variant="secondary" onPress={handleClearData} />
        </View>
      </View>
    </View>
  );
}

export function SettingsScreen() {
  const responsive = useResponsive();
  const router = useRouter();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: responsive.isPhone ? spacing[5] : responsive.gutter,
        paddingTop: responsive.isPhone ? spacing[7] : responsive.gutter,
        paddingBottom: responsive.useSidebar ? responsive.gutter : spacing[18],
      }}
    >
      <View
        style={{
          width: responsive.isPhone ? responsive.contentWidth : "100%",
          maxWidth: responsive.isTablet ? 720 : responsive.maxContentWidth,
          alignSelf: "center",
          gap: spacing[8],
        }}
      >
        <AppText color="primary" variant="title1" weight="bold">
          Settings
        </AppText>

        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[5],
            borderRadius: 18,
            borderCurve: "continuous",
            borderWidth: 1,
            borderColor: "rgba(168, 85, 247, 0.42)",
            backgroundColor: "#18091F",
            padding: spacing[6],
          }}
        >
          <View
            style={{
              width: 72,
              height: 72,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.pill,
              backgroundColor: colors.brand.purple,
            }}
          >
            <Crown color={colors.text.primary} size={36} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, gap: spacing[3] }}>
            <View>
              <AppText color="primary" variant="title3" weight="semibold">
                Upgrade to Lumira Pro
              </AppText>
              <AppText color="secondary" variant="body">
                Unlimited AI assistance, advanced analytics, and more
              </AppText>
            </View>
            <Button
              title="Learn More"
              variant="secondary"
              onPress={() => router.push("/settings/premium")}
            />
          </View>
        </View>

        <SettingsGroup title="Account" items={accountItems} />
        <SettingsGroup title="Preferences" items={preferenceItems} />
        <DevelopmentDebugSection />
      </View>
    </ScrollView>
  );
}
