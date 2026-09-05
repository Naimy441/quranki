#!/usr/bin/env node
/**
 * Rebuilds src/data/quran/vocab-examples.json from the already-built surah files.
 * Does not rewrite surah JSON. Re-run the full reader build if those sources change.
 *
 *   node scripts/rebuild-vocab-examples.js
 */
const fs = require('fs');
const path = require('path');

const { buildVocabMatches, loadMorphologyStems, collectAffixLocations } = require('./vocab-word-matcher');
const { buildVocabExampleMap } = require('./pick-vocab-examples');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const OUT_DIR = path.join(DATA_DIR, 'quran');
const SURAHS_DIR = path.join(OUT_DIR, 'surahs');

function loadStudyById() {
  const curated = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'quranic-words.json'), 'utf8'));
  const generated = JSON.parse(fs.readFileSync(path.join(OUT_DIR, 'stage-levels.json'), 'utf8')).levels;
  const studyById = new Map();
  const exampleOfById = new Map();
  for (const level of [...curated.levels, ...generated]) {
    for (const word of level.words) {
      studyById.set(word.id, word);
      if (word.exampleOf) exampleOfById.set(word.id, word.exampleOf);
    }
  }
  return { studyById, exampleOfById };
}

function loadAyahs() {
  const ayahsBySurah = new Map();
  const surfaceByLocation = new Map();
  const ayahWordOrder = new Map();
  for (let surahNumber = 1; surahNumber <= 114; surahNumber += 1) {
    const ayahs = JSON.parse(
      fs.readFileSync(path.join(SURAHS_DIR, `${String(surahNumber).padStart(3, '0')}.json`), 'utf8'),
    );
    ayahsBySurah.set(surahNumber, ayahs);
    for (const ayah of ayahs) {
      const ayahKey = `${surahNumber}:${ayah.a}`;
      const locations = ayah.w.map((word) => `${ayahKey}:${word.p}`);
      ayahWordOrder.set(ayahKey, locations);
      ayah.w.forEach((word, i) => {
        surfaceByLocation.set(locations[i], word.ar.map((seg) => seg.t).join('').replace(/\s/g, ''));
      });
    }
  }
  return { ayahsBySurah, surfaceByLocation, ayahWordOrder };
}

function main() {
  console.log('Loading surahs and study words...');
  const { studyById, exampleOfById } = loadStudyById();
  const { ayahsBySurah, surfaceByLocation, ayahWordOrder } = loadAyahs();

  console.log('Matching study words against the mushaf...');
  const vocabMatches = buildVocabMatches(surfaceByLocation, ayahWordOrder);
  const stemByLocation = loadMorphologyStems(ayahWordOrder);
  const { suffixById, prefixById } = collectAffixLocations(studyById);

  const locationsByVocabId = new Map();
  const addLoc = (id, loc) => {
    if (!id || String(id).startsWith('lem:')) return;
    if (!locationsByVocabId.has(id)) locationsByVocabId.set(id, []);
    locationsByVocabId.get(id).push(loc);
  };
  for (const [loc, id] of vocabMatches) addLoc(id, loc);
  for (const [id, locs] of suffixById) for (const loc of locs) addLoc(id, loc);
  for (const [id, locs] of prefixById) for (const loc of locs) addLoc(id, loc);

  const onlyIds = new Set(process.argv.slice(2).filter((id) => /^\d+-\d+$/.test(id)));
  let existingExamples = {};
  const existingPath = path.join(OUT_DIR, 'vocab-examples.json');
  if (fs.existsSync(existingPath)) {
    existingExamples = JSON.parse(fs.readFileSync(existingPath, 'utf8'));
  }
  const existingForPick = { ...existingExamples };
  for (const id of onlyIds) delete existingForPick[id];

  console.log(onlyIds.size ? `Picking verse examples for ${[...onlyIds].join(', ')}...` : 'Picking verse examples...');
  const vocabExamples = buildVocabExampleMap({
    studyById,
    exampleOfById,
    locationsByVocabId,
    ayahsBySurah,
    ayahWordOrder,
    surfaceByLocation,
    stemByLocation,
    existingExamples: existingForPick,
    onlyIds: onlyIds.size ? onlyIds : undefined,
  });

  const written = onlyIds.size ? { ...existingExamples, ...vocabExamples } : vocabExamples;
  if (onlyIds.size) {
    for (const id of onlyIds) {
      if (!vocabExamples[id]) delete written[id];
    }
  }
  fs.writeFileSync(existingPath, JSON.stringify(written));
  const counts = Object.values(written).map((value) => (Array.isArray(value) ? value.length : 1));
  const withMany = counts.filter((count) => count > 1).length;
  const avg = counts.length === 0 ? 0 : counts.reduce((sum, count) => sum + count, 0) / counts.length;
  console.log(
    `Wrote ${counts.length} study words (${withMany} with multiple examples, avg ${avg.toFixed(2)}).`,
  );
}

main();
