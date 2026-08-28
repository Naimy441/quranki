import quranicWordsData from '@/data/quranic-words.json';
import { deserializeCard, isCardDue, isWordMastered, shouldHideInReader, State, type GradeName, type SerializedCard } from '@/lib/fsrs';
import { getWordOccurrenceCount, TOTAL_QURAN_WORDS } from '@/lib/quran-coverage';

export interface Word {
  id: string;
  arabic: string;
  english: string;
}

export interface Level {
  number: number;
  id: string;
  title: string;
  words: Word[];
}

export interface WordProgress {
  wordId: string;
  card: SerializedCard;
  lastGrade: GradeName | null;
  reviewedAt: string;
  /** True only when this progress entry was fabricated by marking the word "known" in the
   *  Qur'an reader (see useKnownWordsStore), rather than earned through a real flashcard review.
   *  Lets "forget this word" safely undo *only* that fabricated mastery - a real review always
   *  writes a fresh entry without this flag, so genuine progress is never at risk of being wiped
   *  by an unrelated "forget" action. */
  autoMastered?: boolean;
}

export type ProgressMap = Record<string, WordProgress>;

const data = quranicWordsData as { deck: string; levelCount: number; wordCount: number; levels: Level[] };

export const DECK_NAME = data.deck;
export const LEVEL_COUNT = data.levelCount;
export const WORD_COUNT = data.wordCount;
export const LEVELS: Level[] = data.levels;
/** Levels 1–47 are the original thematic curriculum; 48+ are frequency leftovers. */
export const THEMATIC_LEVEL_COUNT = 47;
/** Study-word count in the thematic curriculum (levels 1–47). */
export const THEMATIC_WORD_COUNT = LEVELS.slice(0, THEMATIC_LEVEL_COUNT).reduce(
  (sum, level) => sum + level.words.length,
  0,
);

const wordIndex = new Map<string, { word: Word; level: Level }>();
for (const level of LEVELS) {
  for (const word of level.words) {
    wordIndex.set(word.id, { word, level });
  }
}

export interface LevelCoverage {
  /** Qur'an tokens covered if every study word through this level is known. */
  quranWords: number;
  percent: number;
}

const coverageThroughLevel: LevelCoverage[] = [];
{
  let running = 0;
  for (const level of LEVELS) {
    for (const word of level.words) running += getWordOccurrenceCount(word.id);
    const percent = TOTAL_QURAN_WORDS === 0 ? 0 : Math.round((running / TOTAL_QURAN_WORDS) * 100);
    coverageThroughLevel[level.number] = { quranWords: running, percent };
  }
}

/** Qur'an-text coverage the learner would have after mastering every word through `levelNumber`. */
export function getCoverageThroughLevel(levelNumber: number): LevelCoverage {
  return coverageThroughLevel[levelNumber] ?? { quranWords: 0, percent: 0 };
}

export function getLevel(levelNumber: number): Level | undefined {
  return LEVELS[levelNumber - 1];
}

export function getWord(wordId: string): Word | undefined {
  return wordIndex.get(wordId)?.word;
}

export function getLevelForWord(wordId: string): Level | undefined {
  return wordIndex.get(wordId)?.level;
}

export interface WordState {
  word: Word;
  progress: WordProgress | null;
  isNew: boolean;
  isDue: boolean;
  isMastered: boolean;
}

/** Study word ids whose translations should start hidden in the Qur'an reader: anything the
 *  learner is supposed to know (Review or Learning), but not New or Relearning. Distinct from
 *  `getMasteredVocabIds`, which is the stricter Good/Easy graduation used for stats and unlocks. */
export function getHiddenVocabIds(progressMap: ProgressMap): Set<string> {
  const hidden = new Set<string>();
  for (const [wordId, progress] of Object.entries(progressMap)) {
    if (shouldHideInReader(deserializeCard(progress.card))) hidden.add(wordId);
  }
  return hidden;
}

/** All mastered study word ids in one pass - used for stats and the word-detail sheet, not for
 *  hiding glosses in the reader (that's `getHiddenVocabIds`: Review/Learning rather than only
 *  Good/Easy graduation). Computing this once per progress change is much cheaper than
 *  deserializing every card again for each of the thousands of words a surah can render. */
export function getMasteredVocabIds(progressMap: ProgressMap): Set<string> {
  const mastered = new Set<string>();
  for (const [wordId, progress] of Object.entries(progressMap)) {
    if (isWordMastered(deserializeCard(progress.card), progress.lastGrade)) mastered.add(wordId);
  }
  return mastered;
}

export function getWordState(word: Word, progressMap: ProgressMap, now: Date): WordState {
  const progress = progressMap[word.id] ?? null;
  if (!progress) {
    return { word, progress: null, isNew: true, isDue: false, isMastered: false };
  }
  const card = deserializeCard(progress.card);
  return {
    word,
    progress,
    isNew: false,
    isDue: isCardDue(card, now),
    isMastered: isWordMastered(card, progress.lastGrade),
  };
}

export interface LevelStatus {
  level: Level;
  wordStates: WordState[];
  newCount: number;
  dueCount: number;
  masteredCount: number;
  totalCount: number;
  /** True once every word in the level has been rated Good/Easy at least once. */
  isMastered: boolean;
}

export function getLevelStatus(level: Level, progressMap: ProgressMap, now: Date): LevelStatus {
  const wordStates = level.words.map((word) => getWordState(word, progressMap, now));
  const newCount = wordStates.filter((w) => w.isNew).length;
  const dueCount = wordStates.filter((w) => w.isDue).length;
  const masteredCount = wordStates.filter((w) => w.isMastered).length;
  const totalCount = wordStates.length;
  return {
    level,
    wordStates,
    newCount,
    dueCount,
    masteredCount,
    totalCount,
    isMastered: masteredCount === totalCount,
  };
}

export function getAllLevelStatuses(progressMap: ProgressMap, now: Date): LevelStatus[] {
  return LEVELS.map((level) => getLevelStatus(level, progressMap, now));
}

/** How far into the sequential deck the learner has been introduced - the highest level that
 *  already has at least one studied word. Levels are only an ordering of the one big deck, not
 *  a lock; this is display ("level reached"), not a gate on new cards. Never decreases. */
export function computeReachedLevel(progressMap: ProgressMap, previousMax: number = 1): number {
  let reached = Math.max(previousMax, 1);
  for (const level of LEVELS) {
    if (level.words.some((word) => progressMap[word.id])) {
      reached = Math.max(reached, level.number);
    }
  }
  return reached;
}

/** The first level that still has an unseen word - where sequential new-card introduction is
 *  currently drawing from. LEVEL_COUNT if the whole deck has been introduced. */
export function getIntroductionFrontier(progressMap: ProgressMap): number {
  for (const level of LEVELS) {
    if (level.words.some((word) => !progressMap[word.id])) return level.number;
  }
  return LEVEL_COUNT;
}

export interface SessionWord {
  word: Word;
  levelNumber: number;
  reason: 'due' | 'new';
}

function cardDueTime(state: WordState): number {
  return state.progress ? deserializeCard(state.progress.card).due.getTime() : 0;
}

function isReviewDue(state: WordState): boolean {
  return Boolean(state.isDue && state.progress && deserializeCard(state.progress.card).state === State.Review);
}

function isLearningDue(state: WordState): boolean {
  if (!state.isDue || !state.progress) return false;
  const cardState = deserializeCard(state.progress.card).state;
  return cardState === State.Learning || cardState === State.Relearning;
}

/** Hard cap on Review-state cards pulled into sessions each calendar day. Learning/relearning
 *  steps and new-word introductions are independent of this, matching Anki's "Maximum reviews/day"
 *  vs "New cards/day" split. */
export const DAILY_REVIEW_LIMIT = 200;

/**
 * Builds today's queue across the whole sequential deck, the way Anki does for one sequential
 * deck: due learning/relearning first, then up to DAILY_REVIEW_LIMIT Review-state cards
 * (oldest-due first, minus any already reviewed today), then up to `wordsPerSession` unseen
 * words in curriculum order (level 1, then 2, …). Levels never lock new cards - they are only
 * the insertion order. Reviews never consume the new-word quota.
 */
export function buildGlobalSessionQueue(
  progressMap: ProgressMap,
  now: Date,
  wordsPerSession: number,
  reviewsAlreadyToday: number = 0,
): SessionWord[] {
  const remainingReviewSlots = Math.max(0, DAILY_REVIEW_LIMIT - reviewsAlreadyToday);
  const learning: (SessionWord & { dueTime: number })[] = [];
  const reviews: (SessionWord & { dueTime: number })[] = [];
  const fresh: SessionWord[] = [];

  for (const level of LEVELS) {
    for (const word of level.words) {
      const state = getWordState(word, progressMap, now);
      if (isLearningDue(state)) {
        learning.push({ word, levelNumber: level.number, reason: 'due', dueTime: cardDueTime(state) });
      } else if (isReviewDue(state)) {
        reviews.push({ word, levelNumber: level.number, reason: 'due', dueTime: cardDueTime(state) });
      } else if (state.isNew) {
        fresh.push({ word, levelNumber: level.number, reason: 'new' });
      }
    }
  }

  learning.sort((a, b) => a.dueTime - b.dueTime);
  reviews.sort((a, b) => a.dueTime - b.dueTime);

  return [
    ...learning.map(({ dueTime, ...rest }) => rest),
    ...reviews.slice(0, remainingReviewSlots).map(({ dueTime, ...rest }) => rest),
    ...fresh.slice(0, wordsPerSession),
  ];
}

export function totalMasteredWords(progressMap: ProgressMap, now: Date): number {
  let count = 0;
  for (const level of LEVELS) {
    for (const word of level.words) {
      const state = getWordState(word, progressMap, now);
      if (state.isMastered) count += 1;
    }
  }
  return count;
}

export function totalDueWords(progressMap: ProgressMap, now: Date): number {
  let count = 0;
  for (const level of LEVELS) {
    for (const word of level.words) {
      const state = getWordState(word, progressMap, now);
      if (state.isDue) count += 1;
    }
  }
  return count;
}
