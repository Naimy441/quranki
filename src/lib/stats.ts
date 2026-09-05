function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

const WEEKDAY_LETTERS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'] as const;
const WEEKDAY_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'] as const;
const STUDY_MS_KEEP_DAYS = 180;
const DAY_KEY_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Local calendar day (`YYYY-MM-DD`) for study-time totals. Streaks still use UTC `dayKey`. */
export function calendarDayKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function sanitizeStudyMsByDate(value: unknown, now: Date = new Date()): Record<string, number> {
  if (!value || typeof value !== 'object') return {};
  const next: Record<string, number> = {};
  for (const [key, ms] of Object.entries(value as Record<string, unknown>)) {
    if (!DAY_KEY_RE.test(key)) continue;
    const amount = Number(ms);
    if (!Number.isFinite(amount) || amount <= 0) continue;
    next[key] = Math.round(amount);
  }
  return pruneStudyMsByDate(next, now);
}

export function pruneStudyMsByDate(studyMsByDate: Record<string, number>, now: Date = new Date()): Record<string, number> {
  const cutoff = calendarDayKey(addDays(now, -(STUDY_MS_KEEP_DAYS - 1)));
  const next: Record<string, number> = {};
  for (const [key, ms] of Object.entries(studyMsByDate)) {
    if (key >= cutoff) next[key] = ms;
  }
  return next;
}

export function studyTimeForDay(studyMsByDate: Record<string, number>, now: Date = new Date()): number {
  return studyMsByDate[calendarDayKey(now)] ?? 0;
}

export interface StudyDay {
  key: string;
  ms: number;
  weekday: (typeof WEEKDAY_LETTERS)[number];
  isToday: boolean;
  /** `today`, `yesterday`, or a short weekday for the header after a bar is pressed. */
  caption: string;
}

export function studyTimeWeek(studyMsByDate: Record<string, number>, now: Date = new Date(), days = 7): StudyDay[] {
  const today = calendarDayKey(now);
  const yesterday = calendarDayKey(addDays(now, -1));
  const week: StudyDay[] = [];
  for (let offset = days - 1; offset >= 0; offset -= 1) {
    const date = addDays(now, -offset);
    const key = calendarDayKey(date);
    const isToday = key === today;
    week.push({
      key,
      ms: studyMsByDate[key] ?? 0,
      weekday: WEEKDAY_LETTERS[date.getDay()],
      isToday,
      caption: isToday ? 'today' : key === yesterday ? 'yesterday' : WEEKDAY_SHORT[date.getDay()],
    });
  }
  return week;
}

/** Compact clock for stat cards: `12m`, `1h`, `1h 20m`. */
export function formatStudyDuration(ms: number): string {
  if (!Number.isFinite(ms) || ms <= 0) return '0m';
  const totalMinutes = Math.floor(ms / 60_000);
  if (totalMinutes < 1) return '<1m';
  if (totalMinutes < 60) return `${totalMinutes}m`;
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  return minutes === 0 ? `${hours}h` : `${hours}h ${minutes}m`;
}

/** The length of the active streak that can be saved by studying today. */
export function getStreakReclaimOpportunity(
  reviewDates: string[],
  streakGraceDates: string[],
  now: Date = new Date(),
): number {
  const reviewed = new Set(reviewDates);
  const protectedDays = new Set(streakGraceDates);
  const yesterday = addDays(now, -1);

  if (reviewed.has(dayKey(now)) || reviewed.has(dayKey(yesterday)) || protectedDays.has(dayKey(yesterday))) return 0;

  return computeStreak(reviewDates, streakGraceDates, addDays(now, -2));
}

/** "1234567" -> "1,234,567". Hermes doesn't reliably ship full ICU data for
 *  `Number.prototype.toLocaleString`, so big counts (e.g. Quran word coverage) are formatted by
 *  hand instead of risking it silently falling back to no separators on-device. */
export function formatCount(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Calendar days to finish `wordsLeft` at the Settings new-words-per-day pace. */
export function daysAtPace(wordsLeft: number, wordsPerDay: number): number {
  if (!Number.isFinite(wordsLeft) || wordsLeft <= 0) return 0;
  const pace = Math.max(1, Math.round(Number.isFinite(wordsPerDay) ? wordsPerDay : 1));
  return Math.ceil(wordsLeft / pace);
}

export function formatDaysAtPace(days: number): string | undefined {
  if (days <= 0) return undefined;
  return days === 1 ? '1 day' : `${formatCount(days)} days`;
}

/** Consecutive calendar-day streak ending today (or yesterday, if today has no review yet).
 * A protected grace day keeps a run connected but does not add to its count. */
export function computeStreak(
  reviewDates: string[],
  streakGraceDates: string[] = [],
  now: Date = new Date(),
): number {
  const dates = new Set(reviewDates);
  const protectedDays = new Set(streakGraceDates);
  let cursor = now;
  if (!dates.has(dayKey(cursor)) && !protectedDays.has(dayKey(cursor))) {
    cursor = addDays(cursor, -1);
    if (!dates.has(dayKey(cursor)) && !protectedDays.has(dayKey(cursor))) return 0;
  }
  let streak = 0;
  while (dates.has(dayKey(cursor)) || protectedDays.has(dayKey(cursor))) {
    if (dates.has(dayKey(cursor))) streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
