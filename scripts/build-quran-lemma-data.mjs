#!/usr/bin/env node
/**
 * Builds lemma-frequency and word-position datasets from the Quranic Arabic
 * Corpus morphology v0.4 plain-text release.
 *
 * Source: https://corpus.quran.com/download/
 * Copyright (C) 2011 Kais Dukes, GPL; Quran text copyright Tanzil.info.
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, "..");
const sourcePath = process.argv[2] || "/private/tmp/quranic-corpus-morphology-0.4.txt";
const outputDir = resolve(rootDir, "data");

// The disconnected opening letters (ḥurūf muqaṭṭaʿāt) are intentionally
// omitted. QAC marks these 30 sequences with the INL (initial letters) tag.

// Quranic Arabic Corpus uses Buckwalter transliteration. This map makes the
// dataset convenient for Arabic display while retaining `buckwalter` exactly.
const arabic = {
  "'": "ء", "|": "آ", ">": "أ", "&": "ؤ", "<": "إ", "}": "ئ", A: "ا", b: "ب",
  p: "ة", t: "ت", v: "ث", j: "ج", H: "ح", x: "خ", d: "د", "*": "ذ", r: "ر",
  z: "ز", s: "س", "$": "ش", S: "ص", D: "ض", T: "ط", Z: "ظ", E: "ع", g: "غ",
  f: "ف", q: "ق", k: "ك", l: "ل", m: "م", n: "ن", h: "ه", w: "و", Y: "ى",
  y: "ي", F: "ً", N: "ٌ", K: "ٍ", a: "َ", u: "ُ", i: "ِ", "~": "ّ", o: "ْ",
  "`": "ٰ", "^": "ٓ", "{": "ٱ",
};

function toArabic(buckwalter) {
  return [...buckwalter].map((character) => arabic[character] ?? character).join("");
}

function getFeature(features, name) {
  const match = features.match(new RegExp(`(?:^|\\|)${name}:([^|]+)`));
  return match?.[1] ?? null;
}

const raw = await readFile(sourcePath, "utf8");
const words = new Map();

for (const line of raw.split(/\r?\n/)) {
  if (!line.startsWith("(")) continue;
  const [location, form, pos, features] = line.split("\t");
  if (!features) continue;
  const match = location.match(/^\((\d+):(\d+):(\d+):(\d+)\)$/);
  if (!match) throw new Error(`Unexpected location: ${location}`);
  const [, surah, ayah, word, segment] = match;
  const key = `${surah}:${ayah}:${word}`;
  const record = words.get(key) ?? {
    surah: Number(surah), ayah: Number(ayah), word: Number(word), segments: [], stems: [], isOpeningLetter: false,
  };
  record.isOpeningLetter ||= pos === "INL";
  record.segments.push({ form, pos, features, segment: Number(segment) });
  if (features.startsWith("STEM|")) {
    // QAC leaves LEM empty for some closed-class forms (notably pronouns).
    // A deterministic surface-form fallback gives the requested word-level
    // coverage without claiming it was an explicit QAC lemma.
    const lemma = getFeature(features, "LEM") ?? form;
    record.stems.push({ lemma, source: getFeature(features, "LEM") ? "qac" : "surface_fallback" });
  }
  words.set(key, record);
}

const includedWords = [...words.values()].filter((record) => !record.isOpeningLetter);

const lemmaStats = new Map();
for (const record of includedWords) {
  if (!record.stems.length) throw new Error(`No stem found for ${record.surah}:${record.ayah}:${record.word}`);
  for (const stem of record.stems) {
    const stat = lemmaStats.get(stem.lemma) ?? { buckwalter: stem.lemma, arabic: toArabic(stem.lemma), frequency: 0, qacLemma: stem.source === "qac" };
    stat.frequency += 1;
    stat.qacLemma ||= stem.source === "qac";
    lemmaStats.set(stem.lemma, stat);
  }
}

const lemmas = [...lemmaStats.values()]
  .sort((a, b) => b.frequency - a.frequency || a.buckwalter.localeCompare(b.buckwalter))
  .map((lemma, index) => ({ id: index + 1, ...lemma }));
const lemmaOccurrenceCount = lemmas.reduce((sum, lemma) => sum + lemma.frequency, 0);
let cumulativeFrequency = 0;
for (const lemma of lemmas) {
  cumulativeFrequency += lemma.frequency;
  lemma.cumulativeFrequency = cumulativeFrequency;
  // Rounded to six decimals so the JSON stays compact while remaining useful
  // for display and charting. The final entry is exactly 100.
  lemma.cumulativePercentage = lemma.id === lemmas.length
    ? 100
    : Number(((cumulativeFrequency / lemmaOccurrenceCount) * 100).toFixed(6));
}
const lemmaIdByBuckwalter = new Map(lemmas.map((lemma) => [lemma.buckwalter, lemma.id]));

const surahs = Array.from({ length: 114 }, (_, index) => ({ surah: index + 1, ayahs: [] }));
const ayahMap = new Map();
for (const record of [...words.values()].sort((a, b) => a.surah - b.surah || a.ayah - b.ayah || a.word - b.word)) {
  const verseKey = `${record.surah}:${record.ayah}`;
  let verse = ayahMap.get(verseKey);
  if (!verse) {
    verse = { ayah: record.ayah, words: [] };
    ayahMap.set(verseKey, verse);
    surahs[record.surah - 1].ayahs.push(verse);
  }
  if (record.isOpeningLetter) continue;
  const lemmaIds = [...new Set(record.stems.map(({ lemma }) => lemmaIdByBuckwalter.get(lemma)))];
  const surfaceBuckwalter = record.segments.map(({ form }) => form).join("");
  verse.words.push({
    position: record.word,
    arabic: toArabic(surfaceBuckwalter),
    buckwalter: surfaceBuckwalter,
    lemmaId: lemmaIds[0],
    lemmaIds,
  });
}

const metadata = {
  source: "Quranic Arabic Corpus morphology v0.4 (Kais Dukes), https://corpus.quran.com/download/",
  generatedAt: new Date().toISOString(),
  lemmaCount: lemmas.length,
  wordCount: includedWords.length,
  excludedOpeningLetterWordCount: words.size - includedWords.length,
  lemmaOccurrenceCount,
  notes: "The ḥurūf muqaṭṭaʿāt (disjoint opening letters) are excluded. Frequency counts stem-level lemma occurrences. A word with multiple stems can have multiple lemmaIds. qacLemma=false denotes a surface-form fallback where QAC does not supply LEM.",
};

await mkdir(outputDir, { recursive: true });
await writeFile(resolve(outputDir, "quran-lemmas.json"), JSON.stringify({ metadata, lemmas }, null, 2) + "\n");
await writeFile(resolve(outputDir, "quran-word-lemmas.json"), JSON.stringify({ metadata, surahs }, null, 2) + "\n");

console.log(JSON.stringify({ ...metadata, surahCount: surahs.length }));
