#!/usr/bin/env node
/**
 * One-off data-prep script for the Qur'an reader.
 *
 * Splits the large source JSON blobs (qpc-hafs-tajweed.json,
 * colored-english-wbw-translation.json, quran-metadata-surah-name.json) into:
 *   - src/data/quran/surahs/NNN.json   (one compact file per surah, 114 total)
 *   - src/data/quran/surah-index.json  (114 metadata rows for the surah list screen)
 *   - src/data/quran/bismillah.json    (the 4-word Bismillah, reused as a decorative header)
 *   - src/data/quran/loader.ts         (static per-surah require map, so Metro/Hermes only
 *                                        parses the surah JSON actually opened by the reader)
 *
 * Re-run with `node scripts/build-quran-reader-data.js` if the source data files change.
 */
const fs = require('fs');
const path = require('path');

const { buildVocabMatches, buildLemmaFallbackTags, loadMorphologyStems } = require('./vocab-word-matcher');

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

// Combining diacritics (harakat, tanween, Qur'anic annotation signs like small high marks)
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
  const surahMeta = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'quran-metadata-surah-name.json'), 'utf8'));
  const ayahTranslations = JSON.parse(
    fs.readFileSync(path.join(DATA_DIR, 'en-sahih-international-with-footnote-tags.json'), 'utf8'),
  );

  fs.mkdirSync(SURAHS_OUT_DIR, { recursive: true });

  const surahIndex = [];
  let bismillahWords = null;
  const ayahsBySurah = new Map();
  // Built up across every surah so word-family matching (see vocab-word-matcher.js) can expand a
  // single study word to every Qur'an occurrence sharing its root, wherever in the muṣḥaf it is.
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
        const arabicSegments = parseArabicSegments(text);
        if (isAyahEndMarker(arabicSegments)) {
          wordNumber += 1;
          continue;
        }

        const englishSegments = parseTranslationSegments(translations[location]);
        words.push({ p: wordNumber, ar: arabicSegments, en: englishSegments });
        wordNumber += 1;
      }
      if (words.length === 0) {
        throw new Error(`No words found for ayah ${surahNumber}:${ayahNumber}`);
      }
      const translation = parseAyahTranslation(ayahTranslations[`${surahNumber}:${ayahNumber}`]);
      ayahs.push({ a: ayahNumber, w: words, tr: translation });

      const ayahKey = `${surahNumber}:${ayahNumber}`;
      const locations = words.map((word) => `${ayahKey}:${word.p}`);
      words.forEach((word, i) => {
        surfaceByLocation.set(locations[i], word.ar.map((seg) => seg.t).join(''));
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
      ac: meta.verses_count,
      rp: meta.revelation_place === 'makkah' ? 'meccan' : 'medinan',
      b: meta.bismillah_pre,
    });
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
        const vocabId = unifiedTags.get(`${surahNumber}:${ayah.a}:${word.p}`);
        if (vocabId) {
          word.v = vocabId;
          taggedCount += 1;
        }
      }
    }
    const outPath = path.join(SURAHS_OUT_DIR, `${String(surahNumber).padStart(3, '0')}.json`);
    fs.writeFileSync(outPath, JSON.stringify(ayahs));
  }
  console.log(`Tagged ${taggedCount} of ${surfaceByLocation.size} Qur'an words with a vocabulary id.`);

  // How many times each vocab id (curated study word OR generated lemma id) actually occurs
  // across the whole Qur'an - lets the app show "X of the Qur'an's Y words are ones you know"
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
  console.log('Wrote surah-index.json, bismillah.json, loader.ts, vocab-coverage.json');
}

main();
