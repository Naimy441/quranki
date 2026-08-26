import quranicWordsData from '@/data/quranic-words.json';
import { deserializeCard, isCardDue, isWordMastered, type GradeName, type SerializedCard } from '@/lib/fsrs';

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
}

export type ProgressMap = Record<string, WordProgress>;

const data = quranicWordsData as { deck: string; levelCount: number; wordCount: number; levels: Level[] };

export const DECK_NAME = data.deck;
export const LEVEL_COUNT = data.levelCount;
export const WORD_COUNT = data.wordCount;
export const LEVELS: Level[] = data.levels;

const wordIndex = new Map<string, { word: Word; level: Level }>();
for (const level of LEVELS) {
  for (const word of level.words) {
    wordIndex.set(word.id, { word, level });
  }
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

/** All mastered study word ids in one pass - used outside of the review flow, e.g. to decide
 *  whether to hide a matching word's translation in the Qur'an reader (see
 *  src/lib/quran-reader-types.ts's `ReaderWord.v`). Computing this once per progress change is
 *  much cheaper than deserializing every card again for each of the thousands of words a surah
 *  can render. */
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

/** A level's follow-on level unlocks once at least this fraction of its words have been rated
 *  "Good" - deliberately *not* 100%. Curriculum pacing ("what should I be introduced to next")
 *  and SRS scheduling ("when do I need to see this word again") are different concerns: FSRS
 *  already keeps resurfacing a word for review for as long as it needs to regardless of level, via
 *  buildGlobalSessionQueue pulling due reviews from every unlocked level. Requiring literal 100%
 *  per-word perfection here would let a single persistently-tricky word hold the entire rest of
 *  the curriculum hostage, which conflates the two. See `isMastered` below for the separate,
 *  still-strict "every word in this level" flag used for the "fully complete" UI treatment.*/
const LEVEL_ADVANCE_THRESHOLD = 0.8;

export interface LevelStatus {
  level: Level;
  wordStates: WordState[];
  newCount: number;
  dueCount: number;
  masteredCount: number;
  totalCount: number;
  /** True once every single word in the level has been rated Good/Easy at least once - the
   *  "fully complete" state shown in the level grid. Not what gates the next level - see
   *  `isReadyToAdvance`. */
  isMastered: boolean;
  /** True once enough of the level (LEVEL_ADVANCE_THRESHOLD) is mastered to move on - this, not
   *  `isMastered`, is what unlocks the next level (see computeMaxUnlockedLevel). */
  isReadyToAdvance: boolean;
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
    isReadyToAdvance: masteredCount >= Math.ceil(totalCount * LEVEL_ADVANCE_THRESHOLD),
  };
}

export function getAllLevelStatuses(progressMap: ProgressMap, now: Date): LevelStatus[] {
  return LEVELS.map((level) => getLevelStatus(level, progressMap, now));
}

/** Levels 1..maxUnlockedLevel are available to the user; the rest are locked. */
export function computeMaxUnlockedLevel(progressMap: ProgressMap, now: Date, previousMax: number): number {
  let max = Math.max(previousMax, 1);
  while (max < LEVEL_COUNT) {
    const level = getLevel(max);
    if (!level) break;
    const status = getLevelStatus(level, progressMap, now);
    if (!status.isReadyToAdvance) break;
    max += 1;
  }
  return max;
}

export interface SessionWord {
  word: Word;
  levelNumber: number;
  reason: 'due' | 'new';
}

function cardDueTime(state: WordState): number {
  return state.progress ? deserializeCard(state.progress.card).due.getTime() : 0;
}

/** Builds the word queue for a session scoped to a single level: due reviews first, then new words. */
export function buildSessionQueue(level: Level, progressMap: ProgressMap, now: Date, wordsPerSession: number): SessionWord[] {
  const wordStates = level.words.map((word) => getWordState(word, progressMap, now));
  const due = wordStates
    .filter((w) => w.isDue)
    .sort((a, b) => cardDueTime(a) - cardDueTime(b))
    .map((w) => ({ word: w.word, levelNumber: level.number, reason: 'due' as const }));

  const remainingSlots = Math.max(wordsPerSession - due.length, 0);
  const fresh = wordStates
    .filter((w) => w.isNew)
    .slice(0, remainingSlots)
    .map((w) => ({ word: w.word, levelNumber: level.number, reason: 'new' as const }));

  return [...due, ...fresh];
}

/**
 * Builds today's unified review queue across every unlocked level, the way Anki does: every
 * due card (from any level already unlocked), oldest-due-first, regardless of which level it
 * belongs to, plus new words from the current frontier level to fill out the session. Levels
 * exist to gate *introduction* of new words, not to silo review - once a word has been seen,
 * it resurfaces here whenever FSRS says it's due, no matter how many levels have unlocked since.
 */
export function buildGlobalSessionQueue(
  progressMap: ProgressMap,
  now: Date,
  wordsPerSession: number,
  maxUnlockedLevel: number,
): SessionWord[] {
  const due: (SessionWord & { dueTime: number })[] = [];
  const fresh: SessionWord[] = [];

  for (const level of LEVELS) {
    if (level.number > maxUnlockedLevel) break;
    for (const word of level.words) {
      const state = getWordState(word, progressMap, now);
      if (state.isDue) {
        due.push({ word, levelNumber: level.number, reason: 'due', dueTime: cardDueTime(state) });
      } else if (state.isNew) {
        fresh.push({ word, levelNumber: level.number, reason: 'new' });
      }
    }
  }

  due.sort((a, b) => a.dueTime - b.dueTime);
  const remainingSlots = Math.max(wordsPerSession - due.length, 0);

  return [...due.map(({ dueTime, ...rest }) => rest), ...fresh.slice(0, remainingSlots)];
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

export function totalDueWords(progressMap: ProgressMap, now: Date, maxUnlockedLevel: number): number {
  let count = 0;
  for (const level of LEVELS) {
    if (level.number > maxUnlockedLevel) continue;
    for (const word of level.words) {
      const state = getWordState(word, progressMap, now);
      if (state.isDue) count += 1;
    }
  }
  return count;
}
