import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';

import type { Settings } from '@/lib/storage';

export const PRACTICE_REMINDER_ID = 'quranki.practice-reminder';
const PRACTICE_CHANNEL_ID = 'practice';

export const DEFAULT_REMINDER_HOUR = 20;
export const DEFAULT_REMINDER_MINUTE = 0;

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldPlaySound: true,
      shouldSetBadge: false,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

export function clampReminderHour(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_REMINDER_HOUR;
  return Math.min(23, Math.max(0, Math.round(value)));
}

export function clampReminderMinute(value: number): number {
  if (!Number.isFinite(value)) return DEFAULT_REMINDER_MINUTE;
  return Math.min(59, Math.max(0, Math.round(value)));
}

export function formatReminderTime(hour: number, minute: number): string {
  const period = hour >= 12 ? 'PM' : 'AM';
  const hour12 = hour % 12 || 12;
  return `${hour12}:${String(clampReminderMinute(minute)).padStart(2, '0')} ${period}`;
}

async function ensureAndroidChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(PRACTICE_CHANNEL_ID, {
    name: 'Practice reminders',
    importance: Notifications.AndroidImportance.DEFAULT,
  });
}

export async function cancelPracticeReminder(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    await Notifications.cancelScheduledNotificationAsync(PRACTICE_REMINDER_ID);
  } catch {
    // Identifier may not exist yet.
  }
}

export async function reminderPermissionGranted(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const existing = await Notifications.getPermissionsAsync();
  return existing.status === 'granted';
}

/** Shows the system prompt only when the user has just chosen a reminder time. */
export async function requestReminderPermission(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await ensureAndroidChannel();
  if (await reminderPermissionGranted()) return true;
  const next = await Notifications.requestPermissionsAsync();
  return next.status === 'granted';
}

export async function syncPracticeReminder(
  settings: Pick<Settings, 'reminderEnabled' | 'reminderHour' | 'reminderMinute'>,
  options?: { requestPermission?: boolean },
): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  await cancelPracticeReminder();
  if (!settings.reminderEnabled) return false;
  const allowed = options?.requestPermission === false
    ? await reminderPermissionGranted()
    : await requestReminderPermission();
  if (!allowed) return false;

  const hour = clampReminderHour(settings.reminderHour);
  const minute = clampReminderMinute(settings.reminderMinute);
  await Notifications.scheduleNotificationAsync({
    identifier: PRACTICE_REMINDER_ID,
    content: {
      title: 'Time to practice',
      body: 'A few Quran words today is enough.',
      sound: 'default',
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.DAILY,
      hour,
      minute,
      channelId: PRACTICE_CHANNEL_ID,
    },
  });
  return true;
}
