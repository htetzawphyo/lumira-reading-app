import { useRouter } from "expo-router";
import {
  ArrowLeft,
  Bell,
  Check,
  Cloud,
  Crown,
  HardDrive,
  Lock,
  Mail,
  Moon,
  Palette,
  Shield,
  Sparkles,
  Sun,
  UserRound,
  WifiOff,
  type LucideIcon,
} from "lucide-react-native";
import type { ReactNode } from "react";
import { useState } from "react";
import { Pressable, ScrollView, Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { IconButton } from "@/components/ui/icon-button";
import { Surface } from "@/components/ui/surface";
import { useResponsive } from "@/design/responsive";
import { colors, radii, spacing } from "@/design/tokens";

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
};

function DetailShell({
  title,
  subtitle,
  icon: Icon,
  accent = colors.brand.violet,
  children,
}: DetailShellProps) {
  const responsive = useResponsive();
  const router = useRouter();

  return (
    <ScrollView
      contentInsetAdjustmentBehavior="automatic"
      contentContainerStyle={{
        paddingHorizontal: responsive.isPhone ? spacing[5] : responsive.gutter,
        paddingTop: responsive.isPhone ? spacing[5] : responsive.gutter,
        paddingBottom: responsive.useSidebar ? responsive.gutter : spacing[18],
      }}
    >
      <View
        style={{
          width: responsive.isPhone ? responsive.contentWidth : "100%",
          maxWidth: responsive.isTablet ? 860 : responsive.maxContentWidth,
          alignSelf: "center",
          gap: spacing[7],
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[4] }}>
          <IconButton
            icon={ArrowLeft}
            label="Back to settings"
            onPress={() => router.replace("/settings")}
          />
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText color="primary" variant="title1" weight="bold" numberOfLines={1}>
              {title}
            </AppText>
            <AppText color="secondary" variant="body" numberOfLines={2}>
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
                backgroundColor: accent,
              }}
            >
              <Icon color={colors.text.primary} size={28} strokeWidth={2.1} />
            </View>
          ) : null}
        </View>

        {children}
      </View>
    </ScrollView>
  );
}

function Section({ title, children }: SectionProps) {
  return (
    <View style={{ gap: spacing[4] }}>
      <AppText color="secondary" variant="body" weight="semibold">
        {title}
      </AppText>
      <Surface padded={false} style={{ overflow: "hidden", borderRadius: 18 }}>
        {children}
      </Surface>
    </View>
  );
}

function InfoRow({ label, value, icon: Icon }: InfoRowProps) {
  return (
    <View
      style={{
        minHeight: 82,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
        paddingHorizontal: spacing[5],
      }}
    >
      {Icon ? (
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
          <Icon color={colors.text.secondary} size={21} strokeWidth={2} />
        </View>
      ) : null}
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText color="secondary" variant="footnote">
          {label}
        </AppText>
        <AppText color="primary" variant="bodyLarge" weight="semibold" numberOfLines={1}>
          {value}
        </AppText>
      </View>
    </View>
  );
}

function ChoiceCard({
  title,
  subtitle,
  icon: Icon,
  selected,
  onPress,
}: ChoiceCardProps) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected }}
      onPress={onPress}
      style={({ pressed }) => ({
        flex: 1,
        minWidth: 190,
        gap: spacing[4],
        borderRadius: 18,
        borderCurve: "continuous",
        borderWidth: 1,
        borderColor: selected ? "rgba(139, 92, 246, 0.7)" : colors.border.subtle,
        backgroundColor: selected ? "rgba(139, 92, 246, 0.16)" : colors.background.panel,
        padding: spacing[5],
        opacity: pressed ? 0.72 : 1,
      })}
    >
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing[3] }}>
        <View
          style={{
            width: 46,
            height: 46,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radii.md,
            backgroundColor: colors.background.panelStrong,
          }}
        >
          <Icon color={selected ? colors.brand.violet : colors.text.secondary} size={23} />
        </View>
        {selected ? <Check color={colors.brand.violet} size={22} strokeWidth={2.4} /> : null}
      </View>
      <View style={{ gap: spacing[1] }}>
        <AppText color="primary" variant="bodyLarge" weight="semibold">
          {title}
        </AppText>
        <AppText color="secondary" variant="footnote">
          {subtitle}
        </AppText>
      </View>
    </Pressable>
  );
}

function ToggleRow({ title, subtitle, value, onValueChange }: ToggleRowProps) {
  return (
    <View
      style={{
        minHeight: 92,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[4],
        borderBottomWidth: 1,
        borderBottomColor: colors.border.subtle,
        paddingHorizontal: spacing[5],
      }}
    >
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText color="primary" variant="bodyLarge" weight="semibold">
          {title}
        </AppText>
        <AppText color="secondary" variant="footnote" numberOfLines={2}>
          {subtitle}
        </AppText>
      </View>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{
          false: colors.background.panelStrong,
          true: "rgba(139, 92, 246, 0.55)",
        }}
        thumbColor={value ? colors.text.primary : colors.text.secondary}
      />
    </View>
  );
}

function StorageMeter({ value }: { value: number }) {
  return (
    <View style={{ gap: spacing[2] }}>
      <View
        style={{
          height: 10,
          overflow: "hidden",
          borderRadius: radii.pill,
          backgroundColor: colors.background.panelStrong,
        }}
      >
        <View
          style={{
            width: `${value}%`,
            height: "100%",
            borderRadius: radii.pill,
            backgroundColor: colors.brand.violet,
          }}
        />
      </View>
      <AppText color="secondary" variant="caption">
        1.8 GB used by imported books, indexes, highlights, and summaries
      </AppText>
    </View>
  );
}

function ProfileDetail() {
  return (
    <DetailShell
      title="Profile"
      subtitle="Local account identity for your reading workspace."
      icon={UserRound}
    >
      <Surface
        style={{
          flexDirection: "row",
          alignItems: "center",
          gap: spacing[5],
          backgroundColor: "#120F17",
        }}
      >
        <View
          style={{
            width: 82,
            height: 82,
            alignItems: "center",
            justifyContent: "center",
            borderRadius: radii.pill,
            backgroundColor: colors.background.panelStrong,
          }}
        >
          <UserRound color={colors.text.primary} size={38} strokeWidth={2} />
        </View>
        <View style={{ flex: 1, gap: spacing[2], minWidth: 0 }}>
          <AppText color="primary" variant="title3" weight="semibold" numberOfLines={1}>
            John Doe
          </AppText>
          <AppText color="secondary" variant="body" numberOfLines={1} selectable>
            john@example.com
          </AppText>
          <Button title="Edit Profile" variant="secondary" />
        </View>
      </Surface>

      <Section title="Account">
        <InfoRow label="Display name" value="John Doe" icon={UserRound} />
        <InfoRow label="Email" value="john@example.com" icon={Mail} />
        <InfoRow label="Privacy" value="Offline-first, local library" icon={Shield} />
      </Section>
    </DetailShell>
  );
}

function PremiumDetail() {
  const [plan, setPlan] = useState<"annual" | "monthly">("annual");

  return (
    <DetailShell
      title="Lumira Pro"
      subtitle="AI assistance, richer insights, and advanced reading analytics."
      icon={Crown}
      accent={colors.brand.purple}
    >
      <Surface
        style={{
          gap: spacing[5],
          borderColor: "rgba(168, 85, 247, 0.42)",
          backgroundColor: "#18091F",
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[4] }}>
          <View
            style={{
              width: 66,
              height: 66,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.pill,
              backgroundColor: colors.brand.purple,
            }}
          >
            <Sparkles color={colors.text.primary} size={31} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText color="primary" variant="title3" weight="semibold">
              Upgrade your reading workspace
            </AppText>
            <AppText color="secondary" variant="body">
              Summaries, idea links, and deeper knowledge review.
            </AppText>
          </View>
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[4] }}>
          <ChoiceCard
            title="$59/year"
            subtitle="Best value for ongoing reading"
            icon={Crown}
            selected={plan === "annual"}
            onPress={() => setPlan("annual")}
          />
          <ChoiceCard
            title="$8/month"
            subtitle="Flexible monthly access"
            icon={Sparkles}
            selected={plan === "monthly"}
            onPress={() => setPlan("monthly")}
          />
        </View>
        <Button title="Continue" variant="secondary" fullWidth />
      </Surface>

      <Section title="Included">
        <InfoRow label="AI" value="Unlimited assistant sessions" icon={Sparkles} />
        <InfoRow label="Knowledge" value="Advanced highlight analytics" icon={Crown} />
        <InfoRow label="Privacy" value="Your imported books stay local" icon={Lock} />
      </Section>
    </DetailShell>
  );
}

function AppearanceDetail() {
  const [theme, setTheme] = useState<"dark" | "midnight" | "sepia">("dark");

  return (
    <DetailShell
      title="Appearance"
      subtitle="Tune the shell and reader surface for longer sessions."
      icon={Palette}
    >
      <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing[4] }}>
        <ChoiceCard
          title="Dark"
          subtitle="High contrast, calm chrome"
          icon={Moon}
          selected={theme === "dark"}
          onPress={() => setTheme("dark")}
        />
        <ChoiceCard
          title="Midnight"
          subtitle="Softer reading panels"
          icon={Sparkles}
          selected={theme === "midnight"}
          onPress={() => setTheme("midnight")}
        />
        <ChoiceCard
          title="Sepia Reader"
          subtitle="Warm long-form pages"
          icon={Sun}
          selected={theme === "sepia"}
          onPress={() => setTheme("sepia")}
        />
      </View>

      <Section title="Typography">
        <InfoRow label="Reader font" value="Serif" />
        <InfoRow label="Text size" value="Medium" />
        <InfoRow label="Line height" value="Relaxed" />
      </Section>
    </DetailShell>
  );
}

function NotificationsDetail() {
  const [readingReminder, setReadingReminder] = useState(true);
  const [insightDigest, setInsightDigest] = useState(true);
  const [importComplete, setImportComplete] = useState(false);

  return (
    <DetailShell
      title="Notifications"
      subtitle="Quiet reminders for reading rhythm and knowledge review."
      icon={Bell}
    >
      <Section title="Reading">
        <ToggleRow
          title="Reading reminders"
          subtitle="A gentle nudge when your daily reading window starts."
          value={readingReminder}
          onValueChange={setReadingReminder}
        />
        <ToggleRow
          title="Insight digest"
          subtitle="A weekly summary of highlights and unfinished threads."
          value={insightDigest}
          onValueChange={setInsightDigest}
        />
        <ToggleRow
          title="Import complete"
          subtitle="Notify when EPUB processing finishes."
          value={importComplete}
          onValueChange={setImportComplete}
        />
      </Section>

      <Section title="Schedule">
        <InfoRow label="Reminder time" value="8:00 PM" icon={Bell} />
        <InfoRow label="Quiet hours" value="10:00 PM - 7:00 AM" icon={Moon} />
      </Section>
    </DetailShell>
  );
}

function SyncDetail() {
  const [wifiOnly, setWifiOnly] = useState(true);
  const [backgroundIndexing, setBackgroundIndexing] = useState(true);

  return (
    <DetailShell
      title="Sync"
      subtitle="Local-first library status and device storage controls."
      icon={Cloud}
    >
      <Surface style={{ gap: spacing[5] }}>
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[4] }}>
          <View
            style={{
              width: 58,
              height: 58,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 18,
              backgroundColor: colors.background.panelStrong,
            }}
          >
            <WifiOff color={colors.text.primary} size={27} strokeWidth={2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText color="primary" variant="title3" weight="semibold">
              Offline library
            </AppText>
            <AppText color="secondary" variant="body">
              No cloud backend is connected yet.
            </AppText>
          </View>
        </View>
        <StorageMeter value={42} />
      </Surface>

      <Section title="Device">
        <ToggleRow
          title="Wi-Fi only"
          subtitle="Prepare future sync jobs only on Wi-Fi."
          value={wifiOnly}
          onValueChange={setWifiOnly}
        />
        <ToggleRow
          title="Background indexing"
          subtitle="Keep imported EPUB search indexes fresh."
          value={backgroundIndexing}
          onValueChange={setBackgroundIndexing}
        />
      </Section>

      <Section title="Storage">
        <InfoRow label="Imported books" value="23 EPUB files" icon={HardDrive} />
        <InfoRow label="Highlights" value="148 saved notes" icon={Cloud} />
      </Section>
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
