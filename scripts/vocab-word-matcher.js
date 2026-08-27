/**
 * Matches Quranki's 547 study words/phrases (src/data/quranic-words.json) against every word of
 * the Qur'an, so the reader can know which on-screen words the user has already studied - and
 * later, whether they've mastered them - in order to hide/reveal their word-by-word translation.
 *
 * A citation-form vocabulary word (e.g. the verb "هَدَى") doesn't literally reappear everywhere
 * it's relevant - Arabic morphology means the same word surfaces as many different letter
 * sequences ("يَهْدِى", "اهْتَدَىٰ", "هُدًى", "مُهْتَدٍ", ...), and nouns are almost always fused
 * with a leading "ال" or other single-letter prefixes with no space ("الشَّمْس" is one Qur'an
 * word, not "شَمْس" with a separate "ال"). Simple diacritic-insensitive string matching alone
 * only reaches ~20k of the deck's documented 64,282-word coverage for exactly this reason.
 *
 * To close that gap, this uses the Qur'anic Arabic Corpus's morphological segmentation
 * (scripts/data/quran-morphology.txt, from https://github.com/mustafa0x/quran-morphology, an
 * Arabic-script transliteration of the Quranic Arabic Corpus v0.4, (c) Kais Dukes, GNU GPL -
 * kept verbatim as downloaded, see its header for the license/attribution terms): every Qur'an
 * word is pre-split into prefix/stem/suffix segments, and each stem segment is tagged with its
 * dictionary LEMMA and (usually) its ROOT.
 *
 * Matching happens in two normalization tiers, tried in order, because stripping *all* short
 * vowels (as the first version of this script did) is a double-edged sword: it's necessary to
 * unify inflected surface forms with a lemma, but it also erases distinctions that are the
 * *entire difference* between two unrelated words - e.g. "مَنْ" (man, "who") and "مِنْ" (min,
 * "from") both collapse to "من", and would otherwise get assigned to whichever study entry
 * happened to be processed first, mislabeling thousands of the loser's real occurrences:
 *
 *   1. "Light" matching keeps *stem-internal* short vowels and only strips the ones that are
 *      grammatically non-distinctive rather than part of a word's identity: a word-final case
 *      vowel/sukun/tanween (i'rāb - it marks grammatical role, not word identity, and the study
 *      deck and the morphology corpus disagree constantly on whether to write it at all, e.g.
 *      deck "مَنْ" vs. corpus lemma "مَن"), and a hamzat waṣl's contextual opening vowel (the
 *      elidable connecting hamza that opens verb forms VII/VIII/X, e.g. deck "اِهْتَدَى" vs.
 *      corpus lemma "اهْتَدَى"). That wasl strip applies only to a leading bare alef / hamzat
 *      waṣl (ا / ٱ) - not to alef-with-hamza (أ / إ), whose opening vowel *is* the word: "إِلَّا"
 *      ("except") vs "أَلَّا" ("that not"), "إِنَّ" vs "أَنَّ". Every *stem-internal* vowel
 *      survives, so homographs distinguished only by an internal vowel - like "مَنْ" ("man",
 *      who) vs. "مِنْ" ("min", from) - still resolve correctly instead of colliding.
 *   2. "Heavy" matching (strip all short vowels) is only used as a fallback for a study word
 *      that light matching found zero occurrences for, and only when that heavy-normalized
 *      token isn't *also* the heavy form of some other, distinct study word - an ambiguous
 *      fallback is dropped rather than guessed at.
 *
 * Root-family expansion (tag every word sharing a matched word's root, e.g. unifying "هَدَى" and
 * "اهتدى") only ever runs off of confidently-seeded matches, and only when every seed agrees on
 * a single root, so it can't itself introduce a cross-word mix-up.
 *
 * A handful of study words are citation *phrases* rather than single words (e.g. "لَا إِلهَ" "no
 * god", "بَيْنَ يَدَيْ" "in front of") - these are never matched as a contiguous run of adjacent
 * Qur'an words. Instead, each space-separated word in the citation is registered as its own
 * ordinary single-word candidate under the same id (see loadStudyForms), so a learner who
 * recognizes just one piece of the phrase (most usefully "لَا" "no/not", which also happens to be
 * one of the most common words in the whole Qur'an) has it hidden everywhere *that* word appears,
 * not only in the rarer spots it happens to sit next to the phrase's other word. Because a
 * split-off word like that is auto-derived rather than a real, deliberately-taught deck entry, it
 * always defers outright to a genuine single-word study entry for the exact same text should one
 * exist elsewhere in the deck (e.g. "06-012" "لَوْ لَا" "if not for" also splits off a "لَوْ" token,
 * but "12-011" already teaches bare "لَوْ" "if" on its own and keeps every occurrence of it).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const MORPHOLOGY_PATH = path.join(__dirname, 'data', 'quran-morphology.txt');

const ALEF_FAMILY = '\u0627\u0622\u0623\u0625\u0671';

/** Removes an elidable hamzat-waṣl's contextual vowel (see the module doc comment). Only a
 *  leading bare alef (ا) or hamzat waṣl (ٱ) qualifies: the study deck writes form-VII/VIII/X
 *  verbs as "اِهْتَدَى" rather than with ٱ, so both shapes need the same treatment. Alef-with-
 *  hamza (أ / إ) and alef-madda (آ) carry a real hamza; stripping *their* vowel would collapse
 *  distinct particles such as "إِلَّا" / "أَلَّا" and "إِنَّ" / "أَنَّ". */
function stripInitialWaslVowel(text) {
  return text.replace(/^([\u0627\u0671])[\u064b-\u0652]+/, '$1');
}

/** Removes a trailing case vowel/tanween/sukun (i'rāb) - the very last character, and only if
 *  it's one of those marks. Deliberately excludes shadda (\u0651, gemination - part of a word's
 *  root pattern, not a case ending): a word ending "consonant+shadda+case-vowel" (e.g. "رَبِّ")
 *  should end up as "consonant+shadda" (e.g. "رَبّ"), matching how the corpus's lemma writes it. */
function stripFinalCaseVowel(text) {
  return text.replace(/[\u064b-\u0650\u0652]$/, '');
}

/** Spelling-variant-only cleanup shared by both normalization tiers: strips tatweel/joiners and
 *  Qur'anic annotation marks, and unifies letters that are typically written inconsistently
 *  between "clean" dictionary text and the Uthmani mushaf script for the same word (hamza-seat
 *  and alef variants, dagger alif, alef maksura vs. yeh) - without touching stem-internal short
 *  vowels. */
function normalizeLight(text) {
  const cleaned = stripFinalCaseVowel(
    stripInitialWaslVowel(
      text
        .normalize('NFC')
        .replace(/[\u0640\u200c\u200d]/g, '') // tatweel, ZWNJ, ZWJ
        .replace(/[\u0653-\u0655]/g, '') // combining maddah/hamza-above/hamza-below
        // \u06e1 ("small high dotless head of khah") is this mushaf script's own sukun mark -
        // used ~41k times, far more than plain \u0652 - almost always on a word-medial letter
        // (e.g. the ي in "بَيْنَ" "between"), not a mere pause/annotation glyph. Mapping it to
        // \u0652 rather than discarding it (as the other marks in this range genuinely are)
        // keeps that letter's vowellessness legible to stripFinalCaseVowel below and to anything
        // comparing this word's stem-internal vowels against a study word's own citation form,
        // which almost always spells the same sukun with plain \u0652 - discarding it outright
        // instead would silently drop the very letter it sits on out of the normalized text
        // entirely (see e.g. "بَيْنَ" losing its ن) wherever a comparison expects it to survive.
        .replace(/\u06e1/g, '\u0652')
        .replace(/[\u06d6-\u06ed]/g, ''), // remaining small Qur'anic pause/annotation marks
    ),
  );
  return cleaned
    .replace(/\u0670/g, '\u0627') // dagger alif -> plain alef (spelling variant, not a vowel choice)
    .replace(new RegExp(`[${ALEF_FAMILY}]`, 'g'), '\u0627')
    .replace(/\u0624/g, '\u0648') // waw with hamza above -> waw
    .replace(/\u0626/g, '\u064a') // yeh with hamza above -> yeh
    .replace(/\u0649/g, '\u064a') // alef maksura -> yeh (Uthmani rasm often spells word-final
    // "yeh" this way - e.g. "فى"/"على"/"إلى" - where standard dictionary spelling uses "ي")
    .replace(/[^\u0600-\u06ff]/g, '') // drop anything left that isn't an Arabic-block character
    .trim();
}

/** Full normalization: light normalization plus stripping every remaining short vowel mark.
 *  Used for the heavy-matching fallback, for root text (already vowel-free), and to detect
 *  which study words are only distinguishable *with* their vowels (see loadStudyForms). */
function normalizeArabic(text) {
  return normalizeLight(text).replace(/[\u064b-\u0652]/g, '');
}

/** Light normalization plus stripping *only* shadda (gemination) and sukun (vowellessness) -
 *  unlike normalizeArabic/"heavy" matching, every other short vowel (fatha/kasra/damma/tanween)
 *  survives, so this stays just as safe from cross-word collisions as light matching for
 *  distinguishing genuinely different words (see the module doc comment on "مَنْ" vs "مِنْ").
 *  Closes a narrower gap light matching alone can't: a mushaf spelling and the study deck's own
 *  citation form occasionally disagree only on whether a doubling/vowellessness mark is written
 *  at all, never on the vowels themselves - e.g. the mushaf spells the negation particle "لَا" as
 *  "لَّا" (with a gemination shadda picked up from an elided assimilated letter) in some
 *  positions, and never writes the sukun on "أَنْتَ" ("you") that the deck's own citation does.
 *  Used only for a *supplementary* top-up pass (see buildVocabMatches) - never as a primary
 *  matching tier - specifically because dropping shadda/sukun can still coincidentally unify two
 *  otherwise-distinct words that happen to share every vowel quality (e.g. "رَبَّ" and "رَبَ" if
 *  both existed), so it's deliberately not used as broadly as light matching is. */
function normalizeLightLoose(text) {
  return normalizeLight(text).replace(/[\u0651\u0652]/g, '');
}

/** Whether a study word's own citation form ends in a bare fatha - the standard citation
 *  convention for a 3rd-person-masculine-past-tense verb (e.g. "ذَكَرَ", "عَبَدَ"), as opposed to
 *  the bare/pausal citation of a noun or adjective (e.g. "ذَكَر" "male", "عَبْد" "slave"). Used
 *  only to break a rare kind of tie: a verb's *final* case vowel is stripped by normalizeLight
 *  (see its doc comment), which can coincidentally make it collide with an unrelated noun that
 *  never had a final vowel to begin with (e.g. both become "ذَكَر") - this distinguishes the two
 *  well enough to route each occurrence to the right one by POS instead of guessing. */
function endsWithBareFatha(word) {
  return /\u064e$/.test(word.normalize('NFC'));
}

/** One matchable single-word unit derived from a study word: parallel light/heavy normalized
 *  token plus the id it should tag matching Qur'an words with. `looksLikeVerb` is this word's own
 *  citation-form verb guess (see endsWithBareFatha). `synthetic` marks a token that isn't itself
 *  a real deck entry but was auto-derived by splitting a multi-word citation into its individual
 *  words (see loadStudyForms) - used by buildVocabMatches to make sure a word the deck already
 *  teaches in its own right always outranks an auto-derived alias for the same word. */
function loadStudyForms() {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'quranic-words.json'), 'utf8'));
  const forms = [];
  for (const level of raw.levels) {
    for (const word of level.words) {
      // A word's own listed "plural" (e.g. "22-002" "إِلَٰه" "god" -> "آلِهَة" "gods") is
      // registered as just another citation form under the very same id, the same as an
      // additional comma-separated singular form would be: it's the same vocabulary concept, not
      // a different word, so a learner who's marked the singular known should have the plural
      // hidden right along with it, exactly like the existing root-family expansion already does
      // for other morphological relatives.
      const citationForms = word.plural ? `${word.arabic},${word.plural}` : word.arabic;
      for (const commaForm of citationForms.split(/[,\u060c]/)) {
        for (const piece of commaForm.split('...')) {
          const words = piece.split(/\s+/).filter(Boolean);
          if (words.length === 0) continue;

          // A citation with more than one space-separated word (e.g. "لَا إِلهَ" "no god", "بَيْنَ
          // يَدَيْ" "in front of") is never matched as a contiguous phrase - the deck's own
          // citation form is just a gloss for the *concept*, but the individual words that make it
          // up are each real, independent Qur'an vocabulary in their own right, and a learner who
          // recognizes one of them (e.g. "لَا" "no/not") should have it hidden everywhere it
          // appears, not only in the handful of places it happens to sit next to the citation's
          // other word. So each word is registered as its own ordinary single-token form below,
          // sharing this same study id, instead of requiring the whole run to match adjacently.
          for (const singleWord of words) {
            const lightToken = normalizeLight(singleWord);
            if (!lightToken) continue;
            forms.push({
              id: word.id,
              lightTokens: [lightToken],
              heavyTokens: [normalizeArabic(singleWord)],
              looseTokens: [normalizeLightLoose(singleWord)],
              looksLikeVerb: endsWithBareFatha(singleWord),
              synthetic: words.length > 1,
            });
          }

          // Some deck citations write what's really one fused mushaf word with an internal space
          // for etymological clarity (e.g. "لَوْ لَا" for "لَوْلَا" "if not for", always spelled
          // as a single word in the mushaf, never two separate ones, and lemmatized by the corpus
          // as that single fused particle rather than under either half's own lemma). Registering
          // the space-joined form too, as an ordinary (non-synthetic) single-token candidate, lets
          // a word like that match through the same lemma-/stem-surface-based machinery single-
          // token forms already get - in *addition* to, not instead of, each individual word above.
          if (words.length > 1) {
            const fused = words.join('');
            const fusedLight = normalizeLight(fused);
            if (fusedLight) {
              forms.push({
                id: word.id,
                lightTokens: [fusedLight],
                heavyTokens: [normalizeArabic(fused)],
                looseTokens: [normalizeLightLoose(fused)],
                looksLikeVerb: endsWithBareFatha(fused),
              });
            }
          }
        }
      }
    }
  }
  return forms;
}

/** Parses the morphology corpus into `"surah:ayah:word" -> { lightLemma, heavyLemma, root, pos,
 *  lightSurface, heavySurface }`. `lightLemma`/`heavyLemma`/`root`/`pos` come from the word's
 *  first segment that isn't itself a prefix or suffix (its "stem"); words entirely made of
 *  affixes (rare) or missing a lemma leave those four unset. `pos` is `'V'` for verbs and `'N'`
 *  for everything else (nouns, adjectives, proper nouns, ...) - just enough to tell apart the
 *  verb sense of a root from its noun/adjective sense (see buildVocabMatches).
 *
 *  `lightSurface`/`heavySurface` are built differently, and always set: they're every segment's
 *  own literal text *except* a leading single-letter preposition/conjunction (a "PREF" segment,
 *  e.g. "وَ" and, "بِ" by, "لِ" for/to, "كَ" like) glued back together. A one-letter prefix like
 *  that is written with no space, fused onto the next mushaf word (e.g. "وَأُو۟لَٰٓئِكَ" and-those
 *  is one word on the page) - so the reader data's own whole-word surface text, matched directly
 *  against a study word's citation form, only ever matches the *unprefixed* occurrences of a
 *  word. Reconstructing the prefix-stripped surface from the morphology segments (rather than
 *  slicing characters off the reader data's text) means the two independent datasets never need
 *  to be character-aligned - it's entirely self-contained within this file. A trailing suffix
 *  (e.g. an attached object/possessive pronoun) is deliberately *kept*, since the study deck's
 *  own citation forms often include one (e.g. "أُوْلَآئِكَ" already ends with the "-ka" this
 *  corpus tags as a separate SUFF segment). */
/**
 * `ayahWordOrder` (optional, `"surah:ayah" -> ["surah:ayah:word", ...]`, the same map
 * `buildVocabMatches`'s caller builds from the reader data) lets this cross-check the corpus's
 * own per-ayah word count against the reader's. A handful of ayahs disagree - not typos, but the
 * corpus fusing two space-separated mushaf words into a single word-index (e.g. "بَعْدَ مَا"
 * "after that" in 2:181, or the proper name "إِلْ يَاسِينَ" in 37:130) - which shifts every later
 * word-index in that ayah out of alignment with the reader's own numbering for the rest of the
 * ayah. Silently trusting a shifted position would attribute a totally unrelated word's
 * lemma/root to whatever the reader considers that position (2:181's shifted position 11 - the
 * corpus's own data for "ٱللَّهَ" "Allah" - got read as the reader's position 11, "إِنَّ"
 * "verily", corrupting matching for both once root-family expansion ran with it). An ayah with a
 * word-count mismatch has ALL of its stems dropped rather than risk that: falling back to
 * non-morphology-based matching for its handful of words is far safer than mislabeling them.
 */
function loadMorphologyStems(ayahWordOrder) {
  const lines = fs.readFileSync(MORPHOLOGY_PATH, 'utf8').split('\n');
  const segmentsByWord = new Map(); // wordKey -> [{ text, pos, feats }, ...] in segment order
  const wordCountByAyah = new Map(); // "surah:ayah" -> highest word index the corpus has for it
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const [loc, text, pos, featuresRaw] = line.split('\t');
    if (!loc || !text || !featuresRaw) continue;
    const parts = loc.split(':');
    if (parts.length !== 4) continue;
    const wordKey = `${parts[0]}:${parts[1]}:${parts[2]}`;
    if (!segmentsByWord.has(wordKey)) segmentsByWord.set(wordKey, []);
    segmentsByWord.get(wordKey).push({ text, pos, feats: featuresRaw.split('|') });

    const ayahKey = `${parts[0]}:${parts[1]}`;
    const wordIndex = Number(parts[2]);
    wordCountByAyah.set(ayahKey, Math.max(wordCountByAyah.get(ayahKey) ?? 0, wordIndex));
  }

  const misalignedAyahs = new Set();
  if (ayahWordOrder) {
    for (const [ayahKey, locations] of ayahWordOrder) {
      const morphCount = wordCountByAyah.get(ayahKey);
      if (morphCount !== undefined && morphCount !== locations.length) misalignedAyahs.add(ayahKey);
    }
  }

  const stemByLocation = new Map();
  for (const [wordKey, segments] of segmentsByWord) {
    const [surahNum, ayahNum] = wordKey.split(':');
    if (misalignedAyahs.has(`${surahNum}:${ayahNum}`)) continue;
    const surfaceRaw = segments
      .filter((s) => !s.feats.includes('PREF'))
      .map((s) => s.text)
      .join('');
    const stem = segments.find((s) => !s.feats.includes('PREF') && !s.feats.includes('SUFF'));
    const lemFeat = stem?.feats.find((f) => f.startsWith('LEM:'));
    const rootFeat = stem?.feats.find((f) => f.startsWith('ROOT:'));
    stemByLocation.set(wordKey, {
      lightLemma: lemFeat ? normalizeLight(lemFeat.slice(4)) : null,
      heavyLemma: lemFeat ? normalizeArabic(lemFeat.slice(4)) : null,
      root: rootFeat ? normalizeArabic(rootFeat.slice(5)) : null,
      pos: stem?.pos === 'V' ? 'V' : 'N',
      lightSurface: normalizeLight(surfaceRaw),
      heavySurface: normalizeArabic(surfaceRaw),
      looseSurface: normalizeLightLoose(surfaceRaw),
    });
  }
  return stemByLocation;
}

function addToIndex(index, key, value) {
  if (!key) return;
  if (!index.has(key)) index.set(key, []);
  index.get(key).push(value);
}

/** Builds the full location -> study-id map for the whole Qur'an in one pass.
 *  `rawSurfaceByLocation` is `"surah:ayah:word" -> rawArabicText` (undiacritic-stripped, as
 *  rendered), and `ayahWordOrder` is `"surah:ayah" -> ["surah:ayah:word", ...]` in word order
 *  (both derived by the caller from the same per-surah reader data used to render the app, so
 *  positions always agree with what's on screen). */
function buildVocabMatches(rawSurfaceByLocation, ayahWordOrder) {
  const studyForms = loadStudyForms();
  const stemByLocation = loadMorphologyStems(ayahWordOrder);

  const lightLemmaIndex = new Map();
  const heavyLemmaIndex = new Map();
  const rootIndex = new Map();
  // Indexed separately from the reader data's whole-word surface text below because it's already
  // prefix-stripped (see loadMorphologyStems) - this is what lets an attached "وَ"/"بِ"/"لِ"/"كَ"
  // prefix not prevent a study word's citation form from matching that occurrence.
  const lightStemSurfaceIndex = new Map();
  const heavyStemSurfaceIndex = new Map();
  for (const [loc, stem] of stemByLocation) {
    addToIndex(lightLemmaIndex, stem.lightLemma, loc);
    addToIndex(heavyLemmaIndex, stem.heavyLemma, loc);
    addToIndex(rootIndex, stem.root, loc);
    addToIndex(lightStemSurfaceIndex, stem.lightSurface, loc);
    addToIndex(heavyStemSurfaceIndex, stem.heavySurface, loc);
  }
  const lightSurfaceIndex = new Map();
  const heavySurfaceIndex = new Map();
  const lightSurfaceByLocation = new Map();
  const heavySurfaceByLocation = new Map();
  for (const [loc, rawText] of rawSurfaceByLocation) {
    const light = normalizeLight(rawText);
    const heavy = normalizeArabic(rawText);
    lightSurfaceByLocation.set(loc, light);
    heavySurfaceByLocation.set(loc, heavy);
    addToIndex(lightSurfaceIndex, light, loc);
    addToIndex(heavySurfaceIndex, heavy, loc);
  }

  const matchByLocation = new Map(); // "surah:ayah:word" -> study id

  const singleTokenForms = studyForms.filter((f) => f.lightTokens.length === 1);

  // The prefix-stripped stem-surface index is deliberately treated as a lower-confidence,
  // fill-the-gaps-only source: an exact *whole-word* match for some study word (any study word,
  // not just the one being seeded) means that occurrence already has a precise owner and
  // shouldn't also be pulled in by a broader, prefix-stripped match. This matters because the
  // deck teaches some prefix+word combinations as their own vocabulary item (e.g. "09-001" is
  // "بِمَا", not just "ب" + "06-001" "مَا") - without this, every "بِمَا" occurrence would look
  // identical to a stripped "مَا" and get misattributed to the bare word instead.
  //
  // Deliberately *not* using lemma matches for this: a lemma can legitimately be a broad,
  // multi-sense umbrella (e.g. the corpus lemmatizes every demonstrative pronoun - "هَذَا",
  // "ذَلِكَ", "أُولَٰئِكَ" - under one shared root lemma "ذا", which also happens to be one of
  // "07-001"'s own citation forms, "ذُو، ذَا، ذِي" "possessor of"). Treating that lemma match as
  // an exact claim would wrongly block *other* demonstrative words' own prefix-stripped matches
  // on the mere coincidence of sharing a lemma with an unrelated word.
  const exactLightMatchLocations = new Set();
  for (const form of singleTokenForms) {
    for (const loc of lightSurfaceIndex.get(form.lightTokens[0]) ?? []) exactLightMatchLocations.add(loc);
  }

  // Pass 1: vowel-exact ("light") seeding. Every form is tried independently - two study words
  // legitimately keeping distinct vowels (like "مَنْ" vs "مِنْ") simply seed two disjoint sets.
  // A handful of tokens are shared by more than one study word even at this tier - almost always
  // the verb/noun final-case-vowel coincidence described on endsWithBareFatha (e.g. the verb
  // "ذَكَرَ" and the noun "ذَكَر" "male" both normalize to "ذَكَر"). Those are split by POS using
  // each id's own looksLikeVerb guess when it cleanly separates the colliding ids; otherwise the
  // shared candidates are left unseeded for all of them rather than guessed at - *except* that a
  // `synthetic` owner (a word auto-derived by splitting a multi-word citation - see
  // loadStudyForms) always defers outright to any `synthetic: false` co-owner of the same token,
  // regardless of POS: a word the deck already teaches deliberately, on its own, should never
  // lose any of its occurrences to an auto-derived alias of some *other* word that merely happens
  // to contain the same text (e.g. "12-011"'s own "لَوْ" "if" must keep every occurrence of "لَوْ"
  // even though "06-012" "لَوْ لَا" "if not for" also splits off a "لَوْ" token).
  const seedsById = new Map(); // id -> Set<location>, own direct (lemma/surface) matches only
  const unseeded = [];
  function mergeSeed(id, seed) {
    const existing = seedsById.get(id);
    if (existing) for (const loc of seed) existing.add(loc);
    else seedsById.set(id, new Set(seed));
  }
  const lightTokenOwners = new Map();
  for (const form of singleTokenForms) {
    if (!lightTokenOwners.has(form.lightTokens[0])) lightTokenOwners.set(form.lightTokens[0], []);
    lightTokenOwners.get(form.lightTokens[0]).push(form);
  }
  for (const form of singleTokenForms) {
    const [lightToken] = form.lightTokens;
    const stemSurfaceMatches = (lightStemSurfaceIndex.get(lightToken) ?? []).filter(
      (loc) => !exactLightMatchLocations.has(loc),
    );
    const candidates = new Set([
      ...(lightLemmaIndex.get(lightToken) ?? []),
      ...(lightSurfaceIndex.get(lightToken) ?? []),
      ...stemSurfaceMatches,
    ]);
    const owners = lightTokenOwners.get(lightToken);
    const naturalOwners = owners.filter((o) => !o.synthetic);
    const contendingOwners = naturalOwners.length > 0 ? naturalOwners : owners;
    let seed = candidates;
    // Whether a *synthetic* form lost this token outright to some other owner (as opposed to a
    // natural word losing an ordinary natural-vs-natural collision, which still gets its normal
    // pass-2 heavy-fallback shot exactly as before multi-word splitting existed) - see the pass-2
    // comment below for why the distinction matters.
    let suppressFallback = false;
    if (form.synthetic && naturalOwners.length > 0) {
      // A word the deck already teaches deliberately, on its own, always outranks an auto-derived
      // alias of some *other* word that merely happens to contain the same text (e.g. "12-011"'s
      // own "لَوْ" "if" must keep every occurrence of "لَوْ" even though "06-012" "لَوْ لَا" "if not
      // for" also splits off a "لَوْ" token) - regardless of POS.
      seed = new Set();
      suppressFallback = true;
    } else if (contendingOwners.length > 1) {
      const sameClassOwners = contendingOwners.filter((o) => o.looksLikeVerb === form.looksLikeVerb);
      if (sameClassOwners.length === 1) {
        seed = new Set([...candidates].filter((loc) => (stemByLocation.get(loc)?.pos === 'V') === form.looksLikeVerb));
      } else if (contendingOwners[0] !== form) {
        // Still ambiguous even split by POS (e.g. two colliding verbs, or the same word entered
        // twice in the deck by mistake) - rather than guess, or drop the shared occurrences for
        // everyone, keep this deterministic: only the first-listed (earliest level) owner claims
        // the shared candidates, exactly as if this token had only ever had one owner.
        seed = new Set();
        if (form.synthetic) suppressFallback = true;
      }
    }
    if (seed.size > 0) mergeSeed(form.id, seed);
    // A *synthetic* form that lost this token to another owner is deliberately excluded from the
    // heavy fallback pass below too, rather than being treated the same as a form that simply
    // found no candidates at all: pass 2's own ambiguity check only looks at *other still-
    // unseeded* forms, so without this it wouldn't know this token already has a rightful owner
    // (the light-tier winner, who isn't "unseeded" and so isn't considered) and would hand the
    // synthetic loser the exact same locations right back, uncontested, via heavy-normalized
    // matching instead. A *natural* word that loses an ordinary natural-vs-natural collision is
    // unaffected and still proceeds to pass 2 as it always has.
    else if (!suppressFallback) unseeded.push(form);
  }

  // Pass 2: fallback ("heavy") seeding for study words light matching found nothing for -
  // skipped entirely when the heavy-normalized token is shared by more than one such word, since
  // there's then no way to tell which of them a given occurrence really belongs to.
  const exactHeavyMatchLocations = new Set();
  for (const form of singleTokenForms) {
    for (const loc of heavySurfaceIndex.get(form.heavyTokens[0]) ?? []) exactHeavyMatchLocations.add(loc);
  }
  const heavyTokenOwners = new Map();
  for (const form of unseeded) {
    if (!heavyTokenOwners.has(form.heavyTokens[0])) heavyTokenOwners.set(form.heavyTokens[0], new Set());
    heavyTokenOwners.get(form.heavyTokens[0]).add(form.id);
  }
  for (const form of unseeded) {
    const [heavyToken] = form.heavyTokens;
    if ((heavyTokenOwners.get(heavyToken)?.size ?? 0) > 1) continue; // ambiguous - skip, don't guess
    const stemSurfaceMatches = (heavyStemSurfaceIndex.get(heavyToken) ?? []).filter(
      (loc) => !exactHeavyMatchLocations.has(loc),
    );
    const seed = new Set([
      ...(heavyLemmaIndex.get(heavyToken) ?? []),
      ...(heavySurfaceIndex.get(heavyToken) ?? []),
      ...stemSurfaceMatches,
    ]);
    if (seed.size > 0) mergeSeed(form.id, seed);
  }

  // Pass 3: "loose" (shadda/sukun-insensitive, but every other vowel-exact - see
  // normalizeLightLoose) surface top-up for words that pass 1 *already* found some light-tier
  // matches for. Pass 2 above only rescues a form with *zero* light matches - but some study
  // words have a handful of their occurrences spelled in a way that only differs by a
  // doubling/vowellessness mark, never a genuine vowel choice, so full heavy (all-vowels-
  // stripped) matching would be needlessly - and, as tested, dangerously - broad for this: e.g.
  // "لَا" ("no/not") matches most of its occurrences via light surface/stem-surface text, but the
  // mushaf also spells a handful of them "لَّا" (a gemination shadda picked up from an elided
  // assimilated letter); "أَنْتَ" ("you") never gets its sukun written in the mushaf at all,
  // unlike the study deck's own citation. Full heavy matching *would* catch both of those, but
  // heavy-normalizing also erases enough real distinctions between unrelated words (shadda
  // especially - e.g. "أَمِين" "trustworthy" and "أُمِّيِّينَ" "the unlettered" collapse to the
  // same bare skeleton once every doubled letter and vowel is stripped) that trying it as a
  // broad top-up for every already-seeded word caused real cross-word mislabeling in testing.
  // Loose matching keeps every vowel quality (only shadda/sukun go), so it stays exactly as safe
  // from that as light matching already is, while still closing this narrower gap. Since this is
  // a *supplementary* top-up (only ever adding occurrences, never reassigning ones pass 1/2
  // already gave to someone else), it's safe to run for every single-token form, seeded or not -
  // guarded by the exact same natural-outranks-synthetic and single-owner ambiguity checks pass 1
  // uses, just computed across *all* forms rather than only ones still unseeded. Deliberately
  // surface-only, never lemma-based, for the same reason pass 2's own doc comment gives for why
  // this file doesn't use lemma matches for stem-surface gap-filling: a lemma can be a much
  // broader multi-sense umbrella than one specific word's own citation form.
  const looseSurfaceIndex = new Map();
  for (const [loc, rawText] of rawSurfaceByLocation) {
    addToIndex(looseSurfaceIndex, normalizeLightLoose(rawText), loc);
  }
  const looseStemSurfaceIndex = new Map();
  for (const [loc, stem] of stemByLocation) addToIndex(looseStemSurfaceIndex, stem.looseSurface, loc);
  const exactLooseMatchLocations = new Set();
  for (const form of singleTokenForms) {
    for (const loc of looseSurfaceIndex.get(form.looseTokens[0]) ?? []) exactLooseMatchLocations.add(loc);
  }
  const looseTokenOwnersAll = new Map();
  for (const form of singleTokenForms) {
    if (!looseTokenOwnersAll.has(form.looseTokens[0])) looseTokenOwnersAll.set(form.looseTokens[0], []);
    looseTokenOwnersAll.get(form.looseTokens[0]).push(form);
  }
  for (const form of singleTokenForms) {
    const [looseToken] = form.looseTokens;
    const owners = looseTokenOwnersAll.get(looseToken);
    const naturalOwners = owners.filter((o) => !o.synthetic);
    if (form.synthetic && naturalOwners.length > 0) continue; // defers, same as passes 1/2
    const contenders = naturalOwners.length > 0 ? naturalOwners : owners;
    const uniqueContenderIds = new Set(contenders.map((o) => o.id));
    if (uniqueContenderIds.size > 1) {
      // Ambiguous among multiple *natural* owners (a genuine cross-curriculum collision, e.g. two
      // colliding verbs) is left unresolved for everyone, same as pass 1. Ambiguous among multiple
      // *synthetic* owners only (e.g. "لَا إِلهَ" and "لَوْ لَا" both splitting off a "لَا" token) is
      // resolved the exact same deterministic way pass 1 resolves it: only the first-listed
      // (earliest level) synthetic owner proceeds, so it isn't wrongly dropped here as if it were
      // still genuinely contested.
      if (naturalOwners.length > 0 || contenders[0] !== form) continue;
    }
    const stemSurfaceMatches = (looseStemSurfaceIndex.get(looseToken) ?? []).filter(
      (loc) => !exactLooseMatchLocations.has(loc),
    );
    const seed = new Set([...(looseSurfaceIndex.get(looseToken) ?? []), ...stemSurfaceMatches]);
    if (seed.size > 0) mergeSeed(form.id, seed);
  }

  // A root is only a safe basis for family-wide expansion (e.g. unifying "هَدَى" and "اهتدى")
  // when exactly one study word's own seeds resolve to it. Many roots cover *several* separately
  // taught deck words - most commonly a verb sense and a noun/adjective sense (e.g. "نَصَرَ" "to
  // help" and "نَصِير" "helper" both come from root نصر) - and expanding either of those into the
  // whole family would silently swallow the other's occurrences. Ownership is resolved globally,
  // up front, before any expansion happens, instead of processing forms one at a time and letting
  // whichever runs first claim the shared territory. When a root is shared, it's still split
  // safely along the verb/non-verb line whenever that line cleanly separates the co-owners (the
  // dominant real-world pattern), using each occurrence's own POS tag; a root shared by two
  // co-owners of the *same* POS class is genuinely ambiguous and is left unexpanded for both.
  const rootById = new Map();
  for (const [id, seed] of seedsById) {
    const roots = new Set();
    for (const loc of seed) {
      const root = stemByLocation.get(loc)?.root;
      if (root) roots.add(root);
    }
    if (roots.size === 1) rootById.set(id, [...roots][0]);
  }
  function classify(seed) {
    let verbs = 0;
    let nonVerbs = 0;
    for (const loc of seed) {
      if (stemByLocation.get(loc)?.pos === 'V') verbs++;
      else nonVerbs++;
    }
    return verbs > nonVerbs ? 'V' : 'N';
  }
  const rootBuckets = new Map(); // root -> { V: Set<id>, N: Set<id> }
  for (const [id, root] of rootById) {
    if (!rootBuckets.has(root)) rootBuckets.set(root, { V: new Set(), N: new Set() });
    rootBuckets.get(root)[classify(seedsById.get(id))].add(id);
  }

  for (const [id, seed] of seedsById) {
    const allLocations = new Set(seed);
    const root = rootById.get(id);
    if (root) {
      const buckets = rootBuckets.get(root);
      const soleOwner = buckets.V.size + buckets.N.size === 1;
      const myClass = classify(seed);
      if (soleOwner) {
        for (const loc of rootIndex.get(root) ?? []) allLocations.add(loc);
      } else if (buckets[myClass].size === 1) {
        for (const loc of rootIndex.get(root) ?? []) {
          if (stemByLocation.get(loc)?.pos === myClass) allLocations.add(loc);
        }
      }
    }
    for (const loc of allLocations) {
      if (!matchByLocation.has(loc)) matchByLocation.set(loc, id);
    }
  }

  return matchByLocation;
}

/**
 * Fallback pass, run *after* `buildVocabMatches`: for every Qur'an word position that still has
 * no curated study-word match, but does have a resolvable Qur'anic Arabic Corpus dictionary
 * lemma, generates a stable, deterministic id ("lem:<lightLemma>") grouping every occurrence of
 * that same lemma. This lets a user who already knows a word *outside* the 547-word curriculum
 * still mark it "known" once (see `useKnownWordsStore`) and have every occurrence of that word
 * recognized across the whole Qur'an, the same way curriculum mastery already works via
 * `ReaderWord.v` + `getMasteredVocabIds`.
 *
 * A lemma is skipped entirely (left untagged, same as today) only if a *majority* of its
 * occurrences already belong to a curated match: that signals the matcher believes this lemma is
 * essentially one of the 547 study words already, and minting a second, competing id for its
 * leftover occurrences - usually ones deliberately left unseeded by buildVocabMatches's
 * ambiguity/POS-splitting logic - would fragment one real-world word into two different "known"
 * ids instead of one.
 *
 * A simple "any occurrence claims the whole lemma" rule is too aggressive: the corpus sometimes
 * lemmatizes an unrelated curated word under the same LEM tag as a much more common word purely
 * as a morphological quirk (e.g. the attention particle "أَلَا" - study word 07-006 - shares the
 * corpus lemma "لا" with the everyday negation particle "لَا", even though a learner would never
 * consider them the same word). Requiring a majority means those rare, low-overlap collisions no
 * longer block fallback tagging for the lemma's hundreds of other, unrelated occurrences.
 *
 * The id itself is just the corpus's own light-normalized LEM tag text (not a heavy-normalized or
 * index-based id), so it's both deterministic across rebuilds and distinguishes true homographs
 * the way light matching already does elsewhere in this file (e.g. "مَنْ" vs "مِنْ" get different
 * lemma ids, not the same one).
 */
function buildLemmaFallbackTags(stemByLocation, matchByLocation) {
  const totalByLemma = new Map();
  const claimedByLemma = new Map();
  for (const [loc, stem] of stemByLocation) {
    const lemma = stem.lightLemma;
    if (!lemma) continue;
    totalByLemma.set(lemma, (totalByLemma.get(lemma) ?? 0) + 1);
    if (matchByLocation.has(loc)) {
      claimedByLemma.set(lemma, (claimedByLemma.get(lemma) ?? 0) + 1);
    }
  }

  const claimedLemmas = new Set();
  for (const [lemma, claimedCount] of claimedByLemma) {
    const total = totalByLemma.get(lemma) ?? 0;
    if (total > 0 && claimedCount / total >= 0.5) claimedLemmas.add(lemma);
  }

  const fallbackByLocation = new Map();
  for (const [loc, stem] of stemByLocation) {
    if (matchByLocation.has(loc)) continue;
    const lemma = stem.lightLemma;
    if (!lemma || claimedLemmas.has(lemma)) continue;
    fallbackByLocation.set(loc, `lem:${lemma}`);
  }
  return fallbackByLocation;
}

module.exports = {
  normalizeArabic,
  normalizeLight,
  loadStudyForms,
  loadMorphologyStems,
  buildVocabMatches,
  buildLemmaFallbackTags,
};
