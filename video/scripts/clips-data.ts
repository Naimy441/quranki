// Builds the word data the Shorts and the Al-Fatiha video read: Al-Fatiha word by word (text, gloss,
// lemma, root, corpus frequencies, Husary word timings) and the corpus counts quoted on screen.
// Run with: npx tsx scripts/clips-data.ts
import fs from 'node:fs';
import path from 'node:path';

const app = path.resolve(__dirname, '..', '..');
const out = path.resolve(__dirname, '..', 'src', 'data', 'clips');
const read = (p: string) => JSON.parse(fs.readFileSync(path.join(app, p), 'utf8'));
const strip = (html: string) => html.replace(/<[^>]+>/g, '').trim();

// Quranic Arabic Corpus: one line per segment, LOC \t FORM \t TAG \t FEATURES.
const lemmaCount = new Map<string, number>();
const rootCount = new Map<string, number>();
const segments = new Map<string, { form: string; lemma?: string; root?: string; affix: boolean }[]>();
for (const line of fs.readFileSync(path.join(app, 'scripts/data/quran-morphology.txt'), 'utf8').split('\n')) {
  if (!/^\d/.test(line)) continue;
  const [loc, form, , feat] = line.split('\t');
  const [s, a, w] = loc.split(':');
  const parts = feat.split('|');
  const f = Object.fromEntries(parts.filter((p) => p.includes(':')).map((p) => p.split(/:(.*)/s).slice(0, 2)));
  const affix = parts.includes('PREF') || parts.includes('SUFF');
  if (f.LEM && !affix) lemmaCount.set(f.LEM, (lemmaCount.get(f.LEM) ?? 0) + 1);
  if (f.ROOT) rootCount.set(f.ROOT, (rootCount.get(f.ROOT) ?? 0) + 1);
  const key = `${s}:${a}:${w}`;
  if (!segments.has(key)) segments.set(key, []);
  segments.get(key)!.push({ form, lemma: f.LEM, root: f.ROOT, affix });
}

const tajweed = read('src/data/qpc-hafs-tajweed.json');
const gloss = read('src/data/colored-english-wbw-translation.json');
const translit = read('src/data/english-wbw-transliteration.json');
const sahih = read('src/data/en-sahih-international-with-footnote-tags.json');
const husary = read('src/data/audio/husary-murattal.json');

const pad = (n: number) => String(n).padStart(3, '0');
const fatiha = [];
const lemmas = new Set<string>();
for (let a = 1; a <= 7; a += 1) {
  const words = [];
  for (let w = 1; gloss[`1:${a}:${w}`]; w += 1) {
    const key = `1:${a}:${w}`;
    const core = segments.get(key)!.find((s) => !s.affix && s.lemma);
    if (core?.lemma) lemmas.add(core.lemma);
    words.push({
      loc: key,
      ar: strip(tajweed[key].text),
      tl: translit[key],
      gloss: strip(gloss[key]),
      lemma: core?.lemma ?? null,
      root: core?.root ? [...core.root].join(' ') : null,
      lemmaFreq: core?.lemma ? lemmaCount.get(core.lemma)! : null,
      rootFreq: core?.root ? rootCount.get(core.root)! : null,
      audio: `wbw/001_${pad(a)}_${pad(w)}.mp3`,
    });
  }
  const seg: [number, number, number][] = husary[`1:${a}`].segments;
  fatiha.push({
    ayah: a,
    words,
    translation: strip(sahih[`1:${a}`].t.replace(/<sup[^>]*>.*?<\/sup>/g, '')),
    recitation: `rec/001-${pad(a)}.mp3`,
    /** Seconds into the recitation where each word starts. */
    wordStarts: seg.map(([, start]) => start / 1000),
  });
}
const occurrences = [...lemmas].reduce((n, l) => n + lemmaCount.get(l)!, 0);
const quranWords = segments.size;

fs.mkdirSync(out, { recursive: true });
fs.writeFileSync(
  path.join(out, 'fatiha.json'),
  JSON.stringify({ ayahs: fatiha, distinctLemmas: lemmas.size, occurrences, quranWords, share: +((occurrences / quranWords) * 100).toFixed(1) }, null, 1),
);
console.log(`Al-Fatiha: ${fatiha.reduce((n, a) => n + a.words.length, 0)} words, ${lemmas.size} lemmas, ${occurrences} occurrences of ${quranWords} (${((occurrences / quranWords) * 100).toFixed(1)}%)`);
