/**
 * Thin wrapper around ts-fsrs (the open-source FSRS spaced-repetition algorithm used by
 * modern Anki). No optimizer/binding packages are used - just the scheduler with sane
 * defaults, matching Anki's default learning steps (1m -> 10m) for new cards.
 */
import { Card, createEmptyCard, fsrs, generatorParameters, Rating, State } from 'ts-fsrs';

export { Rating, State };
export type { Card };

export type GradeName = 'again' | 'hard' | 'good' | 'easy';

export const GRADE_NAMES: GradeName[] = ['again', 'hard', 'good', 'easy'];

export const GRADE_TO_RATING: Record<GradeName, Rating.Again | Rating.Hard | Rating.Good | Rating.Easy> = {
  again: Rating.Again,
  hard: Rating.Hard,
  good: Rating.Good,
  easy: Rating.Easy,
};

export const RATING_TO_GRADE: Partial<Record<Rating, GradeName>> = {
  [Rating.Again]: 'again',
  [Rating.Hard]: 'hard',
  [Rating.Good]: 'good',
  [Rating.Easy]: 'easy',
};

const params = generatorParameters({
  request_retention: 0.9,
  enable_fuzz: true,
});

const scheduler = fsrs(params);

/** A Card with Date fields converted to ISO strings, safe for JSON persistence. */
export interface SerializedCard {
  due: string;
  stability: number;
  difficulty: number;
  elapsed_days: number;
  scheduled_days: number;
  learning_steps: number;
  reps: number;
  lapses: number;
  state: State;
  last_review?: string;
}

export function createNewCard(now: Date = new Date()): Card {
  return createEmptyCard(now);
}

export function serializeCard(card: Card): SerializedCard {
  return {
    ...card,
    due: card.due.toISOString(),
    last_review: card.last_review ? card.last_review.toISOString() : undefined,
  };
}

export function deserializeCard(data: SerializedCard): Card {
  return {
    ...data,
    due: new Date(data.due),
    last_review: data.last_review ? new Date(data.last_review) : undefined,
  };
}

export interface GradeResult {
  card: Card;
  reviewedAt: Date;
}

/** Applies a rating to a card and returns the newly scheduled card. */
export function gradeCard(card: Card, grade: GradeName, now: Date = new Date()): GradeResult {
  const rating = GRADE_TO_RATING[grade];
  const { card: nextCard } = scheduler.next(card, now, rating);
  return { card: nextCard, reviewedAt: now };
}

export interface GradePreview {
  grade: GradeName;
  intervalMs: number;
  label: string;
}

/** Previews the resulting interval for all four ratings, without committing a review. */
export function previewGrades(card: Card, now: Date = new Date()): GradePreview[] {
  const preview = scheduler.repeat(card, now);
  return GRADE_NAMES.map((grade) => {
    const rating = GRADE_TO_RATING[grade];
    const item = preview[rating];
    const intervalMs = item.card.due.getTime() - now.getTime();
    return { grade, intervalMs, label: formatInterval(intervalMs) };
  });
}

/** Formats a millisecond interval the way Anki-style apps display it ("<1m", "6m", "3d", ...). */
export function formatInterval(ms: number): string {
  const minutes = ms / 60_000;
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = minutes / 60;
  if (hours < 24) return `${Math.round(hours)}h`;
  const days = hours / 24;
  if (days < 30) return `${Math.round(days * 10) / 10}d`;
  const months = days / 30;
  if (months < 12) return `${Math.round(months * 10) / 10}mo`;
  const years = months / 12;
  return `${Math.round(years * 10) / 10}y`;
}

/** Hide this word's gloss in the reader while the learner is still supposed to know it:
 *  Review (including Hard - still a review card) or Learning (working through 1m/10m). New
 *  cards and Relearning (just lapsed with Again) stay visible. */
export function shouldHideInReader(card: Card): boolean {
  return card.state === State.Review || card.state === State.Learning;
}

/** A word is considered "at least good" once it has graduated to Review state on a Good/Easy rating. */
export function isWordMastered(card: Card, lastGrade: GradeName | null): boolean {
  return card.state === State.Review && (lastGrade === 'good' || lastGrade === 'easy');
}

export function isCardDue(card: Card, now: Date = new Date()): boolean {
  return card.due.getTime() <= now.getTime();
}
