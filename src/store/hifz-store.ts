import { create } from 'zustand';

import {
  createNewCard,
  deserializeCard,
  gradeCard,
  serializeCard,
  type Card,
  type GradeName,
} from '@/lib/fsrs';
import {
  createHifzCardProgress,
  EMPTY_HIFZ,
  hifzCardKey,
  type HifzCardProgress,
  type HifzData,
} from '@/lib/hifz';
import { getRuku } from '@/lib/ruku';
import { loadHifzAsync, saveHifzAsync } from '@/lib/storage';

function persist(data: HifzData) {
  void saveHifzAsync(data);
}

interface HifzState extends HifzData {
  hydrated: boolean;
  hydrating: boolean;
  hydrate: () => Promise<void>;
  enrollRuku: (rukuId: number) => void;
  unenrollRuku: (rukuId: number) => void;
  gradeRuku: (rukuId: number, grade: GradeName, options?: { fromCard?: Card }) => Card;
  revertSessionRuku: (rukuId: number, previous: HifzCardProgress | undefined) => void;
  markIntroSeen: () => void;
  resetIntroSeen: () => void;
  clearAll: () => void;
}

export const useHifzStore = create<HifzState>((set, get) => ({
  hydrated: false,
  hydrating: false,
  ...EMPTY_HIFZ,

  hydrate: async () => {
    if (get().hydrated || get().hydrating) return;
    set({ hydrating: true });
    const data = await loadHifzAsync();
    set({ hydrated: true, hydrating: false, ...data });
  },

  enrollRuku: (rukuId) => {
    if (!getRuku(rukuId)) return;
    const state = get();
    if (state.enrolledRukuIds.includes(rukuId)) return;
    const key = hifzCardKey(rukuId);
    const cards = state.cards[key]
      ? state.cards
      : { ...state.cards, [key]: createHifzCardProgress(rukuId) };
    const next = { enrolledRukuIds: [...state.enrolledRukuIds, rukuId], cards, introSeen: state.introSeen };
    set(next);
    persist(next);
  },

  unenrollRuku: (rukuId) => {
    const state = get();
    if (!state.enrolledRukuIds.includes(rukuId)) return;
    const cards = { ...state.cards };
    delete cards[hifzCardKey(rukuId)];
    const next = {
      enrolledRukuIds: state.enrolledRukuIds.filter((id) => id !== rukuId),
      cards,
      introSeen: state.introSeen,
    };
    set(next);
    persist(next);
  },

  gradeRuku: (rukuId, grade, options) => {
    const key = hifzCardKey(rukuId);
    const existing = get().cards[key];
    const source =
      options?.fromCard ??
      (existing ? deserializeCard(existing.card) : createNewCard());
    const result = gradeCard(source, grade);
    const entry: HifzCardProgress = {
      rukuId,
      card: serializeCard(result.card),
      lastGrade: grade,
      reviewedAt: result.reviewedAt.toISOString(),
    };
    const enrolledRukuIds = get().enrolledRukuIds.includes(rukuId)
      ? get().enrolledRukuIds
      : [...get().enrolledRukuIds, rukuId];
    const cards = { ...get().cards, [key]: entry };
    const next = { enrolledRukuIds, cards, introSeen: get().introSeen };
    set(next);
    persist(next);
    return result.card;
  },

  revertSessionRuku: (rukuId, previous) => {
    const key = hifzCardKey(rukuId);
    const cards = { ...get().cards };
    if (previous) cards[key] = previous;
    else delete cards[key];
    const next = { enrolledRukuIds: get().enrolledRukuIds, cards, introSeen: get().introSeen };
    set(next);
    persist(next);
  },

  markIntroSeen: () => {
    const state = get();
    if (state.introSeen) return;
    const next = { enrolledRukuIds: state.enrolledRukuIds, cards: state.cards, introSeen: true };
    set(next);
    persist(next);
  },

  resetIntroSeen: () => {
    const state = get();
    const next = { enrolledRukuIds: state.enrolledRukuIds, cards: state.cards, introSeen: false };
    set(next);
    persist(next);
  },

  clearAll: () => {
    const next = { ...EMPTY_HIFZ };
    set(next);
    persist(next);
  },
}));
