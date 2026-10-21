'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  createNewCard,
  createMasteredCard,
  deserializeCard,
  gradeCard,
  isWordMastered,
  serializeCard,
  type GradeName,
} from '@/lib/fsrs';
import {
  computeReachedLevel,
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
import {
  loadAccountSession,
  signInWithPassword,
  signOutAccount,
  signUpWithPassword,
  type AccountSession,
} from '@/lib/account-auth';
import { pullCloudSnapshot, pushCloudSnapshot } from '@/lib/account-sync';

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
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  syncNow: () => Promise<void>;
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
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const pushTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Sync cloud data with local data
  const syncCloud = async (overrideSession?: AccountSession | null): Promise<boolean> => {
    const session = overrideSession ?? loadAccountSession();
    if (!session) return false;
    setIsSyncing(true);
    try {
      const remote = await pullCloudSnapshot();
      if (remote) {
        setData((prev) => {
          // Merge words from remote
          const now = new Date();
          const nextProgress: ProgressMap = { ...prev.progress };

          for (const wordId of remote.wordIds) {
            const existing = nextProgress[wordId];
            if (existing) {
              const card = deserializeCard(existing.card);
              if (isWordMastered(card, existing.lastGrade)) continue;
            }
            nextProgress[wordId] = {
              wordId,
              card: createMasteredCard(now),
              lastGrade: 'good',
              reviewedAt: now.toISOString(),
              easyStreak: 2,
              autoMastered: true,
            };
          }

          const maxUnlocked = computeReachedLevel(nextProgress);

          // Merge review dates
          const reviewDatesSet = new Set([...prev.reviewDates, ...remote.reviewDates]);
          const nextReviewDates = Array.from(reviewDatesSet).sort();

          // Merge bookmarks
          const remoteBookmarks = (remote.quranMarks?.bookmarks || [])
            .map((b) => ({
              surah: Number(b.surah),
              ayah: Number(b.ayah),
            }))
            .filter((b) => b.surah > 0 && b.ayah > 0);

          const bmSet = new Set(prev.bookmarks.map((b) => `${b.surah}:${b.ayah}`));
          const nextBookmarks = [...prev.bookmarks];
          for (const rb of remoteBookmarks) {
            const key = `${rb.surah}:${rb.ayah}`;
            if (!bmSet.has(key)) {
              bmSet.add(key);
              nextBookmarks.push(rb);
            }
          }

          // Merge settings
          const nextSettings: UserSettings = {
            ...prev.settings,
            ...(remote.settings || {}),
          };

          // Study seconds (max of local or remote ms/1000)
          const remoteTotalStudySecs = Math.round(
            Object.values(remote.studyMsByDate || {}).reduce(
              (acc, ms) => acc + (typeof ms === 'number' ? ms : 0),
              0
            ) / 1000
          );
          const nextStudySeconds = Math.max(prev.studySeconds, remoteTotalStudySecs);

          const nextHasCompletedOnboarding = prev.hasCompletedOnboarding || remote.onboardingCompleted;

          const nextData: StoredData = {
            ...prev,
            progress: nextProgress,
            maxUnlockedLevel: Math.max(prev.maxUnlockedLevel, maxUnlocked),
            reviewDates: nextReviewDates,
            bookmarks: nextBookmarks,
            settings: nextSettings,
            studySeconds: nextStudySeconds,
            hasCompletedOnboarding: nextHasCompletedOnboarding,
            account: {
              email: session.email,
              displayName: session.displayName || session.email.split('@')[0],
              createdAt: new Date().toISOString(),
            },
          };

          // Push merged snapshot back to cloud to keep everything coherent
          void pushCloudSnapshot({
            wordIds: Object.keys(nextProgress),
            settings: nextSettings,
            bookmarks: nextBookmarks,
            reviewDates: nextReviewDates,
            studySeconds: nextStudySeconds,
            hasCompletedOnboarding: nextHasCompletedOnboarding,
          }).catch((e) => console.warn('Background push after sync failed:', e));

          return nextData;
        });
      } else {
        // Remote document does not exist yet: push initial local progress
        setData((prev) => {
          void pushCloudSnapshot({
            wordIds: Object.keys(prev.progress),
            settings: prev.settings,
            bookmarks: prev.bookmarks,
            reviewDates: prev.reviewDates,
            studySeconds: prev.studySeconds,
            hasCompletedOnboarding: prev.hasCompletedOnboarding,
          }).catch((e) => console.warn('Initial push for new account failed:', e));

          return {
            ...prev,
            account: {
              email: session.email,
              displayName: session.displayName || session.email.split('@')[0],
              createdAt: new Date().toISOString(),
            },
          };
        });
      }
      setLastSyncedAt(new Date());
      return true;
    } catch (e) {
      console.warn('Failed to sync with cloud:', e);
      return false;
    } finally {
      setIsSyncing(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      setHydrated(true);
      const session = loadAccountSession();
      if (session) {
        void syncCloud(session);
      } else {
        setData((prev) => (prev.account ? { ...prev, account: null } : prev));
      }
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Save to local storage and debounce push to cloud when signed in
  useEffect(() => {
    if (!hydrated) return;
    saveStoredData(data);

    const session = loadAccountSession();
    if (!session) return;

    if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    pushTimerRef.current = setTimeout(() => {
      pushTimerRef.current = null;
      void pushCloudSnapshot({
        wordIds: Object.keys(data.progress),
        settings: data.settings,
        bookmarks: data.bookmarks,
        reviewDates: data.reviewDates,
        studySeconds: data.studySeconds,
        hasCompletedOnboarding: data.hasCompletedOnboarding,
      })
        .then(() => setLastSyncedAt(new Date()))
        .catch((err) => console.warn('Debounced cloud push failed:', err));
    }, 2500);

    return () => {
      if (pushTimerRef.current) clearTimeout(pushTimerRef.current);
    };
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

  const signIn = async (email: string, password?: string): Promise<boolean> => {
    if (!password) throw new Error('Enter a password.');
    const session = await signInWithPassword(email, password);
    await syncCloud(session);
    return true;
  };

  const signUp = async (email: string, password?: string, displayName?: string): Promise<boolean> => {
    if (!password) throw new Error('Enter a password.');
    const session = await signUpWithPassword(email, password, displayName);
    await syncCloud(session);
    return true;
  };

  const signOut = () => {
    signOutAccount();
    setData((prev) => ({ ...prev, account: null }));
  };

  const syncNow = async () => {
    await syncCloud();
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
        isSyncing,
        lastSyncedAt,
        syncNow,
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
