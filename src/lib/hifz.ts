/**
 * Quran-memorization deck: one FSRS card per enrolled ruku. Separate from the vocabulary
 * ProgressMap so grading a ruku never touches word scheduling.
 */
import {
  createNewCard,
  deserializeCard,
  isCardDue,
  serializeCard,
  State,
  type Card,
  type GradeName,
  type SerializedCard,
} from '@/lib/fsrs';
import { getRuku, type Ruku } from '@/lib/ruku';

export interface HifzCardProgress {
  rukuId: number;
  card: SerializedCard;
  lastGrade: GradeName | null;
  reviewedAt: string;
}

export type HifzProgressMap = Record<string, HifzCardProgress>;

export interface HifzData {
  enrolledRukuIds: number[];
  cards: HifzProgressMap;
  /** True after the first-unlock memorization explainer has been finished. */
  introSeen: boolean;
}

export const EMPTY_HIFZ: HifzData = {
  enrolledRukuIds: [],
  cards: {},
  introSeen: false,
};

export type HifzQueueReason = 'new' | 'due';

export interface HifzSessionCard {
  ruku: Ruku;
  reason: HifzQueueReason;
}

export function hifzCardKey(rukuId: number): string {
  return String(rukuId);
}

export function isRukuEnrolled(data: HifzData, rukuId: number): boolean {
  return data.enrolledRukuIds.includes(rukuId);
}

export function createHifzCardProgress(rukuId: number, now: Date = new Date()): HifzCardProgress {
  return {
    rukuId,
    card: serializeCard(createNewCard(now)),
    lastGrade: null,
    reviewedAt: now.toISOString(),
  };
}

export function getHifzCard(data: HifzData, rukuId: number): Card {
  const stored = data.cards[hifzCardKey(rukuId)];
  return stored ? deserializeCard(stored.card) : createNewCard();
}

/** Learning/relearning first, then due reviews, then never-reviewed enrolled rukus. */
export function buildHifzSessionQueue(data: HifzData, now: Date = new Date()): HifzSessionCard[] {
  const learning: HifzSessionCard[] = [];
  const reviews: HifzSessionCard[] = [];
  const fresh: HifzSessionCard[] = [];

  for (const rukuId of data.enrolledRukuIds) {
    const ruku = getRuku(rukuId);
    if (!ruku) continue;
    const stored = data.cards[hifzCardKey(rukuId)];
    if (!stored) {
      fresh.push({ ruku, reason: 'new' });
      continue;
    }
    const card = deserializeCard(stored.card);
    if (card.state === State.New) {
      fresh.push({ ruku, reason: 'new' });
      continue;
    }
    if (!isCardDue(card, now)) continue;
    if (card.state === State.Learning || card.state === State.Relearning) {
      learning.push({ ruku, reason: 'due' });
    } else {
      reviews.push({ ruku, reason: 'due' });
    }
  }

  return [...learning, ...reviews, ...fresh];
}

export function countDueHifzCards(data: HifzData, now: Date = new Date()): { due: number; next: number } {
  const queue = buildHifzSessionQueue(data, now);
  return {
    due: queue.filter((entry) => entry.reason === 'due').length,
    next: queue.filter((entry) => entry.reason === 'new').length,
  };
}

export function sanitizeHifzData(raw: unknown): HifzData {
  if (!raw || typeof raw !== 'object') return { ...EMPTY_HIFZ, enrolledRukuIds: [], cards: {} };
  const data = raw as Partial<HifzData>;
  const seen = new Set<number>();
  const enrolledRukuIds: number[] = [];
  for (const id of data.enrolledRukuIds ?? []) {
    if (!Number.isInteger(id) || id < 1 || seen.has(id) || !getRuku(id)) continue;
    seen.add(id);
    enrolledRukuIds.push(id);
  }

  const cards: HifzProgressMap = {};
  for (const entry of Object.values(data.cards ?? {})) {
    if (!entry || !Number.isInteger(entry.rukuId) || !getRuku(entry.rukuId)) continue;
    if (!entry.card || typeof entry.reviewedAt !== 'string') continue;
    cards[hifzCardKey(entry.rukuId)] = {
      rukuId: entry.rukuId,
      card: entry.card,
      lastGrade: entry.lastGrade ?? null,
      reviewedAt: entry.reviewedAt,
    };
    if (!seen.has(entry.rukuId)) {
      seen.add(entry.rukuId);
      enrolledRukuIds.push(entry.rukuId);
    }
  }

  return { enrolledRukuIds, cards, introSeen: data.introSeen === true };
}
