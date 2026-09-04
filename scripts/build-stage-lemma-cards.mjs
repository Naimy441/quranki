#!/usr/bin/env node
/**
 * Builds study cards for every canonical lemma not already in the curated deck.
 *
 * Leaves quranic-words.json (including the original Stage 1 cards) untouched.
 * Stage 2 leftover lemmas (through id 1467) stay as "Common words". Stages 3–4
 * are packed into the same thematic titles as Stage 2 (Faith, Denial, …).
 *
 * Re-run after changing quran-lemmas.json, quranic-words.json, or reader glosses,
 * then keep lemma-level-coverage.json in sync (this script rewrites it).
 */
import { createRequire } from 'node:module';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { existingPartsFromLevels, packThemed } = require('./leftover-themes.js');

const scriptDir = dirname(fileURLToPath(import.meta.url));
const rootDir = resolve(scriptDir, '..');
const dataDir = join(rootDir, 'src', 'data');
const quranDir = join(dataDir, 'quran');
const surahsDir = join(quranDir, 'surahs');

const STAGE_2_LAST_LEMMA = 1467;
const STAGE_3_LAST_LEMMA = 2878;
const WORDS_PER_LEVEL = 10;
const THEMED_WORDS_PER_LEVEL = 12;

const STAGE_TITLES = {
  2: 'Common words',
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

function polishGloss(text, isVerb) {
  if (!text || text === '—') return '—';
  let next = text.charAt(0).toLowerCase() + text.slice(1);
  if (isVerb && !/^to /i.test(next) && !/\s/.test(next)) next = `to ${next}`;
  return next.replace(/\bto ([A-Za-z]+)/g, (_, word) => `to ${word.toLowerCase()}`);
}

function pickGloss(variantMap, isVerb) {
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
  return polishGloss(ranked[0]?.text ?? '—', isVerb);
}

function stageForLemmaId(id) {
  if (id <= STAGE_2_LAST_LEMMA) return 2;
  if (id <= STAGE_3_LAST_LEMMA) return 3;
  return 4;
}

function scoreExample(surahNumber, wordCount, singleLemma) {
  let score = wordCount;
  if (wordCount < 3) score += 40;
  if (wordCount > 14) score += (wordCount - 14) * 4;
  if (surahNumber === 1) score -= 10;
  if (surahNumber >= 78) score -= 4;
  if (!singleLemma) score += 8;
  return score;
}

function ayahTranslation(ayah) {
  return ayah.tr
    .map((part) => (part.t !== undefined ? part.t : ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);
}

function packStage(cards, startLevel, title) {
  if (cards.length === 0) return [];
  const levelCount = Math.ceil(cards.length / WORDS_PER_LEVEL);
  const levels = [];
  for (let i = 0; i < levelCount; i += 1) {
    const slice = cards.slice(i * WORDS_PER_LEVEL, (i + 1) * WORDS_PER_LEVEL);
    const number = startLevel + i;
    levels.push({
      number,
      id: String(number),
      title: levelCount > 1 ? `${title} ${i + 1}` : title,
      words: slice.map((card) => ({
        id: `qac-${card.id}`,
        arabic: card.arabic,
        english: card.english,
        lemmaIds: [card.id],
        exampleVerse: { s: card.example.s, a: card.example.a },
      })),
    });
  }
  return levels;
}

function writeCoverage(curatedLevels, generatedLevels, canonicalWords, totalWords) {
  const recognizedLemmaIds = new Set();
  const levels = {};
  for (const level of [...curatedLevels, ...generatedLevels]) {
    for (const word of level.words) {
      if (word.kind === 'grammar') continue;
      for (const lemmaId of word.lemmaIds ?? []) recognizedLemmaIds.add(lemmaId);
    }
    levels[level.number] = canonicalWords.reduce(
      (count, lemmaIds) => count + (lemmaIds.every((id) => recognizedLemmaIds.has(id)) ? 1 : 0),
      0,
    );
  }
  return { totalWords, levels };
}

async function loadSurahs() {
  const files = (await readdir(surahsDir)).filter((file) => file.endsWith('.json')).sort();
  const byNumber = new Map();
  for (const file of files) {
    const surahNumber = Number(file.slice(0, 3));
    byNumber.set(surahNumber, JSON.parse(await readFile(join(surahsDir, file), 'utf8')));
  }
  return byNumber;
}

async function main() {
  const [lemmaData, studyWords, wordLemmas, surahs] = await Promise.all([
    readFile(join(dataDir, 'quran-lemmas.json'), 'utf8').then(JSON.parse),
    readFile(join(dataDir, 'quranic-words.json'), 'utf8').then(JSON.parse),
    readFile(join(dataDir, 'quran-word-lemmas.json'), 'utf8').then(JSON.parse),
    loadSurahs(),
  ]);

  const covered = new Set();
  for (const level of studyWords.levels) {
    for (const word of level.words) {
      for (const id of word.lemmaIds ?? []) covered.add(id);
    }
  }

  const glossVotes = new Map();
  const verbVotes = new Map();
  const nounVotes = new Map();
  const examples = new Map();
  const canonicalWords = [];

  for (const [surahNumber, ayahs] of surahs) {
    for (const ayah of ayahs) {
      const wordCount = ayah.w.length;
      const translation = ayahTranslation(ayah);
      const surfaces = ayah.w.map((word) => word.ar.map((seg) => seg.t).join(''));
      for (const word of ayah.w) {
        const lemmaIds = word.l === undefined ? [] : Array.isArray(word.l) ? word.l : [word.l];
        if (lemmaIds.length === 0) continue;
        canonicalWords.push(lemmaIds);
        const rawGloss = (word.en || []).map((seg) => seg.t).join('').replace(/\s+/g, ' ').trim();
        const isVerb = word.ps === 'V';
        const weight = lemmaIds.length === 1 ? 3 : 1;
        for (const id of lemmaIds) {
          if (!glossVotes.has(id)) glossVotes.set(id, new Map());
          if (rawGloss) {
            const map = glossVotes.get(id);
            map.set(rawGloss, (map.get(rawGloss) ?? 0) + weight);
          }
          if (isVerb) verbVotes.set(id, (verbVotes.get(id) ?? 0) + 1);
          else nounVotes.set(id, (nounVotes.get(id) ?? 0) + 1);

          const singleLemma = lemmaIds.length === 1;
          const score = scoreExample(surahNumber, wordCount, singleLemma);
          const current = examples.get(id);
          if (!current || score < current.score) {
            examples.set(id, {
              score,
              example: {
                s: surahNumber,
                a: ayah.a,
                p: word.p,
                w: surfaces,
                tr: translation,
              },
            });
          }
        }
      }
    }
  }

  const leftover = lemmaData.lemmas.filter((lemma) => !covered.has(lemma.id));
  const cards = leftover.map((lemma) => {
    const isVerb = (verbVotes.get(lemma.id) ?? 0) >= (nounVotes.get(lemma.id) ?? 0);
    const example = examples.get(lemma.id)?.example;
    if (!example) throw new Error(`No Quran occurrence found for lemma ${lemma.id}`);
    const votes = glossVotes.get(lemma.id) ?? new Map();
    const glosses = [...votes.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([gloss]) => gloss);
    return {
      id: lemma.id,
      arabic: lemma.arabic,
      english: pickGloss(votes, isVerb),
      stage: stageForLemmaId(lemma.id),
      example,
      themeExtras: {
        pos: isVerb ? 'V' : 'N',
        glosses,
      },
    };
  });

  const byStage = { 2: [], 3: [], 4: [] };
  for (const card of cards) byStage[card.stage].push(card);
  for (const list of Object.values(byStage)) list.sort((a, b) => a.id - b.id);

  let nextLevel = (studyWords.levels.at(-1)?.number ?? 0) + 1;
  const generatedLevels = [];
  const stageEnds = { 2: studyWords.levels.at(-1)?.number ?? 141, 3: 0, 4: 0 };
  let existingParts = existingPartsFromLevels(studyWords.levels);

  const leftoverStage2 = packStage(byStage[2], nextLevel, STAGE_TITLES[2]);
  generatedLevels.push(...leftoverStage2);
  if (leftoverStage2.length > 0) {
    stageEnds[2] = leftoverStage2[leftoverStage2.length - 1].number;
    nextLevel = stageEnds[2] + 1;
  }

  for (const stage of [3, 4]) {
    const packed = packThemed(byStage[stage], nextLevel, existingParts, THEMED_WORDS_PER_LEVEL);
    generatedLevels.push(...packed.levels);
    existingParts = packed.nextParts;
    if (packed.levels.length > 0) {
      stageEnds[stage] = packed.lastLevel;
      nextLevel = packed.lastLevel + 1;
      console.log(`Stage ${stage} themes:`);
      for (const row of packed.summary) {
        console.log(`  ${row.title.padEnd(22)} ${String(row.cards).padStart(4)} → ${row.titles.join(', ')}`);
      }
    } else if (stage === 3) {
      stageEnds[3] = stageEnds[2];
    } else {
      stageEnds[4] = stageEnds[3] || stageEnds[2];
    }
  }

  const coverage = writeCoverage(
    studyWords.levels,
    generatedLevels,
    canonicalWords,
    wordLemmas.metadata.wordCount,
  );

  const payload = {
    metadata: {
      schemaVersion: 1,
      wordsPerLevel: WORDS_PER_LEVEL,
      generatedWordCount: cards.length,
      stage2LastLemma: STAGE_2_LAST_LEMMA,
      stage3LastLemma: STAGE_3_LAST_LEMMA,
      stage1LastLevel: 47,
      stage2LastLevel: stageEnds[2],
      stage3LastLevel: stageEnds[3],
      stage4LastLevel: stageEnds[4],
      stage2NewCards: byStage[2].length,
      stage3NewCards: byStage[3].length,
      stage4NewCards: byStage[4].length,
    },
    levels: generatedLevels,
  };

  await writeFile(join(quranDir, 'stage-levels.json'), `${JSON.stringify(payload)}\n`);
  await writeFile(join(quranDir, 'lemma-level-coverage.json'), JSON.stringify(coverage));

  const lastCoverage = coverage.levels[String(stageEnds[4])];
  console.log(
    `Generated ${cards.length} leftover cards (${byStage[2].length} stage 2, ${byStage[3].length} stage 3, ${byStage[4].length} stage 4) as levels 142–${stageEnds[4]}.`,
  );
  console.log(
    `Coverage through last level: ${lastCoverage} / ${coverage.totalWords} Quran words. Original curated cards were not modified.`,
  );
}

await main();
