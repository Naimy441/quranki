import { create } from 'zustand';

import {
  DEFAULT_MARK_COLOR,
  defaultPinName,
  EMPTY_QURAN_MARKS,
  MARK_NAME_MAX,
  newMarkId,
  RECENT_SURAH_LIMIT,
  type Bookmark,
  type BookmarkCollection,
  type LastRead,
  type Pin,
  type PinPlacement,
  type QuranMarksData,
  type RecentSurah,
} from '@/lib/quran-marks';
import { loadQuranMarksAsync, saveQuranMarksAsync } from '@/lib/storage';

const LAST_READ_PERSIST_MS = 800;
let persistTimer: ReturnType<typeof setTimeout> | null = null;

function persist(data: QuranMarksData, immediate = false) {
  if (persistTimer) {
    clearTimeout(persistTimer);
    persistTimer = null;
  }
  if (immediate) {
    void saveQuranMarksAsync(data);
    return;
  }
  persistTimer = setTimeout(() => {
    persistTimer = null;
    void saveQuranMarksAsync(data);
  }, LAST_READ_PERSIST_MS);
}

function snapshot(state: QuranMarksState): QuranMarksData {
  return {
    lastRead: state.lastRead,
    recentSurahs: state.recentSurahs,
    pins: state.pins,
    pinPlacements: state.pinPlacements,
    collections: state.collections,
    bookmarks: state.bookmarks,
  };
}

function clipName(name: string, fallback: string): string {
  const trimmed = name.trim().slice(0, MARK_NAME_MAX);
  return trimmed || fallback;
}

interface QuranMarksState extends QuranMarksData {
  hydrated: boolean;
  hydrating: boolean;
  hydrate: () => Promise<void>;
  setLastRead: (surah: number, ayah: number) => void;
  noteOpenedSurah: (surah: number) => void;
  addPin: (name: string, color?: string) => Pin;
  updatePin: (id: string, patch: { name?: string; color?: string }) => void;
  removePin: (id: string) => void;
  applyPin: (pinId: string, surah: number, ayah: number) => void;
  removePinFromAyah: (pinId: string, surah: number, ayah: number) => void;
  addCollection: (name: string, color?: string) => BookmarkCollection;
  updateCollection: (id: string, patch: { name?: string; color?: string }) => void;
  removeCollection: (id: string) => void;
  toggleBookmark: (collectionId: string, surah: number, ayah: number) => void;
  removeBookmark: (id: string) => void;
}

export const useQuranMarksStore = create<QuranMarksState>((set, get) => ({
  hydrated: false,
  hydrating: false,
  ...EMPTY_QURAN_MARKS,

  hydrate: async () => {
    if (get().hydrated || get().hydrating) return;
    set({ hydrating: true });
    const data = await loadQuranMarksAsync();
    set({ hydrated: true, hydrating: false, ...data });
  },

  setLastRead: (surah, ayah) => {
    if (!Number.isInteger(surah) || surah < 1 || surah > 114) return;
    if (!Number.isInteger(ayah) || ayah < 1) return;
    const state = get();
    const current = state.lastRead;
    const existing = state.recentSurahs.find((entry) => entry.n === surah);
    if (current?.surah === surah && current.ayah === ayah && existing?.ayah === ayah) return;
    const updatedAt = new Date().toISOString();
    const lastRead: LastRead = { surah, ayah, updatedAt };
    const recentSurahs: RecentSurah[] = existing
      ? state.recentSurahs.map((entry) => (entry.n === surah ? { ...entry, ayah } : entry))
      : [{ n: surah, ayah, openedAt: updatedAt }, ...state.recentSurahs].slice(0, RECENT_SURAH_LIMIT);
    set({ lastRead, recentSurahs });
    persist(snapshot(get()));
  },

  noteOpenedSurah: (surah) => {
    if (!Number.isInteger(surah) || surah < 1 || surah > 114) return;
    const openedAt = new Date().toISOString();
    const existing = get().recentSurahs.find((entry) => entry.n === surah);
    const rest = get().recentSurahs.filter((entry) => entry.n !== surah);
    const recentSurahs: RecentSurah[] = [
      { n: surah, ayah: existing?.ayah ?? 1, openedAt },
      ...rest,
    ].slice(0, RECENT_SURAH_LIMIT);
    if (get().recentSurahs[0]?.n === surah && get().recentSurahs[0]?.ayah === recentSurahs[0].ayah) {
      set({ recentSurahs });
      persist(snapshot(get()));
      return;
    }
    set({ recentSurahs });
    persist(snapshot(get()), true);
  },

  addPin: (name, color) => {
    const pin: Pin = {
      id: newMarkId('pin'),
      name: clipName(name, defaultPinName()),
      color: color || DEFAULT_MARK_COLOR,
      createdAt: new Date().toISOString(),
    };
    set({ pins: [pin, ...get().pins] });
    persist(snapshot(get()), true);
    return pin;
  },

  updatePin: (id, patch) => {
    const pins = get().pins.map((pin) => {
      if (pin.id !== id) return pin;
      return {
        ...pin,
        name: patch.name !== undefined ? clipName(patch.name, defaultPinName()) : pin.name,
        color: patch.color ?? pin.color,
      };
    });
    set({ pins });
    persist(snapshot(get()), true);
  },

  removePin: (id) => {
    set({
      pins: get().pins.filter((pin) => pin.id !== id),
      pinPlacements: get().pinPlacements.filter((placement) => placement.pinId !== id),
    });
    persist(snapshot(get()), true);
  },

  applyPin: (pinId, surah, ayah) => {
    if (!get().pins.some((pin) => pin.id === pinId)) return;
    const alreadyHere = get().pinPlacements.some(
      (entry) => entry.pinId === pinId && entry.surah === surah && entry.ayah === ayah,
    );
    if (alreadyHere) return;
    const createdAt = new Date().toISOString();
    const placement: PinPlacement = { id: newMarkId('pp'), pinId, surah, ayah, createdAt };
    // A pin lives on one ayah at a time; applying it here moves it off any previous ayah.
    const pinPlacements = [placement, ...get().pinPlacements.filter((entry) => entry.pinId !== pinId)];
    set({ pinPlacements });
    persist(snapshot(get()), true);
  },

  removePinFromAyah: (pinId, surah, ayah) => {
    const pinPlacements = get().pinPlacements.filter(
      (entry) => !(entry.pinId === pinId && entry.surah === surah && entry.ayah === ayah),
    );
    if (pinPlacements.length === get().pinPlacements.length) return;
    set({ pinPlacements });
    persist(snapshot(get()), true);
  },

  addCollection: (name, color) => {
    const collection: BookmarkCollection = {
      id: newMarkId('col'),
      name: clipName(name, 'Collection'),
      color: color || DEFAULT_MARK_COLOR,
      createdAt: new Date().toISOString(),
    };
    set({ collections: [collection, ...get().collections] });
    persist(snapshot(get()), true);
    return collection;
  },

  updateCollection: (id, patch) => {
    const collections = get().collections.map((collection) => {
      if (collection.id !== id) return collection;
      return {
        ...collection,
        name: patch.name !== undefined ? clipName(patch.name, 'Collection') : collection.name,
        color: patch.color ?? collection.color,
      };
    });
    set({ collections });
    persist(snapshot(get()), true);
  },

  removeCollection: (id) => {
    set({
      collections: get().collections.filter((collection) => collection.id !== id),
      bookmarks: get().bookmarks.filter((bookmark) => bookmark.collectionId !== id),
    });
    persist(snapshot(get()), true);
  },

  toggleBookmark: (collectionId, surah, ayah) => {
    const existing = get().bookmarks.find(
      (bookmark) => bookmark.collectionId === collectionId && bookmark.surah === surah && bookmark.ayah === ayah,
    );
    const bookmarks = existing
      ? get().bookmarks.filter((bookmark) => bookmark.id !== existing.id)
      : [
          {
            id: newMarkId('bm'),
            collectionId,
            surah,
            ayah,
            createdAt: new Date().toISOString(),
          } satisfies Bookmark,
          ...get().bookmarks,
        ];
    set({ bookmarks });
    persist(snapshot(get()), true);
  },

  removeBookmark: (id) => {
    set({ bookmarks: get().bookmarks.filter((bookmark) => bookmark.id !== id) });
    persist(snapshot(get()), true);
  },
}));
