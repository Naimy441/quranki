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
import { computeReachedLevel, getLevel, getWord, LAST_LEVEL_NUMBER, LEVELS, nextReachedLevel, type ProgressMap, type WordProgress } from '@/lib/levels';
import { syncPracticeReminder } from '@/lib/practice-reminder';
import { calendarDayKey, pruneStudyMsByDate, sanitizeStudyMsByDate, getStreakReclaimOpportunity } from '@/lib/stats';
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
  /** Milliseconds in memorization sessions, keyed by local calendar day. */
  studyMsByDate: Record<string, number>;
  onboardingCompleted: boolean;
  /** In-memory peek counts for the Quran reader (not persisted). A hidden word's first reveal
   *  is a free hint; the second reveal of that same vocab id lapses it. Cleared when the word
   *  is graded in a real review. */
  readerPeeks: Record<string, number>;
  hydrate: () => Promise<void>;
  /** Adds elapsed memorization-session time to the current local calendar day. */
  recordStudyMs: (ms: number) => void;
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
  completeOnboarding: (
    wordsPerSession: number,
    reminder?: { enabled: boolean; hour: number; minute: number },
  ) => Promise<void>;
  setOnboardingCompleted: (value: boolean) => void;
  resetProgress: () => void;
  masterAllWords: () => void;
  /** Dev-only: fills the last week with sample session times so the study-time UI can be checked. */
  seedDemoStudyTime: () => void;
  autoMasterWord: (wordId: string) => void;
  autoMasterWords: (wordIds: readonly string[]) => void;
  revertAutoMasteredWord: (wordId: string) => void;
  revertAutoMasteredWords: (wordIds: readonly string[]) => void;
}

function todayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Varied last-seven-days sample, oldest → today, in minutes. */
const DEMO_STUDY_MINUTES = [9, 16, 0, 21, 13, 19, 12];

function demoStudyMsByDate(now: Date = new Date()): Record<string, number> {
  const studyMsByDate: Record<string, number> = {};
  for (let i = 0; i < DEMO_STUDY_MINUTES.length; i += 1) {
    const minutes = DEMO_STUDY_MINUTES[i];
    if (minutes <= 0) continue;
    const date = new Date(now);
    date.setDate(date.getDate() - (DEMO_STUDY_MINUTES.length - 1 - i));
    studyMsByDate[calendarDayKey(date)] = minutes * 60_000;
  }
  return studyMsByDate;
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
    studyMsByDate?: Record<string, number>;
  },
): void {
  void saveMetaAsync({
    maxUnlockedLevel: state.maxUnlockedLevel,
    reviewDates: state.reviewDates,
    streakGraceDates: state.streakGraceDates,
    reviewCountDate: state.reviewCountDate,
    reviewsToday: state.reviewsToday,
    newCardsToday: state.newCardsToday,
    studyMsByDate: state.studyMsByDate ?? useProgressStore.getState().studyMsByDate,
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
  studyMsByDate: DEFAULT_META.studyMsByDate,
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
    const loadedStudyMs = sanitizeStudyMsByDate(meta.studyMsByDate, now);
    const studyMsByDate =
      __DEV__ && Object.keys(loadedStudyMs).length === 0 ? demoStudyMsByDate(now) : loadedStudyMs;
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
      studyMsByDate,
      onboardingCompleted,
    });
    void syncPracticeReminder(settings, { requestPermission: false }).then((scheduled) => {
      if (settings.reminderEnabled && !scheduled) {
        const nextSettings = { ...useProgressStore.getState().settings, reminderEnabled: false };
        useProgressStore.setState({ settings: nextSettings });
        void saveSettingsAsync(nextSettings);
      }
    });
    if (maxUnlockedLevel !== meta.maxUnlockedLevel || onboardingCompleted !== meta.onboardingCompleted) {
      persistMeta({
        maxUnlockedLevel,
        reviewDates: meta.reviewDates,
        streakGraceDates: meta.streakGraceDates,
        reviewCountDate,
        reviewsToday,
        newCardsToday,
        studyMsByDate,
        onboardingCompleted,
      });
    }
  },

  recordStudyMs: (ms) => {
    if (!Number.isFinite(ms) || ms <= 0) return;
    const now = new Date();
    const key = calendarDayKey(now);
    const state = get();
    const studyMsByDate = pruneStudyMsByDate({
      ...state.studyMsByDate,
      [key]: (state.studyMsByDate[key] ?? 0) + Math.round(ms),
    }, now);
    set({ studyMsByDate });
    persistMeta({ ...state, studyMsByDate });
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
    const nextMaxUnlockedLevel = nextReachedLevel(nextProgress, state.maxUnlockedLevel);
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
    if ('readerShowTranslation' in partial) nextSettings.readerShowTranslation = partial.readerShowTranslation === true;
    if ('readerShowAyahCoverage' in partial) nextSettings.readerShowAyahCoverage = partial.readerShowAyahCoverage === true;
    if ('readerTransliteration' in partial) nextSettings.readerTransliteration = partial.readerTransliteration === true;
    if ('reminderEnabled' in partial) nextSettings.reminderEnabled = partial.reminderEnabled === true;
    set({ settings: nextSettings });
    void saveSettingsAsync(nextSettings);
    if ('reminderEnabled' in partial || 'reminderHour' in partial || 'reminderMinute' in partial) {
      void syncPracticeReminder(nextSettings).then((scheduled) => {
        if (nextSettings.reminderEnabled && !scheduled) {
          const disabled = { ...get().settings, reminderEnabled: false };
          set({ settings: disabled });
          void saveSettingsAsync(disabled);
        }
      });
    }
  },

  completeOnboarding: async (wordsPerSession, reminder) => {
    const state = get();
    let nextSettings = {
      ...state.settings,
      wordsPerSession: clampWordsPerSession(wordsPerSession),
      reminderEnabled: reminder?.enabled === true,
      reminderHour: reminder?.hour ?? state.settings.reminderHour,
      reminderMinute: reminder?.minute ?? state.settings.reminderMinute,
    };
    if (nextSettings.reminderEnabled) {
      const scheduled = await syncPracticeReminder(nextSettings, { requestPermission: false });
      if (!scheduled) nextSettings = { ...nextSettings, reminderEnabled: false };
    } else {
      void syncPracticeReminder(nextSettings, { requestPermission: false });
    }
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
      studyMsByDate: {},
      readerPeeks: {},
      settings: DEFAULT_SETTINGS,
      onboardingCompleted,
    });
    void saveProgressAsync({});
    void saveMetaAsync({ ...DEFAULT_META, onboardingCompleted });
    void saveSettingsAsync(DEFAULT_SETTINGS);
  },

  /** Dev-only helper: instantly marks every word as mastered (Review state, last grade "good",
   *  due 30 days out) without playing through real reviews - lets the Quran reader's word-hiding
   *  feature be tested without grinding through the full curriculum. Not exposed in production. */
  seedDemoStudyTime: () => {
    const studyMsByDate = demoStudyMsByDate();
    set({ studyMsByDate });
    persistMeta({ ...get(), studyMsByDate });
  },

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

  /** Called when a study word is marked "known"
   *  in the Quran reader (see useKnownWordsStore) - fabricates the same kind of Review-state,
   *  due-in-30-days progress entry as `masterAllWords`, but for one word and tagged
   *  `autoMastered: true` so it can be safely undone later. Never overwrites *real* mastery
   *  (a card already in Review state from an actual Good/Easy grade) - marking a word you
   *  already know shouldn't ever erase real review history for that word. The displayed level
   *  only advances if this mark completes a consecutive prefix of fully mastered levels; a
   *  single later word does not jump the learner ahead. */
  autoMasterWord: (wordId) => {
    get().autoMasterWords([wordId]);
  },

  autoMasterWords: (wordIds) => {
    if (wordIds.length === 0) return;
    const state = get();
    let nextProgress: ProgressMap | undefined;
    const now = new Date();
    const due = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    const card = createNewCard(now);
    const serialized = serializeCard({
      ...card,
      state: State.Review,
      due,
      stability: 30,
      difficulty: 5,
      reps: 3,
      scheduled_days: 30,
      last_review: now,
    });
    const reviewedAt = now.toISOString();
    let nextPeeks = state.readerPeeks;
    for (const wordId of wordIds) {
      const existing = (nextProgress ?? state.progress)[wordId];
      if (existing && !existing.autoMastered && isWordMastered(deserializeCard(existing.card), existing.lastGrade)) {
        continue;
      }
      nextProgress ??= { ...state.progress };
      nextProgress[wordId] = {
        wordId,
        card: serialized,
        lastGrade: 'good',
        reviewedAt,
        autoMastered: true,
      };
      if (wordId in nextPeeks) {
        if (nextPeeks === state.readerPeeks) {
          const { [wordId]: _peek, ...rest } = nextPeeks;
          nextPeeks = rest;
        } else {
          delete nextPeeks[wordId];
        }
      }
    }
    if (!nextProgress) return;
    const nextMaxUnlockedLevel = computeReachedLevel(nextProgress);
    set({ progress: nextProgress, maxUnlockedLevel: nextMaxUnlockedLevel, readerPeeks: nextPeeks });
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
    get().revertAutoMasteredWords([wordId]);
  },

  revertAutoMasteredWords: (wordIds) => {
    if (wordIds.length === 0) return;
    const state = get();
    let nextProgress: ProgressMap | undefined;
    for (const wordId of wordIds) {
      if (state.progress[wordId]?.autoMastered !== true) continue;
      nextProgress ??= { ...state.progress };
      delete nextProgress[wordId];
    }
    if (!nextProgress) return;
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

if (__DEV__) {
  const state = useProgressStore.getState();
  if (state.hydrated) {
    const studyMsByDate = demoStudyMsByDate();
    useProgressStore.setState({ studyMsByDate });
    persistMeta({ ...useProgressStore.getState(), studyMsByDate });
  }
}
