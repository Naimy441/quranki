import { createEmptyCard, State } from 'ts-fsrs';

import { serializeCard, type SerializedCard } from './fsrs';
import {
  ASMA_FIRST_LEVEL,
  buildGlobalSessionQueue,
  computeReachedLevel,
  deferReturnReviewBacklog,
  getIntroductionFrontier,
  isAsmaLevel,
  isStudyWord,
  LEVELS,
  RETURN_REVIEW_DAILY_CAP,
  THEMATIC_LEVEL_COUNT,
  type ProgressMap,
  type WordProgress,
} from './levels';

function learningCard(due: Date): SerializedCard {
  const card = createEmptyCard(new Date('2020-01-01T00:00:00Z'));
  card.state = State.Learning;
  card.due = due;
  card.stability = 0.4;
  card.difficulty = 5;
  card.reps = 1;
  return serializeCard(card);
}

function reviewCard(due: Date, stability: number): SerializedCard {
  const card = createEmptyCard(new Date('2020-01-01T00:00:00Z'));
  card.state = State.Review;
  card.due = due;
  card.stability = stability;
  card.difficulty = 4.5;
  card.reps = 6;
  card.lapses = 1;
  card.scheduled_days = 20;
  card.elapsed_days = 20;
  return serializeCard(card);
}

function entry(wordId: string, card: SerializedCard, lastGrade: WordProgress['lastGrade']): WordProgress {
  return { wordId, card, lastGrade, reviewedAt: '2020-01-01T00:00:00.000Z' };
}

function check(condition: unknown, message: string): asserts condition {
  if (!condition) throw new Error(message);
}

function dayKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${month}-${day}`;
}

const now = new Date(2026, 9, 9, 12, 0, 0);
const later = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 40);

const stage1 = LEVELS.filter((level) => level.number <= THEMATIC_LEVEL_COUNT);
const frequencyWord = LEVELS.find(
  (level) => level.number > THEMATIC_LEVEL_COUNT && !isAsmaLevel(level.number),
)?.words.find(isStudyWord);
check(frequencyWord, 'expected a frequency study word');

const introducedStage1: ProgressMap = {};
for (const level of stage1) {
  for (const word of level.words) {
    if (!isStudyWord(word)) continue;
    introducedStage1[word.id] = entry(word.id, learningCard(later), 'again');
  }
}
introducedStage1[frequencyWord.id] = entry(frequencyWord.id, learningCard(later), 'again');

const frontier = getIntroductionFrontier(introducedStage1);
check(frontier === ASMA_FIRST_LEVEL, 'names stay next once stage 1 words are introduced');

const fresh = buildGlobalSessionQueue(introducedStage1, now, 8).filter(
  (item) => item.reason === 'new' && item.word.kind !== 'grammar',
);
check(fresh.length > 0, 'return session still introduces new cards');
check(
  fresh.every((item) => isAsmaLevel(item.levelNumber)),
  `new cards should be Names of Allah, got ${fresh.map((item) => item.word.id).join(', ')}`,
);

const masteredStage1: ProgressMap = {};
for (const level of stage1) {
  for (const word of level.words) {
    if (!isStudyWord(word)) continue;
    masteredStage1[word.id] = entry(word.id, reviewCard(later, 30), 'good');
  }
}
masteredStage1[frequencyWord.id] = entry(frequencyWord.id, learningCard(later), 'again');
check(
  computeReachedLevel(masteredStage1) === ASMA_FIRST_LEVEL,
  'a frequency card must not skip the names stage',
);

const overdue: ProgressMap = {};
const stabilities: number[] = [];
for (let index = 0; index < 80; index += 1) {
  const stability = 3 + index;
  stabilities.push(stability);
  const due = new Date(now.getTime() - (80 - index) * 86_400_000);
  overdue[`card-${index}`] = entry(`card-${index}`, reviewCard(due, stability), 'good');
}

check(
  deferReturnReviewBacklog(overdue, now, dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1))) == null,
  'a one day gap keeps the normal review pile',
);
check(
  deferReturnReviewBacklog(overdue, now, dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 3))) == null,
  'a three day gap keeps the normal review pile',
);

const deferred = deferReturnReviewBacklog(
  overdue,
  now,
  dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10)),
);
check(deferred, 'a gap longer than 3 days should spread the backlog');
let stillDue = 0;
for (let index = 0; index < 80; index += 1) {
  const before = overdue[`card-${index}`]!;
  const after = deferred[`card-${index}`]!;
  check(after.card.stability === stabilities[index], 'stability stays put');
  check(after.card.reps === before.card.reps, 'reps stay put');
  check(after.card.lapses === before.card.lapses, 'lapses stay put');
  check(after.card.scheduled_days === before.card.scheduled_days, 'scheduled days stay put');
  check(after.card.difficulty === before.card.difficulty, 'difficulty stays put');
  check(after.card.state === before.card.state, 'review state stays put');
  const due = new Date(after.card.due).getTime();
  if (due <= now.getTime()) stillDue += 1;
  else check(due > new Date(before.card.due).getTime(), 'overflow only moves forward');
}
check(stillDue === RETURN_REVIEW_DAILY_CAP, `expected ${RETURN_REVIEW_DAILY_CAP} reviews still due, got ${stillDue}`);
check(
  deferReturnReviewBacklog(deferred, now, dayKey(new Date(now.getFullYear(), now.getMonth(), now.getDate() - 10))) == null,
  'the same return day does not push cards again',
);

console.log('return-and-names.test.ts passed');
