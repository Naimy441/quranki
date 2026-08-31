import type { Word } from '@/lib/levels';

/** Harakat, Quranic recitation marks, and tatweel - ignored when matching letters. */
const MARKS = /[\u0640\u064B-\u065F\u0670\u06D6-\u06ED]/;

/** Characters the Uthmanic Hafs font typically has no glyph for - commas, plus, ASCII, etc.
 *  Render these in the system font so they don't show as empty boxes on flashcards. */
export const ARABIC_FALLBACK_RUN = /[,+.\-\/\\|()[\]{}…:;!?%*=<>&'"0-9A-Za-z\u060C\u061B\u061F]+/;

const ALEF = new Set(['\u0627', '\u0622', '\u0623', '\u0625', '\u0671']);

export type AffixSide = 'prefix' | 'suffix' | 'whole';

export function affixSide(word: Word): AffixSide {
  if (word.isSuffix) return 'suffix';
  if (word.isPrefix) return 'prefix';
  return 'whole';
}

function unifyLetter(ch: string): string {
  if (ALEF.has(ch)) return '\u0627';
  if (ch === '\u0649') return '\u064A';
  return ch;
}

interface LetterSpan {
  ch: string;
  start: number;
  end: number;
}

function letterSpans(text: string): LetterSpan[] {
  const spans: LetterSpan[] = [];
  for (let i = 0; i < text.length; ) {
    const cp = text.codePointAt(i);
    if (cp === undefined) break;
    const ch = String.fromCodePoint(cp);
    const next = i + ch.length;
    if (!MARKS.test(ch) && ch !== ' ' && ch !== '\u060C' && ch !== ',') {
      spans.push({ ch: unifyLetter(ch), start: i, end: next });
    }
    i = next;
  }
  // Extend each span through following marks so a highlighted هُ includes its damma.
  for (let i = 0; i < spans.length; i += 1) {
    const limit = i + 1 < spans.length ? spans[i + 1].start : text.length;
    spans[i].end = limit;
  }
  return spans;
}

/** Citation forms listed in `arabic`, plus `variant` / `forms` when present. */
export function studyForms(word: Word): string[] {
  const extra = [word.variant, ...(word.forms ?? [])].filter(Boolean).join(',');
  const raw = extra ? `${word.arabic},${extra}` : word.arabic;
  return raw
    .split(/[,\u060c]/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/**
 * How a study word should appear on a flashcard: suffixes get a leading tatweel (ـهُ), prefixes
 * a trailing one (وَـ), so a lone letter reads as "this attaches" rather than a mysterious glyph.
 * Grammar intros already include the tatweel in their citation form.
 */
export function displayArabic(word: Word): string {
  if (word.kind === 'grammar' || (!word.isSuffix && !word.isPrefix)) return word.arabic;
  const forms = word.arabic.split(/[,\u060c]/).map((part) => part.trim()).filter(Boolean);
  const wrapped = forms.map((form) => {
    const stripped = form.replace(/\u0640/g, '');
    return word.isSuffix ? `\u0640${stripped}` : `${stripped}\u0640`;
  });
  return wrapped.join('\u060c ');
}

export interface HighlightParts {
  before: string;
  hit: string;
  after: string;
}

/** KFGQPC Hafs v18 maps U+06EB (ishmam) to a wide spacing glyph with no GPOS, which splits
 *  Yusuf 12:11's تَأْمَنَّا. U+06EC is the same font's zero-width filled high stop - a small
 *  dot above the letter, which is how ishmam is written in the mushaf. */
export function shapeQpcArabic(text: string): string {
  return text.replace(/\u06EB/g, '\u06EC');
}

const SKIP_EXTRA = new Set(['\u0627', '\u0621']);

function findFlexibleWindow(surface: LetterSpan[], needle: LetterSpan[]): { start: number; end: number } | null {
  if (needle.length === 0 || needle.length > surface.length) return null;
  for (let i = 0; i < surface.length; i += 1) {
    let si = i;
    let ni = 0;
    while (si < surface.length && ni < needle.length) {
      if (surface[si].ch === needle[ni].ch) {
        si += 1;
        ni += 1;
      } else if (ni > 0 && SKIP_EXTRA.has(surface[si].ch)) {
        si += 1;
      } else {
        break;
      }
    }
    if (ni === needle.length) return { start: i, end: si - 1 };
  }
  return null;
}

function partsFromWindow(surface: string, letters: LetterSpan[], window: { start: number; end: number }): HighlightParts {
  const start = letters[window.start].start;
  const end = letters[window.end].end;
  return { before: surface.slice(0, start), hit: surface.slice(start, end), after: surface.slice(end) };
}

/**
 * Split a Quran word's surface form so the study affix (or the matching letters of the whole
 * word) can be colored. Matching is letter-based: harakat are ignored, then mapped back onto
 * the original string so the highlighted run keeps its vowels and recitation marks.
 */
export function highlightAffix(surface: string, word: Word): HighlightParts {
  const side = affixSide(word);
  const surfaceLetters = letterSpans(surface);

  if (side === 'prefix' || side === 'suffix') {
    for (const form of studyForms(word)) {
      const needle = letterSpans(form.replace(/\u0640/g, ''));
      if (needle.length === 0 || needle.length > surfaceLetters.length) continue;

      if (side === 'prefix') {
        if (needle.every((n, i) => n.ch === surfaceLetters[i].ch)) {
          const end = surfaceLetters[needle.length - 1].end;
          return { before: '', hit: surface.slice(0, end), after: surface.slice(end) };
        }
      } else {
        const offset = surfaceLetters.length - needle.length;
        if (needle.every((n, i) => n.ch === surfaceLetters[offset + i].ch)) {
          const start = surfaceLetters[offset].start;
          return { before: surface.slice(0, start), hit: surface.slice(start), after: '' };
        }
      }
    }
    return { before: '', hit: surface, after: '' };
  }

  let best: HighlightParts | null = null;
  let bestLen = -1;
  for (const form of studyForms(word)) {
    const needle = letterSpans(form.replace(/\u0640/g, '').replace(/[+,.]/g, ''));
    if (needle.length === 0) continue;
    const window = findFlexibleWindow(surfaceLetters, needle);
    if (!window) continue;
    const len = window.end - window.start + 1;
    if (len > bestLen) {
      bestLen = len;
      best = partsFromWindow(surface, surfaceLetters, window);
    }
  }
  return best ?? { before: '', hit: surface, after: '' };
}

export interface ArabicRun {
  text: string;
  fallback: boolean;
}

/** Split mixed study-card text into Uthmanic runs vs. punctuation that needs the system font. */
export function splitArabicFallbackRuns(text: string): ArabicRun[] {
  if (!text) return [];
  const runs: ArabicRun[] = [];
  const re = new RegExp(ARABIC_FALLBACK_RUN.source, 'g');
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) runs.push({ text: text.slice(last, match.index), fallback: false });
    runs.push({ text: match[0], fallback: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), fallback: false });
  return runs.filter((run) => run.text.length > 0);
}
