function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function addDays(date: Date, delta: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + delta);
  return next;
}

/** "1234567" -> "1,234,567". Hermes doesn't reliably ship full ICU data for
 *  `Number.prototype.toLocaleString`, so big counts (e.g. Qur'an word coverage) are formatted by
 *  hand instead of risking it silently falling back to no separators on-device. */
export function formatCount(n: number): string {
  return n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

/** Consecutive-day streak ending today (or yesterday, if today has no review yet). */
export function computeStreak(reviewDates: string[], now: Date = new Date()): number {
  const dates = new Set(reviewDates);
  let cursor = now;
  if (!dates.has(dayKey(cursor))) {
    cursor = addDays(cursor, -1);
    if (!dates.has(dayKey(cursor))) return 0;
  }
  let streak = 0;
  while (dates.has(dayKey(cursor))) {
    streak += 1;
    cursor = addDays(cursor, -1);
  }
  return streak;
}
