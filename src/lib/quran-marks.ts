import { getSurahAyahs, getSurahMeta } from '@/lib/quran-reader';

/** Palette for pins and bookmark collections. Saturated enough to read on both themes. */
export const MARK_COLORS = [
  '#E5484D',
  '#DE8A2E',
  '#E6B325',
  '#1E8E5A',
  '#2E7FC7',
  '#7C5CBF',
  '#E85D8C',
  '#6B7C85',
] as const;

export type MarkColor = (typeof MARK_COLORS)[number];

export const DEFAULT_MARK_COLOR: MarkColor = MARK_COLORS[3];

export const RECENT_SURAH_LIMIT = 8;
export const MARK_NAME_MAX = 40;

export interface LastRead {
  surah: number;
  ayah: number;
  updatedAt: string;
}

export interface RecentSurah {
  n: number;
  /** Last ayah the user was on in this surah. */
  ayah: number;
  openedAt: string;
}

/** A named, colored pin the user can check onto ayahs. */
export interface Pin {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

/** One ayah marked with a pin. An ayah can have several pins; each pin is on one ayah at a time. */
export interface PinPlacement {
  id: string;
  pinId: string;
  surah: number;
  ayah: number;
  createdAt: string;
}

export interface BookmarkCollection {
  id: string;
  name: string;
  color: string;
  createdAt: string;
}

export interface Bookmark {
  id: string;
  collectionId: string;
  surah: number;
  ayah: number;
  createdAt: string;
}

export interface QuranMarksData {
  lastRead: LastRead | null;
  recentSurahs: RecentSurah[];
  pins: Pin[];
  pinPlacements: PinPlacement[];
  collections: BookmarkCollection[];
  bookmarks: Bookmark[];
}

export const EMPTY_QURAN_MARKS: QuranMarksData = {
  lastRead: null,
  recentSurahs: [],
  pins: [],
  pinPlacements: [],
  collections: [],
  bookmarks: [],
};

export function newMarkId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function formatAyahRef(surah: number, ayah: number): string {
  return `${surah}:${ayah}`;
}

export function formatAyahLocation(surah: number, ayah: number): string {
  const meta = getSurahMeta(surah);
  const ref = formatAyahRef(surah, ayah);
  return meta ? `${meta.en} ${ref}` : ref;
}

export function getAyahArabicPreview(surah: number, ayah: number, wordCount = 6): string {
  const entry = getSurahAyahs(surah)[ayah - 1];
  if (!entry) return '';
  return entry.w
    .slice(0, wordCount)
    .map((word) => word.ar.map((seg) => seg.t).join(''))
    .join(' ');
}

export function defaultPinName(): string {
  return 'Pin';
}

function isValidSurah(n: number): boolean {
  return Number.isInteger(n) && n >= 1 && n <= 114;
}

function isValidAyah(n: number): boolean {
  return Number.isInteger(n) && n >= 1;
}

export function sanitizeQuranMarks(raw: unknown): QuranMarksData {
  if (!raw || typeof raw !== 'object') return EMPTY_QURAN_MARKS;
  const data = raw as Partial<QuranMarksData>;

  const lastRead =
    data.lastRead &&
    isValidSurah(data.lastRead.surah) &&
    isValidAyah(data.lastRead.ayah) &&
    typeof data.lastRead.updatedAt === 'string'
      ? data.lastRead
      : null;

  const seenRecent = new Set<number>();
  const recentSurahs: RecentSurah[] = [];
  for (const entry of data.recentSurahs ?? []) {
    if (!entry || !isValidSurah(entry.n) || typeof entry.openedAt !== 'string') continue;
    if (seenRecent.has(entry.n)) continue;
    seenRecent.add(entry.n);
    const ayah =
      isValidAyah(entry.ayah) ? entry.ayah : lastRead?.surah === entry.n ? lastRead.ayah : 1;
    recentSurahs.push({ n: entry.n, ayah, openedAt: entry.openedAt });
    if (recentSurahs.length >= RECENT_SURAH_LIMIT) break;
  }

  const { pins, pinPlacements } = sanitizePins(data);

  const collections: BookmarkCollection[] = [];
  const collectionIds = new Set<string>();
  for (const collection of data.collections ?? []) {
    if (!collection || typeof collection.id !== 'string' || typeof collection.name !== 'string') continue;
    if (typeof collection.color !== 'string' || typeof collection.createdAt !== 'string') continue;
    collections.push(collection);
    collectionIds.add(collection.id);
  }

  const bookmarks: Bookmark[] = [];
  const bookmarkKeys = new Set<string>();
  for (const bookmark of data.bookmarks ?? []) {
    if (!bookmark || typeof bookmark.id !== 'string' || typeof bookmark.collectionId !== 'string') continue;
    if (!collectionIds.has(bookmark.collectionId)) continue;
    if (!isValidSurah(bookmark.surah) || !isValidAyah(bookmark.ayah)) continue;
    if (typeof bookmark.createdAt !== 'string') continue;
    const key = `${bookmark.collectionId}:${bookmark.surah}:${bookmark.ayah}`;
    if (bookmarkKeys.has(key)) continue;
    bookmarkKeys.add(key);
    bookmarks.push(bookmark);
  }

  return { lastRead, recentSurahs, pins, pinPlacements, collections, bookmarks };
}

function pinKey(name: string, color: string): string {
  return `${name.trim().toLowerCase()}|${color}`;
}

function sanitizePins(data: Partial<QuranMarksData> & { pins?: unknown }): {
  pins: Pin[];
  pinPlacements: PinPlacement[];
} {
  const rawPins = Array.isArray(data.pins) ? data.pins : [];
  const rawPlacements = Array.isArray(data.pinPlacements) ? data.pinPlacements : [];
  const hasLegacy = rawPins.some(
    (pin) => pin && typeof pin === 'object' && 'surah' in pin && 'ayah' in pin,
  );

  if (hasLegacy && rawPlacements.length === 0) {
    const pins: Pin[] = [];
    const pinPlacements: PinPlacement[] = [];
    const byKey = new Map<string, Pin>();
    for (const raw of rawPins) {
      if (!raw || typeof raw !== 'object') continue;
      const pin = raw as Pin & { surah?: number; ayah?: number };
      if (typeof pin.id !== 'string' || typeof pin.name !== 'string') continue;
      if (typeof pin.color !== 'string' || typeof pin.createdAt !== 'string') continue;
      if (!isValidSurah(pin.surah ?? 0) || !isValidAyah(pin.ayah ?? 0)) continue;
      const key = pinKey(pin.name, pin.color);
      let definition = byKey.get(key);
      if (!definition) {
        definition = { id: pin.id, name: pin.name, color: pin.color, createdAt: pin.createdAt };
        byKey.set(key, definition);
        pins.push(definition);
      }
      pinPlacements.push({
        id: newMarkId('pp'),
        pinId: definition.id,
        surah: pin.surah as number,
        ayah: pin.ayah as number,
        createdAt: pin.createdAt,
      });
    }
    return { pins, pinPlacements };
  }

  const pins: Pin[] = [];
  const pinIds = new Set<string>();
  for (const pin of rawPins) {
    if (!pin || typeof pin !== 'object') continue;
    const next = pin as Pin;
    if (typeof next.id !== 'string' || typeof next.name !== 'string') continue;
    if (typeof next.color !== 'string' || typeof next.createdAt !== 'string') continue;
    pins.push({ id: next.id, name: next.name, color: next.color, createdAt: next.createdAt });
    pinIds.add(next.id);
  }

  const pinPlacements: PinPlacement[] = [];
  const seen = new Set<string>();
  for (const placement of rawPlacements) {
    if (!placement || typeof placement !== 'object') continue;
    const next = placement as PinPlacement;
    if (typeof next.id !== 'string' || typeof next.pinId !== 'string') continue;
    if (!pinIds.has(next.pinId) || !isValidSurah(next.surah) || !isValidAyah(next.ayah)) continue;
    if (typeof next.createdAt !== 'string') continue;
    const key = `${next.pinId}:${next.surah}:${next.ayah}`;
    if (seen.has(key)) continue;
    seen.add(key);
    pinPlacements.push(next);
  }

  return { pins, pinPlacements };
}
