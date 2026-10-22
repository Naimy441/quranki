import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame } from 'remotion';

import timeline from '../data/clips/topten-timeline.json';
import stats from '../data/quran-stats.json';
import { ARABIC, Background, C, EASE_IO, Logo, SANS, SERIF, enter, prog } from '../ui';
import { Captions, ClipAudio, FPS, fmt, useTimeline, type Timeline } from './common';
import { TOP_TEN } from './tracks';

const T = timeline as Timeline;
export const TOPTEN_FRAMES = Math.ceil(T.duration * FPS);

/** Short: the ten most frequent words, counted down, filling a bar to 25% of the Quran. */
export const TopTenShort: React.FC = () => {
  const frame = useCurrentFrame();
  const tl = useTimeline(T);
  const countdown = tl.at('w10');
  const sum = tl.at('sum');
  const cta = tl.at('cta');
  const current = [...TOP_TEN].reverse().find((w) => frame >= tl.at(`w${w.rank}`) - 4 && frame < sum);
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Background />
      {frame < countdown + 10 && <Hook frame={frame} out={countdown - 8} hook2={tl.say('hook2')} />}
      {frame >= countdown - 6 && frame < cta + 10 && <Header frame={frame - countdown} out={cta - countdown - 10} />}
      {current && <WordCard key={current.rank} w={current} frame={frame - tl.at(`w${current.rank}`)} say={tl.say(`w${current.rank}`) - tl.at(`w${current.rank}`)} out={current.rank === 1 ? sum - tl.at('w1') - 8 : undefined} />}
      {frame >= countdown - 6 && frame < cta + 10 && <CoverageBar frame={frame} tl={tl} sum={sum} out={cta - 10} />}
      {frame >= sum - 6 && frame < cta + 10 && <OneInFour frame={frame - sum} out={cta - sum - 10} />}
      {frame >= cta - 6 && <Cta frame={frame - cta} />}
      <Captions t={T} top={1330} />
      <ClipAudio t={T} />
    </AbsoluteFill>
  );
};

const Hook: React.FC<{ frame: number; out: number; hook2: number }> = ({ frame, out, hook2 }) => {
  const pct = interpolate(prog(frame, 4, 40), [0, 1], [0, 25]);
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 300 }}>
      <div style={{ fontFamily: SANS, fontSize: 40, fontWeight: 700, letterSpacing: 4, color: C.gold, ...enter(frame, 0, { out, dur: 12 }) }}>JUST 10 WORDS</div>
      <div style={{ fontFamily: SERIF, fontSize: 380, lineHeight: 0.9, color: C.green, textShadow: '0 0 80px rgba(52,199,126,0.45)', fontVariantNumeric: 'tabular-nums', ...enter(frame, 0, { out, dur: 12 }) }}>
        {Math.round(pct)}%
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 92, color: C.text, ...enter(frame, 8, { out, dur: 14 }) }}>
        of the <span style={{ fontStyle: 'italic', color: C.green }}>entire</span> Quran
      </div>
      <div style={{ marginTop: 80, display: 'flex', alignItems: 'center', gap: 26, ...enter(frame, hook2, { out, dur: 14 }) }}>
        <div style={{ fontFamily: SERIF, fontSize: 200, color: C.gold, lineHeight: 1 }}>#1</div>
        <div style={{ fontFamily: SANS, fontSize: 52, fontWeight: 700, color: C.text, lineHeight: 1.15 }}>
          is not the word
          <br />
          you&apos;d guess
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Header: React.FC<{ frame: number; out: number }> = ({ frame, out }) => (
  <div style={{ position: 'absolute', top: 150, left: 0, right: 0, display: 'flex', justifyContent: 'center', ...enter(frame, 0, { out, y: 12 }) }}>
    <div style={{ padding: '14px 30px', borderRadius: 999, background: 'rgba(20,26,22,0.85)', border: `1.5px solid ${C.border}`, fontFamily: SANS, fontSize: 34, fontWeight: 600, color: C.text }}>
      The <span style={{ color: C.green }}>10 most common</span> words in the Quran
    </div>
  </div>
);

const WordCard: React.FC<{ w: (typeof TOP_TEN)[number]; frame: number; say: number; out?: number }> = ({ w, frame, say, out }) => {
  const pop = spring({ frame, fps: FPS, config: { damping: 13, mass: 0.7 } });
  const exit = out === undefined ? 0 : prog(frame, out, 10, EASE_IO);
  const count = interpolate(prog(frame, say, 22), [0, 1], [0, w.freq]);
  const top = w.rank <= 2;
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 290, opacity: 1 - exit }}>
      <div style={{ fontFamily: SERIF, fontSize: 150, lineHeight: 1, color: top ? C.gold : C.muted, transform: `scale(${0.7 + 0.3 * pop})`, opacity: pop }}>#{w.rank}</div>
      <div
        style={{
          fontFamily: ARABIC,
          fontSize: 300,
          lineHeight: 1.45,
          color: C.text,
          direction: 'rtl',
          transform: `scale(${0.6 + 0.4 * pop})`,
          opacity: Math.min(1, pop * 1.5),
          textShadow: top ? '0 0 70px rgba(227,180,90,0.35)' : '0 0 60px rgba(52,199,126,0.3)',
        }}
      >
        {w.ar}
      </div>
      <div style={{ marginTop: -20, fontFamily: SANS, fontSize: 40, color: C.text2, ...enter(frame, 6, { dur: 12 }) }}>{w.tl}</div>
      <div style={{ marginTop: 6, fontFamily: SERIF, fontSize: 104, color: C.green, fontStyle: 'italic', ...enter(frame, say - 4, { dur: 12 }) }}>{w.gloss}</div>
      <div style={{ marginTop: 10, fontFamily: SANS, fontSize: 44, fontWeight: 600, color: C.text, fontVariantNumeric: 'tabular-nums', ...enter(frame, say, { dur: 12 }) }}>
        {fmt(count)} <span style={{ color: C.text2, fontWeight: 500 }}>times</span>
      </div>
    </AbsoluteFill>
  );
};

/** Running share of the Quran covered by the words shown so far. */
const CoverageBar: React.FC<{ frame: number; tl: ReturnType<typeof useTimeline>; sum: number; out: number }> = ({ frame, tl, sum, out }) => {
  let covered = 0;
  for (const w of TOP_TEN) {
    const at = tl.say(`w${w.rank}`);
    covered += w.freq * prog(frame, at, 20);
  }
  const pct = (covered / stats.QURAN_WORD_COUNT) * 100;
  const o = prog(frame, out, 12, EASE_IO);
  const done = prog(frame, sum, 20);
  return (
    <div style={{ position: 'absolute', top: 1170, left: 110, right: 110, opacity: Math.min(1, prog(frame, tl.at('w10') - 6, 12)) * (1 - o) }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: SANS, fontSize: 30, color: C.text2, marginBottom: 14 }}>
        <span>Share of the Quran</span>
        <span style={{ color: done > 0.5 ? C.green : C.text, fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>{pct.toFixed(1)}%</span>
      </div>
      <div style={{ height: 30, borderRadius: 15, background: C.element, border: `1px solid ${C.border}`, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${pct * 4}%`, borderRadius: 15, background: `linear-gradient(90deg, ${C.greenDark}, ${C.green})`, boxShadow: '0 0 30px rgba(52,199,126,0.6)' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: SANS, fontSize: 24, color: C.muted, marginTop: 10 }}>
        <span>0%</span>
        <span>25%</span>
      </div>
    </div>
  );
};

/** Four word slots, one lit: one in every four words. */
const OneInFour: React.FC<{ frame: number; out: number }> = ({ frame, out }) => (
  <AbsoluteFill style={{ alignItems: 'center', paddingTop: 330 }}>
    <div style={{ fontFamily: SERIF, fontSize: 250, lineHeight: 1, color: C.text, ...enter(frame, 4, { out }) }}>
      1 <span style={{ fontStyle: 'italic', color: C.text2, fontSize: 150 }}>in</span> 4
    </div>
    <div style={{ marginTop: 20, fontFamily: SANS, fontSize: 48, fontWeight: 600, color: C.text2, ...enter(frame, 10, { out }) }}>words of the Quran</div>
    <div style={{ marginTop: 80, display: 'flex', gap: 30 }}>
      {[0, 1, 2, 3].map((i) => {
        const lit = i === 3;
        return (
          <div
            key={i}
            style={{
              width: 170,
              height: 170,
              borderRadius: 32,
              background: lit ? 'rgba(52,199,126,0.18)' : C.element,
              border: `3px solid ${lit ? C.green : C.border}`,
              boxShadow: lit ? '0 0 50px rgba(52,199,126,0.5)' : undefined,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontFamily: SANS,
              fontSize: 70,
              fontWeight: 700,
              color: lit ? C.green : C.muted,
              ...enter(frame, 16 + i * 5, { out }),
            }}
          >
            {lit ? '✓' : ''}
          </div>
        );
      })}
    </div>
  </AbsoluteFill>
);

export const Cta: React.FC<{ frame: number; line?: string }> = ({ frame, line = 'Learn the Quran’s words in the order it uses them' }) => {
  const pop = spring({ frame, fps: FPS, config: { damping: 14, mass: 0.8 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 360 }}>
      <div style={{ transform: `scale(${0.6 + pop * 0.4})`, opacity: Math.min(1, pop * 1.4), filter: `drop-shadow(0 0 70px rgba(52,199,126,${0.5 * pop}))` }}>
        <Logo size={260} />
      </div>
      <div style={{ marginTop: 40, fontFamily: SERIF, fontSize: 170, color: C.text, lineHeight: 1, ...enter(frame, 8) }}>Quranki</div>
      <div style={{ marginTop: 30, width: 860, textAlign: 'center', fontFamily: SERIF, fontSize: 62, lineHeight: 1.15, color: C.text2, ...enter(frame, 16) }}>{line}</div>
      <div style={{ marginTop: 50, padding: '18px 40px', borderRadius: 999, background: C.green, color: '#04140b', fontFamily: SANS, fontWeight: 700, fontSize: 48, ...enter(frame, 26) }}>quranki.org</div>
      <div style={{ marginTop: 26, fontFamily: SANS, fontSize: 34, color: C.muted, ...enter(frame, 32) }}>Free on web, iPhone, and Android</div>
    </AbsoluteFill>
  );
};
