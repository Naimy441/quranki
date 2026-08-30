/**
 * Corpus morphology helpers used at build time: location-alignment checks, lemma/root
 * occurrence indexes, and the vocabulary-card → corpus-lemma mapping.
 *
 * Does not change how ReaderWord.v is assigned (that's still vocab-word-matcher.js).
 */
const fs = require('fs');
const path = require('path');

const {
  normalizeArabic,
  normalizeLight,
  hamzaFold,
  citationPhraseTokens,
} = require('./vocab-word-matcher');

const MORPHOLOGY_PATH = path.join(__dirname, 'data', 'quran-morphology.txt');
const OVERRIDES_PATH = path.join(__dirname, 'data', 'vocab-lemma-overrides.json');

/** Ayahs where the corpus fuses two mushaf words, shifting every later index. Never attach. */
const KNOWN_MISALIGNED = new Set(['2:181', '8:6', '13:37', '37:130']);

function parseMorphWordCounts() {
  const lines = fs.readFileSync(MORPHOLOGY_PATH, 'utf8').split('\n');
  const wordCountByAyah = new Map();
  let morphWords = 0;
  const seen = new Set();
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const loc = line.split('\t')[0];
    if (!loc) continue;
    const parts = loc.split(':');
    if (parts.length !== 4) continue;
    const wordKey = `${parts[0]}:${parts[1]}:${parts[2]}`;
    if (!seen.has(wordKey)) {
      seen.add(wordKey);
      morphWords += 1;
    }
    const ayahKey = `${parts[0]}:${parts[1]}`;
    wordCountByAyah.set(ayahKey, Math.max(wordCountByAyah.get(ayahKey) ?? 0, Number(parts[2])));
  }
  return { wordCountByAyah, morphWords };
}

/** Compare corpus surah:ayah:word indexes to the reader's. Matching uses location only. */
function verifyAlignment(ayahWordOrder) {
  const { wordCountByAyah, morphWords } = parseMorphWordCounts();
  let aligned = 0;
  const mismatched = [];
  for (const [ayahKey, locations] of ayahWordOrder) {
    const morphCount = wordCountByAyah.get(ayahKey);
    if (morphCount === locations.length) aligned += 1;
    else mismatched.push({ ayahKey, reader: locations.length, morph: morphCount ?? 0 });
  }
  const unexpected = mismatched.filter((row) => !KNOWN_MISALIGNED.has(row.ayahKey));
  const missingKnown = [...KNOWN_MISALIGNED].filter((key) => !mismatched.some((row) => row.ayahKey === key));
  return {
    readerAyahs: ayahWordOrder.size,
    morphAyahs: wordCountByAyah.size,
    morphWords,
    aligned,
    mismatched,
    unexpected,
    missingKnown,
    ok: unexpected.length === 0 && missingKnown.length === 0,
  };
}

function addCount(map, key) {
  if (!key) return;
  map.set(key, (map.get(key) ?? 0) + 1);
}

function majorityKey(countMap) {
  let best = null;
  let bestN = -1;
  for (const [key, n] of countMap) {
    if (n > bestN) {
      best = key;
      bestN = n;
    }
  }
  return best;
}

function buildMorphologyIndex(stemByLocation) {
  const lemmaAcc = new Map();
  const rootAcc = new Map();

  for (const stem of stemByLocation.values()) {
    const lemma = stem.lightLemma;
    if (lemma) {
      if (!lemmaAcc.has(lemma)) {
        lemmaAcc.set(lemma, { count: 0, raw: new Map(), roots: new Map(), pos: new Map() });
      }
      const acc = lemmaAcc.get(lemma);
      acc.count += 1;
      addCount(acc.raw, stem.rawLemma ?? lemma);
      addCount(acc.roots, stem.root);
      addCount(acc.pos, stem.corpusPos);
    }
    if (stem.root) {
      if (!rootAcc.has(stem.root)) rootAcc.set(stem.root, { count: 0, lemmas: new Map() });
      const acc = rootAcc.get(stem.root);
      acc.count += 1;
      addCount(acc.lemmas, lemma);
    }
  }

  const lemmas = {};
  for (const [lemma, acc] of lemmaAcc) {
    const entry = {
      count: acc.count,
      arabic: majorityKey(acc.raw) ?? lemma,
    };
    const root = majorityKey(acc.roots);
    if (root) entry.root = root;
    const pos = majorityKey(acc.pos);
    if (pos) entry.pos = pos;
    lemmas[lemma] = entry;
  }

  const roots = {};
  for (const [root, acc] of rootAcc) {
    const list = [...acc.lemmas.entries()]
      .filter(([lm]) => lm)
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ar'))
      .map(([lemma, count]) => ({
        lemma,
        arabic: lemmas[lemma]?.arabic ?? lemma,
        count,
      }));
    roots[root] = { count: acc.count, lemmas: list };
  }

  return { lemmas, roots };
}

function primaryTokens(word) {
  if (word.phrase || word.isSuffix || word.isPrefix) return [];
  // Construction cards ("إِنْ ... إِلَّا") must not inherit every piece's lemma.
  if (String(word.arabic ?? '').includes('...')) return [];
  const tokens = [];
  const firstForm = String(word.arabic ?? '')
    .split(/[,\u060c]/)[0]
    .trim();
  for (const token of firstForm.split(/\s+/).filter(Boolean)) tokens.push(token);
  for (const extra of [word.plural, word.variant].filter(Boolean)) {
    for (const token of citationPhraseTokens(extra)) tokens.push(token);
  }
  return [...new Set(tokens)];
}

/** Light lemma match, then hamza-fold only when the citation actually uses hamza/madda
 *  (قُرْآن vs قُرْءان). Do not fold every skeleton: that equates هُمْ "they" with هَمَّ. */
function matchTokenToLemmas(token, byLight) {
  const light = normalizeLight(token);
  if (byLight.has(light)) return [light];
  if (!/[\u0621\u0622]/.test(token)) return [];
  const folded = hamzaFold(normalizeArabic(token));
  const hits = [...byLight].filter((lemma) => {
    if (!/[\u0621\u0622]/.test(lemma) && !/[\u0621\u0622]/.test(token)) return false;
    return hamzaFold(normalizeArabic(lemma)) === folded;
  });
  return hits.length === 1 ? hits : [];
}

function isSingleTokenCard(word) {
  if (!word || word.phrase) return false;
  return citationPhraseTokens(word.arabic ?? '').length === 1;
}

function loadOverrides() {
  if (!fs.existsSync(OVERRIDES_PATH)) return {};
  return JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
}

/**
 * Auto-map study cards onto corpus lemmas by normalized citation comparison, then apply
 * scripts/data/vocab-lemma-overrides.json for sense splits and spelling mismatches.
 *
 * Conservative on purpose: a card may only claim lemmas its *headword* (or listed plural/
 * variant) actually is. Extra comma-separated case forms ("ذُو، ذَا، ذِي") must not pull in
 * umbrella lemmas the corpus uses for unrelated words (ذا = demonstratives).
 */
function buildVocabLemmaMap(studyWords, morphologyIndex) {
  const byLight = new Set(Object.keys(morphologyIndex.lemmas));

  const candidates = new Map();
  for (const word of studyWords) {
    if (word.kind === 'grammar' || word.isSuffix || word.isPrefix || word.phrase) continue;
    const hits = new Set();
    for (const token of primaryTokens(word)) {
      for (const lemma of matchTokenToLemmas(token, byLight)) hits.add(lemma);
    }
    if (hits.size > 0) candidates.set(word.id, { word, lemmas: hits });
  }

  const owners = new Map();
  for (const [id, { lemmas }] of candidates) {
    for (const lemma of lemmas) {
      if (!owners.has(lemma)) owners.set(lemma, []);
      owners.get(lemma).push(id);
    }
  }

  const auto = new Map();
  function addAuto(id, lemma) {
    if (!auto.has(id)) auto.set(id, new Set());
    auto.get(id).add(lemma);
  }

  const byId = new Map(studyWords.map((word) => [word.id, word]));
  for (const [lemma, ids] of owners) {
    if (ids.length === 1) {
      addAuto(ids[0], lemma);
      continue;
    }
    const singles = ids.filter((id) => isSingleTokenCard(byId.get(id)));
    if (singles.length === 1) {
      addAuto(singles[0], lemma);
      continue;
    }
    const lights = [...new Set(ids.map((id) => normalizeLight(citationPhraseTokens(byId.get(id)?.arabic ?? '')[0] ?? '')))];
    if (singles.length > 1 && lights.length === 1) {
      addAuto(ids.slice().sort()[0], lemma);
    }
  }

  const overrides = loadOverrides();
  const mapping = {};
  for (const word of studyWords) {
    if (word.kind === 'grammar') continue;
    const override = overrides[word.id];
    if (override) {
      mapping[word.id] = {
        ...override,
        lemmas: [...(override.lemmas ?? [])].map((lemma) => normalizeLight(lemma)).filter(Boolean),
      };
      continue;
    }
    const lemmas = [...(auto.get(word.id) ?? [])].sort((a, b) => a.localeCompare(b, 'ar'));
    if (lemmas.length > 0) mapping[word.id] = { lemmas };
  }

  const mapped = Object.keys(mapping).length;
  const withLemmas = Object.values(mapping).filter((entry) => (entry.lemmas?.length ?? 0) > 0).length;
  return { mapping, stats: { studyCards: studyWords.filter((w) => w.kind !== 'grammar').length, mapped, withLemmas } };
}

function attachMorphology(word, loc, stemByLocation) {
  const stem = stemByLocation.get(loc);
  if (!stem) return;
  if (stem.lightLemma) word.lm = stem.lightLemma;
  if (stem.root) word.rt = stem.root;
  if (stem.corpusPos) word.ps = stem.corpusPos;
  if (stem.readerSegments?.length) word.m = stem.readerSegments;
}

module.exports = {
  KNOWN_MISALIGNED,
  verifyAlignment,
  buildMorphologyIndex,
  buildVocabLemmaMap,
  attachMorphology,
};

if (require.main === module) {
  const { loadMorphologyStems } = require('./vocab-word-matcher');
  const DATA_DIR = path.join(__dirname, '..', 'src', 'data', 'quran', 'surahs');
  const ayahWordOrder = new Map();
  for (let n = 1; n <= 114; n += 1) {
    const ayahs = JSON.parse(fs.readFileSync(path.join(DATA_DIR, `${String(n).padStart(3, '0')}.json`), 'utf8'));
    for (const ayah of ayahs) {
      ayahWordOrder.set(`${n}:${ayah.a}`, ayah.w.map((word) => `${n}:${ayah.a}:${word.p}`));
    }
  }
  const report = verifyAlignment(ayahWordOrder);
  console.log(
    `Alignment: ${report.aligned}/${report.readerAyahs} ayahs match location-for-location. ` +
      `Known mismatches: ${report.mismatched.map((row) => row.ayahKey).join(', ') || 'none'}.`,
  );
  if (!report.ok) {
    if (report.unexpected.length) console.error('Unexpected mismatches', report.unexpected);
    if (report.missingKnown.length) console.error('Missing known mismatches', report.missingKnown);
    process.exit(1);
  }
  const stems = loadMorphologyStems(ayahWordOrder);
  const index = buildMorphologyIndex(stems);
  console.log(`Index: ${Object.keys(index.lemmas).length} lemmas, ${Object.keys(index.roots).length} roots.`);
  const بين = index.roots[normalizeArabic('بين')];
  const مبين = index.lemmas['مُبِين'];
  const اية = index.lemmas['ايَة'];
  console.log('مبين', مبين);
  console.log('اية', اية);
  console.log('root بين', بين ? { count: بين.count, forms: بين.lemmas.length } : null);
}
