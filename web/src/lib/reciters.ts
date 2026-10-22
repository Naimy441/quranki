/**
 * The 15 reciter+style combinations, shared with the mobile app. On the web each reciter's
 * per-ayah audio URLs and word timings live in `public/data/audio/<key>/<surah>.json`
 * (see `scripts/split-audio-data.mjs`).
 */

export type RecitationStyle = 'murattal' | 'mujawwad';

export interface ReciterOption {
  key: string;
  reciterName: string;
  style: RecitationStyle;
}

export interface ReciterGroup {
  id: string;
  name: string;
  options: ReciterOption[];
}

export const DEFAULT_RECITER_KEY = 'dosari-murattal';

function group(id: string, name: string, options: Omit<ReciterOption, 'reciterName'>[]): ReciterGroup {
  return { id, name, options: options.map((option) => ({ ...option, reciterName: name })) };
}

export const RECITER_GROUPS: ReciterGroup[] = [
  group('husary', 'Mahmoud Khalil Al-Husary', [
    { key: 'husary-mujawwad', style: 'mujawwad' },
    { key: 'husary-murattal', style: 'murattal' },
  ]),
  group('abdul-basit', 'Abdul Basit Abdul Samad', [
    { key: 'abdul-basit-mujawwad', style: 'mujawwad' },
    { key: 'abdul-basit-murattal', style: 'murattal' },
  ]),
  group('afasy', 'Mishari Rashid Al-Afasy', [{ key: 'afasy-murattal', style: 'murattal' }]),
  group('dosari', 'Yasser Al-Dosari', [{ key: 'dosari-murattal', style: 'murattal' }]),
  group('ghamdi', 'Saad Al-Ghamdi', [{ key: 'ghamdi-murattal', style: 'murattal' }]),
  group('minshawi', 'Muhammad Siddiq Al-Minshawi', [{ key: 'minshawi-murattal', style: 'murattal' }]),
  group('muaiqly', "Maher Al-Mu'aiqly", [{ key: 'muaiqly-murattal', style: 'murattal' }]),
  group('rifai', 'Hani Ar-Rifai', [{ key: 'rifai-murattal', style: 'murattal' }]),
  group('shatri', 'Abu Bakr Al-Shatri', [{ key: 'shatri-murattal', style: 'murattal' }]),
  group('shuraim', 'Saud Al-Shuraim', [{ key: 'shuraim-murattal', style: 'murattal' }]),
  group('sudais', 'Abdul Rahman Al-Sudais', [{ key: 'sudais-murattal', style: 'murattal' }]),
  group('tablawi', 'Mohamed Al-Tablawi', [{ key: 'tablawi-murattal', style: 'murattal' }]),
  group('tunaiji', 'Khalifa Al-Tunaiji', [{ key: 'tunaiji-murattal', style: 'murattal' }]),
];

const OPTIONS_BY_KEY: Map<string, ReciterOption> = new Map(
  RECITER_GROUPS.flatMap((g) => g.options).map((option) => [option.key, option]),
);

export function findReciterOption(key: string): ReciterOption | undefined {
  return OPTIONS_BY_KEY.get(key);
}

export function isReciterKey(value: unknown): value is string {
  return typeof value === 'string' && OPTIONS_BY_KEY.has(value);
}

export function styleLabel(style: RecitationStyle): string {
  return style === 'mujawwad' ? 'Mujawwad' : 'Murattal';
}

export function reciterLabel(key: string): string {
  const option = findReciterOption(key);
  if (!option) return 'Unknown reciter';
  return `${option.reciterName} - ${styleLabel(option.style)}`;
}

/** Flat list for pickers: one row per reciter and style. */
export const RECITERS = RECITER_GROUPS.flatMap((g) =>
  g.options.map((o) => ({ key: o.key, name: o.reciterName, style: styleLabel(o.style) })),
);

export interface AyahAudioData {
  audio_url: string;
  segments: [number, number, number][]; // [wordIndex (1-based), fromMs, toMs]
}

const surahAudioCache = new Map<string, Promise<Record<string, AyahAudioData>>>();

/** Loads one surah's ayah audio URLs and word timings for a reciter. */
export function fetchSurahAudio(reciterKey: string, surah: number): Promise<Record<string, AyahAudioData>> {
  const cacheKey = `${reciterKey}/${surah}`;
  let pending = surahAudioCache.get(cacheKey);
  if (!pending) {
    pending = fetch(`/data/audio/${reciterKey}/${surah}.json`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json() as Promise<Record<string, { u: string; s: [number, number, number][] }>>;
      })
      .then((raw) => {
        const out: Record<string, AyahAudioData> = {};
        for (const [ayah, entry] of Object.entries(raw)) out[ayah] = { audio_url: entry.u, segments: entry.s };
        return out;
      })
      .catch((err) => {
        surahAudioCache.delete(cacheKey);
        throw err;
      });
    surahAudioCache.set(cacheKey, pending);
  }
  return pending;
}

export async function getAyahAudio(reciterKey: string, surah: number, ayah: number): Promise<AyahAudioData | undefined> {
  const data = await fetchSurahAudio(reciterKey, surah);
  return data[String(ayah)];
}

/** 1-based word index matching the current playback time */
export function getActiveWordIndex(
  segments: [number, number, number][] | undefined,
  timeMs: number
): number {
  if (!segments || segments.length === 0) return 0;
  for (let i = 0; i < segments.length; i++) {
    const [wordIdx, start, end] = segments[i];
    if (timeMs >= start && timeMs <= end) {
      return wordIdx;
    }
  }

  // If between words, return the closest previous word
  let lastStarted = 0;
  for (const [wordIdx, start] of segments) {
    if (start <= timeMs) {
      lastStarted = wordIdx;
    } else {
      break;
    }
  }
  return lastStarted;
}

/** Direct playable URL for individual word audio */
export function getWordAudioUrl(surah: number, ayah: number, word: number): string {
  const s = String(surah).padStart(3, '0');
  const a = String(ayah).padStart(3, '0');
  const w = String(word).padStart(3, '0');
  return `https://audio.qurancdn.com/wbw/${s}_${a}_${w}.mp3`;
}
