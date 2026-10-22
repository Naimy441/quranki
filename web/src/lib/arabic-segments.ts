import type { TextSegment } from '@/lib/quran-reader-types';

const LEADING_COMBINING_MARKS = /^[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]+/;

/** Keeps Quranic marks attached to their base letter across colored tajweed runs. */
export function attachLeadingCombiningMarks(segments: TextSegment[]): TextSegment[] {
  if (segments.length <= 1) return segments;
  const out: TextSegment[] = [];
  for (const segment of segments) {
    const previous = out[out.length - 1];
    const marks = previous ? segment.t.match(LEADING_COMBINING_MARKS)?.[0] : undefined;
    if (marks) {
      previous.t += marks;
      const rest = segment.t.slice(marks.length);
      if (rest) out.push({ ...segment, t: rest });
    } else out.push({ ...segment });
  }
  return out;
}
