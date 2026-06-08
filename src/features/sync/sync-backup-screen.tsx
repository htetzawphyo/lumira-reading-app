import { useRouter } from "expo-router";
import {
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  Cloud,
  CloudOff,
  Crown,
  HardDrive,
  Lock,
  RefreshCw,
  RotateCcw,
} from "lucide-react-native";
import { useEffect, useMemo, useState } from "react";
import { Alert, Pressable, View } from "react-native";

import { AppText } from "@/components/ui/app-text";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { InlineStatus } from "@/components/ui/inline-status";
import { Surface } from "@/components/ui/surface";
import { useAppTheme } from "@/design/app-theme-provider";
import { useResponsive } from "@/design/responsive";
import { radii, spacing } from "@/design/tokens";
import { useBooksStore } from "@/features/books/books-store";
import { isPremiumAuthSession, useAuthStore } from "@/features/auth/auth-store";
import {
  fallbackProPlanConfig,
  proPlanService,
  type ProPlanConfig,
} from "@/features/settings/pro-plan-service";
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

function PremiumUpsell() {
  const router = useRouter();
  const responsive = useResponsive();
  const { colors } = useAppTheme();
  const [config, setConfig] = useState<ProPlanConfig>(fallbackProPlanConfig);
  const includedFeatures = config.features.filter((feature) => feature.included);

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
              Read better with {config.planName}
            </AppText>
            <AppText color="secondary" variant={responsive.isPhone ? "footnote" : "body"}>
              {config.subtitle}
            </AppText>
          </View>
        </View>

        <View
          style={{
            flexDirection: responsive.isSmallPhone ? "column" : "row",
            gap: spacing[3],
          }}
        >
          <View
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.border.subtle,
              backgroundColor: colors.surface.soft,
              padding: spacing[3],
            }}
          >
            <AppText color="primary" variant="footnote" weight="semibold">
              Myanmar
            </AppText>
            <AppText color="secondary" variant="caption">
              {config.prices.mm.display}
            </AppText>
          </View>
          <View
            style={{
              flex: 1,
              minWidth: 0,
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.border.subtle,
              backgroundColor: colors.surface.soft,
              padding: spacing[3],
            }}
          >
            <AppText color="primary" variant="footnote" weight="semibold">
              International
            </AppText>
            <AppText color="secondary" variant="caption">
              {config.prices.international.display}
            </AppText>
          </View>
        </View>

        <View style={{ gap: spacing[2] }}>
          <AppText color="secondary" variant="footnote" weight="semibold">
            Included with {config.planName}
          </AppText>
          <View
            style={{
              overflow: "hidden",
              borderRadius: radii.lg,
              borderWidth: 1,
              borderColor: colors.border.subtle,
              backgroundColor: colors.surface.soft,
            }}
          >
            {includedFeatures.map((feature, index) => {
              const isLast = index === includedFeatures.length - 1;

              return (
                <View
                  key={feature.id}
                  style={{
                    minHeight: responsive.isPhone ? 58 : 66,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing[3],
                    borderBottomWidth: isLast ? 0 : 1,
                    borderBottomColor: colors.border.subtle,
                    paddingHorizontal: responsive.isPhone ? spacing[3] : spacing[4],
                    paddingVertical: spacing[3],
                  }}
                >
                  <CheckCircle2
                    color={colors.brand.emerald}
                    size={responsive.isPhone ? 17 : 19}
                    strokeWidth={2.3}
                  />
                  <View style={{ flex: 1, minWidth: 0 }}>
                    <AppText color="primary" variant="footnote" weight="semibold" numberOfLines={1}>
                      {feature.title}
                    </AppText>
                    <AppText color="secondary" variant="caption" numberOfLines={1}>
                      {feature.description}
                    </AppText>
                  </View>
                </View>
              );
            })}
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
              Monthly limit: {config.aiLimits.summariesPerMonth?.toLocaleString() ?? "50"} summaries / month
            </AppText>
          </View>
          <View style={{ flex: 1, minWidth: 0 }}>
            <AppText color="primary" variant="footnote" weight="semibold">
              Discuss with AI
            </AppText>
            <AppText color="secondary" variant="caption">
              Monthly limit: {config.aiLimits.chatMessagesPerMonth?.toLocaleString() ?? "300"} messages / month
            </AppText>
          </View>
        </View>

        <View style={{ flexDirection: responsive.isPhone ? "column" : "row", gap: spacing[3] }}>
          <Button
            title="Upgrade to Lumira Pro"
            icon={Crown}
            variant="secondary"
            onPress={() => router.push("/settings/premium")}
            style={{ alignSelf: responsive.isPhone ? "stretch" : "flex-start" }}
          />
          <Button
            title="View plan details"
            variant="ghost"
            onPress={() => router.push("/settings/premium")}
            style={{ alignSelf: responsive.isPhone ? "stretch" : "flex-start" }}
          />
        </View>
      </Surface>
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
  const [dashboard, setDashboard] = useState<SyncDashboard | null>(null);
  const [loading, setLoading] = useState(false);
  const isPremiumUser = useAuthStore((state) => isPremiumAuthSession(state.session));
  const canUseBackup = canUseCloudBackup(isPremiumUser);
  const context = useMemo(
    () => ({ books, knowledgeCount }),
    [books, knowledgeCount],
  );

  useEffect(() => {
    if (!canUseBackup) {
      setDashboard(null);
      setLoading(false);
      return;
    }

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
  }, [canUseBackup, context]);

  if (!canUseBackup) {
    return <PremiumUpsell />;
  }

  if (loading) {
    return <EmptyState compact icon={Cloud} title="Checking backup status" body="Preparing local cloud backup controls..." />;
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
