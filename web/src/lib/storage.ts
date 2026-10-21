import type { ProgressMap } from '@/lib/levels';

export interface UserSettings {
  wordsPerSession: number;
  dailyReviewLimit: number;
  selectedReciterKey: string;
  readerArabicFontSize: number;
  readerTranslationFontSize: number;
  readerShowTranslation: boolean;
  readerShowWbwGloss: boolean;
  readerShowWbwTransliteration: boolean;
  readerShowTajweed: boolean;
  readerHideLearnedWords: boolean;
  canReadQuran?: boolean;
  theme: 'light' | 'dark' | 'system';
}

export const DEFAULT_SETTINGS: UserSettings = {
  wordsPerSession: 10,
  dailyReviewLimit: 100,
  selectedReciterKey: 'dosari-murattal',
  readerArabicFontSize: 32,
  readerTranslationFontSize: 16,
  readerShowTranslation: true,
  readerShowWbwGloss: true,
  readerShowWbwTransliteration: false,
  readerShowTajweed: true,
  readerHideLearnedWords: true,
  canReadQuran: true,
  theme: 'dark',
};

export interface Bookmark {
  surah: number;
  ayah: number;
}

export interface UserAccount {
  email: string;
  displayName?: string;
  createdAt: string;
}

export interface StoredData {
  progress: ProgressMap;
  maxUnlockedLevel: number;
  reviewDates: string[];
  studySeconds: number;
  bookmarks: Bookmark[];
  settings: UserSettings;
  account: UserAccount | null;
  hasCompletedOnboarding: boolean;
}

const STORAGE_KEY = 'quranki_web_data_v1';

export function loadStoredData(): StoredData {
  if (typeof window === 'undefined') {
    return {
      progress: {},
      maxUnlockedLevel: 1,
      reviewDates: [],
      studySeconds: 0,
      bookmarks: [],
      settings: DEFAULT_SETTINGS,
      account: null,
      hasCompletedOnboarding: false,
    };
  }

  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        progress: {},
        maxUnlockedLevel: 1,
        reviewDates: [],
        studySeconds: 0,
        bookmarks: [],
        settings: DEFAULT_SETTINGS,
        account: null,
        hasCompletedOnboarding: false,
      };
    }

    const parsed = JSON.parse(raw);
    return {
      progress: parsed.progress || {},
      maxUnlockedLevel: parsed.maxUnlockedLevel || 1,
      reviewDates: Array.isArray(parsed.reviewDates) ? parsed.reviewDates : [],
      studySeconds: parsed.studySeconds || 0,
      bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      account: parsed.account || null,
      hasCompletedOnboarding: Boolean(parsed.hasCompletedOnboarding),
    };
  } catch (e) {
    console.error('Failed to load storage data:', e);
    return {
      progress: {},
      maxUnlockedLevel: 1,
      reviewDates: [],
      studySeconds: 0,
      bookmarks: [],
      settings: DEFAULT_SETTINGS,
      account: null,
      hasCompletedOnboarding: false,
    };
  }
}

export function saveStoredData(data: StoredData): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Failed to save storage data:', e);
  }
}

export function getTodayKey(): string {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function computeStreak(reviewDates: string[]): number {
  if (!reviewDates || reviewDates.length === 0) return 0;
  const set = new Set(reviewDates);
  const today = getTodayKey();

  let streak = 0;
  const check = new Date();

  // If reviewed today, streak starts from today, otherwise check if reviewed yesterday
  if (set.has(today)) {
    streak = 1;
    check.setDate(check.getDate() - 1);
  } else {
    check.setDate(check.getDate() - 1);
    const yKey = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, '0')}-${String(
      check.getDate()
    ).padStart(2, '0')}`;
    if (!set.has(yKey)) {
      return 0;
    }
  }

  while (true) {
    const key = `${check.getFullYear()}-${String(check.getMonth() + 1).padStart(2, '0')}-${String(
      check.getDate()
    ).padStart(2, '0')}`;
    if (set.has(key)) {
      streak++;
      check.setDate(check.getDate() - 1);
    } else {
      break;
    }
  }

  return streak;
}
