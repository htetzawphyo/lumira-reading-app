import { useRouter } from "expo-router";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Cloud,
  CloudOff,
  Crown,
  DatabaseBackup,
  HardDrive,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  UploadCloud,
  Wifi,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, ScrollView, Switch, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineStatus } from "@/components/ui/inline-status";
import { Surface } from "@/components/ui/surface";
import { useAppTheme } from "@/design/app-theme-provider";
import { useResponsive } from "@/design/responsive";
import { radii, spacing } from "@/design/tokens";
import { useBooksStore } from "@/features/books/books-store";
import {
  canUseCloudBackup,
  getSyncDashboard,
  syncNow,
} from "@/features/sync/cloud-backup-service";
import type {
  CloudStorageUsage,
  CloudSyncStatus,
  SyncDashboard,
} from "@/features/sync/cloud-backup-types";
import { formatRelativeTime } from "@/utils/date";

function formatBytes(bytes: number) {
  if (bytes >= 1024 * 1024 * 1024) {
    return `${(bytes / (1024 * 1024 * 1024)).toFixed(bytes === 1024 * 1024 * 1024 ? 0 : 1)} GB`;
  }

  if (bytes >= 1024 * 1024) {
    return `${Math.round(bytes / (1024 * 1024))} MB`;
  }

  return `${Math.round(bytes / 1024)} KB`;
}

function storageTone(usage: CloudStorageUsage) {
  const ratio = usage.totalBytes > 0 ? usage.usedBytes / usage.totalBytes : 0;

  if (ratio >= 0.95) {
    return "full";
  }

  if (ratio >= 0.75) {
    return "warning";
  }

  return "normal";
}

function syncStateCopy(status: CloudSyncStatus, lastSyncedAt: string | null) {
  switch (status) {
    case "enabled":
      return {
        icon: Cloud,
        title: "Sync is ready",
        body: "Cloud backup will start when the backend is connected.",
      };
    case "syncing":
      return {
        icon: RefreshCw,
        title: "Syncing your library...",
        body: "Keep the app open while large books upload.",
      };
    case "synced":
      return {
        icon: CheckCircle2,
        title: "Your library is backed up.",
        body: lastSyncedAt ? `Last synced ${formatRelativeTime(lastSyncedAt)}.` : "Last sync time is not available.",
      };
    case "failed":
      return {
        icon: AlertCircle,
        title: "Sync couldn't finish.",
        body: "Your local data is safe. Try again when your connection is stable.",
      };
    case "storage-full":
      return {
        icon: HardDrive,
        title: "Cloud storage is full.",
        body: "Delete some cloud backups to continue syncing. Local books remain available on this device.",
      };
    case "offline":
      return {
        icon: CloudOff,
        title: "You're offline.",
        body: "Sync will resume when you're connected.",
      };
    case "restoring":
      return {
        icon: RotateCcw,
        title: "Restoring your library...",
        body: "Existing local books will not be deleted.",
      };
    case "restore-completed":
      return {
        icon: CheckCircle2,
        title: "Restore completed.",
        body: "Lumira merged available cloud items into this device.",
      };
    default:
      return {
        icon: Lock,
        title: "Cloud Backup is not enabled.",
        body: "Upgrade to Premium to back up your EPUB library and reading data.",
      };
  }
}

function StorageUsage({ usage }: { usage: CloudStorageUsage }) {
  const { colors } = useAppTheme();
  const tone = storageTone(usage);
  const percent = usage.totalBytes > 0
    ? Math.min(Math.round((usage.usedBytes / usage.totalBytes) * 100), 100)
    : 0;
  const barColor =
    tone === "full"
      ? colors.brand.amber
      : tone === "warning"
        ? colors.brand.amber
        : colors.brand.emerald;

  return (
    <View style={{ gap: spacing[2] }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", gap: spacing[3] }}>
        <AppText color="primary" variant="footnote" weight="semibold">
          {formatBytes(usage.usedBytes)} of {formatBytes(usage.totalBytes)} used
        </AppText>
        <AppText color="secondary" variant="footnote" weight="semibold">
          {percent}%
        </AppText>
      </View>
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
            width: `${percent}%`,
            height: "100%",
            borderRadius: radii.pill,
            backgroundColor: barColor,
          }}
        />
      </View>
      <AppText color="tertiary" variant="caption">
        1GB cloud backup storage. Local books remain available on this device.
      </AppText>
    </View>
  );
}

function Benefit({ children }: { children: string }) {
  const { colors } = useAppTheme();

  return (
    <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[2] }}>
      <CheckCircle2 color={colors.brand.emerald} size={16} strokeWidth={2.2} />
      <AppText color="secondary" variant="footnote">
        {children}
      </AppText>
    </View>
  );
}

function PremiumUpsell({ onPreviewPremium }: { onPreviewPremium: () => void }) {
  const router = useRouter();
  const responsive = useResponsive();
  const { colors } = useAppTheme();

  return (
    <View style={{ gap: responsive.isPhone ? spacing[4] : spacing[5] }}>
      <Surface
        style={{
          gap: spacing[4],
          borderColor: "rgba(168, 85, 247, 0.38)",
          backgroundColor: colors.background.panel,
          padding: responsive.isPhone ? spacing[4] : spacing[5],
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
          <View
            style={{
              width: responsive.isPhone ? 48 : 58,
              height: responsive.isPhone ? 48 : 58,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.pill,
              backgroundColor: colors.brand.purple,
            }}
          >
            <Crown color="#FFFFFF" size={responsive.isPhone ? 23 : 28} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1, minWidth: 0, gap: spacing[1] }}>
            <AppText color="primary" variant={responsive.isPhone ? "bodyLarge" : "title3"} weight="semibold">
              Back up your library and continue reading across devices.
            </AppText>
            <AppText color="secondary" variant={responsive.isPhone ? "footnote" : "body"}>
              Cloud Backup is a Premium feature. Local reading stays free and offline.
            </AppText>
          </View>
        </View>

        <View style={{ gap: spacing[2] }}>
          <Benefit>EPUB cloud backup</Benefit>
          <Benefit>Reading progress sync</Benefit>
          <Benefit>Notes and highlights sync</Benefit>
          <Benefit>Folder sync</Benefit>
          <Benefit>Reader settings sync</Benefit>
          <Benefit>Restore your library on a new device</Benefit>
          <Benefit>1GB cloud backup storage</Benefit>
        </View>

        <View style={{ flexDirection: responsive.isSmallPhone ? "column" : "row", gap: spacing[3] }}>
          <Button
            title="Upgrade to Premium"
            icon={Crown}
            variant="secondary"
            onPress={() => router.push("/settings/premium")}
            style={{ alignSelf: responsive.isSmallPhone ? "stretch" : "flex-start" }}
          />
          <Button
            title="Learn more"
            variant="ghost"
            onPress={() => router.push("/settings/premium")}
            style={{ alignSelf: responsive.isSmallPhone ? "stretch" : "flex-start" }}
          />
        </View>
      </Surface>

      {__DEV__ ? (
        <Button
          title="Preview Premium Dashboard"
          variant="ghost"
          onPress={onPreviewPremium}
        />
      ) : null}
    </View>
  );
}

function DashboardAction({
  title,
  subtitle,
  icon: Icon,
  onPress,
}: {
  title: string;
  subtitle: string;
  icon: typeof Cloud;
  onPress: () => void;
}) {
  const { colors } = useAppTheme();

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => ({
        minHeight: 72,
        flexDirection: "row",
        alignItems: "center",
        gap: spacing[3],
        borderRadius: radii.lg,
        borderWidth: 1,
        borderColor: colors.border.subtle,
        backgroundColor: colors.background.panel,
        padding: spacing[4],
        opacity: pressed ? 0.72 : 1,
      })}
    >
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
        <Icon color={colors.text.primary} size={20} strokeWidth={2.1} />
      </View>
      <View style={{ flex: 1, minWidth: 0 }}>
        <AppText color="primary" variant="body" weight="semibold">
          {title}
        </AppText>
        <AppText color="secondary" variant="caption" numberOfLines={2}>
          {subtitle}
        </AppText>
      </View>
      <ChevronRight color={colors.text.secondary} size={20} strokeWidth={2} />
    </Pressable>
  );
}

function PremiumDashboard({
  dashboard,
  onDashboardChange,
}: {
  dashboard: SyncDashboard;
  onDashboardChange: (dashboard: SyncDashboard) => void;
}) {
  const router = useRouter();
  const responsive = useResponsive();
  const { colors } = useAppTheme();
  const [syncing, setSyncing] = useState(false);
  const [cloudBackupEnabled, setCloudBackupEnabled] = useState(
    dashboard.cloudBackupEnabled,
  );
  const [autoSyncWifiOnly, setAutoSyncWifiOnly] = useState(
    dashboard.autoSyncWifiOnly,
  );
  const [allowMobileDataSync, setAllowMobileDataSync] = useState(
    dashboard.allowMobileDataSync,
  );
  const stateCopy = syncStateCopy(dashboard.status, dashboard.lastSyncedAt);
  const StateIcon = stateCopy.icon;

  async function handleSyncNow() {
    if (syncing) {
      return;
    }

    setSyncing(true);
    onDashboardChange({ ...dashboard, status: "syncing" });

    try {
      const result = await syncNow();
      onDashboardChange({ ...dashboard, status: result.status });
      Alert.alert(result.ok ? "Sync complete" : "Sync unavailable", result.message);
    } catch {
      onDashboardChange({ ...dashboard, status: "failed" });
      Alert.alert("Sync unavailable", "Couldn't connect to cloud backup. Try again later.");
    } finally {
      setSyncing(false);
    }
  }

  return (
    <View style={{ gap: responsive.isPhone ? spacing[4] : spacing[5] }}>
      <Surface
        style={{
          gap: spacing[4],
          backgroundColor: colors.background.panel,
          padding: responsive.isPhone ? spacing[4] : spacing[5],
        }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", gap: spacing[3] }}>
          <View
            style={{
              width: 48,
              height: 48,
              alignItems: "center",
              justifyContent: "center",
              borderRadius: radii.pill,
              backgroundColor: colors.surface.soft,
            }}
          >
            <StateIcon color={colors.brand.violet} size={23} strokeWidth={2.2} />
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText color="primary" variant="bodyLarge" weight="semibold">
              {stateCopy.title}
            </AppText>
            <AppText color="secondary" variant="footnote">
              {stateCopy.body}
            </AppText>
          </View>
        </View>
        <StorageUsage usage={dashboard.storage} />
        {dashboard.status === "failed" || dashboard.status === "storage-full" ? (
          <InlineStatus tone="warning" message="Local data remains safe on this device." />
        ) : null}
      </Surface>

      <Surface padded={false} style={{ overflow: "hidden" }}>
        <View
          style={{
            minHeight: 72,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[3],
            borderBottomWidth: 1,
            borderBottomColor: colors.border.subtle,
            paddingHorizontal: spacing[4],
          }}
        >
          <DatabaseBackup color={colors.text.secondary} size={20} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <AppText color="primary" variant="body" weight="semibold">
              Enable Cloud Backup
            </AppText>
            <AppText color="secondary" variant="caption">
              Back up books, metadata, notes, folders, and settings.
            </AppText>
          </View>
          <Switch
            value={cloudBackupEnabled}
            onValueChange={(value) => {
              setCloudBackupEnabled(value);
              onDashboardChange({
                ...dashboard,
                cloudBackupEnabled: value,
                status: value ? "enabled" : "not-enabled",
              });
            }}
            trackColor={{ false: colors.background.panelStrong, true: "rgba(139, 92, 246, 0.55)" }}
            thumbColor={cloudBackupEnabled ? colors.text.primary : colors.text.secondary}
          />
        </View>
        <View
          style={{
            minHeight: 72,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[3],
            borderBottomWidth: 1,
            borderBottomColor: colors.border.subtle,
            paddingHorizontal: spacing[4],
          }}
        >
          <Wifi color={colors.text.secondary} size={20} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <AppText color="primary" variant="body" weight="semibold">
              Auto Sync on Wi-Fi
            </AppText>
            <AppText color="secondary" variant="caption">
              Recommended default for large EPUB uploads.
            </AppText>
          </View>
          <Switch
            value={autoSyncWifiOnly}
            onValueChange={setAutoSyncWifiOnly}
            trackColor={{ false: colors.background.panelStrong, true: "rgba(139, 92, 246, 0.55)" }}
            thumbColor={autoSyncWifiOnly ? colors.text.primary : colors.text.secondary}
          />
        </View>
        <View
          style={{
            minHeight: 72,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing[3],
            paddingHorizontal: spacing[4],
          }}
        >
          <UploadCloud color={colors.text.secondary} size={20} strokeWidth={2} />
          <View style={{ flex: 1 }}>
            <AppText color="primary" variant="body" weight="semibold">
              Auto Sync on Mobile Data
            </AppText>
            <AppText color="secondary" variant="caption">
              Off by default to protect data plans.
            </AppText>
          </View>
          <Switch
            value={allowMobileDataSync}
            onValueChange={setAllowMobileDataSync}
            trackColor={{ false: colors.background.panelStrong, true: "rgba(139, 92, 246, 0.55)" }}
            thumbColor={allowMobileDataSync ? colors.text.primary : colors.text.secondary}
          />
        </View>
      </Surface>

      <View style={{ flexDirection: responsive.isSmallPhone ? "column" : "row", gap: spacing[3] }}>
        <Button
          title={syncing ? "Syncing..." : "Sync Now"}
          icon={RefreshCw}
          variant="secondary"
          disabled={syncing}
          onPress={handleSyncNow}
          style={{ alignSelf: responsive.isSmallPhone ? "stretch" : "flex-start" }}
        />
        <Button
          title="Restore from Backup"
          icon={RotateCcw}
          variant="ghost"
          onPress={() => router.push("/settings/sync-restore")}
          style={{ alignSelf: responsive.isSmallPhone ? "stretch" : "flex-start" }}
        />
      </View>

      <View style={{ gap: spacing[3] }}>
        <DashboardAction
          title="Restore from Backup"
          subtitle="Add cloud books and reading data to this device."
          icon={RotateCcw}
          onPress={() => router.push("/settings/sync-restore")}
        />
        <DashboardAction
          title="Manage Cloud Library"
          subtitle="Review backed up EPUBs without touching local files."
          icon={HardDrive}
          onPress={() => router.push("/settings/cloud-library")}
        />
      </View>
    </View>
  );
}

export function SyncBackupScreen() {
  const responsive = useResponsive();
  const books = useBooksStore((state) => state.books);
  const knowledgeCount = useBooksStore((state) => state.knowledgeItems.length);
  const [previewPremium, setPreviewPremium] = useState(false);
  const [dashboard, setDashboard] = useState<SyncDashboard | null>(null);
  const [loading, setLoading] = useState(true);
  const isPremiumUser = false;
  const canUseBackup = canUseCloudBackup(isPremiumUser || previewPremium);
  const context = useMemo(
    () => ({ books, knowledgeCount }),
    [books, knowledgeCount],
  );

  useEffect(() => {
    let active = true;

    setLoading(true);
    getSyncDashboard(context)
      .then((nextDashboard) => {
        if (active) {
          setDashboard(nextDashboard);
        }
      })
      .catch(() => {
        if (active) {
          setDashboard(null);
        }
      })
      .finally(() => {
        if (active) {
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [context]);

  if (loading) {
    return <EmptyState compact icon={Cloud} title="Checking backup status" body="Preparing local cloud backup controls..." />;
  }

  if (!canUseBackup) {
    return <PremiumUpsell onPreviewPremium={() => setPreviewPremium(true)} />;
  }

  if (!dashboard) {
    return (
      <Surface style={{ gap: spacing[3], padding: responsive.isPhone ? spacing[4] : spacing[5] }}>
        <EmptyState compact icon={CloudOff} title="Backup status unavailable" body="Couldn't connect to cloud backup. Local reading still works." />
      </Surface>
    );
  }

  return (
    <PremiumDashboard
      dashboard={dashboard}
      onDashboardChange={setDashboard}
    />
  );
}
