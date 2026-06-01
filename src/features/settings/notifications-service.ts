import { Platform } from "react-native";

import type {
  Book,
  NotificationPermissionStatus,
  NotificationSettings,
} from "@/features/books/types";

const notificationChannelId = "lumira-reading";
type NotificationsModule = typeof import("expo-notifications");

let notificationsModule: NotificationsModule | null | undefined;

function getNotificationsModule() {
  if (notificationsModule !== undefined) {
    return notificationsModule;
  }

  try {
    const module = require("expo-notifications") as NotificationsModule;
    module.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: true,
        shouldShowList: true,
        shouldPlaySound: false,
        shouldSetBadge: false,
      }),
    });
    notificationsModule = module;
  } catch {
    notificationsModule = null;
  }

  return notificationsModule;
}

function normalizePermissionStatus(
  permission: { granted?: boolean; status?: string },
): NotificationPermissionStatus {
  if (permission.granted || permission.status === "granted") {
    return "granted";
  }

  if (permission.status === "denied") {
    return "denied";
  }

  return "undetermined";
}

async function configureAndroidChannel() {
  const Notifications = getNotificationsModule();

  if (!Notifications) {
    return false;
  }

  if (Platform.OS !== "android") {
    return true;
  }

  await Notifications.setNotificationChannelAsync(notificationChannelId, {
    name: "Reading reminders",
    description: "Quiet Lumira reminders and local reading updates.",
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 160, 120, 160],
    lightColor: "#8B5CF6",
  });
  return true;
}

export async function getNotificationPermissionStatus() {
  const Notifications = getNotificationsModule();

  if (!Notifications) {
    return "denied";
  }

  try {
    const permission = await Notifications.getPermissionsAsync();
    return normalizePermissionStatus(permission);
  } catch {
    return "denied";
  }
}

export async function requestNotificationPermission() {
  const Notifications = getNotificationsModule();

  if (!Notifications) {
    return "denied";
  }

  try {
    const channelReady = await configureAndroidChannel();

    if (!channelReady) {
      return "denied";
    }

    const existing = await Notifications.getPermissionsAsync();

    if (existing.granted || existing.status === "granted") {
      return "granted";
    }

    if (existing.canAskAgain === false) {
      return normalizePermissionStatus(existing);
    }

    const requested = await Notifications.requestPermissionsAsync({
      ios: {
        allowAlert: true,
        allowBadge: false,
        allowSound: false,
      },
    });

    return normalizePermissionStatus(requested);
  } catch {
    return "denied";
  }
}

async function cancelScheduledNotification(identifier?: string | null) {
  const Notifications = getNotificationsModule();

  if (!Notifications) {
    return;
  }

  if (!identifier) {
    return;
  }

  try {
    await Notifications.cancelScheduledNotificationAsync(identifier);
  } catch {
    // The identifier may refer to a notification already delivered or cleared.
  }
}

async function scheduleReadingReminder(settings: NotificationSettings) {
  const Notifications = getNotificationsModule();

  if (!Notifications) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Time to read",
      body: "A quiet Lumira reminder for your daily reading window.",
      data: { type: "reading-reminder" },
      sound: false,
      color: "#8B5CF6",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour: settings.reminderHour,
      minute: settings.reminderMinute,
      channelId: notificationChannelId,
    },
  });
}

async function scheduleInsightDigest(settings: NotificationSettings) {
  const Notifications = getNotificationsModule();

  if (!Notifications) {
    return null;
  }

  return Notifications.scheduleNotificationAsync({
    content: {
      title: "Review your reading notes",
      body: "Revisit this week's highlights and open threads in Lumira.",
      data: { type: "insight-digest" },
      sound: false,
      color: "#8B5CF6",
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
      weekday: settings.digestWeekday,
      hour: settings.digestHour,
      minute: settings.digestMinute,
      channelId: notificationChannelId,
    },
  });
}

export async function syncNotificationSchedules(
  settings: NotificationSettings,
  options: { requestPermission?: boolean } = {},
): Promise<NotificationSettings> {
  const channelReady = await configureAndroidChannel();

  if (!channelReady) {
    return {
      ...settings,
      permissionStatus: "denied",
      readingReminderEnabled: false,
      insightDigestEnabled: false,
      importCompleteEnabled: false,
      readingReminderNotificationId: null,
      insightDigestNotificationId: null,
    };
  }

  const permissionStatus = options.requestPermission
    ? await requestNotificationPermission()
    : await getNotificationPermissionStatus();

  await cancelScheduledNotification(settings.readingReminderNotificationId);
  await cancelScheduledNotification(settings.insightDigestNotificationId);

  if (permissionStatus !== "granted") {
    return {
      ...settings,
      permissionStatus,
      readingReminderEnabled: options.requestPermission
        ? false
        : settings.readingReminderEnabled,
      insightDigestEnabled: options.requestPermission
        ? false
        : settings.insightDigestEnabled,
      importCompleteEnabled: options.requestPermission
        ? false
        : settings.importCompleteEnabled,
      readingReminderNotificationId: null,
      insightDigestNotificationId: null,
    };
  }

  const readingReminderNotificationId = settings.readingReminderEnabled
    ? await scheduleReadingReminder(settings)
    : null;
  const insightDigestNotificationId = settings.insightDigestEnabled
    ? await scheduleInsightDigest(settings)
    : null;

  return {
    ...settings,
    permissionStatus,
    readingReminderNotificationId,
    insightDigestNotificationId,
  };
}

export async function showImportCompleteNotification(
  settings: NotificationSettings,
  book: Book,
) {
  if (!settings.importCompleteEnabled) {
    return;
  }

  const permissionStatus = await getNotificationPermissionStatus();

  if (permissionStatus !== "granted") {
    return;
  }

  const Notifications = getNotificationsModule();
  const channelReady = await configureAndroidChannel();

  if (!Notifications || !channelReady) {
    return;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title: "Import complete",
      body: `${book.title} is ready in your Lumira library.`,
      data: { type: "import-complete", bookId: book.id },
      sound: false,
      color: "#8B5CF6",
    },
    trigger: null,
  });
}
