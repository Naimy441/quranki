import { create } from 'zustand';

import { createNewCard, deserializeCard, gradeCard, serializeCard, State, type GradeName } from '@/lib/fsrs';
import { computeMaxUnlockedLevel, getLevel, LEVEL_COUNT, LEVELS, type ProgressMap, type WordProgress } from '@/lib/levels';
import {
  DEFAULT_META,
  DEFAULT_SETTINGS,
  loadMetaAsync,
  loadProgressAsync,
  loadSettingsAsync,
  saveMetaAsync,
  saveProgressAsync,
  saveSettingsAsync,
  type Settings,
} from '@/lib/storage';

interface ProgressState {
  hydrated: boolean;
  hydrating: boolean;
  progress: ProgressMap;
  settings: Settings;
  maxUnlockedLevel: number;
  reviewDates: string[];
  hydrate: () => Promise<void>;
  gradeWord: (wordId: string, grade: GradeName) => void;
  updateSettings: (partial: Partial<Settings>) => void;
  resetProgress: () => void;
  masterAllWords: () => void;
}

function todayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  hydrated: false,
  hydrating: false,
  progress: {},
  settings: DEFAULT_SETTINGS,
  maxUnlockedLevel: DEFAULT_META.maxUnlockedLevel,
  reviewDates: DEFAULT_META.reviewDates,

  hydrate: async () => {
    if (get().hydrated || get().hydrating) return;
    set({ hydrating: true });
    const [progress, settings, meta] = await Promise.all([
      loadProgressAsync(),
      loadSettingsAsync(),
      loadMetaAsync(),
    ]);
    const maxUnlockedLevel = computeMaxUnlockedLevel(progress, new Date(), meta.maxUnlockedLevel);
    set({
      hydrated: true,
      hydrating: false,
      progress,
      settings,
      maxUnlockedLevel,
      reviewDates: meta.reviewDates,
    });
    if (maxUnlockedLevel !== meta.maxUnlockedLevel) {
      void saveMetaAsync({ maxUnlockedLevel, reviewDates: meta.reviewDates });
    }
  },

  gradeWord: (wordId, grade) => {
    const now = new Date();
    const state = get();
    const existing = state.progress[wordId];
    const card = existing ? deserializeCard(existing.card) : createNewCard(now);
    const { card: nextCard } = gradeCard(card, grade, now);

    const nextWordProgress: WordProgress = {
      wordId,
      card: serializeCard(nextCard),
      lastGrade: grade,
      reviewedAt: now.toISOString(),
    };

    const nextProgress: ProgressMap = { ...state.progress, [wordId]: nextWordProgress };
    const key = todayKey(now);
    const nextReviewDates = state.reviewDates.includes(key) ? state.reviewDates : [...state.reviewDates, key];
    const nextMaxUnlockedLevel = computeMaxUnlockedLevel(nextProgress, now, state.maxUnlockedLevel);

    set({ progress: nextProgress, reviewDates: nextReviewDates, maxUnlockedLevel: nextMaxUnlockedLevel });
    void saveProgressAsync(nextProgress);
    void saveMetaAsync({ maxUnlockedLevel: nextMaxUnlockedLevel, reviewDates: nextReviewDates });
  },

  updateSettings: (partial) => {
    const nextSettings = { ...get().settings, ...partial };
    set({ settings: nextSettings });
    void saveSettingsAsync(nextSettings);
  },

  resetProgress: () => {
    set({ progress: {}, maxUnlockedLevel: 1, reviewDates: [], settings: DEFAULT_SETTINGS });
    void saveProgressAsync({});
    void saveMetaAsync(DEFAULT_META);
    void saveSettingsAsync(DEFAULT_SETTINGS);
  },

  /** Dev-only helper: instantly marks every word as mastered (Review state, last grade "good",
   *  due 30 days out) without playing through real reviews - lets the Qur'an reader's word-hiding
   *  feature be tested without grinding through the full curriculum. Not exposed in production. */
  masterAllWords: () => {
    const now = new Date();
    const due = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const nextProgress: ProgressMap = {};
    for (const level of LEVELS) {
      for (const word of level.words) {
        const card = createNewCard(now);
        nextProgress[word.id] = {
          wordId: word.id,
          card: serializeCard({
            ...card,
            state: State.Review,
            due,
            stability: 30,
            difficulty: 5,
            reps: 3,
            scheduled_days: 30,
            last_review: now,
          }),
          lastGrade: 'good',
          reviewedAt: now.toISOString(),
        };
      }
    }
    set({ progress: nextProgress, maxUnlockedLevel: LEVEL_COUNT });
    void saveProgressAsync(nextProgress);
    void saveMetaAsync({ maxUnlockedLevel: LEVEL_COUNT, reviewDates: get().reviewDates });
  },
}));

/** True if `levelNumber` just became newly unlocked as a result of the most recent grade. */
export function didUnlockLevel(previousMax: number, nextMax: number, levelNumber: number): boolean {
  return levelNumber > previousMax && levelNumber <= nextMax;
}

export function isLevelUnlocked(levelNumber: number, maxUnlockedLevel: number): boolean {
  return levelNumber <= maxUnlockedLevel;
}

export function levelExists(levelNumber: number): boolean {
  return Boolean(getLevel(levelNumber));
}
