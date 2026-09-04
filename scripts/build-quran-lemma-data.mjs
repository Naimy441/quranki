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
const outputDir = resolve(rootDir, "src", "data");

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
  verse.words.push({ position: record.word, lemmaIds });
}

const metadata = {
  schemaVersion: 1,
  sourceVersion: "Quranic Arabic Corpus morphology v0.4",
  source: "https://corpus.quran.com/download/",
  lemmaCount: lemmas.length,
  wordCount: includedWords.length,
  excludedOpeningLetterWordCount: words.size - includedWords.length,
  lemmaOccurrenceCount,
  surfaceFallbackLemmaCount: lemmas.filter((lemma) => !lemma.qacLemma).length,
};

await mkdir(outputDir, { recursive: true });
const runtimeLemmas = lemmas.map(({ id, arabic: lemmaArabic, frequency }) => ({
  id,
  arabic: lemmaArabic,
  frequency,
}));
const wordMetadata = {
  schemaVersion: metadata.schemaVersion,
  sourceVersion: metadata.sourceVersion,
  wordCount: metadata.wordCount,
  excludedOpeningLetterWordCount: metadata.excludedOpeningLetterWordCount,
};
// These are generated build artifacts, not hand-edited source. Keep them minified so the
// repository and Metro bundle do not pay for indentation or redundant source transliteration.
await writeFile(resolve(outputDir, "quran-lemmas.json"), `${JSON.stringify({ metadata, lemmas: runtimeLemmas })}\n`);
await writeFile(resolve(outputDir, "quran-word-lemmas.json"), `${JSON.stringify({ metadata: wordMetadata, surahs })}\n`);

console.log(JSON.stringify({ ...metadata, surahCount: surahs.length }));
