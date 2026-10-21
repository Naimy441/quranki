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

export function formatInterval(ms: number): string {
  if (ms <= 0) return '< 1m';
  const minutes = Math.round(ms / (1000 * 60));
  if (minutes < 60) return `${Math.max(1, minutes)}m`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d`;
  const months = Math.round(days / 30);
  if (months < 12) return `${months}mo`;
  const years = Math.round(days / 365);
  return `${years}y`;
}

export function previewGrades(card: Card, now: Date = new Date()): GradePreview[] {
  const preview = scheduler.repeat(card, now);
  return GRADE_NAMES.map((grade) => {
    const rating = GRADE_TO_RATING[grade];
    const item = preview[rating];
    const intervalMs = item.card.due.getTime() - now.getTime();
    return { grade, intervalMs, label: formatInterval(intervalMs) };
  });
}

export function isCardDue(card: Card, now: Date = new Date()): boolean {
  return card.due.getTime() <= now.getTime();
}

export function isWordMastered(card: Card, lastGrade?: GradeName | null): boolean {
  if (lastGrade === 'good' || lastGrade === 'easy') return true;
  return card.state === State.Review && card.stability >= 21;
}

export function shouldHideInReader(card: Card): boolean {
  return card.state === State.Review && card.stability >= 1;
}
