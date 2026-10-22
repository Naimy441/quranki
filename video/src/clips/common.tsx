import React from 'react';
import { Audio, Sequence, staticFile, useCurrentFrame } from 'remotion';

import { C, SANS } from '../ui';

export const FPS = 30;

export interface Timeline {
  duration: number;
  timeline: Record<string, { start: number; end: number; sayStart?: number; sayEnd?: number; say?: string }>;
  audio: { src: string; at: number; trim?: number; length: number }[];
  captions: { id: string; words: { w: string; s: number; e: number }[] }[];
}

/** Frame lookups into a generated timeline. */
export function useTimeline(t: Timeline) {
  const seg = (id: string) => {
    const s = t.timeline[id];
    if (!s) throw new Error(`no segment ${id}`);
    return s;
  };
  return {
    /** Frame the segment starts (its audio, or its line). */
    at: (id: string) => Math.round(seg(id).start * FPS),
    /** Frame Jon starts the segment's line. */
    say: (id: string) => Math.round((seg(id).sayStart ?? seg(id).start) * FPS),
    end: (id: string) => Math.round(seg(id).end * FPS),
    has: (id: string) => id in t.timeline,
  };
}

/** Every sound in the timeline, each trimmed to the part the timeline uses. */
export const ClipAudio: React.FC<{ t: Timeline }> = ({ t }) => (
  <>
    {t.audio.map((a, i) => {
      const from = Math.round(a.at * FPS);
      const dur = Math.ceil(a.length * FPS);
      const fadeOut = a.src.startsWith('rec/') ? 6 : 2;
      return (
        <Sequence key={`${a.src}-${i}`} from={Math.max(0, from)} durationInFrames={dur} layout="none" name={a.src}>
          <Audio
            src={staticFile(a.src)}
            trimBefore={Math.round(((a.trim ?? 0) + (from < 0 ? -from / FPS : 0)) * FPS)}
            volume={(f) => (a.src.startsWith('vo') ? 1 : Math.min(1, (dur - f) / fadeOut))}
          />
        </Sequence>
      );
    })}
  </>
);

/**
 * Shorts-style captions: a few words at a time, the spoken word lit up. Chunks break at
 * punctuation or after `max` words.
 */
export const Captions: React.FC<{ t: Timeline; top: number; max?: number; skip?: string[] }> = ({ t, top, max = 4, skip = [] }) => {
  const frame = useCurrentFrame();
  const now = frame / FPS;
  const chunks: { w: string; s: number; e: number }[][] = [];
  for (const c of t.captions) {
    if (skip.includes(c.id)) continue;
    let cur: { w: string; s: number; e: number }[] = [];
    for (const w of c.words) {
      cur.push(w);
      if (cur.length >= max || /[.,:;?!]$/.test(w.w)) {
        chunks.push(cur);
        cur = [];
      }
    }
    if (cur.length) chunks.push(cur);
  }
  const chunk = chunks.find((c, i) => now >= c[0].s - 0.05 && now < (chunks[i + 1] && chunks[i + 1][0].s - c[c.length - 1].e < 0.6 ? chunks[i + 1][0].s - 0.05 : c[c.length - 1].e + 0.35));
  if (!chunk) return null;
  const pop = Math.min(1, (now - chunk[0].s + 0.05) / 0.12);
  return (
    <div style={{ position: 'absolute', top, left: 70, right: 70, display: 'flex', justifyContent: 'center', flexWrap: 'wrap', gap: '0 22px', transform: `scale(${0.92 + 0.08 * pop})` }}>
      {chunk.map((w, i) => {
        const on = now >= w.s - 0.02;
        return (
          <span
            key={i}
            style={{
              fontFamily: SANS,
              fontWeight: 700,
              fontSize: 76,
              lineHeight: 1.18,
              color: on && now < w.e + 0.08 ? C.green : C.text,
              opacity: on ? 1 : 0.55,
              textShadow: '0 6px 30px rgba(0,0,0,0.85), 0 2px 4px rgba(0,0,0,0.9)',
              letterSpacing: -0.5,
            }}
          >
            {w.w}
          </span>
        );
      })}
    </div>
  );
};

export const fmt = (n: number) => Math.round(n).toLocaleString('en-US');
