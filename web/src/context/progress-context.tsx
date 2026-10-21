'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  createNewCard,
  deserializeCard,
  gradeCard,
  isWordMastered,
  serializeCard,
  type GradeName,
} from '@/lib/fsrs';
import {
  getLevel,
  LEVELS,
  type ProgressMap,
  type WordProgress,
} from '@/lib/levels';
import {
  computeStreak,
  DEFAULT_SETTINGS,
  getTodayKey,
  loadStoredData,
  saveStoredData,
  type Bookmark,
  type StoredData,
  type UserAccount,
  type UserSettings,
} from '@/lib/storage';

interface ProgressContextValue {
  hydrated: boolean;
  progress: ProgressMap;
  settings: UserSettings;
  account: UserAccount | null;
  hasCompletedOnboarding: boolean;
  maxUnlockedLevel: number;
  streak: number;
  studySeconds: number;
  bookmarks: Bookmark[];
  gradeWord: (wordId: string, grade: GradeName) => void;
  updateSettings: (partial: Partial<UserSettings>) => void;
  toggleBookmark: (surah: number, ayah: number) => void;
  isBookmarked: (surah: number, ayah: number) => boolean;
  recordStudySeconds: (secs: number) => void;
  resetProgress: () => void;
  autoMasterAllWords: () => void;
  exportDataJson: () => string;
  importDataJson: (json: string) => boolean;
  signIn: (email: string, password?: string) => Promise<boolean>;
  signUp: (email: string, password?: string, displayName?: string) => Promise<boolean>;
  signOut: () => void;
  completeOnboarding: (prefs?: { canReadQuran?: boolean; wordsPerSession?: number }) => void;
}

const ProgressContext = createContext<ProgressContextValue | null>(null);

export function ProgressProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<StoredData>(() => loadStoredData());
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    saveStoredData(data);
  }, [data, hydrated]);

  // Apply dark mode class to document element
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    if (data.settings.theme === 'dark') {
      root.classList.add('dark');
    } else if (data.settings.theme === 'light') {
      root.classList.remove('dark');
    } else {
      const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      if (isDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  }, [data.settings.theme, hydrated]);

  const streak = computeStreak(data.reviewDates);

  const gradeWord = (wordId: string, grade: GradeName) => {
    const existing = data.progress[wordId];
    const prevCard = existing ? deserializeCard(existing.card) : createNewCard();
    const { card: nextCard, reviewedAt } = gradeCard(prevCard, grade);

    const easyStreak = grade === 'easy' ? (existing?.easyStreak ?? 0) + 1 : 0;
    const wp: WordProgress = {
      wordId,
      card: serializeCard(nextCard),
      lastGrade: grade,
      reviewedAt: reviewedAt.toISOString(),
      easyStreak,
    };

    const nextProgress = {
      ...data.progress,
      [wordId]: wp,
    };

    // Add today to review dates if not already present
    const today = getTodayKey();
    const reviewDates = data.reviewDates.includes(today)
      ? data.reviewDates
      : [...data.reviewDates, today];

    // Check if maxUnlockedLevel can advance
    let maxUnlocked = data.maxUnlockedLevel;
    const currentLvl = getLevel(maxUnlocked);
    if (currentLvl) {
      const allMastered = currentLvl.words.every((w) => {
        if (w.kind === 'grammar') return true;
        const p = nextProgress[w.id];
        return p && isWordMastered(deserializeCard(p.card));
      });
      if (allMastered && maxUnlocked < LEVELS.length) {
        maxUnlocked += 1;
      }
    }

    setData((prev) => ({
      ...prev,
      progress: nextProgress,
      reviewDates,
      maxUnlockedLevel: maxUnlocked,
    }));
  };

  const updateSettings = (partial: Partial<UserSettings>) => {
    setData((prev) => ({
      ...prev,
      settings: { ...prev.settings, ...partial },
    }));
  };

  const toggleBookmark = (surah: number, ayah: number) => {
    setData((prev) => {
      const exists = prev.bookmarks.some((b) => b.surah === surah && b.ayah === ayah);
      const bookmarks = exists
        ? prev.bookmarks.filter((b) => !(b.surah === surah && b.ayah === ayah))
        : [...prev.bookmarks, { surah, ayah }];
      return { ...prev, bookmarks };
    });
  };

  const isBookmarked = (surah: number, ayah: number): boolean => {
    return data.bookmarks.some((b) => b.surah === surah && b.ayah === ayah);
  };

  const recordStudySeconds = (secs: number) => {
    setData((prev) => ({
      ...prev,
      studySeconds: prev.studySeconds + secs,
    }));
  };

  const resetProgress = () => {
    setData((prev) => ({
      ...prev,
      progress: {},
      maxUnlockedLevel: 1,
      reviewDates: [],
      studySeconds: 0,
      bookmarks: [],
    }));
  };

  const autoMasterAllWords = () => {
    const nextProgress: ProgressMap = { ...data.progress };
    const sampleWords = LEVELS.slice(0, 2).flatMap((l) => l.words.filter((w) => w.kind !== 'grammar'));

    for (const w of sampleWords) {
      const { card, reviewedAt } = gradeCard(createNewCard(), 'easy');
      nextProgress[w.id] = {
        wordId: w.id,
        card: serializeCard(card),
        lastGrade: 'easy',
        reviewedAt: reviewedAt.toISOString(),
        easyStreak: 2,
        autoMastered: true,
      };
    }

    setData((prev) => ({
      ...prev,
      progress: nextProgress,
      maxUnlockedLevel: 2,
      reviewDates: prev.reviewDates.includes(getTodayKey())
        ? prev.reviewDates
        : [...prev.reviewDates, getTodayKey()],
    }));
  };

  const signIn = async (email: string): Promise<boolean> => {
    const account: UserAccount = {
      email,
      displayName: email.split('@')[0],
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, account }));
    return true;
  };

  const signUp = async (email: string, _password?: string, displayName?: string): Promise<boolean> => {
    const account: UserAccount = {
      email,
      displayName: displayName || email.split('@')[0],
      createdAt: new Date().toISOString(),
    };
    setData((prev) => ({ ...prev, account, hasCompletedOnboarding: true }));
    return true;
  };

  const signOut = () => {
    setData((prev) => ({ ...prev, account: null }));
  };

  const completeOnboarding = (prefs?: { canReadQuran?: boolean; wordsPerSession?: number }) => {
    setData((prev) => ({
      ...prev,
      hasCompletedOnboarding: true,
      settings: {
        ...prev.settings,
        ...(prefs?.canReadQuran !== undefined ? { canReadQuran: prefs.canReadQuran } : {}),
        ...(prefs?.wordsPerSession !== undefined ? { wordsPerSession: prefs.wordsPerSession } : {}),
      },
    }));
  };

  const exportDataJson = (): string => {
    return JSON.stringify(data, null, 2);
  };

  const importDataJson = (json: string): boolean => {
    try {
      const parsed = JSON.parse(json);
      if (typeof parsed !== 'object' || !parsed) return false;
      setData({
        progress: parsed.progress || {},
        maxUnlockedLevel: parsed.maxUnlockedLevel || 1,
        reviewDates: Array.isArray(parsed.reviewDates) ? parsed.reviewDates : [],
        studySeconds: parsed.studySeconds || 0,
        bookmarks: Array.isArray(parsed.bookmarks) ? parsed.bookmarks : [],
        settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
        account: parsed.account || null,
        hasCompletedOnboarding: Boolean(parsed.hasCompletedOnboarding),
      });
      return true;
    } catch {
      return false;
    }
  };

  return (
    <ProgressContext.Provider
      value={{
        hydrated,
        progress: data.progress,
        settings: data.settings,
        account: data.account,
        hasCompletedOnboarding: data.hasCompletedOnboarding,
        maxUnlockedLevel: data.maxUnlockedLevel,
        streak,
        studySeconds: data.studySeconds,
        bookmarks: data.bookmarks,
        gradeWord,
        updateSettings,
        toggleBookmark,
        isBookmarked,
        recordStudySeconds,
        resetProgress,
        autoMasterAllWords,
        exportDataJson,
        importDataJson,
        signIn,
        signUp,
        signOut,
        completeOnboarding,
      }}
    >
      {children}
    </ProgressContext.Provider>
  );
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error('useProgress must be used within a ProgressProvider');
  return ctx;
}
