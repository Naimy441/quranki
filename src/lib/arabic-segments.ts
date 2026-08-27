import type { TextSegment } from '@/lib/quran-reader-types';

/**
 * Combining diacritics (harakat, tanween, Qur'anic annotation signs) have no width of their own -
 * the font positions them onto the glyph immediately before them. Tajweed markup often opens or
 * closes a <rule> tag between a letter and its own trailing mark, so the mark lands at the start
 * of the next color run. If those runs are rendered as sibling <Text> nodes (and especially if a
 * ZWJ is inserted between them for Android joining), the mark attaches to the wrong base - or to
 * the ZWJ itself - and the word falls apart on iOS and Android.
 *
 * Fold any leading combining marks into the previous run so a letter and its harakat always share
 * one Text node. The letter's tajweed class wins, which is also the correct coloring.
 */
const LEADING_COMBINING_MARKS = /^[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]+/;

export function attachLeadingCombiningMarks(segments: TextSegment[]): TextSegment[] {
  if (segments.length <= 1) return segments;
  const out: TextSegment[] = [];
  for (const seg of segments) {
    const prev = out[out.length - 1];
    const marks = prev ? seg.t.match(LEADING_COMBINING_MARKS)?.[0] : undefined;
    if (marks) {
      prev.t += marks;
      const rest = seg.t.slice(marks.length);
      if (rest) out.push({ ...seg, t: rest });
    } else {
      out.push({ ...seg });
    }
  }
  return out;
}
