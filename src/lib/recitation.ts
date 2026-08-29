/**
 * Husary Mujawwad (Hafs) recitation.
 *
 * Gapped (ayah-by-ayah): one MP3 per ayah, derived from the QUL 956 catalog
 * (`SSSAAA.mp3`) so the 2 MB JSON never ships in the bundle.
 *
 * Gapless (surah-by-surah): one MP3 per surah. Timestamps come from QUL recitation
 * id 164 (resource 567) when that surah is played, not up front for all 114.
 */
const GAPPED_CDN = 'https://audio-cdn.tarteel.ai/quran/husaryMujawwad';
const GAPLESS_CDN = 'https://audio-cdn.tarteel.ai/quran/surah/husary/mujawwad/mp3';
const GAPLESS_RECITATION_ID = 164;

/** Husary's gapped 1:1 file (the inserted opening Bismillah) has studio padding on both ends.
 *  Measured on `001001.mp3`: audible recitation runs ~3.85s–8.65s of a 10.4s file. */
export const BISMILLAH_AUDIO_START_SECONDS = 3.65;
export const BISMILLAH_AUDIO_END_SECONDS = 8.65;

export type AyahTiming = [fromMs: number, toMs: number];

export interface GaplessSurahMeta {
  url: string;
  size: number;
  ayahs: AyahTiming[];
}

export function recitationFileName(surahNumber: number, ayahNumber: number): string {
  const surah = String(surahNumber).padStart(3, '0');
  const ayah = String(ayahNumber).padStart(3, '0');
  return `${surah}${ayah}.mp3`;
}

export function getAyahAudioUrl(surahNumber: number, ayahNumber: number): string {
  return `${GAPPED_CDN}/${recitationFileName(surahNumber, ayahNumber)}`;
}

export function recitationAyahKey(surahNumber: number, ayahNumber: number): string {
  return `${surahNumber}:${ayahNumber}`;
}

export function gaplessSurahFileName(surahNumber: number): string {
  return `${String(surahNumber).padStart(3, '0')}.mp3`;
}

export function getGaplessSurahUrl(surahNumber: number): string {
  return `${GAPLESS_CDN}/${gaplessSurahFileName(surahNumber)}`;
}

export function getGaplessSegmentsUrl(surahNumber: number, ayahCount: number): string {
  return `https://qul.tarteel.ai/api/v1/audio/surah_segments/${GAPLESS_RECITATION_ID}?surah=${surahNumber}&from=1&to=${ayahCount}&per_page=${ayahCount}`;
}

/** Last ayah whose `time_from` is at or before `timeMs` (1-based). */
export function ayahAtTimeMs(timings: AyahTiming[], timeMs: number): number {
  if (!timings.length) return 1;
  let lo = 0;
  let hi = timings.length - 1;
  let index = 0;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (timings[mid][0] <= timeMs) {
      index = mid;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  return index + 1;
}

export function parseGaplessSegments(
  surahNumber: number,
  ayahCount: number,
  data: unknown,
): GaplessSurahMeta {
  if (!data || typeof data !== 'object') {
    throw new Error('Invalid segment payload');
  }
  const payload = data as {
    audio?: { url?: string; audio_size?: number };
    segments?: Record<string, { time_from?: number; time_to?: number }>;
  };
  const segments = payload.segments ?? {};
  const ayahs: AyahTiming[] = [];
  for (let ayah = 1; ayah <= ayahCount; ayah++) {
    const row = segments[`${surahNumber}:${ayah}`];
    if (row?.time_from == null || row?.time_to == null) {
      throw new Error('Incomplete timestamps');
    }
    ayahs.push([Number(row.time_from), Number(row.time_to)]);
  }
  return {
    url: payload.audio?.url || getGaplessSurahUrl(surahNumber),
    size: Number(payload.audio?.audio_size) || 0,
    ayahs,
  };
}
