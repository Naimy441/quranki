import React from 'react';
import { AbsoluteFill } from 'remotion';

import { ARABIC, Background, C, Logo, SANS, SERIF } from '../ui';

const WORDS = [
  { ar: 'إِيَّاكَ', en: 'You alone' },
  { ar: 'نَعۡبُدُ', en: 'we worship' },
];

const Brand: React.FC = () => (
  <div style={{ position: 'absolute', left: 64, bottom: 48, display: 'flex', alignItems: 'center', gap: 14 }}>
    <Logo size={46} />
    <div style={{ fontFamily: SERIF, fontSize: 40, color: C.text2 }}>Quranki</div>
  </div>
);

const WordStack: React.FC<{ left: number; top: number; scale?: number }> = ({ left, top, scale = 1 }) => (
  <div style={{ position: 'absolute', left, top, display: 'flex', flexDirection: 'row-reverse', gap: 26, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
    {WORDS.map((w, i) => (
      <div
        key={w.ar}
        style={{
          padding: '6px 30px 22px',
          borderRadius: 30,
          background: 'rgba(16,21,15,0.95)',
          border: `2px solid ${i === 0 ? 'rgba(52,199,126,0.75)' : C.border}`,
          boxShadow: i === 0 ? '0 0 60px -10px rgba(52,199,126,0.6)' : '0 30px 60px -20px rgba(0,0,0,0.9)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transform: `rotate(${i === 0 ? -3 : 3}deg)`,
        }}
      >
        <div style={{ fontFamily: ARABIC, fontSize: 118, lineHeight: 1.55, color: C.text, direction: 'rtl' }}>{w.ar}</div>
        <div style={{ fontFamily: SANS, fontSize: 38, fontWeight: 700, color: C.green, marginTop: -14 }}>{w.en}</div>
      </div>
    ))}
  </div>
);

/** A: the stat. You have said it ninety thousand times. */
export const FatihaThumbnail: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <AbsoluteFill style={{ background: 'radial-gradient(640px 480px at 26% 46%, rgba(52,199,126,0.16), transparent 70%)' }} />
    <div style={{ position: 'absolute', left: 60, top: 110, width: 640 }}>
      <div style={{ fontFamily: SANS, fontSize: 40, fontWeight: 700, color: C.gold, letterSpacing: 2 }}>YOU&apos;VE SAID IT</div>
      <div style={{ fontFamily: SERIF, fontSize: 230, lineHeight: 0.92, color: C.green, letterSpacing: -5, textShadow: '0 0 60px rgba(52,199,126,0.45)' }}>90,000×</div>
      <div style={{ marginTop: 16, fontFamily: SERIF, fontSize: 82, lineHeight: 1, color: C.text }}>
        Know what it <span style={{ fontStyle: 'italic', color: C.green }}>means?</span>
      </div>
    </div>
    <WordStack left={700} top={330} scale={0.88} />
    <Brand />
  </AbsoluteFill>
);

/** B: the promise. Every word of Al-Fatiha, understood. */
export const FatihaThumbnailB: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <AbsoluteFill style={{ background: 'radial-gradient(700px 420px at 50% 40%, rgba(52,199,126,0.16), transparent 70%)' }} />
    <div style={{ position: 'absolute', left: 0, right: 0, top: 40, textAlign: 'center' }}>
      <div style={{ fontFamily: SERIF, fontSize: 120, lineHeight: 1, color: C.text }}>
        Al-Fatiha, <span style={{ fontStyle: 'italic', color: C.green }}>every word</span>
      </div>
    </div>
    <WordStack left={280} top={190} scale={1.25} />
    <div style={{ position: 'absolute', right: 64, bottom: 52, fontFamily: SANS, fontSize: 40, fontWeight: 700, color: C.gold }}>29 WORDS - 9 MIN</div>
    <Brand />
  </AbsoluteFill>
);
