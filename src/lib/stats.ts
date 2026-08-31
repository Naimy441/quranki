function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
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
