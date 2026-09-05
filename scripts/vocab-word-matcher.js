/**
 * Matches Quranki's study words/phrases (src/data/quranic-words.json) against every word of
 * the Quran, so the reader can know which on-screen words the user has already studied - and
 * later, whether they've mastered them - in order to hide/reveal their word-by-word translation.
 *
 * A citation-form vocabulary word (e.g. the verb "هَدَى") doesn't literally reappear everywhere
 * it's relevant - Arabic morphology means the same word surfaces as many different letter
 * sequences ("يَهْدِى", "اهْتَدَىٰ", "هُدًى", "مُهْتَدٍ", ...), and nouns are almost always fused
 * with a leading "ال" or other single-letter prefixes with no space ("الشَّمْس" is one Quran
 * word, not "شَمْس" with a separate "ال"). Simple diacritic-insensitive string matching alone
 * only reaches ~20k of the deck's documented 64,282-word coverage for exactly this reason.
 *
 * To close that gap, this uses the Quranic Arabic Corpus's morphological segmentation
 * (scripts/data/quran-morphology.txt, from https://github.com/mustafa0x/quran-morphology, an
 * Arabic-script transliteration of the Quranic Arabic Corpus v0.4, (c) Kais Dukes, GNU GPL -
 * kept verbatim as downloaded, see its header for the license/attribution terms): every Quran
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
 * After seeding, a lemma-completion pass tags every remaining Quran word that shares a study
 * word's dominant corpus lemma. Hiding a word in the reader is keyed on that study id, so this
 * is what makes "I already know this" cover every inflection of the same dictionary word
 * ("المبينِ", "مبيناً", "مبينون") without also swallowing unrelated derivatives that happen to
 * share a root ("بين" "between" vs "مبين" "clear") *or* a vowel-stripped skeleton ("إِنْ" "if"
 * vs "إِنَّ" "indeed", "أَنَا" "I" vs "أَنَّا" "that we"). Completion only runs when that
 * majority lemma is still the same dictionary word as the card's citation form, and when exactly
 * one study word's seeds resolve to it - demonstratives the corpus lumps under "ذا", or the
 * several senses of "ما", stay split by their own surface matches instead.
 *
 * A handful of study words are citation *phrases* rather than single words (e.g. "بَيْنَ يَدَيْ"
 * "in front of") - these are never matched as a contiguous run of adjacent Quran words. Instead,
 * each space-separated word in the citation is registered as its own ordinary single-word
 * candidate under the same id (see loadStudyForms), so a learner who recognizes just one piece of
 * the phrase has it hidden everywhere *that* word appears. Because a split-off word like that is
 * auto-derived rather than a real, deliberately-taught deck entry, it always defers outright to a
 * genuine single-word study entry for the exact same text should one exist elsewhere in the deck
 * (e.g. "06-012" "لَوْ لَا" "if not for" also splits off a "لَوْ" token, but "12-011" already
 * teaches bare "لَوْ" "if" on its own and keeps every occurrence of it).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT, 'src', 'data');
const MORPHOLOGY_PATH = path.join(__dirname, 'data', 'quran-morphology.txt');

const ALEF_FAMILY = '\u0627\u0622\u0623\u0625\u0671';

/** Study words that share citation text but are different vocabulary. The Quranic Arabic Corpus
 *  tags each occurrence with a feature the deck's own English glosses map onto - without this,
 *  the earlier card swallows every spelling-identical hit (or a shadda-only surface like 2:29's
 *  "مَّا" "what" is left untagged because loose matching refuses to pick a winner). */
function isFemininePerson(stem) {
  return hasFeat(stem, '3FS') || hasFeat(stem, '3FP') || hasFeat(stem, '2FS') || hasFeat(stem, '2FP');
}

const FEATURE_SENSE = {
  '02-006': (stem) => hasFeat(stem, 'NEG'), // مَا "not"
  '06-001': (stem) =>
    hasFeat(stem, 'REL') || hasFeat(stem, 'INTG') || hasFeat(stem, 'COND') || hasFeat(stem, 'SUP'), // مَا "what / that which"
  '08-011': (stem) => hasFeat(stem, 'PREV'), // مَا ... إِلَّا "nothing but"
  // Independent pronouns whose citation forms collide once the final vowel (identity here, not
  // i'rāb) is stripped: أَنْتَ / أَنْتِ both become أَنت. The corpus has no LEM on these, so
  // lemma matching cannot split them either.
  '04-003': (stem) => hasFeat(stem, 'PRON') && hasFeat(stem, '2MS'),
  '04-004': (stem) => hasFeat(stem, 'PRON') && hasFeat(stem, '2FS'),
  // نَعَمْ "yes" shares the corpus lemma نَعَم with cattle (أَنْعَام) and the root نعم with
  // blessing/نِعْمَ. Only the answer particle is this card.
  '02-013': (stem) => hasFeat(stem, 'ANS'),
  // لَيْسَ / لَيْسَتْ share lemma لَيْسَ; without a person split the masculine card swallows
  // every feminine occurrence and the feminine card never seeds.
  '02-007': (stem) => !isFemininePerson(stem),
  '02-008': (stem) => isFemininePerson(stem),
  // الَّذِي / الَّتِي / الَّذِينَ share lemma الَّذِي.
  '01-007': (stem) => hasFeat(stem, 'REL') && hasFeat(stem, 'MS'),
  '01-008': (stem) => hasFeat(stem, 'REL') && (hasFeat(stem, 'FS') || hasFeat(stem, 'FP') || hasFeat(stem, 'FD')),
  '01-009': (stem) => hasFeat(stem, 'REL') && (hasFeat(stem, 'MP') || hasFeat(stem, 'MD')),
  // إِنْ "if" (COND) vs إِنْ ... إِلَّا "nothing but" (NEG). Same letters, same corpus lemma إِن.
  // إلا under 08-010 is a different token and must still match.
  '08-010': (stem) => hasFeat(stem, 'NEG') || stem.lightLemma === normalizeLight('إِلَّا'),
  '12-007': (stem) => hasFeat(stem, 'COND'),
  // ذُو / ذَات / أُولُو share corpus lemma ذُو. Split by gender and the أولو stem.
  '07-001': (stem) => dhuFamily(stem) && !hasFeat(stem, 'FS') && !hasFeat(stem, 'FD') && !hasFeat(stem, 'FP') && !isUluPossessive(stem),
  '07-002': (stem) => dhuFamily(stem) && (hasFeat(stem, 'FS') || hasFeat(stem, 'FD')),
  '07-003': (stem) => dhuFamily(stem) && (isUluPossessive(stem) || hasFeat(stem, 'FP')),
  // All six demonstratives share corpus lemma ذا. Split by the prefix-stripped surface.
  '01-001': (stem) => demonstrativeKind(stem) === 'hadha',
  '01-002': (stem) => demonstrativeKind(stem) === 'hadhihi',
  '01-003': (stem) => demonstrativeKind(stem) === 'haula',
  '01-004': (stem) => demonstrativeKind(stem) === 'dhalika',
  '01-005': (stem) => demonstrativeKind(stem) === 'tilka',
  '01-006': (stem) => demonstrativeKind(stem) === 'ulaika',
  // Cattle (أنعام) share corpus lemma نَعَم with the answer particle نَعَمْ.
  '18-004': (stem) => !hasFeat(stem, 'ANS'),
  // "Last" vs "the Hereafter": same corpus lemma آخِر; Hereafter is the feminine.
  '14-002': (stem) => !hasFeat(stem, 'FS'),
  '20-004': (stem) => hasFeat(stem, 'FS'),
  // بَدَأ "originate" vs بَدَا "appear": alef-hamza folds to alef, so the surfaces collide.
  '61-012': (stem) => stem.rawRoot === 'بدأ',
  '63-012': (stem) => stem.rawRoot === 'بدو',
  // أَمَامَ "in front of" vs إِمام "leader": same letters once hamza/vowels fold, but the
  // corpus lemmas stay distinct. Without this split the noun card swallows 75:5's أَمَامَهُ.
  '05-005': (stem) => lemmaIs(stem, 'أَمام'),
  '108-005': (stem) => lemmaIs(stem, 'إِمام'),
};

/** Independent personal pronouns in the corpus are tagged PRON + person, with no LEM - so the
 *  usual lemma/surface pipeline misses spelling variants (mushaf أَنتَ vs deck أَنْتَ) and
 *  case-vowel shifts (هُمْ / هِمْ). Map leftover untagged stems onto the Level 4 cards. */
const INDEPENDENT_PRONOUN_BY_PERSON = {
  '1S': '04-005',
  '1P': '04-010',
  '2MS': '04-003',
  '2FS': '04-004',
  '2MP': '04-008',
  '2FP': '04-009',
  '2D': '04-012',
  '3MS': '04-001',
  '3FS': '04-002',
  '3MP': '04-006',
  '3FP': '04-007',
  '3D': '04-011',
};

/** One-letter prepositions the mushaf fuses onto a pronoun (بِهِ, لَكُمْ, كَهَا). They never
 *  appear as their own word, so surface matching finds nothing for the Level 10 cards; the
 *  pronoun half is a clitic, not independent هو. Tag the whole fused word as the preposition. */
const PREP_PREFIX_BY_LEMMA = {
  ب: '10-001',
  ل: '10-005',
  ك: '10-004',
};

function hasFeat(stem, tag) {
  return (stem?.feats ?? []).includes(tag);
}

function dhuFamily(stem) {
  return stem.lightLemma === normalizeLight('ذُو');
}

/** أُولُو / أُولِي / أُولَات — plural "people of", not ذُو / ذَوِي. */
function isUluPossessive(stem) {
  return /اول/.test(normalizeArabic(stem.looseSurface || stem.lightSurface || ''));
}

/** True when two lemma strings are the same dictionary word after light
 *  normalization. Corpus light-lemmas often keep a fatha that sat on hamza-alef
 *  (أَصْحاب → اَصْحاب); a second normalizeLight strips that wasl vowel (اصْحاب). */
function sameLemma(a, b) {
  if (!a || !b) return false;
  if (a === b) return true;
  const na = normalizeLight(a);
  const nb = normalizeLight(b);
  return a === nb || na === b || na === nb;
}

function lemmaIs(stem, ...forms) {
  const candidates = [stem?.lightLemma, stem?.rawLemma, stem?.heavyLemma].filter(Boolean);
  if (candidates.length === 0) return false;
  return forms.some((form) => candidates.some((value) => sameLemma(value, form)));
}

/** Prefix-stripped letters of a corpus stem (هذا, كذلك, فأولئك, ...). */
function stemLetters(stem) {
  return stem?.heavySurface ?? '';
}

/**
 * The corpus dumps every demonstrative under lemma ذا, and the stem text is prefix-stripped:
 * هذا → ذا, هذه → ذه, هؤلاء → ولاء, ذلك → ذالك. Classify from that stem, not the full mushaf word.
 */
function demonstrativeKind(stem) {
  if (!hasFeat(stem, 'DEM')) return null;
  const h = stemLetters(stem);
  if (h.includes('وليك') || h.includes('ولايك')) return 'ulaika';
  if (h.includes('ولاء') || h.includes('اولاء')) return 'haula';
  if (h.includes('تلك')) return 'tilka';
  if (h.includes('ذه')) return 'hadhihi';
  if (h.includes('ذالك')) return 'dhalika';
  if (h.includes('ذان') || h === 'ذا' || h.startsWith('ذا')) return 'hadha';
  if (h.includes('تين')) return 'hadhihi';
  return null;
}

function senseFilter(form, loc, stemByLocation) {
  const test = FEATURE_SENSE[form.id];
  if (!test) return true;
  const stem = stemByLocation.get(loc);
  if (stem == null) return true;
  return test(stem);
}

function applySenseFilter(form, seed, stemByLocation) {
  if (!FEATURE_SENSE[form.id] || seed.size === 0) return seed;
  return new Set([...seed].filter((loc) => senseFilter(form, loc, stemByLocation)));
}

function ownersHaveSenses(owners) {
  const ids = [...new Set(owners.map((owner) => owner.id))];
  return ids.length > 1 && ids.every((id) => FEATURE_SENSE[id]);
}

/** Whether a corpus stem is the same dictionary word as this citation form.
 *  Tokens with no lemma (independent pronouns) may still match by surface.
 *  Hamza-fold is only allowed when the citation itself writes hamza/madda, so
 *  "قُرْآن" can meet corpus "قُرْءان" without "هُمْ" meeting "هَمَّ".
 *  `unambiguousHeavy` is heavy skeletons that belong to exactly one corpus lemma
 *  (كَانَ vs corpus كان): those may match without identical vocalization.
 *  Skeletons shared by several lemmas (ان = إن / إنّ / أنّ) must match the citation
 *  light form exactly, or they swallow a different word. */
/** Letters + shadda, ignoring short vowels. "إِنْ" vs "إِنّ" stay distinct; extra fathas do not. */
function shaddaSkeleton(light) {
  return light.replace(/[\u064b-\u0650\u0652]/g, '');
}

/** Corpus lemmas often omit a fatha the deck writes (إِلَّا vs إِلّا, كَانَ vs كان).
 *  Compatible only when letters+shadda match and every lemma vowel still appears, in order,
 *  on the citation — never when shadda is the whole difference (مَن / مَنّ). */
function vocalizationCompatible(citationLight, lemmaLight) {
  if (citationLight === lemmaLight) return true;
  if (shaddaSkeleton(citationLight) !== shaddaSkeleton(lemmaLight)) return false;
  const citationVowels = [...citationLight].filter((c) => /[\u064b-\u0650\u0652]/.test(c)).join('');
  const lemmaVowels = [...lemmaLight].filter((c) => /[\u064b-\u0650\u0652]/.test(c)).join('');
  let i = 0;
  for (const vowel of lemmaVowels) {
    const at = citationVowels.indexOf(vowel, i);
    if (at < 0) return false;
    i = at + 1;
  }
  return true;
}

/** Same dictionary word except an extra alef the mushaf inserts for a dagger alif
 *  (إِله vs إِلٰه, لكِن vs لاكِن). Leading or trailing extra alefs are not allowed:
 *  لا must not match إلا, إن must not match إنا. */
function lemmaLettersMatch(citationLight, lemmaLight) {
  const cit = [...hamzaFold(citationLight)];
  const lem = [...hamzaFold(lemmaLight)];
  if (cit.length === 0 || lem.length === 0) return false;
  if (cit[0] !== lem[0] || cit[cit.length - 1] !== lem[lem.length - 1]) return false;
  let i = 0;
  for (const ch of lem) {
    if (i < cit.length && ch === cit[i]) i += 1;
    else if (ch === '\u0627' && i > 0 && i < cit.length) continue;
    else return false;
  }
  return i === cit.length;
}

function lemmaCompatible(form, stem, unambiguousHeavy) {
  if (!stem?.lightLemma) return true;
  if (form.surfaceOnly) {
    return (
      sameLemma(stem.lightLemma, form.headwordLight) ||
      lemmaLettersMatch(form.headwordLight, stem.lightLemma)
    );
  }
  if (sameLemma(stem.lightLemma, form.lightTokens[0])) return true;
  if (stem.rawLemma && sameLemma(stem.rawLemma, form.lightTokens[0])) return true;
  if (lemmaLettersMatch(form.lightTokens[0], stem.lightLemma)) return true;
  if (vocalizationCompatible(form.lightTokens[0], stem.lightLemma)) return true;
  if (
    form.hasHamzaSpelling &&
    stem.rawLemma &&
    /[\u0621\u0622]/.test(stem.rawLemma) &&
    stem.heavyLemma &&
    hamzaFold(stem.heavyLemma) === hamzaFold(form.heavyTokens[0])
  ) {
    return (stem.pos === 'V') === form.looksLikeVerb;
  }
  if (
    unambiguousHeavy?.has(`${form.heavyTokens[0]}\t${form.looksLikeVerb ? 'V' : 'N'}`) &&
    stem.heavyLemma === form.heavyTokens[0] &&
    (stem.pos === 'V') === form.looksLikeVerb
  ) {
    return true;
  }
  return false;
}

function isExactSurface(form, loc, stem, lightSurfaceByLocation) {
  if (stem?.lightSurface === form.lightTokens[0]) return true;
  if (lightSurfaceByLocation?.get(loc) === form.lightTokens[0]) return true;
  return false;
}

function filterByCitationLemma(form, locations, stemByLocation, unambiguousHeavy, lightSurfaceByLocation) {
  return [...locations].filter((loc) => {
    const stem = stemByLocation.get(loc);
    // Spelling-only variants (مَنّ written for مَنْ) must not keep a different lemma just
    // because the surface happens to equal the variant.
    if (form.surfaceOnly) return lemmaCompatible(form, stem, unambiguousHeavy);
    if (isExactSurface(form, loc, stem, lightSurfaceByLocation)) {
      if (!stem?.lightLemma || lemmaCompatible(form, stem, unambiguousHeavy)) return true;
      // Same letters, different dictionary word: ابن "son" vs ابنِ "build!", أهلكَ
      // "destroy" vs أهلكَ "your family". Trust exact surface only when POS agrees
      // (corpus sometimes tags إلا as إن, and those must still stay إلا).
      if ((stem.pos === 'V') !== form.looksLikeVerb) return false;
      return true;
    }
    return lemmaCompatible(form, stem, unambiguousHeavy);
  });
}

function citationAcceptsLemma(formsForId, lemma, unambiguousHeavy) {
  const fakeN = { lightLemma: lemma, heavyLemma: normalizeArabic(lemma), rawLemma: lemma, pos: 'N' };
  const fakeV = { ...fakeN, pos: 'V' };
  return formsForId.some(
    (form) => lemmaCompatible(form, fakeN, unambiguousHeavy) || lemmaCompatible(form, fakeV, unambiguousHeavy),
  );
}

/** Removes an elidable hamzat-waṣl's contextual vowel (see the module doc comment). Only a
 *  leading bare alef (ا) or hamzat waṣl (ٱ) qualifies: the study deck writes form-VII/VIII/X
 *  verbs as "اِهْتَدَى" rather than with ٱ, so both shapes need the same treatment. Alef-with-
 *  hamza (أ / إ) and alef-madda (آ) carry a real hamza; stripping *their* vowel would collapse
 *  distinct particles such as "إِلَّا" / "أَلَّا" and "إِنَّ" / "أَنَّ". */
function stripInitialWaslVowel(text) {
  return text.replace(/^([\u0627\u0671])[\u064b-\u0652]+/, '$1');
}

/** Reorder a vowel that was written *before* shadda (U+064E U+0651) into the usual
 *  shadda-then-vowel sequence, so a trailing case vowel can actually be stripped.
 *  The deck writes "إِنَّ" that way; the corpus lemma is "إِنّ" (shadda, no fatha). */
function canonicalizeShadda(text) {
  return text.replace(/([\u064b-\u0650\u0652])(\u0651)/g, '$2$1');
}

/** Removes a trailing case vowel/tanween/sukun (i'rāb). Accusative tanween is written as
 *  fathatan plus a carrying alef (نَارًا "a fire") - that alef is not part of the word, so both
 *  marks go. Remaining tanween (هُدًى, كِتَابٍ) is always grammatical, never part of identity.
 *  Excludes shadda (\u0651): "رَبِّ" should stay "رَبّ", matching the corpus lemma. */
function stripFinalCaseVowel(text) {
  return text
    .replace(/\u064b\u0627$/, '') // fathatan + carrying alef (نَارًا → نَار)
    .replace(/[\u064b\u064c\u064d]/g, '') // any remaining tanween
    .replace(/[\u064e-\u0650\u0652]$/, ''); // final case vowel / sukun
}

/** Spelling-variant-only cleanup shared by both normalization tiers: strips tatweel/joiners and
 *  Quranic annotation marks, and unifies letters that are typically written inconsistently
 *  between "clean" dictionary text and the Uthmani mushaf script for the same word (hamza-seat
 *  and alef variants, dagger alif, alef maksura vs. yeh) - without touching stem-internal short
 *  vowels. */
function normalizeLight(text) {
  const cleaned = stripFinalCaseVowel(
    stripInitialWaslVowel(
      canonicalizeShadda(
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
          .replace(/[\u06d6-\u06ed]/g, ''), // remaining small Quranic pause/annotation marks
      ),
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

/** Drops a standalone hamza (ء) after heavy normalization. The deck writes "قُرْآن" (alef-madda)
 *  while the corpus lemma is "قُرْءان" (hamza + alef); those are the same word, and without this
 *  fold the noun never seeds, so a later root-relative verb used to swallow every occurrence. */
function hamzaFold(heavyText) {
  return heavyText.replace(/\u0621/g, '');
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
 *  token plus the id it should tag matching Quran words with. `looksLikeVerb` is this word's own
 *  citation-form verb guess (see endsWithBareFatha). `synthetic` marks a token that isn't itself
 *  a real deck entry but was auto-derived by splitting a multi-word citation into its individual
 *  words (see loadStudyForms) - used by buildVocabMatches to make sure a word the deck already
 *  teaches in its own right always outranks an auto-derived alias for the same word. */
function loadStudyForms() {
  const raw = JSON.parse(fs.readFileSync(path.join(DATA_DIR, 'quranic-words.json'), 'utf8'));
  const forms = [];
  for (const level of raw.levels) {
    for (const word of level.words) {
      // Possessive endings (Level 3) are not standalone mushaf words. Registering them as
      // ordinary surface forms lets "هُمْ" "their" swallow every independent "هُمْ" "they",
      // and "كَ" "your" compete with the preposition "كَ" "like". The reader tags whole words,
      // so suffixes are taught in flashcards only. Grammar intros are explanations, not forms.
      if (word.isSuffix || word.kind === 'grammar') continue;
      // Prefix cards still match on their own letter (لِ, بِ), but a teaching `variant` like
      // 11-007's "أَمْر" (the grammatical term "imperative") must not seed the noun "أمر".
      const headword = String(word.arabic ?? '')
        .split(/[,\u060c]/)[0]
        .split('...')[0]
        .trim()
        .split(/\s+/)
        .find(Boolean) ?? '';
      const headwordLight = normalizeLight(headword);
      const headwordSkel = shaddaSkeleton(headwordLight);
      const sources = word.isPrefix
        ? [['arabic', word.arabic]]
        : [
            ['arabic', word.arabic],
            ['plural', word.plural],
            ['variant', word.variant],
          ].filter(([, text]) => text);
      // Multi-word citations that set `phrase: true` must not split into synthetic tokens.
      // Contiguous phrase runs are found later for verse examples; they are not used to tag
      // the reader.
      for (const [source, sourceText] of sources) {
        for (const commaForm of sourceText.split(/[,\u060c]/)) {
        for (const piece of commaForm.split('...')) {
          const words = piece.split(/\s+/).filter(Boolean);
          if (words.length === 0) continue;

          // A citation with more than one space-separated word (e.g. "لَا إِلهَ" "no god", "بَيْنَ
          // يَدَيْ" "in front of") is never matched as a contiguous phrase - the deck's own
          // citation form is just a gloss for the *concept*, but the individual words that make it
          // up are each real, independent Quran vocabulary in their own right, and a learner who
          // recognizes one of them (e.g. "لَا" "no/not") should have it hidden everywhere it
          // appears, not only in the handful of places it happens to sit next to the citation's
          // other word. So each word is registered as its own ordinary single-token form below,
          // sharing this same study id, instead of requiring the whole run to match adjacently.
          // `phrase: true` opts out of that split (see above).
          if (!word.phrase) {
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
                hasHamzaSpelling: /[\u0621\u0622]/.test(singleWord),
                headwordLight,
                surfaceOnly: source !== 'arabic' && shaddaSkeleton(lightToken) !== headwordSkel,
              });
            }
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
                hasHamzaSpelling: /[\u0621\u0622]/.test(fused),
                headwordLight,
                surfaceOnly: source !== 'arabic' && shaddaSkeleton(fusedLight) !== headwordSkel,
              });
            }
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
    const rawLemma = lemFeat ? lemFeat.slice(4) : null;
    const rawRoot = rootFeat ? rootFeat.slice(5) : null;
    const prepSeg = segments.find((s) => s.feats.includes('PREF') && s.feats.includes('P'));
    const prepLem = prepSeg?.feats.find((f) => f.startsWith('LEM:'));
    const prefixHeavies = [];
    let prefixEmphLam = false;
    let prefixVocYa = false;
    let prefixImprLam = false;
    for (const seg of segments) {
      if (!seg.feats.includes('PREF')) continue;
      const lemFeat = seg.feats.find((f) => f.startsWith('LEM:'));
      const lemma = lemFeat ? normalizeArabic(lemFeat.slice(4)) : '';
      if (lemma) prefixHeavies.push(lemma);
      if (lemma === 'ل' && seg.feats.includes('EMPH')) prefixEmphLam = true;
      if (lemma === 'ل' && seg.feats.includes('IMPV')) prefixImprLam = true;
      if ((lemma === 'ي' || lemma === 'يا') && seg.feats.includes('VOC')) prefixVocYa = true;
    }
    const hasEmphNun = segments.some((seg) => seg.feats.includes('SUFF') && seg.feats.includes('EMPH'));
    const hasQad = segments.some((seg) => {
      if (seg.feats.includes('PREF') || seg.feats.includes('SUFF')) return false;
      const lemFeat = seg.feats.find((f) => f.startsWith('LEM:'));
      return lemFeat ? normalizeArabic(lemFeat.slice(4)) === normalizeArabic('قَد') : false;
    });
    stemByLocation.set(wordKey, {
      lightLemma: rawLemma ? normalizeLight(rawLemma) : null,
      heavyLemma: rawLemma ? normalizeArabic(rawLemma) : null,
      rawLemma,
      root: rawRoot ? normalizeArabic(rawRoot) : null,
      rawRoot,
      pos: stem?.pos === 'V' ? 'V' : 'N',
      // Corpus POS column as written (N/V/P). Distinct from `pos`, which collapses to V vs N
      // for the matcher. Reader enrichment uses this; matching does not.
      corpusPos: stem?.pos ?? null,
      readerSegments: segments.map((segment) => ({
        t: segment.text,
        k: segment.feats.includes('PREF') ? 'prefix' : segment.feats.includes('SUFF') ? 'suffix' : 'stem',
        p: segment.pos,
        f: segment.feats.filter(
          (feature) =>
            feature !== 'PREF' &&
            feature !== 'SUFF' &&
            !feature.startsWith('LEM:') &&
            !feature.startsWith('ROOT:'),
        ),
      })),
      feats: stem?.feats ?? [],
      // Preposition+pronoun words (بِهِ "with it") have the clitic as the morphological "stem"
      // after a PREF tagged P. Those are not independent هو/هِيَ; they belong to the preposition.
      hasPrepPrefix: prepSeg != null,
      prepLemma: prepLem ? normalizeArabic(prepLem.slice(4)) : null,
      prefixHeavies,
      prefixEmphLam,
      prefixVocYa,
      prefixImprLam,
      hasEmphNun,
      hasQad,
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

/** Builds the full location -> study-id map for the whole Quran in one pass.
 *  `rawSurfaceByLocation` is `"surah:ayah:word" -> rawArabicText` (undiacritic-stripped, as
 *  rendered), and `ayahWordOrder` is `"surah:ayah" -> ["surah:ayah:word", ...]` in word order
 *  (both derived by the caller from the same per-surah reader data used to render the app, so
 *  positions always agree with what's on screen). */
function buildVocabMatches(rawSurfaceByLocation, ayahWordOrder) {
  const studyForms = loadStudyForms();
  const stemByLocation = loadMorphologyStems(ayahWordOrder);

  const lightLemmaIndex = new Map();
  const heavyLemmaIndex = new Map();
  const foldLemmaIndex = new Map();
  // Indexed separately from the reader data's whole-word surface text below because it's already
  // prefix-stripped (see loadMorphologyStems) - this is what lets an attached "وَ"/"بِ"/"لِ"/"كَ"
  // prefix not prevent a study word's citation form from matching that occurrence.
  const lightStemSurfaceIndex = new Map();
  const heavyStemSurfaceIndex = new Map();
  for (const [loc, stem] of stemByLocation) {
    addToIndex(lightLemmaIndex, stem.lightLemma, loc);
    const foldedLight = stem.lightLemma ? normalizeLight(stem.lightLemma) : null;
    if (foldedLight && foldedLight !== stem.lightLemma) addToIndex(lightLemmaIndex, foldedLight, loc);
    addToIndex(heavyLemmaIndex, stem.heavyLemma, loc);
    addToIndex(foldLemmaIndex, stem.heavyLemma ? hamzaFold(stem.heavyLemma) : null, loc);
    addToIndex(lightStemSurfaceIndex, stem.lightSurface, loc);
    addToIndex(heavyStemSurfaceIndex, stem.heavySurface, loc);
  }
  const heavyPosLemmas = new Map();
  for (const [, stem] of stemByLocation) {
    if (!stem.heavyLemma || !stem.lightLemma) continue;
    const key = `${stem.heavyLemma}\t${stem.pos}`;
    if (!heavyPosLemmas.has(key)) heavyPosLemmas.set(key, new Set());
    heavyPosLemmas.get(key).add(stem.lightLemma);
  }
  const unambiguousHeavy = new Set();
  for (const [key, lemmas] of heavyPosLemmas) {
    if (lemmas.size <= 1) unambiguousHeavy.add(key);
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
      if (ownersHaveSenses(contendingOwners)) {
        seed = new Set([...candidates].filter((loc) => senseFilter(form, loc, stemByLocation)));
      } else if (sameClassOwners.length === 1) {
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
    seed = applySenseFilter(form, seed, stemByLocation);
    seed = new Set(filterByCitationLemma(form, seed, stemByLocation, unambiguousHeavy, lightSurfaceByLocation));
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
    const heavyOwners = unseeded.filter((owner) => owner.heavyTokens[0] === heavyToken);
    const heavyOwnerIds = heavyTokenOwners.get(heavyToken);
    if ((heavyOwnerIds?.size ?? 0) > 1 && !ownersHaveSenses(heavyOwners)) continue;
    const stemSurfaceMatches = (heavyStemSurfaceIndex.get(heavyToken) ?? []).filter(
      (loc) => !exactHeavyMatchLocations.has(loc),
    );
    let seed = new Set([
      ...(heavyLemmaIndex.get(heavyToken) ?? []),
      ...(heavySurfaceIndex.get(heavyToken) ?? []),
      ...stemSurfaceMatches,
    ]);
    if ((heavyOwnerIds?.size ?? 0) > 1) {
      seed = new Set([...seed].filter((loc) => senseFilter(form, loc, stemByLocation)));
    }
    seed = applySenseFilter(form, seed, stemByLocation);
    seed = new Set(filterByCitationLemma(form, seed, stemByLocation, unambiguousHeavy, lightSurfaceByLocation));
    if (seed.size > 0) mergeSeed(form.id, seed);
  }

  // Pass 2b: heavy-lemma top-up. The corpus often writes lemmas without fathas the deck includes
  // (كانَ vs كَانَ, نار vs نَار), so light lemma matching misses inflected forms like كَانُوا
  // even when the citation form itself already seeded. Heavy lemma + POS recovers those without
  // running the broader unseeded-only heavy pass (which would not run here: these words already
  // have some light hits). Skipped when two same-POS study words share the skeleton.
  const heavyNaturalOwners = new Map();
  for (const form of singleTokenForms) {
    if (form.synthetic) continue;
    const heavy = form.heavyTokens[0];
    if (!heavyNaturalOwners.has(heavy)) heavyNaturalOwners.set(heavy, []);
    heavyNaturalOwners.get(heavy).push(form);
  }
  for (const form of singleTokenForms) {
    if (form.synthetic) continue;
    const heavy = form.heavyTokens[0];
    const owners = heavyNaturalOwners.get(heavy) ?? [];
    const samePos = owners.filter((owner) => owner.looksLikeVerb === form.looksLikeVerb);
    const samePosIds = new Set(samePos.map((owner) => owner.id));
    if (samePosIds.size !== 1 && !ownersHaveSenses(samePos)) continue;
    const locs = (heavyLemmaIndex.get(heavy) ?? []).filter((loc) => {
      const stem = stemByLocation.get(loc);
      if (!stem || (stem.pos === 'V') !== form.looksLikeVerb) return false;
      if (!lemmaCompatible(form, stem, unambiguousHeavy)) return false;
      return senseFilter(form, loc, stemByLocation);
    });
    if (locs.length > 0) mergeSeed(form.id, locs);
  }

  // Pass 2c: hamza-fold lemma top-up. The deck writes "قُرْآن" (alef-madda) while the corpus
  // lemma is "قُرْءان" (hamza + alef); light/heavy lemma indexes miss that spelling gap, and
  // without this the noun never seeds so a later root-relative verb used to swallow it.
  const foldNaturalOwners = new Map();
  for (const form of singleTokenForms) {
    if (form.synthetic || !form.hasHamzaSpelling) continue;
    const folded = hamzaFold(form.heavyTokens[0]);
    if (!folded) continue;
    if (!foldNaturalOwners.has(folded)) foldNaturalOwners.set(folded, []);
    foldNaturalOwners.get(folded).push(form);
  }
  for (const form of singleTokenForms) {
    if (form.synthetic || !form.hasHamzaSpelling) continue;
    const folded = hamzaFold(form.heavyTokens[0]);
    if (!folded) continue;
    const owners = foldNaturalOwners.get(folded) ?? [];
    const samePos = owners.filter((owner) => owner.looksLikeVerb === form.looksLikeVerb);
    const samePosIds = new Set(samePos.map((owner) => owner.id));
    if (samePosIds.size !== 1 && !ownersHaveSenses(samePos)) continue;
    const locs = (foldLemmaIndex.get(folded) ?? []).filter((loc) => {
      const stem = stemByLocation.get(loc);
      if (!stem || (stem.pos === 'V') !== form.looksLikeVerb) return false;
      if (!lemmaCompatible(form, stem, unambiguousHeavy)) return false;
      return senseFilter(form, loc, stemByLocation);
    });
    if (locs.length > 0) mergeSeed(form.id, locs);
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
    const stemSurfaceMatches = (looseStemSurfaceIndex.get(looseToken) ?? []).filter(
      (loc) => !exactLooseMatchLocations.has(loc),
    );
    let seed = new Set([...(looseSurfaceIndex.get(looseToken) ?? []), ...stemSurfaceMatches]);
    if (uniqueContenderIds.size > 1) {
      if (ownersHaveSenses(contenders)) {
        seed = new Set([...seed].filter((loc) => senseFilter(form, loc, stemByLocation)));
      } else if (naturalOwners.length > 0 || contenders[0] !== form) {
        // Ambiguous among multiple *natural* owners with no sense split - leave unresolved.
        // Multiple *synthetic* owners: only the first-listed proceeds, same as pass 1.
        continue;
      }
    }
    seed = applySenseFilter(form, seed, stemByLocation);
    seed = new Set(filterByCitationLemma(form, seed, stemByLocation, unambiguousHeavy, lightSurfaceByLocation));
    if (seed.size > 0) mergeSeed(form.id, seed);
  }

  function seedAttachedLemmaCards() {
    const extra = new Map();
    for (const [loc, stem] of stemByLocation) {
      const hit = Object.entries(ATTACHED_LEMMA_CARDS).find(([, test]) => test(stem));
      if (!hit) continue;
      if (!extra.has(hit[0])) extra.set(hit[0], new Set());
      extra.get(hit[0]).add(loc);
    }
    for (const [id, locs] of extra) mergeSeed(id, locs);
  }
  seedAttachedLemmaCards();

  // Lemma completion — not root expansion. Inflected surface forms of the *same dictionary
  // lemma* ("المبينِ", "مبيناً", "مبينون") should hide together; derivatives that only share a
  // root ("بين" "between" vs "مبين" "clear", "شاء" "to will" vs "شيء" "thing") must not.
  // A card may claim leftover locations of a lemma only when it is the unique study word whose
  // seeds majority-resolve to that lemma, or when every co-owner of the lemma has an explicit
  // sense filter (ما not vs ما what). Demonstratives the corpus lumps under "ذا" stay split by
  // their own surface seeds. Majority is of the whole seed (including untagged pronouns), so a
  // handful of lookalike surfaces cannot promote a foreign lemma. The majority lemma must also
  // still be the card's citation word ("إِنْ" cannot complete "إِنَّ").
  const naturalFormsById = new Map();
  for (const form of singleTokenForms) {
    if (form.synthetic) continue;
    if (!naturalFormsById.has(form.id)) naturalFormsById.set(form.id, []);
    naturalFormsById.get(form.id).push(form);
  }
  function majorityLemma(seed) {
    const counts = new Map();
    let tagged = 0;
    for (const loc of seed) {
      const lemma = stemByLocation.get(loc)?.lightLemma;
      if (!lemma) continue;
      tagged += 1;
      counts.set(lemma, (counts.get(lemma) ?? 0) + 1);
    }
    let best = null;
    let bestN = 0;
    for (const [lemma, n] of counts) {
      if (n > bestN) {
        best = lemma;
        bestN = n;
      }
    }
    if (!best || seed.size === 0 || bestN / seed.size < 0.5) return null;
    return best;
  }
  const lemmaById = new Map();
  for (const [id, seed] of seedsById) {
    const lemma = majorityLemma(seed);
    if (lemma) lemmaById.set(id, lemma);
  }
  const lemmaOwners = new Map();
  for (const [id, lemma] of lemmaById) {
    if (!lemmaOwners.has(lemma)) lemmaOwners.set(lemma, new Set());
    lemmaOwners.get(lemma).add(id);
  }

  for (const [id, seed] of seedsById) {
    const allLocations = new Set(seed);
    const lemma = lemmaById.get(id);
    if (lemma) {
      const coOwners = lemmaOwners.get(lemma);
      const sense = FEATURE_SENSE[id];
      const canComplete =
        citationAcceptsLemma(naturalFormsById.get(id) ?? [], lemma, unambiguousHeavy) &&
        (coOwners.size === 1 || (sense != null && [...coOwners].every((owner) => FEATURE_SENSE[owner])));
      if (canComplete) {
        for (const loc of lightLemmaIndex.get(lemma) ?? []) {
          if (sense && !senseFilter({ id }, loc, stemByLocation)) continue;
          allLocations.add(loc);
        }
      }
    }
    for (const loc of allLocations) {
      if (!matchByLocation.has(loc)) matchByLocation.set(loc, id);
    }
  }

  tagIndependentPronouns(stemByLocation, matchByLocation);
  tagPrepPronouns(stemByLocation, matchByLocation);
  tagRelativePronouns(stemByLocation, matchByLocation);
  tagAttachedLemmas(stemByLocation, matchByLocation);
  tagCoverageBandLemmas(stemByLocation, matchByLocation);
  tagGluedPrefixes(stemByLocation, matchByLocation);

  return matchByLocation;
}

const RELATIVE_PRONOUN_BY_FEAT = {
  MS: '01-007',
  FS: '01-008',
  FP: '01-008',
  FD: '01-008',
  MP: '01-009',
  MD: '01-009',
};

function tagRelativePronouns(stemByLocation, matchByLocation) {
  const lemma = normalizeLight('الَّذِي');
  for (const [loc, stem] of stemByLocation) {
    if (matchByLocation.has(loc)) continue;
    if (!hasFeat(stem, 'REL') || stem.lightLemma !== lemma) continue;
    const feat = Object.keys(RELATIVE_PRONOUN_BY_FEAT).find((tag) => hasFeat(stem, tag));
    if (feat) matchByLocation.set(loc, RELATIVE_PRONOUN_BY_FEAT[feat]);
  }
}

function tagIndependentPronouns(stemByLocation, matchByLocation) {
  for (const [loc, stem] of stemByLocation) {
    if (matchByLocation.has(loc)) continue;
    if (!hasFeat(stem, 'PRON') || hasFeat(stem, 'SUFF') || stem.hasPrepPrefix) continue;
    const person = Object.keys(INDEPENDENT_PRONOUN_BY_PERSON).find((tag) => hasFeat(stem, tag));
    if (!person) continue;
    matchByLocation.set(loc, INDEPENDENT_PRONOUN_BY_PERSON[person]);
  }
}

function tagPrepPronouns(stemByLocation, matchByLocation) {
  for (const [loc, stem] of stemByLocation) {
    if (matchByLocation.has(loc)) continue;
    if (!stem.hasPrepPrefix || !hasFeat(stem, 'PRON')) continue;
    const id = PREP_PREFIX_BY_LEMMA[stem.prepLemma];
    if (id) matchByLocation.set(loc, id);
  }
}

/** Deck citations that the ordinary surface/lemma pipeline misses: إله vs إِلٰه, الله vs
 *  اللَّه, cattle vs "yes" under نَعَم, Hereafter as feminine آخِر, لكن vs corpus لاكِنّ. */
const ATTACHED_LEMMA_CARDS = {
  '01-001': (stem) => demonstrativeKind(stem) === 'hadha',
  '01-002': (stem) => demonstrativeKind(stem) === 'hadhihi',
  '01-003': (stem) => demonstrativeKind(stem) === 'haula',
  '01-004': (stem) => demonstrativeKind(stem) === 'dhalika',
  '01-005': (stem) => demonstrativeKind(stem) === 'tilka',
  '01-006': (stem) => demonstrativeKind(stem) === 'ulaika',
  '02-014': (stem) => lemmaIs(stem, 'إِلٰه'),
  '02-002': (stem) => lemmaIs(stem, 'اللَّه'),
  '12-004': (stem) => lemmaIs(stem, 'لاكِنّ', 'لاكِن'),
  '18-004': (stem) => lemmaIs(stem, 'نَعَم') && !hasFeat(stem, 'ANS'),
  '18-009': (stem) => lemmaIs(stem, 'لَيْل', 'لَيْلَة'),
  '19-001': (stem) => lemmaIs(stem, 'اَصْحاب', 'صاحِب', 'صاحب'),
  '20-004': (stem) => lemmaIs(stem, 'آخِر') && hasFeat(stem, 'FS'),
  '05-005': (stem) => lemmaIs(stem, 'أَمام'),
  '25-002': (stem) => lemmaIs(stem, 'اباء', 'آباء'),
  '25-004': (stem) => lemmaIs(stem, 'رِجال'),
  '25-005': (stem) => lemmaIs(stem, 'نِساء'),
  '26-009': (stem) => lemmaIs(stem, 'رِجْل'),
  '31-002': (stem) => lemmaIs(stem, 'يَشْعُر', 'شَعَر'),
  '33-002': (stem) => lemmaIs(stem, 'يَحْزُن', 'حَزِن'),
  '37-001': (stem) => lemmaIs(stem, 'تَلَي'),
  '38-008': (stem) => lemmaIs(stem, 'رَاَي', 'رَأَى'),
  '47-004': (stem) => lemmaIs(stem, 'اسْتَغْفَر'),
  '32-012': (stem) => lemmaIs(stem, 'رَجَع'),
  '32-013': (stem) => lemmaIs(stem, 'اَحْبَب', 'أَحَبّ', 'أَحَبَّ'),
  '32-014': (stem) => lemmaIs(stem, 'حَرَّم'),
  '32-015': (stem) => lemmaIs(stem, 'اسْتَوَي'),
  '32-016': (stem) => lemmaIs(stem, 'فَتَن'),
  '32-017': (stem) => lemmaIs(stem, 'نَهَي'),
  '32-018': (stem) => lemmaIs(stem, 'اَغْنَت'),
  '32-019': (stem) => lemmaIs(stem, 'يَضُرّ'),
  '32-020': (stem) => lemmaIs(stem, 'اَذِن'),
  '32-021': (stem) => lemmaIs(stem, 'مَش'),
  '12-003': (stem) => lemmaIs(stem, 'كَاَن'),
  '50-006': (stem) => lemmaIs(stem, 'مَيْت'),
  '100-002': (stem) => lemmaIs(stem, 'مُوْمِنَة'),
  '103-006': (stem) => lemmaIs(stem, 'نَبَا', 'نَبَأ') && stem.pos !== 'V',
  '104-002': (stem) => lemmaIs(stem, 'ظُلُمَة'),
  '105-001': (stem) => lemmaIs(stem, 'مَنّ'),
  '109-007': (stem) => lemmaIs(stem, 'حَبَّة'),
  '114-003': (stem) => lemmaIs(stem, 'قِبْلَة'),
};

const COVERAGE_OVERRIDE_PATH = path.join(__dirname, 'data', 'vocab-lemma-overrides.json');

/** Leftover-lemma cards (level 100+) store the corpus light-lemma in overrides. Attach any
 *  still-untagged locations of those lemmas so a later duplicate citation cannot first-write
 *  the token and then fail lemmaCompatible, leaving the leftover unclaimed. */
function tagCoverageBandLemmas(stemByLocation, matchByLocation) {
  if (!fs.existsSync(COVERAGE_OVERRIDE_PATH)) return;
  const overrides = JSON.parse(fs.readFileSync(COVERAGE_OVERRIDE_PATH, 'utf8'));
  const tests = [];
  for (const [id, entry] of Object.entries(overrides)) {
    const level = Number(id.split('-')[0]);
    if (!Number.isFinite(level) || level < 100) continue;
    if (FEATURE_SENSE[id]) continue;
    const lemmas = entry.lemmas ?? [];
    if (lemmas.length === 0) continue;
    tests.push([id, (stem) => lemmaIs(stem, ...lemmas)]);
  }
  tests.sort((a, b) => a[0].localeCompare(b[0]));
  for (const [loc, stem] of stemByLocation) {
    if (matchByLocation.has(loc)) continue;
    const hit = tests.find(([, test]) => test(stem));
    if (hit) matchByLocation.set(loc, hit[0]);
  }
}

function tagAttachedLemmas(stemByLocation, matchByLocation) {
  const tests = Object.entries(ATTACHED_LEMMA_CARDS);
  for (const [loc, stem] of stemByLocation) {
    if (matchByLocation.has(loc)) continue;
    const hit = tests.find(([, test]) => test(stem));
    if (hit) matchByLocation.set(loc, hit[0]);
  }
}

/** One-letter prefixes fused onto a word (وَكتاب, فَقال, سَيَعْلَم). Prefix cards only own a
 *  whole reader word when it has no lexical stem lemma of its own. Otherwise the word must fall
 *  through to the lemma fallback: assigning وَ to وَثُلَاثَ, for example, would make “three” and
 *  every other unmatched و-prefixed word share the “and” card. Definite الْ is skipped too —
 *  tagging every leftover noun as "the" would hide the noun itself. */
function tagGluedPrefixes(stemByLocation, matchByLocation) {
  const skip = new Set(['ال', normalizeArabic('الْ')]);
  for (const [loc, stem] of stemByLocation) {
    if (matchByLocation.has(loc)) continue;
    if (stem.lightLemma) continue;
    if (stem.prefixEmphLam && stem.hasEmphNun) {
      matchByLocation.set(loc, '11-004');
      continue;
    }
    if (stem.prefixEmphLam && stem.hasQad) {
      matchByLocation.set(loc, '11-005');
      continue;
    }
    if (stem.prefixVocYa) {
      matchByLocation.set(loc, '12-012');
      continue;
    }
    if (stem.prefixEmphLam) {
      matchByLocation.set(loc, '11-006');
      continue;
    }
    if (stem.prefixImprLam) {
      matchByLocation.set(loc, '11-007');
      continue;
    }
    for (const heavy of stem.prefixHeavies ?? []) {
      if (skip.has(heavy)) continue;
      const id = PREFIX_LEMMA_TO_ID[heavy];
      if (id && id !== '11-008') {
        matchByLocation.set(loc, id);
        break;
      }
    }
  }
}

/**
 * Fallback pass, run *after* `buildVocabMatches`: for every Quran word position that still has
 * no curated study-word match, but does have a resolvable Quranic Arabic Corpus dictionary
 * lemma, generates a stable, deterministic id ("lem:<lightLemma>") grouping every occurrence of
 * that same lemma. This lets a user who already knows a word *outside* the 547-word curriculum
 * still mark it "known" once (see `useKnownWordsStore`) and have every occurrence of that word
 * recognized across the whole Quran, the same way curriculum mastery already works via
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
 *
 * Prefix-card tags (وَكتاب as "and") do not count as claiming the *stem* lemma: otherwise a
 * leftover noun that often follows وَ would look "majority claimed" and its unprefixed
 * occurrences would lose the lem: fallback.
 */
function buildLemmaFallbackTags(stemByLocation, matchByLocation) {
  const totalByLemma = new Map();
  const claimedByLemma = new Map();
  for (const [loc, stem] of stemByLocation) {
    const lemma = stem.lightLemma;
    if (!lemma) continue;
    totalByLemma.set(lemma, (totalByLemma.get(lemma) ?? 0) + 1);
    const id = matchByLocation.get(loc);
    if (id && !PREFIX_STUDY_IDS.has(id)) {
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

const SUFFIX_PERSON_TO_ID = {
  '1S': '03-005',
  '1P': '03-010',
  '2MS': '03-003',
  '2FS': '03-004',
  '2MP': '03-008',
  '2FP': '03-009',
  '2D': '03-012',
  '3MS': '03-001',
  '3FS': '03-002',
  '3MP': '03-006',
  '3FP': '03-007',
  '3D': '03-011',
};

const PREFIX_LEMMA_TO_ID = {
  و: '10-012',
  ف: '08-007',
  ب: '10-001',
  ل: '10-005',
  ك: '10-004',
  س: '11-002',
  ال: '11-008',
  ت: '10-008',
};

const PREFIX_STUDY_IDS = new Set([
  '08-007',
  '10-001',
  '10-004',
  '10-005',
  '10-008',
  '10-012',
  '11-002',
  '11-004',
  '11-005',
  '11-006',
  '11-007',
  '11-008',
  '12-012',
]);

function lettersOnly(text) {
  return normalizeArabic(text).replace(/[^\u0621-\u064A\u0671]/g, '');
}

function suffixTextMatchesStudy(suffText, study) {
  const suff = lettersOnly(suffText);
  if (!suff) return false;
  const citations = [study.arabic, study.variant, ...(study.forms ?? [])]
    .filter(Boolean)
    .join(',')
    .split(/[,\u060c]/);
  return citations.some((citation) => {
    const form = lettersOnly(citation);
    if (!form) return false;
    // Dual verb endings are tagged 2D with a bare alif (فَأْتِيَا). That is not كُمَا,
    // even though كما ends with ا. Require the corpus clitic to be the taught form.
    return suff === form || (suff.length > form.length && suff.endsWith(form));
  });
}

/**
 * Locations whose morphology has an attached pronoun / one-letter prefix matching a study card.
 * Used to pick a verse example for clitics that never appear as their own mushaf word.
 * `studyById` is `"03-001" -> { arabic, variant }` from the deck.
 */
function collectAffixLocations(studyById) {
  const lines = fs.readFileSync(MORPHOLOGY_PATH, 'utf8').split('\n');
  const segmentsByWord = new Map();
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const [loc, text, , featuresRaw] = line.split('\t');
    if (!loc || !text || !featuresRaw) continue;
    const parts = loc.split(':');
    if (parts.length !== 4) continue;
    const wordKey = `${parts[0]}:${parts[1]}:${parts[2]}`;
    if (!segmentsByWord.has(wordKey)) segmentsByWord.set(wordKey, []);
    segmentsByWord.get(wordKey).push({ text, feats: featuresRaw.split('|') });
  }

  const suffixById = new Map();
  const prefixById = new Map();
  const add = (map, id, loc) => {
    if (!id) return;
    if (!map.has(id)) map.set(id, []);
    map.get(id).push(loc);
  };

  for (const [wordKey, segments] of segmentsByWord) {
    for (const seg of segments) {
      if (seg.feats.includes('SUFF') && seg.feats.includes('PRON')) {
        const person = Object.keys(SUFFIX_PERSON_TO_ID).find((tag) => seg.feats.includes(tag));
        const id = person ? SUFFIX_PERSON_TO_ID[person] : null;
        const study = id ? studyById.get(id) : null;
        if (id && study && suffixTextMatchesStudy(seg.text, study)) add(suffixById, id, wordKey);
      }
      if (seg.feats.includes('PREF')) {
        const lemFeat = seg.feats.find((f) => f.startsWith('LEM:'));
        const lemma = lemFeat ? normalizeArabic(lemFeat.slice(4)) : '';
        if (lemma === 'ل' && seg.feats.includes('EMPH')) {
          add(prefixById, '11-006', wordKey);
        } else if (lemma === 'ي' && seg.feats.includes('VOC')) {
          add(prefixById, '12-012', wordKey);
        } else {
          add(prefixById, PREFIX_LEMMA_TO_ID[lemma], wordKey);
        }
      }
    }
    const hasEmphLam = segments.some((seg) => {
      const lemFeat = seg.feats.find((f) => f.startsWith('LEM:'));
      const lemma = lemFeat ? normalizeArabic(lemFeat.slice(4)) : '';
      return seg.feats.includes('PREF') && seg.feats.includes('EMPH') && lemma === 'ل';
    });
    const hasEmphNun = segments.some((seg) => seg.feats.includes('SUFF') && seg.feats.includes('EMPH'));
    if (hasEmphLam && hasEmphNun) add(prefixById, '11-004', wordKey);
    const hasQad = segments.some((seg) => {
      if (seg.feats.includes('PREF') || seg.feats.includes('SUFF')) return false;
      const lemFeat = seg.feats.find((f) => f.startsWith('LEM:'));
      return lemFeat ? normalizeArabic(lemFeat.slice(4)) === normalizeArabic('قَد') : false;
    });
    if (hasEmphLam && hasQad) add(prefixById, '11-005', wordKey);
  }
  return { suffixById, prefixById };
}

/** First comma-separated citation, split on spaces - the phrase a flashcard is teaching. */
function citationPhraseTokens(arabic) {
  const first = String(arabic ?? '')
    .split(/[,\u060c]/)[0]
    .trim();
  return first.split(/\s+/).filter(Boolean);
}

/** Every multi-word citation listed on a study card (`arabic` alternatives and `forms`). */
function citationPhraseTokenizations(study) {
  const texts = [study?.arabic, ...(study?.forms ?? [])].filter(Boolean);
  const out = [];
  const seen = new Set();
  for (const text of texts) {
    for (const piece of String(text).split(/[,\u060c]/)) {
      const tokens = piece.trim().split(/\s+/).filter(Boolean);
      if (tokens.length < 2) continue;
      const key = tokens.join(' ');
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(tokens);
    }
  }
  return out;
}

/** Mushaf spellings often write a dagger alif the deck citation omitted (إِله vs إِلَٰه). */
function lettersMatchFlexible(citation, surface) {
  const cit = [...hamzaFold(normalizeArabic(citation))];
  const sur = [...hamzaFold(normalizeArabic(surface))];
  if (cit.length === 0 || sur.length === 0) return false;
  let i = 0;
  for (const ch of sur) {
    if (i < cit.length && ch === cit[i]) i += 1;
    else if (ch === '\u0627') continue;
    else return false;
  }
  return i === cit.length;
}

/** Citation letters are a prefix of the surface, allowing a trailing clitic (يَدَيْهِ). */
function lettersMatchAsPrefix(citation, surface) {
  const cit = [...hamzaFold(normalizeArabic(citation))];
  const sur = [...hamzaFold(normalizeArabic(surface))];
  if (cit.length === 0 || sur.length === 0) return false;
  let i = 0;
  for (const ch of sur) {
    if (i >= cit.length) return true;
    if (ch === cit[i]) i += 1;
    else if (ch === '\u0627') continue;
    else return false;
  }
  return i === cit.length;
}

function locationMatchesPhraseToken(token, loc, rawSurfaceByLocation, stemByLocation, allowTrailing = false) {
  const stem = stemByLocation.get(loc);
  const surface = stem?.lightSurface || normalizeLight(rawSurfaceByLocation.get(loc) ?? '');
  if (!surface) return false;
  const light = normalizeLight(token);
  if (surface === light) return true;
  if (stem?.lightLemma === light) return true;
  if (stem?.heavyLemma === normalizeArabic(token)) return true;
  if (normalizeLightLoose(surface) === normalizeLightLoose(token)) return true;
  const raw = rawSurfaceByLocation.get(loc) ?? surface;
  const candidate = stem?.lightSurface || raw;
  if (lettersMatchFlexible(token, candidate)) return true;
  return allowTrailing ? lettersMatchAsPrefix(token, candidate) : false;
}

/**
 * Adjacent mushaf words matching a multi-word citation, in order. Used to pick verse examples
 * for phrase cards so "لَا إِلهَ" shows a shahada ayah rather than a random "لَا" (e.g. ولا in
 * 1:7). Reader tagging still splits phrases into individual words; this is example-only.
 * The last token may carry a possessive/object suffix (بين يديه).
 */
function findPhraseRuns(tokens, ayahWordOrder, rawSurfaceByLocation, stemByLocation) {
  if (!tokens || tokens.length < 2) return [];
  const runs = [];
  for (const locations of ayahWordOrder.values()) {
    for (let i = 0; i <= locations.length - tokens.length; i += 1) {
      let ok = true;
      for (let j = 0; j < tokens.length; j += 1) {
        const last = j === tokens.length - 1;
        if (
          !locationMatchesPhraseToken(
            tokens[j],
            locations[i + j],
            rawSurfaceByLocation,
            stemByLocation,
            last,
          )
        ) {
          ok = false;
          break;
        }
      }
      if (ok) runs.push({ loc: locations[i], n: tokens.length });
    }
  }
  return runs;
}

/** Verb-word locations whose morphology carries this person tag (e.g. 2FP on لَسْتُنَّ).
 *  Used only for flashcard examples of independent pronouns that never appear standalone.
 *  When `citation` is set, keep verbs whose letters include that pronoun's ending (تن on أنتن)
 *  so imperfect 2FP نَ (تخضعن، قلن) is not treated as the independent pronoun. */
function collectVerbPersonLocations(stemByLocation, personTag, citation) {
  const ending = citation ? letterCore(citation).slice(-2) : '';
  const locs = [];
  for (const [loc, stem] of stemByLocation) {
    if (stem?.pos !== 'V' || !hasFeat(stem, personTag)) continue;
    if (ending) {
      const core = letterCore(stem.lightSurface || stem.heavySurface || '');
      if (!core.includes(ending)) continue;
    }
    locs.push(loc);
  }
  return locs;
}

function letterCore(text) {
  return hamzaFold(normalizeArabic(text)).replace(/[^\u0621-\u064A]/g, '');
}

const SKIP_EXTRA_LETTERS = new Set(['\u0627', '\u0621']);

function coreContains(surfaceCore, needleCore) {
  if (!needleCore || needleCore.length < 3 || !surfaceCore) return false;
  for (let i = 0; i < surfaceCore.length; i += 1) {
    let si = i;
    let ni = 0;
    while (si < surfaceCore.length && ni < needleCore.length) {
      if (surfaceCore[si] === needleCore[ni]) {
        si += 1;
        ni += 1;
      } else if (ni > 0 && SKIP_EXTRA_LETTERS.has(surfaceCore[si])) {
        si += 1;
      } else {
        break;
      }
    }
    if (ni === needleCore.length) return true;
  }
  return false;
}

function coreVariants(core) {
  const out = [core];
  if (core.startsWith('ال') && core.length > 5) out.push(core.slice(2));
  // Form-X استفعل: drop the prosthetic alef (and a trailing hamza-alef) so يستهزئون can
  // illustrate اِسْتَهْزَأَ. Do not strip a generic leading ا/و/ي - that turns أُمُور into
  // مور and matches تَمُور, or أَنْتُنَّ into نتن and matches جَنَّتَانِ.
  if (core.startsWith('است') && core.length >= 6) {
    const rest = core.slice(1);
    out.push(rest);
    if (/ا$/.test(rest) && rest.length > 3) out.push(rest.slice(0, -1));
  }
  return [...new Set(out)].filter((item) => item.length >= 3);
}

function locationCores(loc, rawSurfaceByLocation, stemByLocation) {
  const raw = rawSurfaceByLocation.get(loc) ?? '';
  const stem = stemByLocation.get(loc);
  return [...new Set([letterCore(raw), letterCore(stem?.lightSurface || '')].filter(Boolean))];
}

function studyNeedles(word) {
  const raw = [word.arabic, word.plural, word.variant, ...(word.forms ?? [])].filter(Boolean);
  const needles = [];
  for (const form of raw) {
    for (const piece of String(form).split(/[,\u060c]/)) {
      const trimmed = piece.trim();
      if (!trimmed || trimmed.includes('+')) continue;
      if (trimmed.includes('...')) {
        const tokens = trimmed.split('...').map((part) => part.trim()).filter(Boolean);
        if (tokens.length >= 2) needles.push({ kind: 'gap', tokens });
        continue;
      }
      const core = letterCore(trimmed);
      if (core.length >= 3) needles.push({ kind: 'core', core });
    }
  }
  return needles;
}

/**
 * Fallback verse examples for study words that never tag a whole mushaf word: find a surface
 * that *contains* the citation letters (القرآن for قرآن) or an ayah that has both halves of a
 * "ما ... إلا" pattern. Highlighting the matching letters is the caller's job.
 */
function findPartialExampleHits(word, otherCores, ayahWordOrder, rawSurfaceByLocation, stemByLocation, locPrefix) {
  const needles = studyNeedles(word);
  if (needles.length === 0) return [];
  const coreNeedles = needles.filter((needle) => needle.kind === 'core');
  const maxCore = Math.max(0, ...coreNeedles.map((needle) => needle.core.length));
  const used = needles.filter((needle) => needle.kind !== 'core' || needle.core.length === maxCore);
  const hits = [];
  const locOk = (loc) => !locPrefix || loc.startsWith(locPrefix);
  const ayahKey = locPrefix ? locPrefix.replace(/:$/, '') : null;
  const scopedLocs =
    ayahKey && ayahWordOrder.has(ayahKey)
      ? ayahWordOrder.get(ayahKey)
      : [...rawSurfaceByLocation.keys()];
  for (const needle of used) {
    if (needle.kind === 'core') {
      if (!locPrefix && otherCores.get(needle.core) === '*') continue;
      const variants = coreVariants(needle.core).filter(
        (core) => locPrefix || otherCores.get(core) !== '*',
      );
      for (const loc of scopedLocs) {
        if (!locOk(loc)) continue;
        const cores = locationCores(loc, rawSurfaceByLocation, stemByLocation);
        if (!variants.some((variant) => cores.some((core) => coreContains(core, variant)))) continue;
        hits.push({ loc, n: 1 });
      }
    } else {
      const ayahLists = ayahKey && ayahWordOrder.has(ayahKey)
        ? [ayahWordOrder.get(ayahKey)]
        : [...ayahWordOrder.values()];
      for (const locations of ayahLists) {
        const matched = [];
        let cursor = 0;
        for (const token of needle.tokens) {
          let found = -1;
          for (let i = cursor; i < locations.length; i += 1) {
            if (!locationMatchesPhraseToken(token, locations[i], rawSurfaceByLocation, stemByLocation)) continue;
            // Light matching unifies إ/أ, so إِلَّا would otherwise hit أَلَّا ("that not").
            const raw = rawSurfaceByLocation.get(locations[i]) ?? '';
            if (/إ/.test(token) && /أ/.test(raw) && !/إ/.test(raw)) continue;
            found = i;
            break;
          }
          if (found < 0) {
            matched.length = 0;
            break;
          }
          matched.push(locations[found]);
          cursor = found + 1;
        }
        if (matched.length === needle.tokens.length) {
          hits.push({ loc: matched[0], n: 1, hits: matched.map((loc) => Number(loc.split(':')[2])) });
        }
      }
    }
  }
  return hits;
}

function collectStudyCores(studyById) {
  const cores = new Map();
  for (const [id, word] of studyById) {
    if (word.kind === 'grammar' || word.isSuffix || word.isPrefix) continue;
    for (const needle of studyNeedles(word)) {
      if (needle.kind !== 'core') continue;
      if (!cores.has(needle.core)) cores.set(needle.core, word.arabic);
      else if (cores.get(needle.core) !== word.arabic) cores.set(needle.core, '*');
    }
  }
  return cores;
}

module.exports = {
  normalizeArabic,
  normalizeLight,
  normalizeLightLoose,
  sameLemma,
  hamzaFold,
  loadStudyForms,
  loadMorphologyStems,
  buildVocabMatches,
  buildLemmaFallbackTags,
  collectAffixLocations,
  citationPhraseTokens,
  citationPhraseTokenizations,
  findPhraseRuns,
  findPartialExampleHits,
  collectStudyCores,
  collectVerbPersonLocations,
  INDEPENDENT_PRONOUN_BY_PERSON,
};
