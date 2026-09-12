/**
 * Counts Quran words by the hardest Qaida skill needed to sound them out.
 *
 *   node scripts/build-qaida-readable-coverage.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SURAH_DIR = path.join(ROOT, 'src', 'data', 'quran', 'surahs');
const OUT = path.join(ROOT, 'src', 'data', 'quran', 'qaida-readable-coverage.json');

const FATHA = '\u064E';
const KASRA = '\u0650';
const DAMMA = '\u064F';
const FATHATAIN = '\u064B';
const KASRATAIN = '\u064D';
const DAMMATAIN = '\u064C';
const SUKOON = '\u0652';
const QURAN_SUKOON = '\u06E1';
const SHADDAH = '\u0651';
const DAGGER = '\u0670';
const MADDAH = '\u0653';
const SMALL_MADDAH = '\u06E4';
const ALEF_MADDA = '\u0622';
const ALEF = '\u0627';
const WAW = '\u0648';
const YAA = '\u064A';
const ALEF_MAQSURA = '\u0649';

const SHORT = new Set([FATHA, KASRA, DAMMA]);
const TANWEEN = new Set([FATHATAIN, KASRATAIN, DAMMATAIN]);
const STOPS = new Set([SUKOON, QURAN_SUKOON]);
const MAD_CLASSES = new Set(['madda_normal', 'madda_permissible', 'madda_necessary', 'madda_obligatory']);

const SKILLS = ['letters', 'muqattaat', 'haraka', 'tanween', 'madd', 'leen', 'sukoon', 'shaddah'];

function harder(a, b) {
  return SKILLS.indexOf(a) >= SKILLS.indexOf(b) ? a : b;
}

function featuresOf(text, maddFromClass) {
  let hasShort = false;
  let hasTanween = false;
  let hasShaddah = false;
  let hasMadd = maddFromClass;
  let hasLeen = false;
  let sukoonCount = 0;
  let leenSukoonCount = 0;

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    const next = text[i + 1] ?? '';
    const after = text[i + 2] ?? '';

    if (SHORT.has(ch)) hasShort = true;
    if (TANWEEN.has(ch)) hasTanween = true;
    if (ch === SHADDAH) hasShaddah = true;
    if (STOPS.has(ch)) sukoonCount += 1;
    if (ch === DAGGER || ch === MADDAH || ch === SMALL_MADDAH || ch === ALEF_MADDA) hasMadd = true;

    if (ch === FATHA && (next === ALEF || next === DAGGER || next === ALEF_MAQSURA)) hasMadd = true;
    if (ch === FATHA && (next === YAA || next === WAW) && STOPS.has(after)) {
      hasLeen = true;
      leenSukoonCount += 1;
    }
    if (ch === KASRA && (next === YAA || next === ALEF_MAQSURA) && !STOPS.has(after)) hasMadd = true;
    if (ch === DAMMA && next === WAW && !STOPS.has(after)) hasMadd = true;
  }

  let skill = 'letters';
  if (hasShort) skill = harder(skill, 'haraka');
  if (hasTanween) skill = harder(skill, 'tanween');
  if (hasMadd) skill = harder(skill, 'madd');
  if (hasLeen) skill = harder(skill, 'leen');
  if (sukoonCount > leenSukoonCount) skill = harder(skill, 'sukoon');
  if (hasShaddah) skill = harder(skill, 'shaddah');
  return skill;
}

function classify(word) {
  if (word.l === undefined) return 'muqattaat';
  const ar = (word.ar ?? []).map((part) => part.t).join('');
  const morph = (word.m ?? []).map((part) => part.t).join('');
  const maddFromClass = (word.ar ?? []).some((part) => part.c && MAD_CLASSES.has(part.c));
  const fromAr = featuresOf(ar, maddFromClass);
  if (!morph) return fromAr;
  return harder(fromAr, featuresOf(morph, false));
}

const counts = Object.fromEntries(SKILLS.map((skill) => [skill, 0]));
let total = 0;

for (let surah = 1; surah <= 114; surah += 1) {
  const file = path.join(SURAH_DIR, `${String(surah).padStart(3, '0')}.json`);
  const ayahs = JSON.parse(fs.readFileSync(file, 'utf8'));
  for (const ayah of ayahs) {
    for (const word of ayah.w ?? []) {
      total += 1;
      counts[classify(word)] += 1;
    }
  }
}

const cumulative = {};
let running = 0;
for (const skill of SKILLS) {
  running += counts[skill];
  cumulative[skill] = running;
}

const payload = { total, counts, cumulative };
fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`);
console.log(JSON.stringify(payload, null, 2));
