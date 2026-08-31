#!/usr/bin/env node
/**
 * Appends leftover corpus lemmas (5+ Quran occurrences, not already in levels 1–47) as
 * frequency-ordered study levels 48–99. Re-run after changing leftover coverage, then
 * `node scripts/build-quran-reader-data.js` so those locations switch from lem:… to 48-001 etc.
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const { normalizeArabic, normalizeLight, normalizeLightLoose } = require('./vocab-word-matcher');

const ROOT = path.join(__dirname, '..');
const WORDS_PATH = path.join(ROOT, 'src', 'data', 'quranic-words.json');
const SURAHS_DIR = path.join(ROOT, 'src', 'data', 'quran', 'surahs');
const MORPH_PATH = path.join(__dirname, 'data', 'quran-morphology.txt');
const POOL_PATH = path.join(__dirname, 'data', 'leftover-frequency-5plus.json');

/** Citation glosses where the most common reader phrasing is inflected, mixed, or misleading. */
const GLOSS_OVERRIDES = {
  كان: 'to be, was',
  كُلّ: 'every, all',
  رَاَي: 'to see',
  سَماء: 'sky, heaven',
  لَعَلّ: 'perhaps, so that',
  رَحْمَة: 'mercy',
  عِلْم: 'knowledge',
  هُدًي: 'guidance',
  يُخادِع: 'to seek to deceive',
  يَخْدَع: 'to deceive',
  حَياة: 'life',
  اَطاع: 'to obey',
  لاكِن: 'but',
  لاكِنّ: 'but (emphatic)',
  بُنَيّ: 'children (of)',
  صالِحَة: 'righteous deed',
  تَلَي: 'to recite',
  صادِق: 'truthful',
  اَقام: 'to establish',
  قاتَل: 'to fight',
  مَوْت: 'death',
  اَحْيا: 'to give life',
  مَلَكَت: 'what the right hand possesses',
  اسْتَطاع: 'to be able',
  ضَلال: 'error, misguidance',
  مُحْسِن: 'doer of good',
  مَعْرُوف: 'what is right, fair',
  مَيِّت: 'dead',
  عَصا: 'staff; to disobey',
  مُسْتَقِيم: 'straight',
  قام: 'to stand',
  كاذِب: 'liar',
  اِذًا: 'then, in that case',
  لَبِث: 'to remain',
  جُند: 'troops, hosts',
  حُكْم: 'judgment, wisdom',
  مَصِير: 'destination, return',
  باب: 'gate, door',
  غافِل: 'unaware, heedless',
  مُنافِق: 'hypocrite',
  كَيْد: 'plot, scheme',
  خَلا: 'to pass away',
  جادَل: 'to dispute, argue',
  طايِفَة: 'a group, party',
  طَعام: 'food',
  سَبْع: 'seven',
  فُلْك: 'ship',
  قَرْن: 'generation',
  مِسْكِين: 'needy, poor',
  يَتِيم: 'orphan',
  امْرَاَت: 'woman, wife',
  بَرّ: 'land; righteous',
  فَرِح: 'to rejoice',
  كَاَنّ: 'as if',
  كَأَنْ: 'as if',
  كَاَن: 'as if',
  هاد: 'Jew',
  آوَى: 'to give shelter',
  مَاْوَي: 'abode, refuge',
  يَرْجُوا: 'to hope',
  اسْتُهْزِي: 'to be mocked',
  اشْتَرَي: 'to buy, exchange',
  اَعْمَي: 'blind',
  حَسَن: 'good, beautiful',
  شاهِد: 'witness',
  شَهْر: 'month',
  صابِر: 'patient',
  كَتَم: 'to conceal',
  مَش: 'to walk',
  مُكَذِّب: 'denier',
  نَصِيب: 'portion, share',
  اَقْسَم: 'to swear',
  اَمات: 'to cause death',
  بَلَو: 'to test',
  حِزْب: 'party, group',
  حَقَّ: 'to prove true, become due',
  حَيّ: 'living, alive',
  سَبَق: 'to precede',
  سَعَي: 'to strive, run',
  قَصَّ: 'to relate, narrate',
  مَرَّة: 'time, occasion',
  هارُون: 'Aaron (Harun)',
  شَجَرَة: 'tree',
  طَيْر: 'bird',
  مُصَدِّق: 'confirming',
  نَبَا: 'news, tidings',
  نَفَخ: 'to blow',
};

const SPELLING_FIXES = {
  باب: 'بَاب',
  عام: 'عَام',
  طاغي: 'طَاغِي',
  غاوي: 'غَاوِي',
  حَياة: 'حَيَاة',
  ضَلال: 'ضَلَال',
  صالِحَة: 'صَالِحَة',
  صادِق: 'صَادِق',
  كاذِب: 'كَاذِب',
  غافِل: 'غَافِل',
  مُنافِق: 'مُنَافِق',
  شاهِد: 'شَاهِد',
  صابِر: 'صَابِر',
  طَعام: 'طَعَام',
  تُراب: 'تُرَاب',
  فُؤاد: 'فُؤَاد',
  مِيزان: 'مِيزَان',
  جُند: 'جُنْد',
  عَصا: 'عَصَا',
  خَلا: 'خَلَا',
  مَش: 'مَشَى',
  نَبَا: 'نَبَأ',
  قام: 'قَامَ',
  هُدًي: 'هُدَى',
  هُدًى: 'هُدَى',
  يُخادِع: 'خَادَعَ',
  يَخْدَع: 'خَدَعَ',
};

/** Clearer, shorter labels for the original thematic curriculum (levels 1–47). */
const THEMATIC_TITLES = {
  1: 'This and That',
  2: 'Yes and No',
  3: 'Possessive Endings',
  4: 'Pronouns',
  5: 'Prepositions 1',
  6: 'Questions',
  7: 'Adjectives',
  8: 'Time Words',
  9: 'Prepositions + mā',
  10: 'Prepositions 2',
  11: 'Verb Prefixes',
  12: 'Innā and Sisters',
  13: "Allah's Attributes 1",
  14: "Allah's Attributes 2",
  15: 'Comparatives',
  16: 'More Attributes',
  17: 'Prophets',
  18: "Allah's Signs",
  19: 'The Last Day 1',
  20: 'The Last Day 2',
  21: 'The Religion',
  22: 'Faith',
  23: 'Deeds',
  24: 'Blessings',
  25: 'Relatives',
  26: 'Body Parts',
  27: 'The World',
  28: 'People',
  29: 'Verbs 1',
  30: 'Verbs 2',
  31: 'Verbs 3',
  32: 'Verbs 4',
  33: 'Verbs 5',
  34: 'Doubled-root Verbs',
  35: 'Assimilated Verbs',
  36: 'Hollow Verbs',
  37: 'Defective Verbs',
  38: 'Hamzated Verbs',
  39: 'Form II Verbs 1',
  40: 'Form II–III Verbs',
  41: 'Form IV Verbs 1',
  42: 'Form IV Verbs 2',
  43: 'Form IV Verbs 3',
  44: 'Form IV Verbs 4',
  45: 'Form V–VI Verbs',
  46: 'Form VII–VIII Verbs',
  47: 'Form IX–X Verbs',
};

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
  for (const [raw, count] of variantMap) {
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

function chunkSizes(total, levels) {
  const base = Math.floor(total / levels);
  const extra = total % levels;
  return Array.from({ length: levels }, (_, i) => base + (i < extra ? 1 : 0));
}

function packIntoLevels(items, startLevel, levelCount, title) {
  if (items.length === 0 || levelCount <= 0) return [];
  const sizes = chunkSizes(items.length, levelCount);
  const levels = [];
  let offset = 0;
  for (let i = 0; i < levelCount; i += 1) {
    const number = startLevel + i;
    const slice = items.slice(offset, offset + sizes[i]);
    offset += sizes[i];
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
        };
      }),
    });
  }
  return levels;
}

function bandOf(occurrences) {
  if (occurrences >= 100) return { key: '100+', title: 'Very common (100+)' };
  if (occurrences >= 50) return { key: '50-99', title: 'Common (50–99)' };
  if (occurrences >= 25) return { key: '25-49', title: 'Frequent (25–49)' };
  if (occurrences >= 10) return { key: '10-24', title: 'Fairly common (10–24)' };
  if (occurrences >= 8) return { key: '8-9', title: 'Occasional (8–9)' };
  return { key: '5-7', title: 'Uncommon (5–7)' };
}

function allocateSlots(counts, totalSlots) {
  const slots = counts.map(() => 1);
  let remaining = totalSlots - counts.length;
  if (remaining <= 0) return slots;
  const sum = counts.reduce((a, b) => a + b, 0);
  const raw = counts.map((count) => (remaining * count) / sum);
  const floors = raw.map(Math.floor);
  remaining -= floors.reduce((a, b) => a + b, 0);
  const order = raw
    .map((value, i) => ({ i, frac: value - floors[i] }))
    .sort((a, b) => b.frac - a.frac || counts[b.i] - counts[a.i]);
  for (let k = 0; k < remaining; k += 1) floors[order[k].i] += 1;
  return slots.map((base, i) => base + floors[i]);
}

function packByFrequency(items, startLevel, targetLevelCount) {
  const groups = [];
  for (const item of items) {
    const band = bandOf(item.n);
    const last = groups.at(-1);
    if (last && last.key === band.key) last.items.push(item);
    else groups.push({ key: band.key, title: band.title, items: [item] });
  }
  const minChunk = 8;
  const maxFor = (count) => Math.max(1, Math.ceil(count / minChunk));
  const slots = allocateSlots(
    groups.map((group) => group.items.length),
    targetLevelCount,
  ).map((slot, i) => Math.min(slot, maxFor(groups[i].items.length)));
  let used = slots.reduce((sum, slot) => sum + slot, 0);
  while (used < targetLevelCount) {
    let best = -1;
    for (let i = 0; i < groups.length; i += 1) {
      if (slots[i] >= maxFor(groups[i].items.length)) continue;
      if (best < 0 || groups[i].items.length / slots[i] > groups[best].items.length / slots[best]) best = i;
    }
    if (best < 0) break;
    slots[best] += 1;
    used += 1;
  }
  const levels = [];
  let nextNumber = startLevel;
  for (let i = 0; i < groups.length; i += 1) {
    levels.push(...packIntoLevels(groups[i].items, nextNumber, slots[i], groups[i].title));
    nextNumber += slots[i];
  }
  return levels;
}

function diacriticCount(text) {
  return (text.match(/[\u064b-\u065f\u0670]/g) || []).length;
}

function tanweenCount(text) {
  return (text.match(/[\u064b\u064c\u064d]/g) || []).length;
}

function stripFinalMarks(text) {
  return text.replace(/[\u064b-\u0650\u0652]$/, '');
}

function hasTanween(text) {
  return /[\u064b\u064c\u064d]/.test(text);
}

function stripSandhiShadda(text) {
  return text.replace(/^([\u0621-\u064a])\u0651/, '$1');
}

function foldLakinAlef(text) {
  return stripSandhiShadda(text).replace(/ل[\u064b-\u065f]*[\u0670\u0627]ك/g, 'لك');
}

function vocalizationForDedup(text) {
  return normalizeLight(foldLakinAlef(text))
    .replace(/\u0651\u0650/g, '')
    .replace(/[\u0651\u0652]/g, '');
}

function geminationCollapsed(text) {
  return normalizeLight(foldLakinAlef(text)).replace(/[\u0650\u0651\u0652]/g, '');
}

function cleanDisplayForm(text) {
  return stripSandhiShadda(text)
    .replace(/[\u06d6-\u06ed]/g, '')
    .replace(/\u064b\u0627$/, '')
    .replace(/[\u064b-\u064d]/g, '')
    .replace(/[\u0653\u0670]+$/g, '')
    .replace(/[\u064b-\u0650\u0652]$/, '');
}

function isKaannaFamily(a, b) {
  const hamza = (text) => /[أإؤئءآ\u0621]/.test(text);
  if (!hamza(a) || !hamza(b)) return false;
  const key = normalizeArabic('كَأَنَّ');
  return normalizeArabic(a) === key && normalizeArabic(b) === key;
}

function isLakinFamily(a, b) {
  const key = normalizeArabic('لكِن');
  return normalizeArabic(foldLakinAlef(a)) === key && normalizeArabic(foldLakinAlef(b)) === key;
}

function ensureInitialFatha(text) {
  if (/^[\u0622\u0623\u0625\u0627]/.test(text)) return text;
  if (/^[\u0621-\u064a]\u0627/.test(text) && !/^[\u0621-\u064a][\u064b-\u065f\u0670]/.test(text)) {
    return `${text[0]}\u064e${text.slice(1)}`;
  }
  return text;
}

function polishGloss(text) {
  if (!text || text === '—') return text;
  return text.replace(/\bto ([A-Za-z]+)/g, (_, word) => `to ${word.toLowerCase()}`);
}

/** True when `short` is the same word as `full` with some fathas left unwritten (typical QAC
 *  lemma vs a fully vocalized deck citation) - not when they are a noun/verb pair that only
 *  collide after every vowel is stripped. */
function isUnderspecifiedDuplicate(short, full) {
  const a = foldLakinAlef(short);
  const b = foldLakinAlef(full);
  if (isKaannaFamily(a, b) || isLakinFamily(a, b)) return true;
  if (normalizeArabic(a) !== normalizeArabic(b)) return false;
  if (hasTanween(short) !== hasTanween(full)) return false;
  const hamza = (text) => /[أإؤئءآ\u0621]/.test(text);
  if (hamza(short) !== hamza(full)) return false;
  const stripFatha = (text) => normalizeLight(text).replace(/\u064e/g, '');
  return (
    stripFatha(a) === stripFatha(b) ||
    normalizeLightLoose(a) === normalizeLightLoose(b) ||
    vocalizationForDedup(short) === vocalizationForDedup(full) ||
    geminationCollapsed(short) === geminationCollapsed(full)
  );
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
    vote(light, rawLem, 2 + diacriticCount(rawLem));
    const stemText = segments
      .filter((s) => !s.feats.includes('PREF') && !s.feats.includes('SUFF'))
      .map((s) => s.text)
      .join('');
    const citation = stripFinalMarks(stemText);
    if (citation && normalizeArabic(citation) === normalizeArabic(rawLem)) {
      vote(light, citation, 1 + diacriticCount(citation));
    }
  }
  const best = new Map();
  for (const [light, map] of votes) {
    const winner = [...map.entries()].sort(
      (a, b) =>
        tanweenCount(a[0]) - tanweenCount(b[0]) ||
        diacriticCount(b[0]) - diacriticCount(a[0]) ||
        b[1] - a[1] ||
        a[0].localeCompare(b[0], 'ar'),
    )[0][0];
    best.set(light, winner);
  }
  return best;
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

function loadReaderGlosses(wanted) {
  const glosses = new Map();
  const files = fs.readdirSync(SURAHS_DIR).filter((file) => file.endsWith('.json'));
  for (const file of files) {
    const ayahs = JSON.parse(
      execSync(`git show HEAD:src/data/quran/surahs/${file}`, {
        encoding: 'utf8',
        maxBuffer: 10 * 1024 * 1024,
      }),
    );
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

function attachVariant(word, form) {
  const already = [word.arabic, word.plural, word.variant]
    .filter(Boolean)
    .join(',')
    .split(/[,\u060c]/)
    .map((piece) => piece.trim())
    .filter(Boolean);
  if (already.some((piece) => normalizeLight(piece) === normalizeLight(form))) return;
  word.variant = word.variant ? `${word.variant},${form}` : form;
}

function citationFormsForDedup(word) {
  if (word.isSuffix || word.kind === 'grammar') return [];
  if (word.arabic.includes('+')) return [];
  return [word.arabic, word.plural, word.feminine, ...(word.forms ?? [])]
    .filter(Boolean)
    .flatMap((value) => String(value).split(/[,\u060c]/))
    .map((piece) => piece.trim())
    .filter((piece) => piece && !/\s/.test(piece) && normalizeArabic(piece).length >= 2);
}

function preferVocalized(current, candidate) {
  const currentMarks = diacriticCount(current);
  const nextMarks = diacriticCount(candidate);
  if (nextMarks !== currentMarks) return nextMarks > currentMarks ? candidate : current;
  return candidate.length > current.length ? candidate : current;
}

function mergeLeftoverDuplicates(items) {
  const kept = [];
  let merged = 0;
  for (const item of items) {
    const hit = kept.find(
      (entry) =>
        isUnderspecifiedDuplicate(item.arabic, entry.arabic) ||
        isUnderspecifiedDuplicate(entry.arabic, item.arabic),
    );
    if (hit) {
      attachVariant(hit, item.arabic);
      hit.arabic = stripSandhiShadda(preferVocalized(hit.arabic, item.arabic));
      hit.n = Math.max(hit.n, item.n);
      merged += 1;
      continue;
    }
    kept.push(item);
  }
  return { kept, merged };
}

function main() {
  const deck = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf8'));
  const previousEnglish = new Map();
  for (const level of deck.levels) {
    if (level.number < 48) continue;
    for (const word of level.words) {
      previousEnglish.set(word.arabic, word.english);
      previousEnglish.set(normalizeLight(word.arabic), word.english);
    }
  }
  const original = JSON.parse(
    execSync('git show HEAD:src/data/quranic-words.json', { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }),
  );
  const thematic = original.levels.filter((level) => level.number <= 47);
  const existing = new Set(thematic.flatMap((level) => level.words.map((w) => w.id)));
  if (existing.size !== 547 || thematic.length !== 47) {
    throw new Error('Expected an unmodified 47-level / 547-word thematic deck before appending frequency levels.');
  }
  for (const level of thematic) {
    if (THEMATIC_TITLES[level.number]) level.title = THEMATIC_TITLES[level.number];
  }
  deck.levels = thematic;

  const leftover = JSON.parse(fs.readFileSync(POOL_PATH, 'utf8')).map((item) => ({
    ...item,
    id: `lem:${item.lemma}`,
  }));
  // Noun "guidance" (هُدًى, 85×) is a different word from the verb هَدَى / elative أَهْدَى already
  // in levels 1–47, so the frozen 5+ pool never included it. Deceive-lemmas are rarer than the
  // 5+ cutoff but are the two verbs in 2:9, so they're added explicitly.
  const extraLeftovers = [
    { lemma: 'هُدًي', n: 85 },
    { lemma: 'يُخادِع', n: 2 },
    { lemma: 'يَخْدَع', n: 2 },
  ];
  for (const extra of extraLeftovers) {
    if (leftover.some((item) => item.lemma === extra.lemma)) continue;
    leftover.push({ ...extra, id: `lem:${extra.lemma}` });
  }
  leftover.sort((a, b) => b.n - a.n || a.lemma.localeCompare(b.lemma, 'ar'));
  const citations = loadBestArabic();
  for (const item of leftover) {
    const cited =
      citations.get(item.lemma) ?? citations.get(normalizeLight(item.lemma)) ?? item.lemma;
    item.arabic =
      SPELLING_FIXES[cited] ??
      SPELLING_FIXES[item.lemma] ??
      SPELLING_FIXES[normalizeLight(cited)] ??
      cited;
    item.arabic = ensureInitialFatha(cleanDisplayForm(item.arabic));
  }

  const thematicPieces = thematic.flatMap((level) =>
    level.words.flatMap((word) => citationFormsForDedup(word).map((piece) => ({ word, piece }))),
  );

  const unique = [];
  let merged = 0;
  for (const item of leftover) {
    const hit = thematicPieces.find((entry) => {
      if (isUnderspecifiedDuplicate(item.arabic, entry.piece)) return true;
      if (item.arabic.endsWith('ى') && entry.piece.endsWith('ا')) {
        return isUnderspecifiedDuplicate(item.arabic.replace(/ى$/, 'ا'), entry.piece);
      }
      if (item.arabic.endsWith('ي') && entry.piece.endsWith('ا')) {
        return isUnderspecifiedDuplicate(`${item.arabic}ا`, entry.piece);
      }
      return false;
    });
    if (hit) {
      attachVariant(hit.word, item.arabic);
      if (item.lemma) attachVariant(hit.word, item.lemma);
      merged += 1;
      continue;
    }
    unique.push(item);
  }

  const leftoverDedup = mergeLeftoverDuplicates(unique);
  unique.length = 0;
  unique.push(...leftoverDedup.kept);
  merged += leftoverDedup.merged;

  const wanted = new Set(unique.map((item) => item.id));
  const glosses = loadReaderGlosses(wanted);
  const verbLemmas = loadVerbLemmas();

  for (const item of unique) {
    const fromReader = pickGloss(item.lemma, glosses.get(item.id) ?? new Map(), verbLemmas.has(item.lemma));
    item.english = polishGloss(
      GLOSS_OVERRIDES[item.lemma] ??
        (fromReader !== '—' ? fromReader : null) ??
        previousEnglish.get(item.lemma) ??
        previousEnglish.get(item.arabic) ??
        fromReader,
    );
  }

  const newLevels = packByFrequency(unique, 48, 52);
  if (newLevels.length === 0 || newLevels[0].number !== 48) {
    throw new Error(`Expected frequency levels to start at 48, got ${newLevels[0]?.number}`);
  }
  const lastNumber = newLevels[newLevels.length - 1].number;
  if (lastNumber !== 47 + newLevels.length) {
    throw new Error(`Frequency levels are not contiguous: last is ${lastNumber}`);
  }

  const added = newLevels.reduce((sum, level) => sum + level.words.length, 0);
  if (added !== unique.length) {
    throw new Error(`Packed ${added} words but unique leftover pool is ${unique.length}`);
  }

  deck.levels = [...deck.levels, ...newLevels];
  deck.levelCount = deck.levels.length;
  deck.wordCount = 547 + added;

  fs.writeFileSync(WORDS_PATH, `${JSON.stringify(deck, null, 2)}\n`);
  console.log(
    `Merged ${merged} leftover lemmas into levels 1–47 as extra citation forms. Appended ${added} new cards as levels 48–${lastNumber}. Deck is now ${deck.wordCount} words.`,
  );
}

main();
