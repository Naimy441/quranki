#!/usr/bin/env node
/**
 * One-off data-prep script for the Quran reader.
 *
 * Splits the large source JSON blobs (qpc-hafs-tajweed.json,
 * colored-english-wbw-translation.json, quran-metadata-surah-name.json) into:
 *   - src/data/quran/surahs/NNN.json   (one compact file per surah, 114 total)
 *   - src/data/quran/surah-index.json  (114 metadata rows for the surah list screen)
 *   - src/data/quran/bismillah.json    (the 4-word Bismillah, reused as a decorative header)
 *   - src/data/quran/loader.ts         (static per-surah require map, so Metro/Hermes only
 *                                        parses the surah JSON actually opened by the reader)
 *   - src/data/quran/vocab-coverage.json (study-id occurrence counts from the existing matcher)
 *   - src/data/quran/morphology-index.json (lemma/root counts from the corpus, by location)
 *   - src/data/quran/vocab-lemmas.json (study card → corpus lemma map; not yet used for hiding)
 *
 * Re-run with `node scripts/build-quran-reader-data.js` if the source data files change.
 */
const fs = require('fs');
const path = require('path');

const { buildVocabMatches, buildLemmaFallbackTags, loadMorphologyStems, collectAffixLocations, citationPhraseTokens, citationPhraseTokenizations, findPhraseRuns, findPartialExampleHits, collectStudyCores, collectVerbPersonLocations, INDEPENDENT_PRONOUN_BY_PERSON, normalizeLight } = require('./vocab-word-matcher');
const { verifyAlignment, buildMorphologyIndex, buildVocabLemmaMap, attachMorphology } = require('./corpus-lemma-map');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const OUT_DIR = path.join(DATA_DIR, 'quran');
const SURAHS_OUT_DIR = path.join(OUT_DIR, 'surahs');

const ARABIC_INDIC_DIGITS = /^[\u0660-\u0669]+$/;

// The class attribute appears unquoted (`class=X`), single-quoted (`class='X'`), or
// double-quoted with extra bogus attributes tacked on (`class="X" data-bs-original-title="" ...`)
// depending on the source word - all three forms occur in the dataset. Rule tags can also
// nest (e.g. a silent-letter rule inside a madd rule, for the one letter that's both), so this
// is a small stack-based tokenizer rather than a single non-nesting regex match: the innermost
// active rule wins for any given run of text, and outer rules apply to the rest of their range.
const TOKEN_RE = /<rule class=(?:"([a-zA-Z_]+)"[^>]*|'([a-zA-Z_]+)'|([a-zA-Z_]+))>|<\/rule>|([^<]+)/g;

// Combining diacritics (harakat, tanween, Quranic annotation signs like small high marks)
// have no width of their own - they're positioned by the font purely via GPOS mark-to-base
// attachment onto the glyph before them. The tajweed markup frequently closes/opens a <rule>
// tag right between a letter and its own trailing mark (e.g. a qalqalah letter tagged alone,
// with its tanween left outside the tag, or a madd rule that starts with the previous letter's
// fatha). Once each run becomes its own sibling <Text> for coloring, that split detaches the
// mark from its base - and inserting a ZWJ between runs for Android joining makes it worse,
// because the mark then attaches to the ZWJ. Fold any leading (or entire-run) combining marks
// into the immediately preceding run, regardless of the two runs' rule classes, so every base
// letter and its diacritics stay in one Text node.
const LEADING_COMBINING_MARKS = /^[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]+/;

function parseArabicSegments(raw) {
  const segments = [];
  const stack = [];
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(raw))) {
    if (m[4] !== undefined) {
      let text = m[4];
      const prev = segments[segments.length - 1];
      if (prev) {
        const marks = text.match(LEADING_COMBINING_MARKS)?.[0];
        if (marks) {
          prev.t += marks;
          text = text.slice(marks.length);
        }
      }
      if (!text) continue;
      const cls = stack[stack.length - 1];
      segments.push(cls ? { t: text, c: cls } : { t: text });
    } else if (m[0] === '</rule>') {
      stack.pop();
    } else {
      stack.push(m[1] ?? m[2] ?? m[3]);
    }
  }
  return segments;
}

// One word (32:3:3, "aftarahu") is corrupted in the source tajweed data: a literal "&gt;" HTML
// entity sits where a superscript-alef-bearing letter should be, presumably lost in an earlier
// conversion of this dataset. Patched here rather than in the raw source file.
const RAW_TEXT_FIXES = {
  '32:3:3': { from: '&gt;\u066e', to: '\u0649' },
};

/**
 * The tajweed source splits these written forms into two display words, while the Quranic Arabic
 * Corpus (and the word-by-word translation source) assigns each pair one word location. Keeping
 * the reader on the corpus boundary makes `surah:ayah:word` a stable key everywhere: lemma data,
 * morphology, word glosses, and transliteration all refer to the same word.
 *
 * Values are the first tajweed-source word position and the number of adjacent source words to
 * render at that corpus position. The English and transliteration data already use corpus
 * positions, so they deliberately stay at their output position when the Arabic runs are joined.
 */
const CORPUS_WORD_BOUNDARY_MERGES = {
  '2:181': [{ position: 3, sourceWordCount: 2 }], // بَعْدَ + مَا
  '8:6': [{ position: 4, sourceWordCount: 2 }], // بَعْدَ + مَا
  '13:37': [{ position: 8, sourceWordCount: 2 }], // بَعْدَ + مَا
  '37:130': [{ position: 3, sourceWordCount: 2 }], // إِلْ + يَاسِينَ
};

/** Make tajweed display-word boundaries match Quranic Arabic Corpus word locations. */
function alignWordsToCorpus(ayahKey, words) {
  const merges = CORPUS_WORD_BOUNDARY_MERGES[ayahKey];
  if (!merges) return words;

  const mergeByPosition = new Map(merges.map((merge) => [merge.position, merge]));
  const aligned = [];
  let sourcePosition = 1;

  for (let corpusPosition = 1; sourcePosition <= words.length; corpusPosition += 1) {
    const sourceWordCount = mergeByPosition.get(corpusPosition)?.sourceWordCount ?? 1;
    const displayWords = words.slice(sourcePosition - 1, sourcePosition - 1 + sourceWordCount);
    const annotationWord = words[corpusPosition - 1];
    if (displayWords.length !== sourceWordCount || !annotationWord) {
      throw new Error(`Invalid corpus word-boundary merge for ${ayahKey}:${corpusPosition}`);
    }
    aligned.push({
      ...annotationWord,
      p: corpusPosition,
      // Keep the mushaf's visible space even though this is one corpus word location.
      ar: displayWords.flatMap((word, index) => (index === 0 ? word.ar : [{ t: ' ' }, ...word.ar])),
    });
    sourcePosition += sourceWordCount;
  }

  return aligned;
}

function isAyahEndMarker(segments) {
  if (segments.length !== 1 || segments[0].c) return false;
  return ARABIC_INDIC_DIGITS.test(segments[0].t);
}

function parseTranslationSegments(raw) {
  if (!raw) return [];
  const segments = [];
  const re = /<span class='([a-z]+)'>(.*?)<\/span>( ?)/g;
  let m;
  while ((m = re.exec(raw))) {
    segments.push({ t: m[2] + m[3], c: m[1] });
  }
  return segments;
}

/**
 * Parses a Sahih International ayah translation (with inline `<sup foot_note="ID">N</sup>`
 * markers) into a flat list of plain-text runs and footnote markers, resolving each marker's
 * footnote body from the sibling `f` map so the reader never needs a second lookup at runtime.
 */
function parseAyahTranslation(entry) {
  if (!entry) return [];
  const { t: text, f: footnotes = {} } = entry;
  const parts = [];
  const re = /<sup foot_note="(\d+)">(\d+)<\/sup>/g;
  let lastIndex = 0;
  let m;
  while ((m = re.exec(text))) {
    if (m.index > lastIndex) parts.push({ t: text.slice(lastIndex, m.index) });
    parts.push({ n: m[2], fn: footnotes[m[1]] ?? '' });
    lastIndex = re.lastIndex;
  }
  if (lastIndex < text.length) parts.push({ t: text.slice(lastIndex) });
  return parts;
}

function main() {
  console.log('Loading source JSON files (this may take a moment)...');
  const tajweed = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'qpc-hafs-tajweed.json'), 'utf8'));
  const translations = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'colored-english-wbw-translation.json'), 'utf8'),
  );
  const transliterations = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'english-wbw-transliteration.json'), 'utf8'),
  );
  const surahMeta = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'quran-metadata-surah-name.json'), 'utf8'));
  const ayahTranslations = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'en-sahih-international-with-footnote-tags.json'), 'utf8'),
  );

  fs.mkdirSync(SURAHS_OUT_DIR, { recursive: true });

  const surahIndex = [];
  let bismillahWords = null;
  const ayahsBySurah = new Map();
  // Built up across every surah so word-family matching (see vocab-word-matcher.js) can expand a
  // single study word to every Quran occurrence sharing its root, wherever in the muṣḥaf it is.
  const surfaceByLocation = new Map();
  const ayahWordOrder = new Map();

  for (let surahNumber = 1; surahNumber <= 114; surahNumber += 1) {
    const meta = surahMeta[String(surahNumber)];
    if (!meta) throw new Error(`Missing metadata for surah ${surahNumber}`);

    const ayahs = [];
    for (let ayahNumber = 1; ayahNumber <= meta.verses_count; ayahNumber += 1) {
      const words = [];
      let wordNumber = 1;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const location = `${surahNumber}:${ayahNumber}:${wordNumber}`;
        const entry = tajweed[location];
        if (!entry) break;

        const fix = RAW_TEXT_FIXES[location];
        const text = fix ? entry.text.replace(fix.from, fix.to) : entry.text;
        let arabicSegments = parseArabicSegments(text);
        // Ishmam (U+06EB, 12:11 تَأْمَنَّا) and imala (U+06EA, 11:41 مَجْرَاهَا) are
        // positioned by the Uthmanic font as ligatures across the following letter.
        // Splitting those words into tajweed color runs detaches the mark and the
        // word falls apart on screen.
        const rareMarks = /[\u06EA\u06EB]/;
        const joinedArabic = arabicSegments.map((seg) => seg.t).join('');
        if (rareMarks.test(joinedArabic) && arabicSegments.length > 1) {
          arabicSegments = [{ t: joinedArabic }];
        }
        if (isAyahEndMarker(arabicSegments)) {
          wordNumber += 1;
          continue;
        }

        const englishSegments = parseTranslationSegments(translations[location]);
        const transliteration = transliterations[location];
        words.push({
          p: wordNumber,
          ar: arabicSegments,
          en: englishSegments,
          ...(transliteration ? { tl: transliteration } : {}),
        });
        wordNumber += 1;
      }
      if (words.length === 0) {
        throw new Error(`No words found for ayah ${surahNumber}:${ayahNumber}`);
      }
      const ayahKey = `${surahNumber}:${ayahNumber}`;
      const alignedWords = alignWordsToCorpus(ayahKey, words);
      const translation = parseAyahTranslation(ayahTranslations[ayahKey]);
      ayahs.push({ a: ayahNumber, w: alignedWords, tr: translation });

      const locations = alignedWords.map((word) => `${ayahKey}:${word.p}`);
      alignedWords.forEach((word, i) => {
        // Visible spaces inside a corpus word (the four merged cases above) are display-only.
        surfaceByLocation.set(locations[i], word.ar.map((seg) => seg.t).join('').replace(/\s/g, ''));
      });
      ayahWordOrder.set(ayahKey, locations);
    }

    if (surahNumber === 1) {
      bismillahWords = ayahs[0].w.slice(0, 4);
    }

    ayahsBySurah.set(surahNumber, ayahs);

    surahIndex.push({
      n: surahNumber,
      ar: meta.name_arabic,
      en: meta.name_simple,
      tr: meta.name,
      nt: meta.name_translation,
      ac: meta.verses_count,
      rp: meta.revelation_place === 'makkah' ? 'meccan' : 'medinan',
      b: meta.bismillah_pre,
    });
  }

  const alignment = verifyAlignment(ayahWordOrder);
  console.log(
    `Corpus location check: ${alignment.aligned}/${alignment.readerAyahs} ayahs map 1:1 ` +
      `(${alignment.mismatched.length} word-count mismatches).`,
  );
  if (!alignment.ok) {
    console.error('Corpus/reader location mismatches:', alignment.mismatched);
    throw new Error('Quranic Arabic Corpus locations do not match reader surah:ayah:word indexes.');
  }

  console.log('Matching study words (src/data/quranic-words.json) against every Qur\'an word...');
  const vocabMatches = buildVocabMatches(surfaceByLocation, ayahWordOrder);

  console.log('Grouping remaining words by corpus lemma (for user-marked "known words")...');
  const stemByLocation = loadMorphologyStems(ayahWordOrder);
  const lemmaFallbackTags = buildLemmaFallbackTags(stemByLocation, vocabMatches);
  const lemmaIdCount = new Set(lemmaFallbackTags.values()).size;
  console.log(
    `Grouped ${lemmaFallbackTags.size} otherwise-untagged words into ${lemmaIdCount} corpus-lemma ids ` +
      "outside the curriculum.",
  );

  // The unified id space every ReaderWord.v draws from: curated study-word ids take priority
  // (buildVocabMatches already resolved those with the deck's own citation forms), and every
  // remaining word with a resolvable dictionary lemma gets a generated "lem:<lemma>" id instead
  // of being left untagged - see buildLemmaFallbackTags's doc comment for why this doesn't
  // fragment or collide with curated ids.
  const unifiedTags = new Map(vocabMatches);
  for (const [loc, id] of lemmaFallbackTags) unifiedTags.set(loc, id);

  let taggedCount = 0;
  for (const [surahNumber, ayahs] of ayahsBySurah) {
    for (const ayah of ayahs) {
      for (const word of ayah.w) {
        const loc = `${surahNumber}:${ayah.a}:${word.p}`;
        const vocabId = unifiedTags.get(loc);
        if (vocabId) {
          word.v = vocabId;
          taggedCount += 1;
        }
        attachMorphology(word, loc, stemByLocation);
      }
    }
    const outPath = path.join(SURAHS_OUT_DIR, `${String(surahNumber).padStart(3, '0')}.json`);
    fs.writeFileSync(outPath, JSON.stringify(ayahs));
  }
  console.log(`Tagged ${taggedCount} of ${surfaceByLocation.size} Quran words with a vocabulary id.`);

  // How many times each vocab id (curated study word OR generated lemma id) actually occurs
  // across the whole Quran - lets the app show "X of the Quran's Y words are ones you know"
  // (real text coverage) rather than just "X of 547 vocab items mastered" (see
  // src/lib/quran-coverage.ts), and lets the reader show "appears N times" when a user marks an
  // arbitrary word as known.
  const occurrenceCounts = {};
  for (const vocabId of unifiedTags.values()) {
    occurrenceCounts[vocabId] = (occurrenceCounts[vocabId] ?? 0) + 1;
  }

  // The 4 Bismillah words are also rendered a second way: BismillahHeader repeats the exact same
  // 4 tagged words (see `bismillahWords` above) as a decorative header before ayah 1 of every
  // surah with `bismillah_pre: true` (112 of the 114 - all but Al-Fatihah, where it already *is*
  // ayah 1, and At-Tawbah, which has none). Marking one of those words "known" hides it in every
  // one of those headers too, so its on-screen occurrence count should include them - otherwise
  // e.g. "بِسْمِ" ("name", id 23-010) would show a misleadingly small 39 (just its real-ayah
  // occurrences) despite visually appearing 151 times across the app.
  const bismillahHeaderCount = surahIndex.filter((s) => s.b).length;
  for (const word of bismillahWords ?? []) {
    if (!word.v) continue;
    occurrenceCounts[word.v] = (occurrenceCounts[word.v] ?? 0) + bismillahHeaderCount;
  }

  const vocabCoverage = { totalWords: surfaceByLocation.size, occurrenceCounts };
  fs.writeFileSync(path.join(OUT_DIR, 'vocab-coverage.json'), JSON.stringify(vocabCoverage));

  const morphologyIndex = buildMorphologyIndex(stemByLocation);
  fs.writeFileSync(path.join(OUT_DIR, 'morphology-index.json'), JSON.stringify(morphologyIndex));
  console.log(
    `Wrote morphology index (${Object.keys(morphologyIndex.lemmas).length} lemmas, ` +
      `${Object.keys(morphologyIndex.roots).length} roots).`,
  );

  const studyWords = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'quranic-words.json'), 'utf8'));
  const studyById = new Map();
  const exampleOfById = new Map();
  const studyWordList = [];
  for (const level of studyWords.levels) {
    for (const word of level.words) {
      studyById.set(word.id, word);
      studyWordList.push(word);
      if (word.exampleOf) exampleOfById.set(word.id, word.exampleOf);
    }
  }

  const { mapping: vocabLemmas, stats: lemmaMapStats } = buildVocabLemmaMap(studyWordList, morphologyIndex);
  fs.writeFileSync(path.join(OUT_DIR, 'vocab-lemmas.json'), JSON.stringify(vocabLemmas));
  console.log(
    `Wrote vocab → lemma map for ${lemmaMapStats.withLemmas} of ${lemmaMapStats.studyCards} study cards ` +
      `(unmapped cards still use ReaderWord.v).`,
  );
  const { suffixById, prefixById } = collectAffixLocations(studyById);

  const locationsByVocabId = new Map();
  const addLoc = (id, loc) => {
    if (!id || String(id).startsWith('lem:')) return;
    if (!locationsByVocabId.has(id)) locationsByVocabId.set(id, []);
    locationsByVocabId.get(id).push(loc);
  };
  for (const [loc, id] of unifiedTags) addLoc(id, loc);
  for (const [id, locs] of suffixById) for (const loc of locs) addLoc(id, loc);
  for (const [id, locs] of prefixById) for (const loc of locs) addLoc(id, loc);

  function ayahPlainTranslation(ayah) {
    return ayah.tr.map((part) => (part.t !== undefined ? part.t : '')).join('').replace(/\s+/g, ' ').trim();
  }

  function scoreExample(surahNumber, wordCount, bonus = 0) {
    let score = wordCount;
    if (wordCount < 3) score += 40;
    if (wordCount > 14) score += (wordCount - 14) * 4;
    if (surahNumber === 1) score -= 10;
    if (surahNumber >= 78) score -= 4;
    return score - bonus;
  }

  function surfaceFitBonus(study, loc, ayah) {
    const [, , p] = loc.split(':').map(Number);
    const word = ayah.w.find((item) => item.p === p);
    if (!word) return 0;
    const surface = word.ar.map((seg) => seg.t).join('');
    const citation = citationPhraseTokens(study.arabic ?? '')[0] ?? study.arabic;
    const stem = stemByLocation.get(loc);
    const lightSurface = stem?.lightSurface ?? normalizeLight(surface);
    const lightCitation = normalizeLight(citation);
    if (lightSurface === lightCitation) return 12;
    if (lightSurface.endsWith(lightCitation) && lightSurface.length - lightCitation.length <= 2) return 4;
    return 0;
  }

  function packExample(s, a, p, n, ayah, hits) {
    const idx = ayah.w.findIndex((word) => word.p === p);
    if (idx < 0) return null;
    const toIndex = (wordP) => {
      const found = ayah.w.findIndex((word) => word.p === wordP);
      return found >= 0 ? found + 1 : wordP;
    };
    const example = {
      s,
      a,
      p: idx + 1,
      w: ayah.w.map((word) => word.ar.map((seg) => seg.t).join('')),
      tr: ayahPlainTranslation(ayah).slice(0, 180),
    };
    const hitIndexes = (hits ?? []).map(toIndex).filter((pos, i, arr) => arr.indexOf(pos) === i);
    if (hitIndexes.length > 1) example.hits = hitIndexes;
    else if (n > 1) example.n = n;
    return example;
  }

  function pickFromCandidates(candidates, study) {
    let best = null;
    let bestScore = Infinity;
    for (const candidate of candidates) {
      const { s, a, p, n, ayah, bonus, hits } = candidate;
      if (!ayah || !ayah.w.some((word) => word.p === p)) continue;
      const loc = `${s}:${a}:${p}`;
      const score = scoreExample(s, ayah.w.length, bonus + surfaceFitBonus(study, loc, ayah));
      if (score < bestScore) {
        bestScore = score;
        best = { s, a, p, n, ayah, hits };
      }
    }
    return best;
  }

  const studyCores = collectStudyCores(studyById);
  const personByIndependentId = Object.fromEntries(
    Object.entries(INDEPENDENT_PRONOUN_BY_PERSON).map(([person, id]) => [id, person]),
  );
  const vocabExamples = {};
  for (const [id, study] of studyById) {
    if (study.kind === 'grammar') continue;
    const locations = [...(locationsByVocabId.get(id) ?? [])];
    const person = personByIndependentId[id];
    if (person && locations.length === 0 && study.exampleVerse) {
      locations.push(...collectVerbPersonLocations(stemByLocation, person, study.arabic));
    }
    const phraseRuns = [];
    for (const tokens of citationPhraseTokenizations(study)) {
      phraseRuns.push(...findPhraseRuns(tokens, ayahWordOrder, surfaceByLocation, stemByLocation));
    }
    const preferred = study.exampleVerse;

    const fromRun = (run, bonus) => {
      const [s, a, p] = run.loc.split(':').map(Number);
      const ayahs = ayahsBySurah.get(s);
      const ayah = ayahs ? ayahs.find((row) => row.a === a) : null;
      return { s, a, p, n: run.n, ayah, bonus, hits: run.hits };
    };
    const fromLoc = (loc, bonus, n = 1) => {
      const [s, a, p] = loc.split(':').map(Number);
      const ayahs = ayahsBySurah.get(s);
      const ayah = ayahs ? ayahs.find((row) => row.a === a) : null;
      return { s, a, p, n, ayah, bonus };
    };

    const hitsInAyah = (s, a) => {
      const prefix = `${s}:${a}:`;
      const positions = new Set();
      for (const loc of locations) {
        if (loc.startsWith(prefix)) positions.add(Number(loc.split(':')[2]));
      }
      for (const run of phraseRuns) {
        if (!run.loc.startsWith(prefix)) continue;
        const start = Number(run.loc.split(':')[2]);
        for (let i = 0; i < run.n; i += 1) positions.add(start + i);
        for (const hit of run.hits ?? []) positions.add(hit);
      }
      const inAyah = findPartialExampleHits(
        study,
        studyCores,
        ayahWordOrder,
        surfaceByLocation,
        stemByLocation,
        prefix,
      );
      for (const run of inAyah) {
        positions.add(Number(run.loc.split(':')[2]));
        for (const hit of run.hits ?? []) positions.add(hit);
      }
      return [...positions].sort((x, y) => x - y);
    };

    let best = null;
    if (preferred) {
      const inAyah = (item) => item.s === preferred.s && item.a === preferred.a;
      best = pickFromCandidates(phraseRuns.map((run) => fromRun(run, 80)).filter(inAyah), study);
      if (!best) {
        const locPrefix = `${preferred.s}:${preferred.a}:`;
        best = pickFromCandidates(
          locations.filter((loc) => loc.startsWith(locPrefix)).map((loc) => fromLoc(loc, 80)),
          study,
        );
      }
    }
    if (!best && phraseRuns.length > 0) {
      best = pickFromCandidates(phraseRuns.map((run) => fromRun(run, 50)), study);
    }
    if (!best) {
      best = pickFromCandidates(locations.map((loc) => fromLoc(loc, 0)), study);
    }
    if (!best) {
      const partial = findPartialExampleHits(study, studyCores, ayahWordOrder, surfaceByLocation, stemByLocation);
      best = pickFromCandidates(partial.map((run) => fromRun(run, 15)), study);
    }
    if (best) {
      const extraHits = hitsInAyah(best.s, best.a);
      const hits = extraHits.length > 1 ? extraHits : best.hits;
      const packed = packExample(best.s, best.a, best.p, best.n, best.ayah, hits);
      if (packed) vocabExamples[id] = packed;
    }
  }
  for (const [id, ofId] of exampleOfById) {
    if (!vocabExamples[id] && vocabExamples[ofId]) vocabExamples[id] = vocabExamples[ofId];
  }
  fs.writeFileSync(path.join(OUT_DIR, 'vocab-examples.json'), JSON.stringify(vocabExamples));
  console.log(`Wrote verse examples for ${Object.keys(vocabExamples).length} study words.`);

  fs.writeFileSync(path.join(OUT_DIR, 'surah-index.json'), JSON.stringify(surahIndex, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'bismillah.json'), JSON.stringify(bismillahWords, null, 2));

  const loaderLines = [];
  for (let n = 1; n <= 114; n += 1) {
    const padded = String(n).padStart(3, '0');
    loaderLines.push(`  ${n}: () => require('./surahs/${padded}.json') as ReaderAyah[],`);
  }

  const loaderSource = `/**
 * Lazy per-surah data loaders, generated by scripts/build-quran-reader-data.js.
 * Each require() is only executed (and its JSON parsed) the first time a surah is opened,
 * and the result is cached so re-visiting a surah is instant.
 */
import type { ReaderAyah } from '@/lib/quran-reader-types';

const loaders: Record<number, () => ReaderAyah[]> = {
${loaderLines.join('\n')}
};

const cache = new Map<number, ReaderAyah[]>();

export function loadSurahAyahs(surahNumber: number): ReaderAyah[] {
  const cached = cache.get(surahNumber);
  if (cached) return cached;
  const loader = loaders[surahNumber];
  if (!loader) throw new Error(\`Unknown surah number: \${surahNumber}\`);
  const ayahs = loader();
  cache.set(surahNumber, ayahs);
  return ayahs;
}
`;
  fs.writeFileSync(path.join(OUT_DIR, 'loader.ts'), loaderSource);

  console.log(`Wrote ${surahIndex.length} surah files to ${SURAHS_OUT_DIR}`);
  console.log('Wrote surah-index.json, bismillah.json, loader.ts, vocab-coverage.json, vocab-examples.json, morphology-index.json, vocab-lemmas.json');
}

main();
