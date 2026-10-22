/**
 * Web version of the mobile daily practice reminder. Browsers cannot schedule an OS alarm, so the
 * reminder fires as a desktop notification at the chosen time while any Quranki tab is open
 * (including a background tab), once per day, and only if the learner has not studied yet.
 * The reminder settings themselves sync with the phone, where they schedule a real notification.
 */
import type { Settings } from '@/lib/storage';

export const PRACTICE_REMINDER_ID = 'quranki.practice-reminder';
export const DEFAULT_REMINDER_HOUR = 20;
export const DEFAULT_REMINDER_MINUTE = 0;

const LAST_SHOWN_KEY = 'quranki:web-reminder:last-shown';

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

function notificationsSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

export async function reminderPermissionGranted(): Promise<boolean> {
  return notificationsSupported() && Notification.permission === 'granted';
}

export async function requestReminderPermission(): Promise<boolean> {
  if (!notificationsSupported()) return false;
  if (Notification.permission === 'granted') return true;
  if (Notification.permission === 'denied') return false;
  return (await Notification.requestPermission()) === 'granted';
}

let timer: ReturnType<typeof setTimeout> | null = null;
let studiedToday: () => boolean = () => false;

/** Lets the reminder skip days the learner already studied. */
export function setStudiedTodayCheck(check: () => boolean): void {
  studiedToday = check;
}

export async function cancelPracticeReminder(): Promise<void> {
  if (timer) clearTimeout(timer);
  timer = null;
}

function localDayKey(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function schedule(hour: number, minute: number): void {
  if (timer) clearTimeout(timer);
  const now = new Date();
  const next = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hour, minute, 0, 0);
  let lastShown: string | null = null;
  try {
    lastShown = localStorage.getItem(LAST_SHOWN_KEY);
  } catch {
    lastShown = null;
  }
  // Already past today's time: fire now if today's reminder has not been shown, else tomorrow.
  if (next.getTime() <= now.getTime()) {
    if (lastShown !== localDayKey(now)) next.setTime(now.getTime() + 1000);
    else next.setDate(next.getDate() + 1);
  }
  timer = setTimeout(() => {
    const today = localDayKey(new Date());
    try {
      if (localStorage.getItem(LAST_SHOWN_KEY) !== today && !studiedToday() && Notification.permission === 'granted') {
        localStorage.setItem(LAST_SHOWN_KEY, today);
        const n = new Notification('Time to practice', {
          body: 'A few Quran words today is enough.',
          icon: '/images/icon-192.png',
          tag: PRACTICE_REMINDER_ID,
        });
        n.onclick = () => {
          window.focus();
          window.location.href = '/session/review';
        };
      }
    } catch {
      // Notification blocked or storage unavailable.
    }
    schedule(hour, minute);
  }, Math.min(next.getTime() - now.getTime(), 2 ** 31 - 1));
}

export async function syncPracticeReminder(
  settings: Pick<Settings, 'reminderEnabled' | 'reminderHour' | 'reminderMinute'>,
  options?: { requestPermission?: boolean },
): Promise<boolean> {
  await cancelPracticeReminder();
  if (!settings.reminderEnabled) return false;
  const allowed =
    options?.requestPermission === false ? await reminderPermissionGranted() : await requestReminderPermission();
  // On the web a missing permission should not turn the synced setting off; the phone may still
  // deliver it. Report success when the setting itself is valid.
  if (allowed) schedule(clampReminderHour(settings.reminderHour), clampReminderMinute(settings.reminderMinute));
  return true;
}
