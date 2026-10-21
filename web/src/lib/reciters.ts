export interface ReciterOption {
  key: string;
  name: string;
  style: string;
}

export const DEFAULT_RECITER_KEY = 'dosari-murattal';

export const RECITERS: ReciterOption[] = [
  { key: 'dosari-murattal', name: 'Yasser Al-Dosari', style: 'Murattal' },
  { key: 'afasy-murattal', name: 'Mishari Rashid Al-Afasy', style: 'Murattal' },
  { key: 'husary-murattal', name: 'Mahmoud Khalil Al-Husary', style: 'Murattal' },
  { key: 'minshawi-murattal', name: 'Muhammad Siddiq Al-Minshawi', style: 'Murattal' },
  { key: 'abdul-basit-murattal', name: 'Abdul Basit Abdul Samad', style: 'Murattal' },
  { key: 'muaiqly-murattal', name: "Maher Al-Mu'aiqly", style: 'Murattal' },
  { key: 'shatri-murattal', name: 'Abu Bakr Al-Shatri', style: 'Murattal' },
  { key: 'ghamdi-murattal', name: 'Saad Al-Ghamdi', style: 'Murattal' },
  { key: 'sudais-murattal', name: 'Abdul Rahman Al-Sudais', style: 'Murattal' },
  { key: 'shuraim-murattal', name: 'Saud Al-Shuraim', style: 'Murattal' },
];

export interface AyahAudioData {
  surah_number: number;
  ayah_number: number;
  audio_url: string;
  segments: [number, number, number][]; // [wordIndex, fromMs, toMs]
}

const reciterAudioCache = new Map<string, Record<string, AyahAudioData>>();

export async function fetchReciterAudioDataset(
  reciterKey: string
): Promise<Record<string, AyahAudioData>> {
  const cached = reciterAudioCache.get(reciterKey);
  if (cached) return cached;

  try {
    const res = await fetch(`/data/audio/${reciterKey}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = (await res.json()) as Record<string, AyahAudioData>;
    reciterAudioCache.set(reciterKey, data);
    return data;
  } catch (err) {
    console.warn(`Failed to fetch audio dataset for ${reciterKey}:`, err);
    return {};
  }
}

export function getCachedAyahAudio(
  reciterKey: string,
  surahNumber: number,
  ayahNumber: number
): AyahAudioData | undefined {
  const dataset = reciterAudioCache.get(reciterKey);
  if (!dataset) return undefined;
  const key = `${surahNumber}:${ayahNumber}`;
  return dataset[key];
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
