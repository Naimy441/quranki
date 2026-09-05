/**
 * Picks verse examples for study cards.
 *
 * Tone is a mild preference, not a filter. Short, clear ayahs still win. When a word also
 * appears in a gentler setting, that setting is shown first. Words whose meaning is the
 * heavier topic keep honest examples.
 */
const {
  citationPhraseTokens,
  citationPhraseTokenizations,
  findPhraseRuns,
  findPartialExampleHits,
  collectStudyCores,
  collectVerbPersonLocations,
  INDEPENDENT_PRONOUN_BY_PERSON,
  normalizeLight,
  normalizeLightLoose,
} = require('./vocab-word-matcher');

const MAX_EXAMPLES = 3;
const MAX_EXAMPLES_MULTI = 4;

/** Card is itself about a heavier topic — do not steer its examples away from that. */
const TOPIC_IS_WEIGHT =
  /\b(punish|hell|hellfire|torment|fire|criminal|disbeliev|curse|cursed|wrath|kill|slain|death|die|dead|sin|evil|satan|devil|hypocrit|idol|penalty|recompense|account|warn|anger|astray|wrongdoer|oppress|chastis|adulter|fornicat|flog|crucif)\b/i;

/** Phrases that can startle a newer learner on an otherwise ordinary vocab card. Kept narrow on purpose. */
const WEIGHT_TERMS =
  /\b(hellfire|hell\b|the fire|punish(?:ment|ed|es|ing)?|torment(?:s|ed|ing)?|chastis(?:e|ed|ement)?|criminals?|accursed|massacre(?:d|s)?|slaughter(?:ed|s)?|flog(?:ged|ging)?|crucif(?:y|ied|ixion)?|adulter(?:y|er|ess|ers)?|fornicat(?:e|ion|or|ors)?|torture[ds]?|blaze\b|inferno|wretched|immorality|unlawful sexual)\b/i;

const GENTLE_TERMS =
  /\b(merc(?:y|iful)|pray(?:er|ing)?|grateful|thank(?:s|ful)?|creat(?:e|ed|ion|or)|guid(?:e|ance|ed)|forgiv(?:e|en|eness)|garden|paradise|worship|remember|prais(?:e|ed)|lord of the worlds|straight path)\b/i;

function ayahPlainTranslation(ayah) {
  return ayah.tr
    .map((part) => (part.t !== undefined ? part.t : ''))
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function lemmaIdsOf(word) {
  if (word.l == null) return [];
  return Array.isArray(word.l) ? word.l : [word.l];
}

function studyFormsLoose(study) {
  return [study.arabic, study.variant, ...(study.forms ?? [])]
    .filter(Boolean)
    .flatMap((form) => String(form).split(/[,\u060c]/))
    .map((part) => normalizeLightLoose(part.trim()))
    .filter(Boolean);
}

function maxExamplesFor(study) {
  const forms = studyFormsLoose(study);
  const meanings = String(study.english ?? '')
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
  return forms.length > 1 || meanings.length > 1 ? MAX_EXAMPLES_MULTI : MAX_EXAMPLES;
}

function studyIsAboutWeight(english) {
  return TOPIC_IS_WEIGHT.test(english ?? '');
}

function tonePenalty(translation, studyEnglish) {
  if (studyIsAboutWeight(studyEnglish)) return 0;
  const hits = translation.match(new RegExp(WEIGHT_TERMS.source, 'gi')) ?? [];
  if (hits.length === 0) return 0;
  return Math.min(hits.length, 2) * 16;
}

function gentleBonus(translation, studyEnglish) {
  if (studyIsAboutWeight(studyEnglish)) return 0;
  return GENTLE_TERMS.test(translation) ? 6 : 0;
}

function pedagogicalScore(surahNumber, wordCount, translation, studyEnglish) {
  let score = wordCount;
  if (wordCount < 3) score += 40;
  if (wordCount > 14) score += (wordCount - 14) * 4;
  if (surahNumber === 1) score -= 10;
  if (surahNumber >= 78) score -= 4;
  score += tonePenalty(translation, studyEnglish);
  score -= gentleBonus(translation, studyEnglish);
  return score;
}

function surfaceFitBonus(study, loc, ayah, stemByLocation) {
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

function translationKey(translation) {
  return translation
    .toLowerCase()
    .replace(/[^a-z]+/g, ' ')
    .replace(/^(and|so|then) /, '')
    .trim()
    .slice(0, 56);
}

function isWeightExample(translation, studyEnglish) {
  if (studyIsAboutWeight(studyEnglish)) return false;
  return WEIGHT_TERMS.test(translation);
}

function pickTopExamples(candidates, study, stemByLocation) {
  const max = maxExamplesFor(study);
  const preferred = study.exampleVerse;
  const byAyah = new Map();
  for (const candidate of candidates) {
    if (!candidate.ayah || !candidate.ayah.w.some((word) => word.p === candidate.p)) continue;
    const loc = `${candidate.s}:${candidate.a}:${candidate.p}`;
    const hitScore = -((candidate.bonus ?? 0) + surfaceFitBonus(study, loc, candidate.ayah, stemByLocation));
    const key = `${candidate.s}:${candidate.a}`;
    const prev = byAyah.get(key);
    if (!prev || hitScore < prev.hitScore) byAyah.set(key, { ...candidate, hitScore });
  }

  const ranked = [...byAyah.values()]
    .map((candidate) => {
      const tr = ayahPlainTranslation(candidate.ayah);
      return {
        ...candidate,
        tr,
        score: pedagogicalScore(candidate.s, candidate.ayah.w.length, tr, study.english),
      };
    })
    .sort((a, b) => a.score - b.score || a.s - b.s || a.a - b.a);

  const picked = [];
  const usedSurah = new Set();
  const usedKeys = new Set();
  const consider = (item) => {
    if (!item || picked.some((row) => row.s === item.s && row.a === item.a)) return false;
    const key = translationKey(item.tr);
    if (key && usedKeys.has(key)) return false;
    if (picked.length >= 1 && isWeightExample(item.tr, study.english)) return false;
    picked.push(item);
    usedSurah.add(item.s);
    if (key) usedKeys.add(key);
    return true;
  };

  for (const item of ranked) {
    if (picked.length >= max) break;
    if (picked.length > 0 && usedSurah.has(item.s)) continue;
    consider(item);
  }
  for (const item of ranked) {
    if (picked.length >= max) break;
    consider(item);
  }

  if (preferred) {
    const pref = ranked.find((row) => row.s === preferred.s && row.a === preferred.a);
    if (pref && !picked.some((row) => row.s === pref.s && row.a === pref.a)) {
      if (picked.length < max) consider(pref);
      else {
        const worst = picked[picked.length - 1];
        if (pref.score <= worst.score + 12) picked[picked.length - 1] = pref;
      }
    }
  }

  picked.sort((a, b) => a.score - b.score || a.s - b.s || a.a - b.a);
  return picked;
}

function packExample(s, a, p, n, ayah, hits) {
  const idx = ayah.w.findIndex((word) => word.p === p);
  if (idx < 0) return null;
  const toIndex = (wordP) => {
    const found = ayah.w.findIndex((word) => word.p === wordP);
    return found >= 0 ? found + 1 : wordP;
  };
  const example = { s, a, p: idx + 1 };
  const hitIndexes = (hits ?? []).map(toIndex).filter((pos, i, arr) => arr.indexOf(pos) === i);
  if (hitIndexes.length > 1) example.hits = hitIndexes;
  else if (n > 1) example.n = n;
  return example;
}

function indexLemmaLocations(ayahsBySurah) {
  const locationsByLemmaId = new Map();
  for (const [surahNumber, ayahs] of ayahsBySurah) {
    for (const ayah of ayahs) {
      for (const word of ayah.w) {
        for (const lemmaId of lemmaIdsOf(word)) {
          if (!locationsByLemmaId.has(lemmaId)) locationsByLemmaId.set(lemmaId, []);
          locationsByLemmaId.get(lemmaId).push(`${surahNumber}:${ayah.a}:${word.p}`);
        }
      }
    }
  }
  return locationsByLemmaId;
}

function uniqueLemmasByStudy(studyById) {
  const studyIdsByLemma = new Map();
  for (const [id, study] of studyById) {
    if (study.kind === 'grammar') continue;
    for (const lemmaId of study.lemmaIds ?? []) {
      if (!studyIdsByLemma.has(lemmaId)) studyIdsByLemma.set(lemmaId, new Set());
      studyIdsByLemma.get(lemmaId).add(id);
    }
  }
  const unique = new Map();
  for (const [id, study] of studyById) {
    unique.set(
      id,
      new Set((study.lemmaIds ?? []).filter((lemmaId) => (studyIdsByLemma.get(lemmaId)?.size ?? 0) === 1)),
    );
  }
  return unique;
}

function citationCore(study) {
  return normalizeLightLoose(String(study.arabic ?? '').split(/[,\u060c]/)[0] ?? '');
}

function surfaceFitsStudy(surface, forms, core) {
  if (forms.length === 0) return !core || surface.length >= core.length;
  return forms.some((form) => {
    if (surface === form) return true;
    return surface.endsWith(form) && surface.length - form.length <= 3;
  });
}

function addLemmaLocations(study, locations, ayahsBySurah, locationsByLemmaId, uniqueLemmas) {
  const forms = studyFormsLoose(study);
  const core = citationCore(study);
  const seen = new Set(locations);
  for (const lemmaId of study.lemmaIds ?? []) {
    for (const loc of locationsByLemmaId.get(lemmaId) ?? []) {
      if (seen.has(loc)) continue;
      const [s, a, p] = loc.split(':').map(Number);
      const ayah = ayahsBySurah.get(s)?.find((row) => row.a === a);
      const word = ayah?.w.find((item) => item.p === p);
      if (!word) continue;
      const ids = lemmaIdsOf(word);
      const surface = normalizeLightLoose(word.ar.map((seg) => seg.t).join(''));
      const uniqueHit = uniqueLemmas.size > 0 && ids.some((id) => uniqueLemmas.has(id));
      if (uniqueHit) {
        if (core.length <= 4 && surface.length < core.length) continue;
        seen.add(loc);
        locations.push(loc);
        continue;
      }
      if (!surfaceFitsStudy(surface, forms, core)) continue;
      seen.add(loc);
      locations.push(loc);
    }
  }
}

function storedExampleList(raw) {
  if (!raw) return [];
  return Array.isArray(raw) ? raw : [raw];
}

function uniqueAyahCount(candidates) {
  const keys = new Set();
  for (const candidate of candidates) {
    if (candidate.ayah) keys.add(`${candidate.s}:${candidate.a}`);
  }
  return keys.size;
}

function buildVocabExampleMap({
  studyById,
  exampleOfById,
  locationsByVocabId,
  ayahsBySurah,
  ayahWordOrder,
  surfaceByLocation,
  stemByLocation,
  existingExamples,
  onlyIds,
}) {
  const studyCores = collectStudyCores(studyById);
  const personByIndependentId = Object.fromEntries(
    Object.entries(INDEPENDENT_PRONOUN_BY_PERSON).map(([person, id]) => [id, person]),
  );
  const locationsByLemmaId = indexLemmaLocations(ayahsBySurah);
  const uniqueLemmas = uniqueLemmasByStudy(studyById);
  const vocabExamples = {};
  let processed = 0;
  const studyCount = [...studyById.values()].filter((word) => word.kind !== 'grammar').length;

  for (const [id, study] of studyById) {
    if (study.kind === 'grammar') continue;
    if (onlyIds && !onlyIds.has(id)) continue;
    const locations = [...(locationsByVocabId.get(id) ?? [])];
    const person = personByIndependentId[id];
    if (person && locations.length === 0 && study.exampleVerse) {
      locations.push(...collectVerbPersonLocations(stemByLocation, person, study.arabic));
    }
    addLemmaLocations(study, locations, ayahsBySurah, locationsByLemmaId, uniqueLemmas.get(id) ?? new Set());

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
    const fromLoc = (loc, bonus, n = 1, hits) => {
      const [s, a, p] = loc.split(':').map(Number);
      const ayahs = ayahsBySurah.get(s);
      const ayah = ayahs ? ayahs.find((row) => row.a === a) : null;
      return { s, a, p, n, ayah, bonus, hits };
    };

    const candidates = [];
    const pushAll = (items) => {
      for (const item of items) {
        if (item.ayah) candidates.push(item);
      }
    };

    if (preferred) {
      const inAyah = (item) => item.s === preferred.s && item.a === preferred.a;
      pushAll(phraseRuns.map((run) => fromRun(run, 40)).filter(inAyah));
      const locPrefix = `${preferred.s}:${preferred.a}:`;
      pushAll(locations.filter((loc) => loc.startsWith(locPrefix)).map((loc) => fromLoc(loc, 40)));
      if (!candidates.some((item) => item.s === preferred.s && item.a === preferred.a)) {
        const ayahs = ayahsBySurah.get(preferred.s);
        const ayah = ayahs ? ayahs.find((row) => row.a === preferred.a) : null;
        const forms = studyFormsLoose(study);
        const match = ayah?.w.find((item) =>
          forms.includes(normalizeLightLoose(item.ar.map((seg) => seg.t).join(''))),
        );
        if (ayah && match) candidates.push({ s: preferred.s, a: preferred.a, p: match.p, n: 1, ayah, bonus: 40 });
      }
    }

    pushAll(phraseRuns.map((run) => fromRun(run, 50)));
    pushAll(locations.map((loc) => fromLoc(loc, 0)));
    pushAll(
      storedExampleList(existingExamples?.[id])
        .filter((example) => {
          const loc = `${example.s}:${example.a}:${example.p}`;
          return (
            locations.includes(loc) ||
            phraseRuns.some((run) => run.loc === loc)
          );
        })
        .map((example) => fromLoc(`${example.s}:${example.a}:${example.p}`, 25, example.n ?? 1, example.hits)),
    );

    if (uniqueAyahCount(candidates) < maxExamplesFor(study)) {
      const partial = findPartialExampleHits(study, studyCores, ayahWordOrder, surfaceByLocation, stemByLocation);
      pushAll(partial.map((run) => fromRun(run, 15)));
    }

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

    const packed = pickTopExamples(candidates, study, stemByLocation)
      .map((best) => {
        const extraHits = hitsInAyah(best.s, best.a);
        const hits = extraHits.length > 1 ? extraHits : best.hits;
        return packExample(best.s, best.a, best.p, best.n, best.ayah, hits);
      })
      .filter(Boolean);
    if (packed.length) vocabExamples[id] = packed;
    processed += 1;
    if (processed % 500 === 0) console.log(`  examples ${processed}/${studyCount}`);
  }

  for (const [id, ofId] of exampleOfById) {
    if (!vocabExamples[id] && vocabExamples[ofId]) vocabExamples[id] = vocabExamples[ofId];
  }
  return vocabExamples;
}

module.exports = {
  buildVocabExampleMap,
  ayahPlainTranslation,
};
