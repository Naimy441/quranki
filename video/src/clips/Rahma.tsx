import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame } from 'remotion';

import timeline from '../data/clips/rahma-timeline.json';
import { ARABIC, Background, C, EASE_IO, SANS, SERIF, enter, prog } from '../ui';
import { Captions, ClipAudio, FPS, fmt, useTimeline, type Timeline } from './common';
import { Cta } from './TopTen';
import { RAHMA_WORDS } from './tracks';

const T = timeline as Timeline;
export const RAHMA_FRAMES = Math.ceil(T.duration * FPS);

const LETTERS = ['ر', 'ح', 'م'];
// Al Imran 3:6, the first five words, with where Husary starts each one.
const AYAH = [
  { ar: 'هُوَ', en: 'He', at: 0.84 },
  { ar: 'ٱلَّذِى', en: 'the One who', at: 1.41 },
  { ar: 'يُصَوِّرُكُمۡ', en: 'forms you', at: 2.52 },
  { ar: 'فِى', en: 'in', at: 4.93 },
  { ar: 'ٱلۡأَرۡحَامِ', en: 'the wombs', at: 5.72 },
];
const BISMILLAH = [
  { ar: 'بِسۡمِ', en: 'In the name' },
  { ar: 'ٱللَّهِ', en: 'of Allah' },
  { ar: 'ٱلرَّحۡمَـٰنِ', en: 'the Entirely Merciful', root: true },
  { ar: 'ٱلرَّحِيمِ', en: 'the Especially Merciful', root: true },
];

/** Short: womb and mercy come from one root, ر ح م. */
export const RahmaShort: React.FC = () => {
  const frame = useCurrentFrame();
  const tl = useTimeline(T);
  const letters = tl.at('letters');
  const ayah = tl.at('ayah');
  const bism = tl.at('bismillah');
  const cta = tl.at('cta');
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Background />
      {frame < letters + 8 && <Hook frame={frame} out={letters - 8} />}
      {frame >= letters - 6 && frame < ayah + 8 && <Root frame={frame} tl={tl} out={ayah - 8} />}
      {frame >= ayah - 6 && frame < bism + 8 && <Ayah frame={frame - ayah} tr={tl.say('ayahtr') - ayah} out={bism - ayah - 8} />}
      {frame >= bism - 6 && frame < cta + 8 && <Bismillah frame={frame - bism} out={cta - bism - 8} />}
      {frame >= cta - 6 && <Cta frame={frame - cta} line="Learn the Quran’s words, root by root" />}
      <Captions t={T} top={1500} skip={['letters']} />
      <ClipAudio t={T} />
    </AbsoluteFill>
  );
};

/** Womb and mercy side by side, then the shared letters light up. */
const Hook: React.FC<{ frame: number; out: number }> = ({ frame, out }) => {
  const lit = prog(frame, 70, 20);
  const Card = ({ ar, en, at }: { ar: string; en: string; at: number }) => (
    <div
      style={{
        width: 820,
        padding: '30px 0 40px',
        borderRadius: 40,
        background: 'rgba(16,21,15,0.92)',
        border: `2px solid ${lit > 0.5 ? 'rgba(52,199,126,0.6)' : C.border}`,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        ...enter(frame, at, { out, dur: 14 }),
      }}
    >
      <Highlighted text={ar} lit={lit} size={190} />
      <div style={{ fontFamily: SERIF, fontSize: 86, color: C.text, fontStyle: 'italic', marginTop: -10 }}>{en}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 210, gap: 40 }}>
      <Card ar="أَرْحَام" en="wombs" at={0} />
      <div style={{ fontFamily: SERIF, fontSize: 90, color: C.gold, lineHeight: 1, ...enter(frame, 10, { out }) }}>=</div>
      <Card ar="رَحْمَة" en="mercy" at={6} />
    </AbsoluteFill>
  );
};

/** Colors ر ح م inside a word. Diacritics stay with the letter they follow. */
const Highlighted: React.FC<{ text: string; lit: number; size: number }> = ({ text, lit, size }) => {
  const parts: { s: string; root: boolean }[] = [];
  for (const ch of text) {
    const isMark = /[ً-ٰٟۖ-ۭ]/.test(ch);
    if (isMark && parts.length) parts[parts.length - 1].s += ch;
    else parts.push({ s: ch, root: LETTERS.includes(ch) });
  }
  const mix = (a: number[], b: number[]) => `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * lit)).join(',')})`;
  return (
    <div style={{ fontFamily: ARABIC, fontSize: size, lineHeight: 1.5, direction: 'rtl', color: C.text }}>
      {parts.map((p, i) => (
        <span key={i} style={p.root ? { color: mix([241, 245, 242], [52, 199, 126]), textShadow: `0 0 ${40 * lit}px rgba(52,199,126,${0.7 * lit})` } : undefined}>
          {p.s}
        </span>
      ))}
    </div>
  );
};

/** The three letters, then the words they grow into. */
const Root: React.FC<{ frame: number; tl: ReturnType<typeof useTimeline>; out: number }> = ({ frame, tl, out }) => {
  const start = tl.at('letters');
  const words = T.captions.find((c) => c.id === 'letters')!.words;
  const count = tl.say('count');
  const firstWord = tl.at('rahma');
  const lift = prog(frame, count - 4, 24, EASE_IO);
  const n = interpolate(prog(frame, count + 30, 40), [0, 1], [0, 339]);
  const active = [...RAHMA_WORDS].reverse().find((w) => frame >= tl.at(w.id) - 3);
  return (
    <AbsoluteFill style={{ alignItems: 'center' }}>
      {/* Root letters: big and centred, then lifted to the top as the stem of the tree. */}
      <div
        style={{
          position: 'absolute',
          top: interpolate(lift, [0, 1], [480, 150]),
          display: 'flex',
          flexDirection: 'row-reverse',
          gap: interpolate(lift, [0, 1], [40, 30]),
          ...enter(frame, start - 4, { out }),
        }}
      >
        {LETTERS.map((l, i) => {
          const at = Math.round(words[i] ? words[i].s * FPS : start / FPS + i * 0.6);
          const p = spring({ frame: frame - at + 2, fps: FPS, config: { damping: 12, mass: 0.6 } });
          const size = interpolate(lift, [0, 1], [230, 150]);
          return (
            <div
              key={l}
              style={{
                width: size * 1.1,
                height: size * 1.1,
                borderRadius: size * 0.22,
                background: 'rgba(52,199,126,0.12)',
                border: `3px solid ${C.green}`,
                boxShadow: '0 0 60px rgba(52,199,126,0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: ARABIC,
                fontSize: size,
                lineHeight: 1,
                paddingBottom: size * 0.18,
                boxSizing: 'border-box',
                color: C.text,
                transform: `scale(${p})`,
                opacity: Math.min(1, p * 1.5),
              }}
            >
              {l}
            </div>
          );
        })}
      </div>
      <div style={{ position: 'absolute', top: 360, fontFamily: SANS, fontSize: 46, fontWeight: 600, color: C.text2, ...enter(frame, count + 24, { out }) }}>
        <span style={{ fontFamily: SERIF, fontSize: 120, color: C.green, fontWeight: 400, fontVariantNumeric: 'tabular-nums' }}>{fmt(n)}</span> times in the Quran
      </div>

      {/* Branches: one row per word; the one being read is large. */}
      <div style={{ position: 'absolute', top: 560, left: 90, right: 90, display: 'flex', flexDirection: 'column', gap: 26 }}>
        {RAHMA_WORDS.map((w, i) => {
          const at = tl.at(w.id);
          const on = active?.id === w.id;
          const seen = frame >= at - 3;
          const p = prog(frame, i === 0 ? firstWord - 8 : at - 6, 14);
          const big = on ? prog(frame, at - 3, 10) : 0;
          return (
            <div
              key={w.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: `${14 + 16 * big}px 40px`,
                borderRadius: 30,
                background: on ? 'rgba(52,199,126,0.14)' : 'rgba(16,21,15,0.9)',
                border: `2px solid ${on ? C.green : C.border}`,
                opacity: seen ? p * (1 - prog(frame, out, 10)) : 0,
                transform: `translateY(${(1 - p) * 20}px)`,
              }}
            >
              <div>
                <div style={{ fontFamily: SERIF, fontSize: 56 + 16 * big, color: on ? C.green : C.text, fontStyle: 'italic', lineHeight: 1.1 }}>{w.gloss}</div>
                <div style={{ fontFamily: SANS, fontSize: 30, color: C.text2, marginTop: 4 }}>
                  {w.tl} - {w.freq} times
                </div>
              </div>
              <Highlighted text={w.ar} lit={1} size={96 + 30 * big} />
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

const Ayah: React.FC<{ frame: number; tr: number; out: number }> = ({ frame, tr, out }) => {
  const t = frame / FPS;
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 300 }}>
      <div style={{ fontFamily: SANS, fontSize: 32, letterSpacing: 4, color: C.green, fontWeight: 700, ...enter(frame, 0, { out }) }}>SURAH AL IMRAN 3:6</div>
      <div style={{ marginTop: 50, width: 940, display: 'flex', flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: '20px 40px' }}>
        {AYAH.map((w, i) => {
          const on = t >= w.at && (i === AYAH.length - 1 || t < AYAH[i + 1].at);
          const key = i === AYAH.length - 1;
          const said = t >= w.at;
          return (
            <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...enter(frame, i * 3, { out }) }}>
              <div style={{ fontFamily: ARABIC, fontSize: 140, lineHeight: 1.55, direction: 'rtl', color: key && said ? C.green : on ? C.text : said ? C.text : C.muted, textShadow: key && said ? '0 0 50px rgba(52,199,126,0.6)' : undefined }}>
                {w.ar}
              </div>
              <div style={{ marginTop: -14, fontFamily: SANS, fontSize: 38, fontWeight: 600, color: key ? C.green : C.text2, opacity: said ? 1 : 0 }}>{w.en}</div>
            </div>
          );
        })}
      </div>
      <div style={{ marginTop: 60, width: 900, textAlign: 'center', fontFamily: SERIF, fontSize: 70, lineHeight: 1.2, color: C.text, fontStyle: 'italic', ...enter(frame, tr - 6, { out }) }}>
        “It is He who forms you in the <span style={{ color: C.green }}>wombs</span> however He wills.”
      </div>
      <div style={{ marginTop: 20, fontFamily: SANS, fontSize: 28, color: C.muted, ...enter(frame, tr, { out }) }}>Sahih International</div>
    </AbsoluteFill>
  );
};

const Bismillah: React.FC<{ frame: number; out: number }> = ({ frame, out }) => (
  <AbsoluteFill style={{ alignItems: 'center', paddingTop: 330 }}>
    <div style={{ width: 960, display: 'flex', flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: '10px 44px' }}>
      {BISMILLAH.map((w, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...enter(frame, i * 6, { out }) }}>
          <Highlighted text={w.ar} lit={w.root ? prog(frame, 40 + i * 10, 16) : 0} size={150} />
          <div style={{ marginTop: -16, fontFamily: SANS, fontSize: 34, fontWeight: 600, color: w.root ? C.green : C.text2, textAlign: 'center', width: 400 }}>{w.en}</div>
        </div>
      ))}
    </div>
    <div style={{ marginTop: 70, display: 'flex', alignItems: 'center', gap: 30, ...enter(frame, 70, { out }) }}>
      <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: 10 }}>
        {LETTERS.map((l) => (
          <div key={l} style={{ width: 96, height: 96, borderRadius: 22, border: `2.5px solid ${C.green}`, background: 'rgba(52,199,126,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: ARABIC, fontSize: 80, lineHeight: 1, paddingBottom: 14, boxSizing: 'border-box', color: C.text }}>
            {l}
          </div>
        ))}
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 150, color: C.gold, lineHeight: 1 }}>×2</div>
    </div>
  </AbsoluteFill>
);
