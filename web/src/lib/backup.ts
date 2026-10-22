/**
 * Web-only backup file: every persisted store under the same storage keys the mobile app uses,
 * so a restore is exactly what those stores would load.
 */
import AsyncStorage from '@/lib/async-storage';

const KEYS = [
  'quranki:progress:v1',
  'quranki:settings:v1',
  'quranki:meta:v1',
  'quranki:known-words:v2',
  'quranki:quran-marks:v1',
  'quranki:hifz:v1',
];

export async function exportBackup(): Promise<string> {
  const data: Record<string, unknown> = {};
  for (const key of KEYS) {
    const raw = await AsyncStorage.getItem(key);
    if (raw) data[key] = JSON.parse(raw);
  }
  return JSON.stringify({ app: 'quranki', version: 3, exportedAt: new Date().toISOString(), data }, null, 2);
}

export async function importBackup(json: string): Promise<boolean> {
  try {
    const parsed = JSON.parse(json) as { data?: Record<string, unknown> };
    if (!parsed?.data || typeof parsed.data !== 'object') return false;
    const entries = Object.entries(parsed.data).filter(([key]) => KEYS.includes(key));
    if (entries.length === 0) return false;
    for (const [key, value] of entries) await AsyncStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}
