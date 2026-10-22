import React from 'react';
import { AbsoluteFill, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { Background, C, Chapter, Logo, Phone, SANS, SERIF, enter, prog } from '../ui';

const BEATS = [
  { at: 0, main: [{ src: 'i-home', at: 0 }], back: [{ src: 'i-quran', at: 0 }], title: 'Same account, on iPhone', body: 'Picks up right where you left off, synced with the web.' },
  {
    at: 200,
    main: [
      { src: 'i-session-front', at: 200 },
      { src: 'i-session-back', at: 275 },
    ],
    back: [{ src: 'i-session2-back', at: 200 }],
    title: 'The same reviews',
    body: 'Every word shown inside its ayah, glossed word by word.',
  },
  {
    at: 440,
    main: [
      { src: 'i-reader', at: 440 },
      { src: 'i-reader-peek', at: 520 },
      { src: 'i-word-detail', at: 600 },
    ],
    back: [{ src: 'i-quran', at: 440 }],
    title: 'The same reader',
    body: 'Tap a known word for a hint. Long press for its grammar and root.',
  },
  {
    at: 690,
    main: [
      { src: 'i-hifz', at: 690 },
      { src: 'i-hifz-back', at: 760 },
    ],
    back: [{ src: 'i-saved', at: 690 }],
    title: 'Your ruku revision',
    body: 'Recite from the opening words, then check yourself.',
  },
  {
    at: 850,
    main: [
      { src: 'i-progress', at: 850 },
      { src: 'i-progress2', at: 930 },
    ],
    back: [{ src: 'i-home', at: 850 }],
    title: 'Every statistic, in your pocket',
    body: 'Coverage, streaks, and study time, always up to date.',
  },
];

export const MobileScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const rise = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const riseBack = spring({ frame: frame - 16, fps, config: { damping: 200 } });
  const float = Math.sin(frame / 45) * 6;
  // Flatten beats into one continuous screen list per phone so screens crossfade between beats.
  const main = BEATS.flatMap((b) => b.main);
  const back = BEATS.flatMap((b) => b.back);
  return (
    <AbsoluteFill>
      <Background />
      <Chapter index="08" label="On iPhone" />
      <Phone
        screens={back}
        scale={0.86}
        style={{ left: 250, top: 175 + (1 - riseBack) * 300 - float * 0.6, opacity: 0.55 * riseBack, filter: 'saturate(0.8) brightness(0.8)', transform: 'rotate(-6deg)' }}
      />
      <Phone screens={main} style={{ left: 520, top: 118 + (1 - rise) * 300 + float, opacity: rise }} />
      {BEATS.map((b, i) => {
        const next = BEATS[i + 1]?.at ?? 1100;
        return (
          <div key={b.title} style={{ position: 'absolute', left: 1060, top: 420, width: 700, ...enter(frame, b.at + 18, { out: next - 10, dur: 26 }) }}>
            <div style={{ fontFamily: SANS, fontSize: 18, letterSpacing: 3, color: C.green, fontWeight: 600, textTransform: 'uppercase' }}>
              {String(i + 1).padStart(2, '0')} / {String(BEATS.length).padStart(2, '0')}
            </div>
            <div style={{ marginTop: 14, fontFamily: SERIF, fontSize: 76, color: C.text, lineHeight: 1.02 }}>{b.title}</div>
            <div style={{ marginTop: 18, fontFamily: SANS, fontSize: 26, color: C.text2, lineHeight: 1.45 }}>{b.body}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

export const OutroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 4, fps, config: { damping: 14, mass: 0.8 } });
  const Badge = ({ top, bottom, at }: { top: string; bottom: string; at: number }) => (
    <div style={{ padding: '14px 28px', borderRadius: 16, border: `1px solid ${C.border}`, background: 'rgba(20,26,22,0.9)', textAlign: 'left', ...enter(frame, at) }}>
      <div style={{ fontFamily: SANS, fontSize: 15, color: C.text2 }}>{top}</div>
      <div style={{ fontFamily: SANS, fontSize: 26, color: C.text, fontWeight: 600, marginTop: 2 }}>{bottom}</div>
    </div>
  );
  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ transform: `scale(${0.6 + pop * 0.4})`, opacity: Math.min(1, pop * 1.4), filter: `drop-shadow(0 0 60px rgba(52,199,126,${0.45 * pop}))` }}>
          <Logo size={120} />
        </div>
        <div style={{ marginTop: 34, fontFamily: SERIF, fontSize: 92, color: C.text, textAlign: 'center', lineHeight: 1.05 }}>
          <span style={{ ...enter(frame, 55), display: 'inline-block' }}>Learn the words.&nbsp;</span>
          <span style={{ ...enter(frame, 95), display: 'inline-block' }}>Read the Quran.</span>
          <br />
          <span style={{ ...enter(frame, 140), display: 'inline-block', fontStyle: 'italic', color: C.green }}>Understand it.</span>
        </div>
        <div style={{ marginTop: 56, display: 'flex', gap: 20, alignItems: 'center' }}>
          <div
            style={{
              padding: '18px 36px',
              borderRadius: 999,
              background: C.green,
              color: '#06140d',
              fontFamily: SANS,
              fontSize: 30,
              fontWeight: 700,
              boxShadow: '0 0 60px -10px rgba(52,199,126,0.7)',
              ...enter(frame, 190),
            }}
          >
            Start free at quranki.org
          </div>
          <Badge top="Download on the" bottom="App Store" at={260} />
          <Badge top="Get it on" bottom="Google Play" at={275} />
        </div>
      </AbsoluteFill>
      <AbsoluteFill style={{ background: C.bg, opacity: prog(frame, 390, 30) }} />
    </AbsoluteFill>
  );
};
