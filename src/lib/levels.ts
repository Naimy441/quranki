import quranicWordsData from '@/data/quranic-words.json';
import lemmaLevelCoverageData from '@/data/quran/lemma-level-coverage.json';
import stageLevelsData from '@/data/quran/stage-levels.json';
import { deserializeCard, isCardDue, isWordMastered, shouldHideInReader, State, type GradeName, type SerializedCard } from '@/lib/fsrs';
import { QURAN_LEMMA_COUNT, TOTAL_QURAN_WORDS, type LemmaId } from '@/lib/quran-lemmas';

export interface Word {
  id: string;
  arabic: string;
  english: string;
  /** Possessive/object ending taught as a clitic, not a standalone mushaf word. */
  isSuffix?: boolean;
  /** One-letter particle that the mushaf fuses onto the next word (وَ, لِ, بِ, ...). */
  isPrefix?: boolean;
  /** A one-time explanation card, not a vocabulary item. */
  kind?: 'grammar';
  note?: string;
  variant?: string;
  forms?: string[];
  /** How a fused card is built, shown on the flashcard (e.g. مِنْ + مَنْ). */
  contractionOf?: string;
  /** English of that makeup (e.g. from + who). */
  contractionEnglish?: string;
  exampleOf?: string;
  /** Do not split this citation into per-word reader tags (avoids claiming الله, etc.). */
  phrase?: boolean;
  /** Prefer this ayah when picking a flashcard verse example. */
  exampleVerse?: { s: number; a: number };
  /** Canonical QAC v0.4 lemma ids represented by this card. Generated once from the former
   * occurrence matcher; reader words now use these ids directly. Affix and grammar cards have
   * no lemma ids because they are not standalone lexical stems. */
  lemmaIds?: LemmaId[];
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
   *  Quran reader (see useKnownWordsStore), rather than earned through a real flashcard review.
   *  Lets "forget this word" safely undo *only* that fabricated mastery - a real review always
   *  writes a fresh entry without this flag, so genuine progress is never at risk of being wiped
   *  by an unrelated "forget" action. */
  autoMastered?: boolean;
}

export type ProgressMap = Record<string, WordProgress>;

const data = quranicWordsData as { deck: string; levelCount: number; wordCount: number; levels: Level[] };
const generated = stageLevelsData as {
  metadata: {
    stage1LastLevel: number;
    stage2LastLevel: number;
    stage3LastLevel: number;
    stage4LastLevel: number;
  };
  levels: Level[];
};

export function isStudyWord(word: Word): boolean {
  return word.kind !== 'grammar';
}

export const DECK_NAME = data.deck;
/** Curated cards first (original Stage 1, then existing Stage 2), then generated leftovers. */
export const LEVELS: Level[] = [...data.levels, ...generated.levels];
export const LEVEL_COUNT = LEVELS.length;
export const LAST_LEVEL_NUMBER = LEVELS[LEVELS.length - 1]?.number ?? 0;
/** Study words only - one-shot grammar intros are not vocabulary. */
export const WORD_COUNT = LEVELS.reduce(
  (sum, level) => sum + level.words.filter(isStudyWord).length,
  0,
);
/** Complete canonical lemma catalogue. Stage breakpoints 547 / 1467 / 2879 / 4875 refer to these ids. */
export const CURRICULUM_LEMMA_COUNT = QURAN_LEMMA_COUNT;

export interface Stage {
  id: number;
  title: string;
  subtitle: string;
  firstLevel: number;
  lastLevel: number;
}

export const STAGES: Stage[] = [
  {
    id: 1,
    title: 'Stage 1',
    subtitle: 'The original curated vocabulary',
    firstLevel: 1,
    lastLevel: generated.metadata.stage1LastLevel,
  },
  {
    id: 2,
    title: 'Stage 2',
    subtitle: 'Five or more occurrences',
    firstLevel: generated.metadata.stage1LastLevel + 1,
    lastLevel: generated.metadata.stage2LastLevel,
  },
  {
    id: 3,
    title: 'Stage 3',
    subtitle: 'Two to four occurrences',
    firstLevel: generated.metadata.stage2LastLevel + 1,
    lastLevel: generated.metadata.stage3LastLevel,
  },
  {
    id: 4,
    title: 'Stage 4',
    subtitle: 'Once in the Quran',
    firstLevel: generated.metadata.stage3LastLevel + 1,
    lastLevel: generated.metadata.stage4LastLevel,
  },
];

export const STAGE_COUNT = STAGES.length;

/** Levels 1–47 are Stage 1, the original thematic curriculum. */
export const THEMATIC_LEVEL_COUNT = STAGES[0].lastLevel;
/** Study-word count in Stage 1 (levels 1–47). */
export const THEMATIC_WORD_COUNT = LEVELS.filter((level) => level.number <= THEMATIC_LEVEL_COUNT).reduce(
  (sum, level) => sum + level.words.filter(isStudyWord).length,
  0,
);

export function getStage(stageId: number): Stage | undefined {
  return STAGES.find((stage) => stage.id === stageId);
}

export function getStageForLevel(levelNumber: number): Stage {
  return STAGES.find((stage) => levelNumber >= stage.firstLevel && levelNumber <= stage.lastLevel) ?? STAGES[0];
}

export function getLevelsForStage(stage: Stage): Level[] {
  return LEVELS.filter((level) => level.number >= stage.firstLevel && level.number <= stage.lastLevel);
}

/** Later stages stay locked until the reached level enters them. Isolated words marked known
 *  in the Quran reader do not unlock a later stage's level list. */
export function isStageUnlocked(stage: Stage, reachedLevel: number): boolean {
  return stage.id === 1 || reachedLevel >= stage.firstLevel;
}

export function getUnlockedStage(reachedLevel: number): Stage {
  for (let i = STAGES.length - 1; i >= 0; i -= 1) {
    if (isStageUnlocked(STAGES[i], reachedLevel)) return STAGES[i];
  }
  return STAGES[0];
}

export interface StageProgress {
  stage: Stage;
  mastered: number;
  total: number;
  introduced: number;
}

export function getStageProgress(stage: Stage, progressMap: ProgressMap, now: Date): StageProgress {
  let mastered = 0;
  let total = 0;
  let introduced = 0;
  for (const level of getLevelsForStage(stage)) {
    for (const word of level.words) {
      if (!isStudyWord(word)) continue;
      total += 1;
      const state = getWordState(word, progressMap, now);
      if (state.isMastered) mastered += 1;
      if (!state.isNew) introduced += 1;
    }
  }
  return { stage, mastered, total, introduced };
}

const wordIndex = new Map<string, { word: Word; level: Level }>();
const studyWordIdsByLemma = new Map<LemmaId, string[]>();
for (const level of LEVELS) {
  for (const word of level.words) {
    wordIndex.set(word.id, { word, level });
    for (const lemmaId of word.lemmaIds ?? []) {
      const ids = studyWordIdsByLemma.get(lemmaId) ?? [];
      ids.push(word.id);
      studyWordIdsByLemma.set(lemmaId, ids);
    }
  }
}

export interface LevelCoverage {
  /** Quran tokens covered if every study word through this level is known. */
  quranWords: number;
  percent: number;
}

const levelCoverage = lemmaLevelCoverageData as { totalWords: number; levels: Record<string, number> };
const coverageThroughLevel: LevelCoverage[] = [];
for (const level of LEVELS) {
  const quranWords = levelCoverage.levels[String(level.number)] ?? 0;
  const percent = TOTAL_QURAN_WORDS === 0 ? 0 : Math.round((quranWords / TOTAL_QURAN_WORDS) * 100);
  coverageThroughLevel[level.number] = { quranWords, percent };
}

/** Quran-text coverage the learner would have after mastering every word through `levelNumber`. */
export function getCoverageThroughLevel(levelNumber: number): LevelCoverage {
  return coverageThroughLevel[levelNumber] ?? { quranWords: 0, percent: 0 };
}

export function getGrammarIntro(level: Level): Word | undefined {
  return level.words.find((word) => word.kind === 'grammar');
}

export function getLevel(levelNumber: number): Level | undefined {
  return LEVELS.find((level) => level.number === levelNumber);
}

export function getWord(wordId: string): Word | undefined {
  return wordIndex.get(wordId)?.word;
}

export function getLevelForWord(wordId: string): Level | undefined {
  return wordIndex.get(wordId)?.level;
}

export function getStudyWordIdsForLemma(id: LemmaId): readonly string[] {
  return studyWordIdsByLemma.get(id) ?? [];
}

export function getStudyWordIdsForLemmas(ids: readonly LemmaId[]): string[] {
  const result = new Set<string>();
  for (const id of ids) {
    for (const wordId of getStudyWordIdsForLemma(id)) result.add(wordId);
  }
  return [...result];
}

export function getHiddenStudyWordIdForLemmas(
  lemmaIds: readonly LemmaId[],
  progressMap: ProgressMap,
): string | undefined {
  for (const wordId of getStudyWordIdsForLemmas(lemmaIds)) {
    const progress = progressMap[wordId];
    if (progress && shouldHideInReader(deserializeCard(progress.card))) return wordId;
  }
  return undefined;
}

export interface WordState {
  word: Word;
  progress: WordProgress | null;
  isNew: boolean;
  isDue: boolean;
  isMastered: boolean;
}

/** Canonical lemma ids whose translations should start hidden in the Quran reader: anything the
 *  learner is supposed to know (Review or Learning), but not New or Relearning. Distinct from
 *  `getMasteredLemmaIds`, which is the stricter Good/Easy graduation used for stats and unlocks. */
export function getHiddenLemmaIds(progressMap: ProgressMap): Set<LemmaId> {
  const hidden = new Set<LemmaId>();
  for (const [wordId, progress] of Object.entries(progressMap)) {
    const word = getWord(wordId);
    if (!word || word.kind === 'grammar' || !shouldHideInReader(deserializeCard(progress.card))) continue;
    for (const lemmaId of word.lemmaIds ?? []) hidden.add(lemmaId);
  }
  return hidden;
}

/** All mastered canonical lemma ids in one pass - used for stats and the word-detail sheet, not
 *  for hiding glosses in the reader (that's `getHiddenLemmaIds`: Review/Learning rather than only
 *  Good/Easy graduation). Computing this once per progress change is much cheaper than
 *  deserializing every card again for each of the thousands of words a surah can render. */
export function getMasteredLemmaIds(progressMap: ProgressMap): Set<LemmaId> {
  const mastered = new Set<LemmaId>();
  for (const [wordId, progress] of Object.entries(progressMap)) {
    const word = getWord(wordId);
    if (!word || word.kind === 'grammar') continue;
    if (isWordMastered(deserializeCard(progress.card), progress.lastGrade)) {
      for (const lemmaId of word.lemmaIds ?? []) mastered.add(lemmaId);
    }
  }
  return mastered;
}

export function getMasteredStudyWordForLemmas(
  lemmaIds: readonly LemmaId[],
  progressMap: ProgressMap,
): { wordId: string; level: Level } | undefined {
  for (const lemmaId of lemmaIds) {
    for (const wordId of getStudyWordIdsForLemma(lemmaId)) {
      const progress = progressMap[wordId];
      const level = getLevelForWord(wordId);
      if (progress && level && isWordMastered(deserializeCard(progress.card), progress.lastGrade)) {
        return { wordId, level };
      }
    }
  }
  return undefined;
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
  const wordStates = level.words.filter(isStudyWord).map((word) => getWordState(word, progressMap, now));
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

export function getLevelStatusesForStage(stage: Stage, progressMap: ProgressMap, now: Date): LevelStatus[] {
  return getLevelsForStage(stage).map((level) => getLevelStatus(level, progressMap, now));
}

function isLevelFullyMastered(level: Level, progressMap: ProgressMap): boolean {
  const studyWords = level.words.filter(isStudyWord);
  return studyWords.every((word) => {
    const progress = progressMap[word.id];
    return Boolean(progress && isWordMastered(deserializeCard(progress.card), progress.lastGrade));
  });
}

/** The learner's current level: the first level that is not yet fully mastered, after a
 *  consecutive prefix of completed levels. Isolated words (including ones marked known in the
 *  Quran reader) do not skip ahead — only finishing every study word in level 1, then 2, and
 *  so on, advances this. Display-only; levels are not a gate on new cards. */
export function computeReachedLevel(progressMap: ProgressMap): number {
  for (const level of LEVELS) {
    if (!isLevelFullyMastered(level, progressMap)) return Math.max(level.number, 1);
  }
  return Math.max(LAST_LEVEL_NUMBER, 1);
}

/** Displayed level only moves forward from reviews. A lapse (Again) must not pull it back;
 *  forgetting an auto-mastered word still uses `computeReachedLevel` directly. */
export function nextReachedLevel(progressMap: ProgressMap, currentMax: number): number {
  return Math.max(currentMax, computeReachedLevel(progressMap));
}

/** The first level that still has an unseen study word - where sequential new-card
 *  introduction is currently drawing from. Grammar intros do not hold this back.
 *  LAST_LEVEL_NUMBER if the whole deck has been introduced. */
export function getIntroductionFrontier(progressMap: ProgressMap): number {
  for (const level of LEVELS) {
    if (level.words.some((word) => isStudyWord(word) && !progressMap[word.id])) return level.number;
  }
  return LAST_LEVEL_NUMBER;
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

export interface UpcomingReview {
  count: number;
  dueAt: Date;
  ms: number;
}

/** Learning/Relearning cards that are not due yet - used to tell the learner
 *  "5 cards come back in 10 minutes" instead of looking like the day is over. */
export function getUpcomingLearning(progressMap: ProgressMap, now: Date): UpcomingReview | null {
  let soonest = Number.POSITIVE_INFINITY;
  let count = 0;
  for (const level of LEVELS) {
    for (const word of level.words) {
      if (!isStudyWord(word)) continue;
      const state = getWordState(word, progressMap, now);
      if (!state.progress) continue;
      const card = deserializeCard(state.progress.card);
      if (card.state !== State.Learning && card.state !== State.Relearning) continue;
      const due = card.due.getTime();
      if (due <= now.getTime()) continue;
      count += 1;
      soonest = Math.min(soonest, due);
    }
  }
  if (count === 0) return null;
  return { count, dueAt: new Date(soonest), ms: soonest - now.getTime() };
}

/**
 * Builds today's queue across the whole sequential deck, the way Anki does for one sequential
 * deck: due learning/relearning first, then up to DAILY_REVIEW_LIMIT Review-state cards
 * (oldest-due first, minus any already reviewed today), then up to `wordsPerSession` unseen
 * study words in curriculum order (level 1, then 2, …), minus any new cards already introduced
 * today. Grammar intros in that same stretch are included for free so they don't consume the
 * new-word quota. Stages hide later level lists until introduction reaches them, the same
 * way a later level can be learned from the Quran reader before it is the current study
 * level. Reviews never consume the new-word quota.
 *
 * The new-card cap is the default day's batch, not a hard stop: pass `ignoreNewCardCap` when
 * the learner explicitly starts another session after finishing today's.
 */
export function buildGlobalSessionQueue(
  progressMap: ProgressMap,
  now: Date,
  wordsPerSession: number,
  reviewsAlreadyToday: number = 0,
  newCardsAlreadyToday: number = 0,
  ignoreNewCardCap: boolean = false,
): SessionWord[] {
  const remainingReviewSlots = Math.max(0, DAILY_REVIEW_LIMIT - reviewsAlreadyToday);
  const remainingNewSlots = ignoreNewCardCap
    ? wordsPerSession
    : Math.max(0, wordsPerSession - newCardsAlreadyToday);
  const learning: (SessionWord & { dueTime: number })[] = [];
  const reviews: (SessionWord & { dueTime: number })[] = [];
  const fresh: SessionWord[] = [];

  for (const level of LEVELS) {
    for (const word of level.words) {
      const state = getWordState(word, progressMap, now);
      if (!isStudyWord(word)) {
        if (state.isNew) fresh.push({ word, levelNumber: level.number, reason: 'new' });
        continue;
      }
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

  const newCards: SessionWord[] = [];
  let vocabSlots = remainingNewSlots;
  for (const item of fresh) {
    if (item.word.kind === 'grammar') {
      if (vocabSlots <= 0) break;
      newCards.push(item);
    } else if (vocabSlots > 0) {
      newCards.push(item);
      vocabSlots -= 1;
    } else {
      break;
    }
  }

  return [
    ...learning.map(({ dueTime, ...rest }) => rest),
    ...reviews.slice(0, remainingReviewSlots).map(({ dueTime, ...rest }) => rest),
    ...newCards,
  ];
}

export function totalMasteredWords(progressMap: ProgressMap, now: Date): number {
  let count = 0;
  for (const level of LEVELS) {
    for (const word of level.words) {
      if (!isStudyWord(word)) continue;
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
      if (!isStudyWord(word)) continue;
      const state = getWordState(word, progressMap, now);
      if (state.isDue) count += 1;
    }
  }
  return count;
}
