import coverageData from '@/data/quran/qaida-readable-coverage.json';
import { deserializeCard, isWordMastered } from '@/lib/fsrs';
import { QAIDA_LEVELS, isStudyWord, type ProgressMap } from '@/lib/levels';

type QaidaReadSkill = 'letters' | 'muqattaat' | 'haraka' | 'tanween' | 'madd' | 'leen' | 'sukoon' | 'shaddah';

interface QaidaReadableCoverageFile {
  total: number;
  counts: Record<QaidaReadSkill, number>;
  cumulative: Record<QaidaReadSkill, number>;
}

const coverage = coverageData as QaidaReadableCoverageFile;

/**
 * Teaching levels that unlock each skill. Reading-practice levels are omitted so they
 * do not pretend the next mark has been taught.
 */
const SKILL_STEPS: { skill: QaidaReadSkill; levels: readonly number[] }[] = [
  { skill: 'letters', levels: [1001, 1002] },
  { skill: 'muqattaat', levels: [1003] },
  { skill: 'haraka', levels: [1004, 1005, 1006, 1007] },
  { skill: 'tanween', levels: [1008, 1009, 1010, 1011] },
  { skill: 'madd', levels: [1013] },
  { skill: 'leen', levels: [1014] },
  { skill: 'sukoon', levels: [1016] },
  { skill: 'shaddah', levels: [1018] },
];

const LEVEL_BY_NUMBER = new Map(QAIDA_LEVELS.map((level) => [level.number, level]));

export interface QaidaReadableCoverage {
  readable: number;
  total: number;
}

function studyCardCount(levelNumbers: readonly number[]): number {
  let total = 0;
  for (const number of levelNumbers) {
    const level = LEVEL_BY_NUMBER.get(number);
    if (!level) continue;
    total += level.words.filter(isStudyWord).length;
  }
  return total;
}

function masteredFraction(progressMap: ProgressMap, levelNumbers: readonly number[]): number {
  let mastered = 0;
  let total = 0;
  for (const number of levelNumbers) {
    const level = LEVEL_BY_NUMBER.get(number);
    if (!level) continue;
    for (const word of level.words) {
      if (!isStudyWord(word)) continue;
      total += 1;
      const progress = progressMap[word.id];
      if (progress && isWordMastered(deserializeCard(progress.card), progress.lastGrade)) {
        mastered += 1;
      }
    }
  }
  return total === 0 ? 1 : mastered / total;
}

function coverageAt(previous: number, target: number, fraction: number): number {
  return Math.round(previous + (target - previous) * fraction);
}

/**
 * Quran words the learner can already sound out, based on Qaida marks they have mastered.
 * Grows as each skill group is learned (short vowels, then tanwīn, madd, and so on).
 */
export function getQaidaReadableCoverage(progressMap: ProgressMap): QaidaReadableCoverage {
  let readable = 0;
  let previous = 0;
  for (const step of SKILL_STEPS) {
    const target = coverage.cumulative[step.skill];
    const fraction = masteredFraction(progressMap, step.levels);
    if (fraction >= 1) {
      readable = target;
      previous = target;
      continue;
    }
    readable = coverageAt(previous, target, fraction);
    break;
  }
  return { readable, total: coverage.total };
}

/** Words readable if every teaching level through `levelNumber` is finished. */
export function getQaidaReadableCoverageThroughLevel(levelNumber: number): QaidaReadableCoverage {
  let readable = 0;
  let previous = 0;
  for (const step of SKILL_STEPS) {
    const target = coverage.cumulative[step.skill];
    const reached = step.levels.filter((number) => number <= levelNumber);
    if (reached.length === 0) break;
    if (reached.length === step.levels.length) {
      readable = target;
      previous = target;
      continue;
    }
    const fraction = studyCardCount(reached) / Math.max(1, studyCardCount(step.levels));
    readable = coverageAt(previous, target, fraction);
    break;
  }
  return { readable, total: coverage.total };
}
