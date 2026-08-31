import { create } from 'zustand';

import {
  createNewCard,
  deserializeCard,
  gradeCard,
  isWordMastered,
  serializeCard,
  State,
  type Card,
  type GradeName,
} from '@/lib/fsrs';
import { computeReachedLevel, getLevel, getWord, LAST_LEVEL_NUMBER, LEVELS, type ProgressMap, type WordProgress } from '@/lib/levels';
import { getStreakReclaimOpportunity } from '@/lib/stats';
import {
  clampWordsPerSession,
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
  streakGraceDates: string[];
  reviewCountDate: string;
  reviewsToday: number;
  newCardsToday: number;
  onboardingCompleted: boolean;
  /** In-memory peek counts for the Qur'an reader (not persisted). A hidden word's first reveal
   *  is a free hint; the second reveal of that same vocab id lapses it. Cleared when the word
   *  is graded in a real review. */
  readerPeeks: Record<string, number>;
  hydrate: () => Promise<void>;
  /** Returns the resulting (post-grade) card so callers - see session-runner.tsx - can tell
   *  whether it graduated to the long-term Review state or is still Learning/Relearning (due
   *  again within minutes, per ts-fsrs's learning_steps/relearning_steps), the same distinction
   *  Anki uses to decide whether a card needs to resurface later in *this* sitting. */
  gradeWord: (wordId: string, grade: GradeName) => Card;
  /** Increments and returns the number of times this vocab id has been peeked (hidden → shown)
   *  in the reader since the last real passing grade. */
  noteReaderPeek: (wordId: string) => number;
  /** Drops the in-memory peek count so a word can hide again (e.g. after marking it known). */
  clearReaderPeek: (wordId: string) => void;
  updateSettings: (partial: Partial<Settings>) => void;
  completeOnboarding: (wordsPerSession: number) => void;
  setOnboardingCompleted: (value: boolean) => void;
  resetProgress: () => void;
  masterAllWords: () => void;
  autoMasterWord: (wordId: string) => void;
  revertAutoMasteredWord: (wordId: string) => void;
}

function todayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** How many Review-state cards have already been graded today - used to leave only
 *  DAILY_REVIEW_LIMIT - this many review slots in the next session queue. */
export function reviewsCompletedToday(reviewCountDate: string, reviewsToday: number, now: Date = new Date()): number {
  return reviewCountDate === todayKey(now) ? reviewsToday : 0;
}

export function newCardsCompletedToday(reviewCountDate: string, newCardsToday: number, now: Date = new Date()): number {
  return reviewCountDate === todayKey(now) ? newCardsToday : 0;
}

function persistMeta(
  state: Pick<ProgressState, 'maxUnlockedLevel' | 'reviewDates' | 'streakGraceDates' | 'reviewCountDate' | 'reviewsToday' | 'newCardsToday'> & {
    onboardingCompleted?: boolean;
  },
): void {
  void saveMetaAsync({
    maxUnlockedLevel: state.maxUnlockedLevel,
    reviewDates: state.reviewDates,
    streakGraceDates: state.streakGraceDates,
    reviewCountDate: state.reviewCountDate,
    reviewsToday: state.reviewsToday,
    newCardsToday: state.newCardsToday,
    onboardingCompleted: state.onboardingCompleted ?? getOnboardingCompleted(),
  });
}

function getOnboardingCompleted(): boolean {
  return useProgressStore.getState().onboardingCompleted;
}

export const useProgressStore = create<ProgressState>((set, get) => ({
  hydrated: false,
  hydrating: false,
  progress: {},
  settings: DEFAULT_SETTINGS,
  maxUnlockedLevel: DEFAULT_META.maxUnlockedLevel,
  reviewDates: DEFAULT_META.reviewDates,
  streakGraceDates: DEFAULT_META.streakGraceDates,
  reviewCountDate: DEFAULT_META.reviewCountDate,
  reviewsToday: DEFAULT_META.reviewsToday,
  newCardsToday: DEFAULT_META.newCardsToday,
  onboardingCompleted: false,
  readerPeeks: {},

  hydrate: async () => {
    if (get().hydrated || get().hydrating) return;
    set({ hydrating: true });
    const [progress, settings, meta] = await Promise.all([
      loadProgressAsync(),
      loadSettingsAsync(),
      loadMetaAsync(),
    ]);
    const maxUnlockedLevel = computeReachedLevel(progress);
    const now = new Date();
    const reviewsToday = reviewsCompletedToday(meta.reviewCountDate, meta.reviewsToday ?? 0, now);
    const newCardsToday = newCardsCompletedToday(meta.reviewCountDate, meta.newCardsToday ?? 0, now);
    const reviewCountDate = reviewsToday > 0 || newCardsToday > 0 ? meta.reviewCountDate : todayKey(now);
    const onboardingCompleted =
      meta.onboardingCompleted ?? (Object.keys(progress).length > 0 || meta.reviewDates.length > 0);
    set({
      hydrated: true,
      hydrating: false,
      progress,
      settings,
      maxUnlockedLevel,
      reviewDates: meta.reviewDates,
      streakGraceDates: meta.streakGraceDates,
      reviewCountDate,
      reviewsToday,
      newCardsToday,
      onboardingCompleted,
    });
    if (maxUnlockedLevel !== meta.maxUnlockedLevel || onboardingCompleted !== meta.onboardingCompleted) {
      persistMeta({
        maxUnlockedLevel,
        reviewDates: meta.reviewDates,
        streakGraceDates: meta.streakGraceDates,
        reviewCountDate,
        reviewsToday,
        newCardsToday,
        onboardingCompleted,
      });
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
    const reclaimableStreak = getStreakReclaimOpportunity(state.reviewDates, state.streakGraceDates, now);
    const missedDay = todayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1));
    const nextStreakGraceDates =
      reclaimableStreak > 0 && !state.streakGraceDates.includes(missedDay)
        ? [...state.streakGraceDates, missedDay]
        : state.streakGraceDates;
    const nextMaxUnlockedLevel = computeReachedLevel(nextProgress);
    const countsAsDailyReview = existing !== undefined && card.state === State.Review;
    const isNewIntroduction = existing === undefined && getWord(wordId)?.kind !== 'grammar';
    const reviewsToday = (state.reviewCountDate === key ? state.reviewsToday : 0) + (countsAsDailyReview ? 1 : 0);
    const newCardsToday = (state.reviewCountDate === key ? state.newCardsToday : 0) + (isNewIntroduction ? 1 : 0);

    // Again (including a reader lapse) leaves the peek count in place so every occurrence stays
    // unhidden while the card is still Learning. A passing grade wipes it so the word can hide
    // again once it's supposed to be known.
    const readerPeeks =
      grade === 'again' ? state.readerPeeks : Object.fromEntries(Object.entries(state.readerPeeks).filter(([id]) => id !== wordId));

    set({
      progress: nextProgress,
      reviewDates: nextReviewDates,
      streakGraceDates: nextStreakGraceDates,
      maxUnlockedLevel: nextMaxUnlockedLevel,
      reviewCountDate: key,
      reviewsToday,
      newCardsToday,
      readerPeeks,
    });
    void saveProgressAsync(nextProgress);
    persistMeta({
      maxUnlockedLevel: nextMaxUnlockedLevel,
      reviewDates: nextReviewDates,
      streakGraceDates: nextStreakGraceDates,
      reviewCountDate: key,
      reviewsToday,
      newCardsToday,
    });
    return nextCard;
  },

  noteReaderPeek: (wordId) => {
    const next = (get().readerPeeks[wordId] ?? 0) + 1;
    set({ readerPeeks: { ...get().readerPeeks, [wordId]: next } });
    return next;
  },

  clearReaderPeek: (wordId) => {
    if (!(wordId in get().readerPeeks)) return;
    const { [wordId]: _peek, ...readerPeeks } = get().readerPeeks;
    set({ readerPeeks });
  },

  updateSettings: (partial) => {
    const nextSettings = { ...get().settings, ...partial };
    set({ settings: nextSettings });
    void saveSettingsAsync(nextSettings);
  },

  completeOnboarding: (wordsPerSession) => {
    const state = get();
    const nextSettings = { ...state.settings, wordsPerSession: clampWordsPerSession(wordsPerSession) };
    set({ settings: nextSettings, onboardingCompleted: true });
    void saveSettingsAsync(nextSettings);
    persistMeta({ ...state, onboardingCompleted: true });
  },

  setOnboardingCompleted: (value) => {
    set({ onboardingCompleted: value });
    persistMeta({ ...get(), onboardingCompleted: value });
  },

  resetProgress: () => {
    const onboardingCompleted = get().onboardingCompleted;
    set({
      progress: {},
      maxUnlockedLevel: 1,
      reviewDates: [],
      streakGraceDates: [],
      reviewCountDate: '',
      reviewsToday: 0,
      newCardsToday: 0,
      readerPeeks: {},
      settings: DEFAULT_SETTINGS,
      onboardingCompleted,
    });
    void saveProgressAsync({});
    void saveMetaAsync({ ...DEFAULT_META, onboardingCompleted });
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
        if (word.kind === 'grammar') continue;
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
    set({ progress: nextProgress, maxUnlockedLevel: LAST_LEVEL_NUMBER });
    void saveProgressAsync(nextProgress);
    persistMeta({ ...get(), maxUnlockedLevel: LAST_LEVEL_NUMBER });
  },

  /** Called when a curated study word (one matching the 547-word id pattern) is marked "known"
   *  in the Qur'an reader (see useKnownWordsStore) - fabricates the same kind of Review-state,
   *  due-in-30-days progress entry as `masterAllWords`, but for one word and tagged
   *  `autoMastered: true` so it can be safely undone later. Never overwrites *real* mastery
   *  (a card already in Review state from an actual Good/Easy grade) - marking a word you
   *  already know shouldn't ever erase real review history for that word. The displayed level
   *  only advances if this mark completes a consecutive prefix of fully mastered levels; a
   *  single later word does not jump the learner ahead. */
  autoMasterWord: (wordId) => {
    const state = get();
    const existing = state.progress[wordId];
    if (existing && !existing.autoMastered && isWordMastered(deserializeCard(existing.card), existing.lastGrade)) {
      return;
    }

    const now = new Date();
    const due = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const card = createNewCard(now);
    const nextWordProgress: WordProgress = {
      wordId,
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
      autoMastered: true,
    };

    const nextProgress: ProgressMap = { ...state.progress, [wordId]: nextWordProgress };
    const nextMaxUnlockedLevel = computeReachedLevel(nextProgress);
    const { [wordId]: _peek, ...readerPeeks } = state.readerPeeks;
    set({ progress: nextProgress, maxUnlockedLevel: nextMaxUnlockedLevel, readerPeeks });
    void saveProgressAsync(nextProgress);
    persistMeta({ ...state, maxUnlockedLevel: nextMaxUnlockedLevel });
  },

  /** Undoes `autoMasterWord` - only when that fabricated entry is still in place untouched. If
   *  the word was later actually reviewed (which always writes a fresh entry without the
   *  `autoMastered` flag) or was never auto-mastered to begin with, this is a no-op: real review
   *  history is never deleted by "forgetting" an unrelated known-word mark. Recomputes the
   *  displayed level from the remaining consecutive mastered prefix, so forgetting the last
   *  word of a completed level can move the current level back. */
  revertAutoMasteredWord: (wordId) => {
    const state = get();
    if (state.progress[wordId]?.autoMastered !== true) return;
    const nextProgress = { ...state.progress };
    delete nextProgress[wordId];
    const nextMaxUnlockedLevel = computeReachedLevel(nextProgress);
    set({ progress: nextProgress, maxUnlockedLevel: nextMaxUnlockedLevel });
    void saveProgressAsync(nextProgress);
    persistMeta({ ...state, maxUnlockedLevel: nextMaxUnlockedLevel });
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
