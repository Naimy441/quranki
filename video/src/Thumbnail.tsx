import React from 'react';
import { AbsoluteFill } from 'remotion';

import { ARABIC, Background, C, Logo, Phone, SANS, SERIF } from './ui';

/** YouTube thumbnail, 1280x720. Big claim on the left, the reader on iPhone on the right. */
export const Thumbnail: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <AbsoluteFill style={{ background: 'radial-gradient(700px 520px at 28% 52%, rgba(52,199,126,0.16), transparent 70%)' }} />

    <div style={{ position: 'absolute', left: 72, top: 58, display: 'flex', alignItems: 'center', gap: 16 }}>
      <Logo size={58} />
      <div style={{ fontFamily: SERIF, fontSize: 50, color: C.text, letterSpacing: -0.5 }}>Quranki</div>
    </div>

    <div style={{ position: 'absolute', left: 66, top: 150, width: 700 }}>
      <div style={{ fontFamily: SANS, fontSize: 40, fontWeight: 700, color: C.text, letterSpacing: 1 }}>
        LEARN JUST <span style={{ color: C.gold }}>500 WORDS</span>
      </div>
      <div
        style={{
          fontFamily: SERIF,
          fontSize: 300,
          lineHeight: 0.88,
          color: C.green,
          letterSpacing: -6,
          marginTop: 6,
          textShadow: '0 0 60px rgba(52,199,126,0.45)',
        }}
      >
        80%
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 84, lineHeight: 1, color: C.text, marginTop: 4 }}>
        of the Quran, <span style={{ fontStyle: 'italic', color: C.green }}>understood.</span>
      </div>
    </div>

    <Phone
      screens={[{ src: 'i-reader-peek', at: 0 }]}
      scale={0.74}
      style={{ left: 880, top: 70, transform: 'rotate(6deg)' }}
    />

    {/* A known word lifting its meaning, the core idea in one glance. */}
    <div
      style={{
        position: 'absolute',
        left: 760,
        top: 470,
        padding: '18px 30px 20px',
        borderRadius: 26,
        background: 'rgba(16,21,15,0.94)',
        border: '1.5px solid rgba(52,199,126,0.6)',
        boxShadow: '0 30px 80px -20px rgba(0,0,0,0.9), 0 0 50px -10px rgba(52,199,126,0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        transform: 'rotate(-4deg)',
      }}
    >
      <div style={{ fontFamily: ARABIC, fontSize: 72, lineHeight: 1.5, color: C.text, direction: 'rtl' }}>تَعْقِلُونَ</div>
      <div style={{ fontFamily: SANS, fontSize: 30, fontWeight: 600, color: C.green, marginTop: -6 }}>you may understand</div>
    </div>
  </AbsoluteFill>
);

// Yusuf 12:2, right to left, with word-by-word glosses.
const YUSUF = [
  { ar: 'إِنَّآ', en: 'Indeed, We' },
  { ar: 'أَنزَلْنَٰهُ', en: 'sent it down' },
  { ar: 'قُرْءَٰنًا', en: 'a Quran' },
  { ar: 'عَرَبِيًّا', en: 'in Arabic' },
  { ar: 'لَّعَلَّكُمْ', en: 'so that you' },
  { ar: 'تَعْقِلُونَ', en: 'may understand' },
];

/** Variant B: the emotional hook. An ayah read word by word, no translation needed. */
export const ThumbnailB: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <AbsoluteFill style={{ background: 'radial-gradient(900px 420px at 50% 40%, rgba(52,199,126,0.18), transparent 70%)' }} />
    <div style={{ position: 'absolute', top: 70, left: 0, right: 0, textAlign: 'center', fontFamily: SERIF, fontSize: 92, lineHeight: 1, color: C.text }}>
      Stop reading <span style={{ fontStyle: 'italic', color: C.gold }}>translations.</span>
    </div>
    <div style={{ position: 'absolute', top: 236, left: 0, right: 0, display: 'flex', flexDirection: 'row-reverse', justifyContent: 'center', gap: 26 }}>
      {YUSUF.map((w, i) => {
        const key = i === YUSUF.length - 1;
        return (
          <div key={w.ar} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
            <div
              style={{
                fontFamily: ARABIC,
                fontSize: 88,
                lineHeight: 1.65,
                color: key ? C.green : C.text,
                direction: 'rtl',
                textShadow: key ? '0 0 40px rgba(52,199,126,0.7)' : undefined,
              }}
            >
              {w.ar}
            </div>
            <div style={{ fontFamily: SANS, fontSize: 25, fontWeight: 600, color: key ? C.green : C.text2, marginTop: -4 }}>{w.en}</div>
          </div>
        );
      })}
    </div>
    <div style={{ position: 'absolute', bottom: 86, left: 0, right: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 24 }}>
      <Logo size={74} />
      <div style={{ fontFamily: SERIF, fontSize: 96, lineHeight: 1, color: C.text }}>
        Understand it <span style={{ fontStyle: 'italic', color: C.green }}>word by word.</span>
      </div>
    </div>
  </AbsoluteFill>
);

const TOP = [
  { ar: 'مِن', en: 'from, of', freq: 3226 },
  { ar: 'ٱللَّه', en: 'Allah', freq: 2699 },
  { ar: 'مَا', en: 'what; not', freq: 2565 },
  { ar: 'لَا', en: 'no, not', freq: 1738 },
  { ar: 'فِى', en: 'in', freq: 1701 },
];

/** Variant C: the surprising stat. Ten words make up a quarter of the Quran. */
export const ThumbnailC: React.FC = () => (
  <AbsoluteFill>
    <Background />
    <AbsoluteFill style={{ background: 'radial-gradient(640px 520px at 26% 50%, rgba(227,180,90,0.12), transparent 70%)' }} />
    <div style={{ position: 'absolute', left: 66, top: 60, width: 600 }}>
      <div style={{ fontFamily: SERIF, fontSize: 360, lineHeight: 0.82, color: C.gold, letterSpacing: -8, textShadow: '0 0 60px rgba(227,180,90,0.35)' }}>10</div>
      <div style={{ fontFamily: SANS, fontSize: 64, fontWeight: 800, color: C.text, lineHeight: 1.02, marginTop: 18, letterSpacing: -1 }}>
        WORDS ARE
        <br />
        <span style={{ color: C.green }}>25% OF THE</span>
        <br />
        <span style={{ color: C.green }}>QURAN</span>
      </div>
    </div>
    <div
      style={{
        position: 'absolute',
        right: 56,
        top: 108,
        width: 560,
        padding: '30px 34px',
        borderRadius: 30,
        background: 'rgba(16,21,15,0.92)',
        border: `1.5px solid ${C.border}`,
        boxShadow: '0 40px 100px -30px rgba(0,0,0,0.9)',
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}
    >
      {TOP.map((w, i) => (
        <div key={w.ar} style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
          <div style={{ width: 92, textAlign: 'right', fontFamily: ARABIC, fontSize: 50, lineHeight: 1.35, color: C.text, direction: 'rtl' }}>{w.ar}</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: SANS, fontSize: 22, fontWeight: 600, color: C.text2, marginBottom: 6 }}>{w.en}</div>
            <div
              style={{
                height: 22,
                width: `${(w.freq / TOP[0].freq) * 100}%`,
                borderRadius: 7,
                background: `linear-gradient(90deg, ${C.greenDark}, ${C.green})`,
                opacity: 1 - i * 0.08,
              }}
            />
          </div>
        </div>
      ))}
      <div style={{ fontFamily: SANS, fontSize: 24, fontWeight: 600, color: C.muted, textAlign: 'center', marginTop: 2 }}>+ 5 more</div>
    </div>
    <div style={{ position: 'absolute', right: 56, top: 26, width: 560, display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 14 }}>
      <Logo size={50} />
      <div style={{ fontFamily: SERIF, fontSize: 46, color: C.text }}>Quranki</div>
    </div>
  </AbsoluteFill>
);
