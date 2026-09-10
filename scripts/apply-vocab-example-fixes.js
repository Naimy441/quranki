#!/usr/bin/env node
/**
 * Applies curated vocab corrections and writes example overrides that survive rebuilds.
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const WORDS_PATH = path.join(ROOT, 'src/data/quranic-words.json');
const STAGE_LEVELS_PATH = path.join(ROOT, 'src/data/quran/stage-levels.json');
const EXAMPLES_PATH = path.join(ROOT, 'src/data/quran/vocab-examples.json');
const OVERRIDES_PATH = path.join(ROOT, 'src/data/quran/vocab-example-overrides.json');
const COVERAGE_PATH = path.join(ROOT, 'src/data/quran/lemma-level-coverage.json');
const WORD_LEMMAS_PATH = path.join(ROOT, 'src/data/quran-word-lemmas.json');
const ASMA_PATH = path.join(ROOT, 'src/data/asma-ul-husna.json');

const overrides = {
  '04-004': [
    { s: 19, a: 21, p: 2 },
    { s: 3, a: 42, p: 7 },
    { s: 19, a: 24, p: 8 },
  ],
  '06-008': [
    { s: 3, a: 40, p: 3 },
    { s: 19, a: 8, p: 3 },
    { s: 6, a: 101, p: 4 },
  ],
  '09-001': [
    { s: 2, a: 10, p: 10 },
    { s: 2, a: 95, p: 4 },
    { s: 2, a: 87, p: 20 },
  ],
  '09-004': [
    { s: 2, a: 183, p: 7 },
    { s: 2, a: 108, p: 6 },
    { s: 2, a: 151, p: 1 },
  ],
  '10-004': [
    { s: 2, a: 17, p: 2 },
    { s: 55, a: 14, p: 5 },
    { s: 105, a: 5, p: 2 },
    { s: 101, a: 5, p: 3 },
  ],
  '11-007': [
    { s: 2, a: 186, p: 12 },
    { s: 2, a: 185, p: 17 },
    { s: 3, a: 104, p: 1 },
    { s: 65, a: 7, p: 1 },
  ],
  '12-003': [
    { s: 2, a: 101, p: 20 },
    { s: 7, a: 171, p: 5 },
    { s: 63, a: 4, p: 9 },
    { s: 24, a: 35, p: 14 },
  ],
  '15-007': [
    { s: 6, a: 81, p: 18 },
    { s: 10, a: 35, p: 17 },
    { s: 9, a: 62, p: 7 },
    { s: 48, a: 26, p: 21 },
  ],
  '15-012': [
    { s: 3, a: 68, p: 2 },
    { s: 33, a: 6, p: 2 },
    { s: 19, a: 70, p: 6 },
    { s: 75, a: 34, p: 1, hits: [1, 3] },
  ],
  '05-003': [
    { s: 25, a: 48, p: 6, n: 2 },
    { s: 36, a: 45, p: 6, n: 2 },
    { s: 20, a: 110, p: 3, n: 2 },
  ],
  '17-007': [
    { s: 89, a: 6, p: 6 },
    { s: 26, a: 123, p: 2 },
    { s: 50, a: 13, p: 1 },
  ],
  '23-008': [
    { s: 2, a: 158, p: 13 },
    { s: 2, a: 198, p: 3 },
    { s: 33, a: 5, p: 17 },
  ],
  '24-009': [
    { s: 18, a: 2, p: 3 },
    { s: 21, a: 12, p: 3 },
    { s: 40, a: 84, p: 3 },
    { s: 6, a: 43, p: 4 },
  ],
  '28-012': [
    { s: 2, a: 257, p: 2 },
    { s: 7, a: 196, p: 2 },
    { s: 6, a: 127, p: 7 },
  ],
  '29-008': [
    { s: 7, a: 116, p: 5 },
    { s: 7, a: 132, p: 7 },
    { s: 23, a: 89, p: 5 },
  ],
  '32-022': [
    { s: 2, a: 275, p: 39 },
    { s: 24, a: 17, p: 4 },
    { s: 36, a: 39, p: 5 },
    { s: 7, a: 29, p: 16 },
  ],
  'qac-1035': [
    { s: 109, a: 6, p: 3 },
    { s: 36, a: 22, p: 2 },
    { s: 14, a: 22, p: 15 },
    { s: 20, a: 18, p: 10 },
  ],
  'qac-1102': [
    { s: 6, a: 38, p: 9 },
    { s: 35, a: 1, p: 10 },
    { s: 17, a: 24, p: 3 },
    { s: 26, a: 215, p: 2 },
  ],
  'qac-1177': [
    { s: 2, a: 173, p: 18 },
    { s: 23, a: 7, p: 7 },
    { s: 26, a: 166, p: 11 },
    { s: 70, a: 31, p: 7 },
  ],
  'qac-2017': [
    { s: 54, a: 34, p: 9 },
    { s: 3, a: 17, p: 6 },
    { s: 51, a: 18, p: 1 },
  ],
  'qac-4634': [
    { s: 75, a: 11, p: 3 },
  ],
  '35-007': [
    { s: 6, a: 164, p: 17 },
    { s: 53, a: 38, p: 2 },
    { s: 35, a: 18, p: 2 },
    { s: 17, a: 15, p: 12 },
  ],
  '36-010': [
    { s: 12, a: 5, p: 8, hits: [8, 10] },
    { s: 21, a: 57, p: 2 },
    { s: 86, a: 15, p: 2, n: 2 },
  ],
  '31-023': [
    { s: 5, a: 17, p: 13 },
    { s: 5, a: 25, p: 5 },
    { s: 78, a: 37, p: 8 },
  ],
  '105-005': [
    { s: 13, a: 9, p: 1 },
    { s: 59, a: 22, p: 8 },
    { s: 6, a: 73, p: 19 },
  ],
  '127-004': [
    { s: 5, a: 109, p: 14 },
    { s: 9, a: 78, p: 10 },
    { s: 34, a: 48, p: 6 },
  ],
};

function patchWord(deck, id, patch) {
  for (const level of deck.levels) {
    const word = level.words.find((item) => item.id === id);
    if (!word) continue;
    Object.assign(word, patch);
    return word;
  }
  throw new Error(`Missing study word ${id}`);
}

const deck = JSON.parse(fs.readFileSync(WORDS_PATH, 'utf8'));

patchWord(deck, '04-004', {
  note: 'Does not appear as its own word in the Quran; the examples show the feminine “you” attached to another word.',
  exampleVerse: { s: 19, a: 21 },
});

patchWord(deck, '05-003', {
  phrase: true,
  lemmaIds: undefined,
});
const baynaAydi = deck.levels.flatMap((level) => level.words).find((word) => word.id === '05-003');
delete baynaAydi.lemmaIds;

patchWord(deck, '06-008', {
  arabic: 'أَنَّىٰ',
  variant: 'أَنّى,أَنَّى',
  exampleVerse: { s: 3, a: 40 },
});

patchWord(deck, '09-001', { exampleVerse: { s: 2, a: 10 } });
patchWord(deck, '09-004', { exampleVerse: { s: 2, a: 183 } });

patchWord(deck, '11-007', { exampleVerse: { s: 2, a: 186 } });

patchWord(deck, '12-003', {
  lemmaIds: [385],
  exampleVerse: { s: 7, a: 171 },
});

patchWord(deck, '14-012', {
  note: 'One Quranic word, two senses: a close/warm friend, and boiling water. Both are taught here.',
});

patchWord(deck, '15-000', {
  arabic: 'أَفْعَل',
  english: 'The أفْعَل form',
  note: 'The pattern أفْعَل turns a describing word into “more / most”. كَبِير big → أَكْبَر bigger / biggest. أَحْسَن better / best is the same shape.',
  exampleOf: '15-005',
});

patchWord(deck, '15-005', { arabic: 'أَكْبَر' });

patchWord(deck, '15-007', {
  lemmaIds: [829],
  exampleVerse: { s: 10, a: 35 },
});

patchWord(deck, '15-012', { exampleVerse: { s: 33, a: 6 } });

patchWord(deck, '17-007', { lemmaIds: [447] });

patchWord(deck, '21-008', { english: 'charity, purity' });

patchWord(deck, '22-004', { english: 'witness, testimony' });

patchWord(deck, '23-008', {
  english: 'blame, sin',
  lemmaIds: [438],
  exampleVerse: { s: 2, a: 158 },
});

patchWord(deck, '24-001', { arabic: 'ءَالَاء' });

patchWord(deck, '24-009', { exampleVerse: { s: 18, a: 2 } });

patchWord(deck, '28-011', { arabic: 'مَلَإِ' });

patchWord(deck, '28-012', {
  lemmaIds: [130],
  exampleVerse: { s: 2, a: 257 },
});

patchWord(deck, '29-008', {
  lemmaIds: [2018],
  exampleVerse: { s: 7, a: 116 },
});

patchWord(deck, '31-023', { exampleVerse: { s: 5, a: 17 } });

patchWord(deck, '32-022', {
  arabic: 'عَادَ',
  english: 'to return',
  lemmaIds: [561],
  exampleVerse: { s: 2, a: 275 },
  note: 'Different word from عَاد, the people of Hud.',
});

patchWord(deck, '34-000', {
  note: 'When the last two root letters are the same, they often write as one letter with a shadda (ّ). رَدَّ (he returned) is raa + daal + daal.',
});

patchWord(deck, '35-007', {
  lemmaIds: [1141],
  exampleVerse: { s: 6, a: 164 },
});

patchWord(deck, '36-010', {
  arabic: 'كَيْد',
  english: 'to plot against, a plot',
  lemmaIds: [425, 996],
  exampleVerse: { s: 12, a: 5 },
});

patchWord(deck, '105-005', { exampleVerse: { s: 59, a: 22 } });
patchWord(deck, '127-004', { exampleVerse: { s: 5, a: 109 } });

const leftoverSenseCards = [
  {
    id: 'qac-1035',
    arabic: 'لِيَ',
    english: 'to me, for me',
    lemmaIds: [1035],
    exampleVerse: { s: 109, a: 6 },
    note: 'The attached “me” after لِ, بِ, or وَلِ. Not the same word as وَلِيّ (guardian).',
  },
  {
    id: 'qac-1102',
    arabic: 'جَنَاح',
    english: 'wing',
    lemmaIds: [1102],
    exampleVerse: { s: 6, a: 38 },
    note: 'Different word from جُنَاح (blame, sin).',
  },
  {
    id: 'qac-1177',
    arabic: 'عَادٍ',
    english: 'transgressor',
    lemmaIds: [1177],
    exampleVerse: { s: 23, a: 7 },
    note: 'Not the people of Hud, and not the verb عَادَ (to return).',
  },
  {
    id: 'qac-2017',
    arabic: 'سَحَر',
    english: 'dawn, the time before dawn',
    lemmaIds: [2017],
    exampleVerse: { s: 54, a: 34 },
    note: 'Different word from سَحَرَ (to bewitch).',
    preferTitle: 'Time Words',
  },
  {
    id: 'qac-4634',
    arabic: 'وَزَر',
    english: 'refuge, place of escape',
    lemmaIds: [4634],
    exampleVerse: { s: 75, a: 11 },
    note: 'Different word from وَزَرَ (to bear a load).',
  },
];

function insertGeneratedCard(generated, card) {
  const { preferTitle, ...studyCard } = card;
  const lemmaId = studyCard.lemmaIds[0];
  let existingLevel;
  let existingWord;
  for (const level of generated.levels) {
    const found = level.words.find((word) => word.id === studyCard.id || (word.lemmaIds ?? []).includes(lemmaId));
    if (found) {
      existingLevel = level;
      existingWord = found;
      break;
    }
  }
  const pool = preferTitle
    ? generated.levels.filter((level) => level.title.startsWith(preferTitle))
    : generated.levels;
  const targets = pool.length > 0 ? pool : generated.levels;
  const titleOk = !preferTitle || existingLevel?.title.startsWith(preferTitle);
  if (existingWord && existingLevel && titleOk) {
    Object.assign(existingWord, studyCard);
    return `updated ${existingLevel.number} ${existingLevel.title}`;
  }
  if (existingWord && existingLevel) {
    existingLevel.words = existingLevel.words.filter((word) => word !== existingWord);
  }
  let target = targets[0];
  let insertAt = 0;
  for (const level of targets) {
    for (let i = 0; i < level.words.length; i += 1) {
      const current = level.words[i].lemmaIds?.[0];
      if (current != null && current < lemmaId) {
        target = level;
        insertAt = i + 1;
      }
    }
  }
  target.words.splice(insertAt, 0, studyCard);
  return `inserted ${target.number} ${target.title}`;
}

function rebuildLemmaCoverage(curatedLevels, generatedLevels, asmaLevels) {
  const wordLemmas = JSON.parse(fs.readFileSync(WORD_LEMMAS_PATH, 'utf8'));
  const ayahWords = wordLemmas.surahs.flatMap((surah) =>
    surah.ayahs.flatMap((ayah) => ayah.words.map((word) => word.lemmaIds)),
  );
  const recognized = new Set();
  const levels = {};
  const ordered = [...curatedLevels, ...generatedLevels, ...asmaLevels].sort((a, b) => a.number - b.number);
  for (const level of ordered) {
    for (const word of level.words) {
      if (word.kind === 'grammar') continue;
      for (const id of word.lemmaIds ?? []) recognized.add(id);
    }
    levels[level.number] = ayahWords.reduce(
      (count, lemmaIds) => count + (lemmaIds.length > 0 && lemmaIds.every((id) => recognized.has(id)) ? 1 : 0),
      0,
    );
  }
  const payload = { totalWords: wordLemmas.metadata.wordCount, levels };
  fs.writeFileSync(COVERAGE_PATH, JSON.stringify(payload));
  return payload.levels[String(Math.max(...ordered.map((level) => level.number)))];
}

const generated = JSON.parse(fs.readFileSync(STAGE_LEVELS_PATH, 'utf8'));
for (const level of generated.levels) {
  const before = level.words.length;
  level.words = level.words.filter((word) => word.id !== 'qac-561' && !(word.lemmaIds ?? []).includes(561));
  if (level.words.length !== before) console.log('removed qac-561 from', level.number, level.title);
}
for (const card of leftoverSenseCards) {
  console.log(card.id, insertGeneratedCard(generated, card));
}
generated.metadata.generatedWordCount = generated.levels.reduce(
  (sum, level) => sum + level.words.filter((word) => word.kind !== 'grammar').length,
  0,
);
fs.writeFileSync(STAGE_LEVELS_PATH, `${JSON.stringify(generated)}\n`);

fs.writeFileSync(WORDS_PATH, `${JSON.stringify(deck, null, 2)}\n`);

function validateOverride(ref) {
  const file = path.join(ROOT, 'src/data/quran/surahs', `${String(ref.s).padStart(3, '0')}.json`);
  const ayah = JSON.parse(fs.readFileSync(file, 'utf8')).find((item) => item.a === ref.a);
  if (!ayah) throw new Error(`Missing ayah ${ref.s}:${ref.a}`);
  const word = ayah.w.find((item) => item.p === ref.p);
  if (!word) throw new Error(`Missing word ${ref.s}:${ref.a}:${ref.p}`);
  return word.ar.map((seg) => seg.t).join('');
}

for (const [id, list] of Object.entries(overrides)) {
  for (const ref of list) {
    const surface = validateOverride(ref);
    console.log(id, `${ref.s}:${ref.a}:${ref.p}`, surface);
  }
}

const existingOverrides = fs.existsSync(OVERRIDES_PATH)
  ? JSON.parse(fs.readFileSync(OVERRIDES_PATH, 'utf8'))
  : {};
const mergedOverrides = { ...existingOverrides, ...overrides };
delete mergedOverrides['qac-561'];
fs.writeFileSync(OVERRIDES_PATH, `${JSON.stringify(mergedOverrides, null, 2)}\n`);

const examples = JSON.parse(fs.readFileSync(EXAMPLES_PATH, 'utf8'));
Object.assign(examples, overrides);
delete examples['qac-561'];
fs.writeFileSync(EXAMPLES_PATH, JSON.stringify(examples));
const asma = JSON.parse(fs.readFileSync(ASMA_PATH, 'utf8'));
const covered = rebuildLemmaCoverage(deck.levels, generated.levels, asma.levels);
console.log(`Wrote ${Object.keys(overrides).length} example overrides. Coverage through last level: ${covered}.`);
