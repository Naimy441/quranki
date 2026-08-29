#!/usr/bin/env node
/**
 * After matcher/citation fixes, drop empty frequency-band cards and append leftover
 * corpus lemmas as new study cards until curated coverage reaches 95% of the mushaf.
 *
 * Run after `node scripts/build-quran-reader-data.js`, then rebuild again so the new
 * ids replace lem: tags.
 */
const fs = require('fs');
const path = require('path');

const { normalizeArabic, normalizeLight } = require('./vocab-word-matcher');

const ROOT = path.join(__dirname, '..');
const WORDS_PATH = path.join(ROOT, 'src', 'data', 'quranic-words.json');
const COVERAGE_PATH = path.join(ROOT, 'src', 'data', 'quran', 'vocab-coverage.json');
const SURAHS_DIR = path.join(ROOT, 'src', 'data', 'quran', 'surahs');
const MORPH_PATH = path.join(__dirname, 'data', 'quran-morphology.txt');
const OVERRIDES_PATH = path.join(__dirname, 'data', 'vocab-lemma-overrides.json');

const TARGET_RATIO = 0.95;
/** Extra leftover tokens so post-rebuild matching slack still clears 95%. */
const TOKEN_SLACK = 300;
const MIN_LEMMA_COUNT = 4;

const GLOSS_OVERRIDES = {
  شَيْء: 'thing',
  مُوْمِن: 'believer',
  مُوْمِنَة: 'believer (female)',
  ظالِم: 'wrongdoer',
  قَوْل: 'saying, word',
  خالِد: 'remaining forever',
  ذِكْر: 'remembrance, mention',
  وَعْد: 'promise',
  رِزْق: 'provision, sustenance',
  خَلْق: 'creation',
  سُوء: 'evil, harm',
  مُسْلِم: 'Muslim, one who submits',
  سُبْحان: 'glory (be to)',
  فاسِق: 'defiantly disobedient',
  مُشْرِك: 'one who associates partners with Allah',
  مُرْسَل: 'messenger, one who is sent',
  اِيمان: 'faith',
  كَذِب: 'lie, falsehood',
  خاسِر: 'loser',
  مُتَّقي: 'God-conscious, mindful',
  واحِدَة: 'one (female)',
  بَشَر: 'human being',
  رِيح: 'wind',
  نَبَا: 'news, tidings',
  خَوْف: 'fear',
  رِجال: 'men',
  ساجِد: 'one who prostrates',
  مُفْسِد: 'corrupter',
  ساحِر: 'magician',
  دُعاء: 'supplication, prayer',
  مَغْفِرَة: 'forgiveness',
  فَوْز: 'success, triumph',
  ظُلُمَة: 'darkness',
  مَنّ: 'manna, favor',
};

function isStudyWord(word) {
  return word.kind !== 'grammar';
}

function loadBestArabic() {
  const votes = new Map();
  const lines = fs.readFileSync(MORPH_PATH, 'utf8').split('\n');
  const segmentsByWord = new Map();
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const [loc, text, , featsRaw] = line.split('\t');
    if (!loc || !text || !featsRaw) continue;
    const parts = loc.split(':');
    if (parts.length !== 4) continue;
    const wordKey = `${parts[0]}:${parts[1]}:${parts[2]}`;
    if (!segmentsByWord.has(wordKey)) segmentsByWord.set(wordKey, []);
    segmentsByWord.get(wordKey).push({ text, feats: featsRaw.split('|') });
  }
  function vote(light, form, weight) {
    if (!light || !form) return;
    if (!votes.has(light)) votes.set(light, new Map());
    const map = votes.get(light);
    map.set(form, (map.get(form) ?? 0) + weight);
  }
  for (const segments of segmentsByWord.values()) {
    const stem = segments.find((s) => !s.feats.includes('PREF') && !s.feats.includes('SUFF'));
    const lemFeat = stem?.feats.find((f) => f.startsWith('LEM:'));
    if (!lemFeat) continue;
    const rawLem = lemFeat.slice(4);
    const light = normalizeLight(rawLem);
    vote(light, rawLem, 3);
    const stemText = segments
      .filter((s) => !s.feats.includes('PREF') && !s.feats.includes('SUFF'))
      .map((s) => s.text)
      .join('');
    if (stemText) vote(light, stemText, 1);
  }
  const best = new Map();
  for (const [light, map] of votes) {
    const winner = [...map.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ar'))[0][0];
    best.set(light, winner);
  }
  return best;
}

function loadReaderGlosses(wanted) {
  const glosses = new Map();
  const files = fs.readdirSync(SURAHS_DIR).filter((file) => file.endsWith('.json'));
  for (const file of files) {
    const ayahs = JSON.parse(fs.readFileSync(path.join(SURAHS_DIR, file), 'utf8'));
    for (const ayah of ayahs) {
      for (const word of ayah.w || []) {
        if (!word.v || !wanted.has(word.v)) continue;
        if (!glosses.has(word.v)) glosses.set(word.v, new Map());
        const g = (word.en || []).map((s) => s.t).join('').replace(/\s+/g, ' ').trim();
        if (!g) continue;
        const map = glosses.get(word.v);
        map.set(g, (map.get(g) ?? 0) + 1);
      }
    }
  }
  return glosses;
}

function cleanOneGloss(raw) {
  return raw
    .replace(/\[[^\]]*\]/g, ' ')
    .replace(/\([^)]*\)/g, ' ')
    .replace(/[«»""]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^(and |And )+/, '')
    .replace(/^(the |The |a |an |A |An )+/, '')
    .replace(/^(you |they |we |he |she |I |his |their |her |our |my |its )+/i, '')
    .replace(/^(used to |will |shall |have |has |had |are |is |was |were )+/i, '')
    .replace(/[.,;:]+$/g, '')
    .trim();
}

function pickGloss(lemma, variantMap, isVerb) {
  if (GLOSS_OVERRIDES[lemma]) return GLOSS_OVERRIDES[lemma];
  const clusters = new Map();
  for (const [raw, count] of variantMap ?? []) {
    const cleaned = cleanOneGloss(raw);
    if (cleaned.length < 2) continue;
    const key = cleaned.toLowerCase();
    const prev = clusters.get(key);
    if (prev) prev.count += count;
    else clusters.set(key, { text: cleaned, count });
  }
  const ranked = [...clusters.values()].sort((a, b) => b.count - a.count || a.text.length - b.text.length);
  let text = ranked[0]?.text ?? '—';
  if (isVerb && text !== '—' && !/^to /i.test(text) && !/\s/.test(text)) text = `to ${text}`;
  if (text !== '—') {
    text = text.charAt(0).toLowerCase() + text.slice(1);
    text = text.replace(/^to ([A-Z])/, (_, letter) => `to ${letter.toLowerCase()}`);
  }
  return text;
}

function loadVerbLemmas() {
  const verbCounts = new Map();
  const nounCounts = new Map();
  const lines = fs.readFileSync(MORPH_PATH, 'utf8').split('\n');
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const [, , pos, feats] = line.split('\t');
    const lem = (feats || '').split('|').find((f) => f.startsWith('LEM:'));
    if (!lem) continue;
    const lemma = normalizeLight(lem.slice(4));
    if (!lemma) continue;
    if (pos === 'V') verbCounts.set(lemma, (verbCounts.get(lemma) ?? 0) + 1);
    else nounCounts.set(lemma, (nounCounts.get(lemma) ?? 0) + 1);
  }
  const verbs = new Set();
  for (const [lemma, v] of verbCounts) {
    if (v >= (nounCounts.get(lemma) ?? 0)) verbs.add(lemma);
  }
  return verbs;
}

function bandOf(n) {
  if (n >= 100) return { key: '100+', title: 'Coverage (100+)' };
  if (n >= 50) return { key: '50-99', title: 'Coverage (50–99)' };
  if (n >= 25) return { key: '25-49', title: 'Coverage (25–49)' };
  if (n >= 10) return { key: '10-24', title: 'Coverage (10–24)' };
  if (n >= 8) return { key: '8-9', title: 'Coverage (8–9)' };
  if (n >= 5) return { key: '5-7', title: 'Coverage (5–7)' };
  return { key: '4', title: 'Coverage (4)' };
}

function packIntoLevels(items, startLevel, title) {
  const perLevel = 12;
  const levelCount = Math.max(1, Math.ceil(items.length / perLevel));
  const levels = [];
  for (let i = 0; i < levelCount; i += 1) {
    const number = startLevel + i;
    const slice = items.slice(i * perLevel, (i + 1) * perLevel);
    const numbered = levelCount > 1 ? `${title} · ${i + 1}` : title;
    levels.push({
      number,
      id: String(number).padStart(2, '0'),
      title: numbered,
      words: slice.map((item, idx) => {
        const variants = [item.variant, item.lemma]
          .filter(Boolean)
          .filter((form) => normalizeLight(form) !== normalizeLight(item.arabic));
        const unique = [...new Set(variants)];
        return {
          arabic: item.arabic,
          english: item.english,
          ...(unique.length ? { variant: unique.join(',') } : {}),
          id: `${String(number).padStart(2, '0')}-${String(idx + 1).padStart(3, '0')}`,
          lemma: item.lemma,
        };
      }),
    });
  }
  return levels;
}

function main() {
  const deck = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf8'));
  const coverage = JSON.parse(fs.readFileSync(COVERAGE_PATH, 'utf8'));
  const counts = coverage.occurrenceCounts;
  const total = coverage.totalWords;
  const need = Math.ceil(TARGET_RATIO * total);

  let currentStudySum = 0;
  for (const level of deck.levels) {
    for (const word of level.words) {
      if (isStudyWord(word)) currentStudySum += counts[word.id] ?? 0;
    }
  }
  if (currentStudySum >= need && deck.levels.some((level) => level.number >= 100)) {
    console.log(
      `Already at ${currentStudySum}/${total} (${((currentStudySum / total) * 100).toFixed(2)}%). ` +
        'Not regenerating coverage levels 100+ (rebuild tagged those leftovers onto existing ids).',
    );
    return;
  }

  // Rebuild of 100+ coverage bands is idempotent only when coverage.json still has leftover
  // lem: tags for those lemmas. After a successful reader rebuild, do not drop 100+.
  deck.levels = deck.levels.filter((level) => level.number < 100);

  let dropped = 0;
  for (const level of deck.levels) {
    if (level.number < 48) continue;
    const before = level.words.length;
    level.words = level.words.filter((word) => !isStudyWord(word) || (counts[word.id] ?? 0) > 0);
    dropped += before - level.words.length;
  }
  deck.levels = deck.levels.filter((level) => level.number < 48 || level.words.some(isStudyWord));

  let studySum = 0;
  for (const level of deck.levels) {
    for (const word of level.words) {
      if (isStudyWord(word)) studySum += counts[word.id] ?? 0;
    }
  }

  const leftovers = Object.entries(counts)
    .filter(([id]) => id.startsWith('lem:'))
    .map(([id, n]) => ({ id, lemma: id.slice(4), n }))
    .filter((item) => item.n >= MIN_LEMMA_COUNT)
    .sort((a, b) => b.n - a.n || a.lemma.localeCompare(b.lemma, 'ar'));

  const chosen = [];
  let acc = studySum;
  const used = new Set();
  for (const item of leftovers) {
    if (acc >= need + TOKEN_SLACK) break;
    if (used.has(item.lemma)) continue;
    chosen.push(item);
    used.add(item.lemma);
    acc += item.n;
  }

  const merged = [];
  const absorbed = new Set();
  for (const item of chosen) {
    if (absorbed.has(item.lemma)) continue;
    const femHeavy = `${normalizeArabic(item.lemma)}ة`;
    const pair = chosen.find((other) => other !== item && normalizeArabic(other.lemma) === femHeavy);
    // Only fold obvious participles (مؤمن/مؤمنة, ظالم/ظالمة). Never ظلم+ظلمة, حب+حبة, قبل+قبلة.
    const letters = normalizeArabic(item.lemma);
    const participle = /^مُ/.test(item.lemma) || (letters.length >= 3 && letters[1] === 'ا');
    if (pair && participle) {
      item.n += pair.n;
      item.feminine = pair.lemma;
      absorbed.add(pair.lemma);
    }
    merged.push(item);
  }

  const wanted = new Set(merged.map((item) => item.id));
  if (merged.some((item) => item.feminine)) {
    for (const item of merged) {
      if (item.feminine) wanted.add(`lem:${item.feminine}`);
    }
  }
  const glosses = loadReaderGlosses(wanted);
  const verbLemmas = loadVerbLemmas();
  const citations = loadBestArabic();

  for (const item of merged) {
    const cited = citations.get(item.lemma) ?? citations.get(normalizeLight(item.lemma)) ?? item.lemma;
    item.arabic = cited;
    item.english = pickGloss(
      item.lemma,
      glosses.get(item.id) ?? new Map(),
      verbLemmas.has(item.lemma) || verbLemmas.has(normalizeLight(item.lemma)),
    );
    if (item.feminine) item.variant = item.feminine;
  }

  const lastThematicOrFreq = Math.max(...deck.levels.map((level) => level.number));
  const startLevel = Math.max(100, lastThematicOrFreq + 1);
  const grouped = new Map();
  for (const item of merged) {
    const band = bandOf(item.n);
    if (!grouped.has(band.key)) grouped.set(band.key, { title: band.title, items: [] });
    grouped.get(band.key).items.push(item);
  }
  const newLevels = [];
  let next = startLevel;
  for (const { title, items } of grouped.values()) {
    const packed = packIntoLevels(items, next, title);
    newLevels.push(...packed);
    next += packed.length;
  }

  const overrides = JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'));
  for (const key of Object.keys(overrides)) {
    const levelNumber = Number(key.split('-')[0]);
    if (levelNumber >= 100) delete overrides[key];
  }
  for (const level of newLevels) {
    for (const word of level.words) {
      const lemmas = [word.lemma, word.variant].filter(Boolean);
      overrides[word.id] = { lemmas };
      delete word.lemma;
    }
  }

  deck.levels = [...deck.levels, ...newLevels];
  const studyCount = deck.levels.reduce(
    (sum, level) => sum + level.words.filter(isStudyWord).length,
    0,
  );
  deck.levelCount = deck.levels.length;
  deck.wordCount = studyCount;

  fs.writeFileSync(WORDS_PATH, `${JSON.stringify(deck, null, 2)}\n`);
  fs.writeFileSync(OVERRIDES_PATH, `${JSON.stringify(overrides, null, 2)}\n`);

  const added = merged.length;
  const addedTokens = merged.reduce((sum, item) => sum + item.n, 0);
  console.log(
    `Dropped ${dropped} empty frequency cards. Added ${added} leftover lemmas (+${addedTokens} tokens) as levels ${startLevel}–${next - 1}.`,
  );
  console.log(
    `Projected coverage ${acc}/${total} (${((acc / total) * 100).toFixed(2)}%). Deck is ${studyCount} study words.`,
  );
}

main();
