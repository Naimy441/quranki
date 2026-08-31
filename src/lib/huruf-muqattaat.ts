import hurufMuqattaatData from '@/data/huruf-muqattaat.json';

interface HurufMuqattaatEntry {
  sura_number: number;
  beginning_letters: string;
}

const entries = hurufMuqattaatData as HurufMuqattaatEntry[];

/** The opening-letter passages are ayah 1, except Ash-Shura where they span ayahs 1 and 2. */
const locations = new Set(
  entries.flatMap(({ sura_number, beginning_letters }) =>
    (beginning_letters.includes('/') ? [1, 2] : [1]).map((ayah) => `${sura_number}:${ayah}`),
  ),
);

/** Each listed opening-letter ayah is one displayed reader word. */
export const HURUF_MUQATTAAT_WORD_COUNT = locations.size;

export function isHurufMuqattaatAyah(surahNumber: number, ayahNumber: number): boolean {
  return locations.has(`${surahNumber}:${ayahNumber}`);
}
