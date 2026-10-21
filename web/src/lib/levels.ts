import asmaUlHusnaData from '@/data/asma-ul-husna.json';
import { QAIDA_FIRST_LEVEL, QAIDA_LAST_LEVEL, QAIDA_LEVELS, QAIDA_STAGE_ID } from '@/data/qaida';
import lemmaLevelCoverageData from '@/data/quran/lemma-level-coverage.json';
import stageLevelsData from '@/data/quran/stage-levels.json';
import quranicWordsData from '@/data/quranic-words.json';
import {
  deserializeCard,
  isCardDue,
  isWordMastered,
  shouldHideInReader,
  State,
  type GradeName,
  type SerializedCard,
} from '@/lib/fsrs';

export { QAIDA_FIRST_LEVEL, QAIDA_LAST_LEVEL, QAIDA_LEVELS, QAIDA_STAGE_ID };

export type LemmaId = number;

export interface Word {
  id: string;
  arabic: string;
  english: string;
  transliteration?: string;
  isSuffix?: boolean;
  isPrefix?: boolean;
  kind?: 'grammar' | 'digit' | 'qaida';
  note?: string;
  variant?: string;
  forms?: string[];
  contractionOf?: string;
  contractionEnglish?: string;
  exampleOf?: string;
  phrase?: boolean;
  exampleVerse?: { s: number; a: number };
  lemmaIds?: LemmaId[];
}

export interface Level {
  number: number;
  id: string;
  title: string;
  words: Word[];
}

export const LISTENING_RECALL_EASY_STREAK = 2;

export interface WordProgress {
  wordId: string;
  card: SerializedCard;
  lastGrade: GradeName | null;
  reviewedAt: string;
  easyStreak?: number;
  autoMastered?: boolean;
}

export function hidesPromptArabic(progress: WordProgress | null | undefined): boolean {
  return (progress?.easyStreak ?? 0) >= LISTENING_RECALL_EASY_STREAK;
}

export function usesListeningOverlay(word: Word): boolean {
  return word.kind !== 'grammar' && word.kind !== 'digit' && word.kind !== 'qaida';
}

export function isQaidaWord(word: Word): boolean {
  return word.kind === 'qaida';
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
const asmaUlHusna = asmaUlHusnaData as {
  metadata: { firstLevel: number; lastLevel: number; wordCount: number };
  levels: Level[];
};

export function isStudyWord(word: Word): boolean {
  return word.kind !== 'grammar';
}

export const DECK_NAME = data.deck;
export const LEVELS: Level[] = [...data.levels, ...generated.levels, ...asmaUlHusna.levels].sort(
  (a, b) => a.number - b.number,
);
export const LEVEL_COUNT = LEVELS.length;
export const LAST_LEVEL_NUMBER = LEVELS[LEVELS.length - 1]?.number ?? 0;
export const LAST_FREQUENCY_LEVEL = generated.metadata.stage4LastLevel;
export const WORD_COUNT = LEVELS.reduce(
  (sum, level) => sum + level.words.filter(isStudyWord).length,
  0,
);

const levelCoverage = lemmaLevelCoverageData as { totalWords: number; levels: Record<string, number> };
export const TOTAL_QURAN_WORDS = levelCoverage.totalWords || 77399;

export interface Stage {
  id: number;
  title: string;
  subtitle: string;
  firstLevel: number;
  lastLevel: number;
  kind?: 'asma' | 'qaida';
}

const STAGE1_LAST_LEVEL = generated.metadata.stage1LastLevel;

export const STAGES: Stage[] = [
  {
    id: 1,
    title: 'Stage 1',
    subtitle: 'The original curated vocabulary',
    firstLevel: 1,
    lastLevel: STAGE1_LAST_LEVEL,
  },
  {
    id: 2,
    title: 'Stage 2',
    subtitle: 'Asma ul-Husna - Arabic digits',
    firstLevel: asmaUlHusna.metadata.firstLevel,
    lastLevel: asmaUlHusna.metadata.lastLevel,
    kind: 'asma',
  },
  {
    id: 3,
    title: 'Stage 3',
    subtitle: 'Five or more occurrences',
    firstLevel: asmaUlHusna.metadata.lastLevel + 1,
    lastLevel: generated.metadata.stage2LastLevel,
  },
  {
    id: 4,
    title: 'Stage 4',
    subtitle: 'Two to four occurrences',
    firstLevel: generated.metadata.stage2LastLevel + 1,
    lastLevel: generated.metadata.stage3LastLevel,
  },
  {
    id: 5,
    title: 'Stage 5',
    subtitle: 'Once in the Quran',
    firstLevel: generated.metadata.stage3LastLevel + 1,
    lastLevel: generated.metadata.stage4LastLevel,
  },
];

export const STAGE_COUNT = STAGES.length;
export const ASMA_FIRST_LEVEL = asmaUlHusna.metadata.firstLevel;
export const ASMA_LAST_LEVEL = asmaUlHusna.metadata.lastLevel;

export function isAsmaLevel(levelNumber: number): boolean {
  return levelNumber >= ASMA_FIRST_LEVEL && levelNumber <= ASMA_LAST_LEVEL;
}

export function isAsmaStage(stage: Stage): boolean {
  return stage.kind === 'asma';
}

export function isAsmaDigitLevel(level: Level): boolean {
  return level.words.some((word) => word.kind === 'digit');
}

export const QAIDA_STAGE: Stage = {
  id: QAIDA_STAGE_ID,
  title: 'The Qaida',
  subtitle: 'Learn to read Arabic',
  firstLevel: QAIDA_FIRST_LEVEL,
  lastLevel: QAIDA_LAST_LEVEL,
  kind: 'qaida',
};

export function isQaidaLevel(levelNumber: number): boolean {
  return levelNumber >= QAIDA_FIRST_LEVEL && levelNumber <= QAIDA_LAST_LEVEL;
}

export function isQaidaStage(stage: Stage): boolean {
  return stage.kind === 'qaida';
}

export const QAIDA_LEVEL_COUNT = QAIDA_LAST_LEVEL - QAIDA_FIRST_LEVEL + 1;

export function levelDisplayNumber(levelNumber: number, learnToRead: boolean): number {
  if (isQaidaLevel(levelNumber)) return levelNumber - QAIDA_FIRST_LEVEL + 1;
  if (learnToRead) return levelNumber + QAIDA_LEVEL_COUNT;
  return levelNumber;
}

export function formatLevelLabel(levelNumber: number, learnToRead = false): string {
  return `Level ${levelDisplayNumber(levelNumber, learnToRead)}`;
}

export function stageDisplayNumber(stage: Stage, learnToRead: boolean): number {
  if (!learnToRead) return stage.id;
  return isQaidaStage(stage) ? 1 : stage.id + 1;
}

export function stageDisplayTitle(stage: Stage, learnToRead: boolean): string {
  return `Stage ${stageDisplayNumber(stage, learnToRead)}`;
}

export function stagePillLabel(stage: Stage, learnToRead: boolean): string {
  return String(stageDisplayNumber(stage, learnToRead));
}

export interface TrackContext {
  learnToRead: boolean;
  qaidaComplete: boolean;
}

export function getTrackContext(progressMap: ProgressMap, canReadQuran: boolean): TrackContext {
  return {
    learnToRead: canReadQuran === false,
    qaidaComplete: isQaidaComplete(progressMap),
  };
}

export function getVisibleStages(learnToRead: boolean): Stage[] {
  return learnToRead ? [QAIDA_STAGE, ...STAGES] : STAGES;
}

export function isQaidaComplete(progressMap: ProgressMap): boolean {
  return QAIDA_LEVELS.every((level) => isLevelFullyMastered(level, progressMap));
}

export const ALL_STAGES: Stage[] = [QAIDA_STAGE, ...STAGES];

const levelMap = new Map<number, Level>();
const levelByIdMap = new Map<string, Level>();
const wordIndex = new Map<string, { word: Word; level: Level }>();
const studyWordIdsByLemma = new Map<LemmaId, string[]>();

for (const level of [...LEVELS, ...QAIDA_LEVELS]) {
  levelMap.set(level.number, level);
  levelByIdMap.set(level.id, level);
  for (const word of level.words) {
    wordIndex.set(word.id, { word, level });
    for (const lemmaId of word.lemmaIds ?? []) {
      const ids = studyWordIdsByLemma.get(lemmaId) ?? [];
      ids.push(word.id);
      studyWordIdsByLemma.set(lemmaId, ids);
    }
  }
}

export function getLevel(number: number): Level | undefined {
  if (isQaidaLevel(number)) return QAIDA_LEVELS.find((level) => level.number === number);
  return levelMap.get(number);
}

export function getLevelById(id: string): Level | undefined {
  if (levelByIdMap.has(id)) return levelByIdMap.get(id);
  const num = parseInt(id, 10);
  if (!isNaN(num)) {
    if (levelMap.has(num)) return levelMap.get(num);
    const pad = String(num).padStart(2, '0');
    if (levelByIdMap.has(pad)) return levelByIdMap.get(pad);
  }
  return undefined;
}

export function getWord(wordId: string): Word | undefined {
  return wordIndex.get(wordId)?.word;
}

export function getLevelForWord(wordId: string): Level | undefined {
  return wordIndex.get(wordId)?.level;
}

export function getWordContext(wordId: string): { word: Word; level: Level } | undefined {
  return wordIndex.get(wordId);
}

export function getStage(stageId: number): Stage | undefined {
  if (stageId === QAIDA_STAGE.id) return QAIDA_STAGE;
  return STAGES.find((stage) => stage.id === stageId);
}

export function getStageForLevel(levelNumber: number): Stage {
  if (isQaidaLevel(levelNumber)) return QAIDA_STAGE;
  return STAGES.find((stage) => levelNumber >= stage.firstLevel && levelNumber <= stage.lastLevel) ?? STAGES[0];
}

export function getLevelsForStage(stage: Stage): Level[] {
  if (isQaidaStage(stage)) return QAIDA_LEVELS;
  return LEVELS.filter((level) => level.number >= stage.firstLevel && level.number <= stage.lastLevel);
}

export function isStageUnlocked(stage: Stage, reachedLevel: number, track?: TrackContext): boolean {
  if (isQaidaStage(stage)) return track?.learnToRead === true;
  if (track?.learnToRead && !track.qaidaComplete) return false;
  return stage.id === 1 || reachedLevel >= stage.firstLevel;
}

export function getUnlockedStage(reachedLevel: number, track?: TrackContext): Stage {
  const stages = getVisibleStages(track?.learnToRead === true);
  for (let i = stages.length - 1; i >= 0; i -= 1) {
    if (isStageUnlocked(stages[i]!, reachedLevel, track)) return stages[i]!;
  }
  return stages[0] ?? STAGES[0];
}

export function isLevelUnlocked(levelNumber: number, maxUnlockedLevel: number): boolean {
  return levelNumber <= maxUnlockedLevel;
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

export interface LevelCoverage {
  quranWords: number;
  percent: number;
}

const coverageThroughLevel: LevelCoverage[] = [];
let lastFrequencyCoverage = 0;
for (const level of LEVELS) {
  const quranWords = isAsmaLevel(level.number)
    ? lastFrequencyCoverage
    : (levelCoverage.levels[String(level.number)] ?? lastFrequencyCoverage);
  if (!isAsmaLevel(level.number)) lastFrequencyCoverage = quranWords;
  const percent = TOTAL_QURAN_WORDS === 0 ? 0 : Math.round((quranWords / TOTAL_QURAN_WORDS) * 100);
  coverageThroughLevel[level.number] = { quranWords, percent };
}

export function getCoverageThroughLevel(levelNumber: number): LevelCoverage {
  return coverageThroughLevel[levelNumber] ?? { quranWords: 0, percent: 0 };
}

export function getGrammarIntro(level: Level): Word | undefined {
  return level.words.find((word) => word.kind === 'grammar');
}

export interface WordState {
  word: Word;
  progress: WordProgress | null;
  isNew: boolean;
  isDue: boolean;
  isMastered: boolean;
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
    isMastered: masteredCount === totalCount && totalCount > 0,
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
  return (
    studyWords.length > 0 &&
    studyWords.every((word) => {
      const progress = progressMap[word.id];
      return Boolean(progress && isWordMastered(deserializeCard(progress.card), progress.lastGrade));
    })
  );
}

function isFrequencyLevel(levelNumber: number): boolean {
  return levelNumber > STAGE1_LAST_LEVEL && !isAsmaLevel(levelNumber) && !isQaidaLevel(levelNumber);
}

function hasProgressInLevels(progressMap: ProgressMap, levels: readonly Level[]): boolean {
  return levels.some((level) =>
    level.words.some((word) => isStudyWord(word) && Boolean(progressMap[word.id])),
  );
}

function stage1Levels(): Level[] {
  return LEVELS.filter((level) => level.number <= STAGE1_LAST_LEVEL);
}

function asmaLevels(): Level[] {
  return LEVELS.filter((level) => isAsmaLevel(level.number));
}

function frequencyLevels(): Level[] {
  return LEVELS.filter((level) => isFrequencyLevel(level.number));
}

function hasFrequencyProgress(progressMap: ProgressMap): boolean {
  return hasProgressInLevels(progressMap, frequencyLevels());
}

export function computeReachedLevel(progressMap: ProgressMap): number {
  const enteredFrequency = hasFrequencyProgress(progressMap);
  for (const level of LEVELS) {
    if (isAsmaLevel(level.number) && enteredFrequency) continue;
    if (!isLevelFullyMastered(level, progressMap)) return Math.max(level.number, 1);
  }
  const nextName = asmaLevels().find((level) => !isLevelFullyMastered(level, progressMap));
  if (nextName) return frequencyLevels().at(-1)?.number ?? nextName.number;
  return Math.max(LAST_LEVEL_NUMBER, 1);
}

export function getQaidaIntroductionFrontier(progressMap: ProgressMap): number {
  for (const level of QAIDA_LEVELS) {
    if (level.words.some((word) => isStudyWord(word) && !progressMap[word.id])) return level.number;
  }
  return QAIDA_LAST_LEVEL;
}

export function getIntroductionFrontier(progressMap: ProgressMap): number {
  const skipNames = hasFrequencyProgress(progressMap);
  for (const level of LEVELS) {
    if (skipNames && isAsmaLevel(level.number)) continue;
    if (level.words.some((word) => isStudyWord(word) && !progressMap[word.id])) return level.number;
  }
  if (skipNames) {
    for (const level of asmaLevels()) {
      if (level.words.some((word) => isStudyWord(word) && !progressMap[word.id])) return level.number;
    }
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

export const DAILY_REVIEW_LIMIT = 200;

function shuffleInPlace<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const swap = items[i];
    items[i] = items[j]!;
    items[j] = swap!;
  }
  return items;
}

export interface UpcomingReview {
  count: number;
  dueAt: Date;
  ms: number;
}

export function getUpcomingLearning(progressMap: ProgressMap, now: Date): UpcomingReview | null {
  let soonest = Number.POSITIVE_INFINITY;
  let count = 0;
  for (const level of [...QAIDA_LEVELS, ...LEVELS]) {
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

export function buildGlobalSessionQueue(
  progressMap: ProgressMap,
  now: Date,
  wordsPerSession: number,
  reviewsAlreadyToday = 0,
  newCardsAlreadyToday = 0,
  ignoreNewCardCap = false,
  track?: TrackContext,
): SessionWord[] {
  const remainingReviewSlots = Math.max(0, DAILY_REVIEW_LIMIT - reviewsAlreadyToday);
  const remainingNewSlots = ignoreNewCardCap
    ? wordsPerSession
    : Math.max(0, wordsPerSession - newCardsAlreadyToday);
  const learning: (SessionWord & { dueTime: number })[] = [];
  const reviews: (SessionWord & { dueTime: number })[] = [];
  const fresh: SessionWord[] = [];
  const learnToRead = track?.learnToRead === true;
  const qaidaOnly = learnToRead && !track?.qaidaComplete;

  const collect = (levels: readonly Level[]) => {
    for (const level of levels) {
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
  };

  if (learnToRead) collect(QAIDA_LEVELS);
  if (!qaidaOnly) collect(LEVELS);

  learning.sort((a, b) => a.dueTime - b.dueTime);
  reviews.sort((a, b) => a.dueTime - b.dueTime);
  const dueReviews = shuffleInPlace(reviews.slice(0, remainingReviewSlots));

  const qaidaFresh = fresh.filter((item) => isQaidaLevel(item.levelNumber));
  const stage1Fresh = fresh.filter((item) => item.levelNumber <= STAGE1_LAST_LEVEL);
  const asmaFresh = fresh.filter((item) => isAsmaLevel(item.levelNumber));
  const laterFresh = fresh.filter((item) => isFrequencyLevel(item.levelNumber));
  const stage1Complete = stage1Levels().every((level) => isLevelFullyMastered(level, progressMap));
  const enteredFrequency = hasFrequencyProgress(progressMap);
  const reserveName = enteredFrequency && asmaFresh.some((item) => isStudyWord(item.word)) ? 1 : 0;

  const newCards: SessionWord[] = [];
  const takeFresh = (items: SessionWord[], slots: number): number => {
    let remaining = slots;
    for (const item of items) {
      if (item.word.kind === 'grammar') {
        if (remaining <= 0) break;
        newCards.push(item);
      } else if (remaining > 0) {
        newCards.push(item);
        remaining -= 1;
      } else {
        break;
      }
    }
    return remaining;
  };
  if (qaidaOnly) {
    takeFresh(qaidaFresh, remainingNewSlots);
  } else if (!stage1Complete) {
    const leftover = takeFresh(stage1Fresh, remainingNewSlots);
    takeFresh(laterFresh, leftover);
  } else if (!enteredFrequency) {
    const leftover = takeFresh(asmaFresh, remainingNewSlots);
    takeFresh(laterFresh, leftover);
  } else {
    const leftover = takeFresh([...stage1Fresh, ...laterFresh], Math.max(0, remainingNewSlots - reserveName));
    takeFresh(asmaFresh, leftover + reserveName);
  }

  return [
    ...learning.map(({ dueTime, ...rest }) => rest),
    ...dueReviews.map(({ dueTime, ...rest }) => rest),
    ...newCards,
  ];
}

export function totalMasteredWords(progressMap: ProgressMap, now: Date): number {
  let count = 0;
  for (const level of [...QAIDA_LEVELS, ...LEVELS]) {
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
  for (const level of [...QAIDA_LEVELS, ...LEVELS]) {
    for (const word of level.words) {
      if (!isStudyWord(word)) continue;
      const state = getWordState(word, progressMap, now);
      if (state.isDue) count += 1;
    }
  }
  return count;
}

export function getDueReviewWords(progress: ProgressMap, now: Date = new Date()): Word[] {
  const due: { word: Word; dueTime: number }[] = [];

  for (const [wordId, wp] of Object.entries(progress)) {
    const word = getWord(wordId);
    if (!word || !isStudyWord(word)) continue;
    const card = deserializeCard(wp.card);
    if (isCardDue(card, now)) {
      due.push({ word, dueTime: card.due.getTime() });
    }
  }

  due.sort((a, b) => a.dueTime - b.dueTime);
  return due.map((d) => d.word);
}

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

export function getHiddenLemmaIds(progressMap: ProgressMap): Set<LemmaId> {
  const hidden = new Set<LemmaId>();
  for (const [wordId, progress] of Object.entries(progressMap)) {
    const word = getWord(wordId);
    if (!word || word.kind === 'grammar' || !shouldHideInReader(deserializeCard(progress.card))) continue;
    for (const lemmaId of word.lemmaIds ?? []) hidden.add(lemmaId);
  }
  return hidden;
}

export interface LevelProgressSummary {
  total: number;
  mastered: number;
  learning: number;
  newCount: number;
  percent: number;
  isUnlocked: boolean;
  isComplete: boolean;
}

export function getLevelProgress(level: Level, progress: ProgressMap, maxUnlocked: number): LevelProgressSummary {
  const studyWords = level.words.filter(isStudyWord);
  const total = studyWords.length;
  let mastered = 0;
  let learning = 0;

  for (const w of studyWords) {
    const wp = progress[w.id];
    if (!wp) continue;
    const card = deserializeCard(wp.card);
    if (isWordMastered(card)) {
      mastered++;
    } else {
      learning++;
    }
  }

  const newCount = Math.max(0, total - mastered - learning);
  const percent = total > 0 ? Math.round((mastered / total) * 100) : 0;
  const isUnlocked = isQaidaLevel(level.number) || level.number <= maxUnlocked;
  const isComplete = mastered === total && total > 0;

  return { total, mastered, learning, newCount, percent, isUnlocked, isComplete };
}
