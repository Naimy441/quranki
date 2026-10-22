import React from 'react';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import stats from '../data/quran-stats.json';
import topWords from '../data/top-words.json';
import { ARABIC, Background, C, EASE_IO, Logo, SANS, SERIF, enter, prog } from '../ui';

// Yusuf 12:2, right to left, with word-by-word glosses.
const AYAH: { ar: string; en: string }[] = [
  { ar: 'إِنَّآ', en: 'Indeed, We' },
  { ar: 'أَنزَلْنَٰهُ', en: 'sent it down' },
  { ar: 'قُرْءَٰنًا', en: 'a Quran' },
  { ar: 'عَرَبِيًّا', en: 'in Arabic' },
  { ar: 'لَّعَلَّكُمْ', en: 'so that you' },
  { ar: 'تَعْقِلُونَ', en: 'may understand' },
];

export const OpenScene: React.FC = () => {
  const frame = useCurrentFrame();
  const glossStart = 335;
  return (
    <AbsoluteFill>
      <Background glow={prog(frame, 0, 60)} />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ display: 'flex', flexDirection: 'row-reverse', gap: 46, alignItems: 'flex-start' }}>
          {AYAH.map((w, i) => {
            const a = 40 + i * 20;
            const g = glossStart + i * 22;
            const isKey = i === AYAH.length - 1;
            const glow = isKey ? prog(frame, 450, 30) : 0;
            return (
              <div key={w.ar} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 22 }}>
                <div
                  style={{
                    fontFamily: ARABIC,
                    fontSize: 104,
                    lineHeight: 1.6,
                    color: isKey ? interpolateColor(glow) : C.text,
                    textShadow: glow > 0 ? `0 0 ${40 * glow}px rgba(52,199,126,${0.6 * glow})` : undefined,
                    direction: 'rtl',
                    ...enter(frame, a, { dur: 34, y: 30 }),
                  }}
                >
                  {w.ar}
                </div>
                <div style={{ fontFamily: SANS, fontSize: 25, fontWeight: 500, color: isKey ? C.green : C.text2, height: 34, ...enter(frame, g, { dur: 22, y: 14 }) }}>{w.en}</div>
              </div>
            );
          })}
        </div>
        <div style={{ marginTop: 70, fontFamily: SERIF, fontSize: 40, color: C.text2, fontStyle: 'italic', textAlign: 'center', ...enter(frame, 470, { dur: 30 }) }}>
          “Indeed, We sent it down as an Arabic Quran so that you may understand.”
        </div>
        <div style={{ marginTop: 18, fontFamily: SANS, fontSize: 18, letterSpacing: 3, color: C.muted, textTransform: 'uppercase', ...enter(frame, 490, { dur: 30 }) }}>
          Surah Yusuf 12:2
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

function interpolateColor(p: number): string {
  const a = [241, 245, 242];
  const b = [52, 199, 126];
  return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * p)).join(',')})`;
}

export const TitleScene: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame: frame - 4, fps, config: { damping: 14, mass: 0.8 } });
  return (
    <AbsoluteFill>
      <Background />
      <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'column' }}>
        <div style={{ transform: `scale(${0.6 + pop * 0.4})`, opacity: Math.min(1, pop * 1.4), filter: `drop-shadow(0 0 60px rgba(52,199,126,${0.45 * pop}))` }}>
          <Logo size={150} />
        </div>
        <div style={{ marginTop: 34, fontFamily: SERIF, fontSize: 150, color: C.text, lineHeight: 1, letterSpacing: -2, ...enter(frame, 14, { dur: 30, y: 30 }) }}>Quranki</div>
        <div style={{ marginTop: 26, fontFamily: SERIF, fontSize: 56, color: C.text, ...enter(frame, 40, { dur: 30 }) }}>
          Understand the Quran, <span style={{ fontStyle: 'italic', color: C.green }}>word by word.</span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const fmt = (n: number) => Math.round(n).toLocaleString('en-US');

export const InsightScene: React.FC = () => {
  const frame = useCurrentFrame();
  // Phase A: counters. Phase B: top ten bars. Phase C: coverage curve.
  const aOut = 295;
  const bAt = 310;
  const bOut = 500;
  const cAt = 515;
  return (
    <AbsoluteFill>
      <Background />
      {frame < aOut + 30 && <Counters frame={frame} out={aOut} />}
      {frame >= bAt - 5 && frame < bOut + 30 && <TopTen frame={frame - bAt} out={bOut - bAt} />}
      {frame >= cAt - 5 && <Curve frame={frame - cAt} />}
    </AbsoluteFill>
  );
};

const Counters: React.FC<{ frame: number; out: number }> = ({ frame, out }) => {
  const words = interpolate(prog(frame, 20, 70), [0, 1], [0, stats.QURAN_WORD_COUNT]);
  const lemmas = interpolate(prog(frame, 210, 60), [0, 1], [0, stats.UNIQUE_LEMMAS]);
  const Block = ({ value, label, sub, at }: { value: string; label: string; sub: string; at: number }) => (
    <div style={{ width: 640, ...enter(frame, at, { out, dur: 26 }) }}>
      <div style={{ fontFamily: SERIF, fontSize: 190, color: C.text, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>{value}</div>
      <div style={{ marginTop: 18, fontFamily: SANS, fontSize: 32, color: C.text, fontWeight: 600 }}>{label}</div>
      <div style={{ marginTop: 8, fontFamily: SANS, fontSize: 22, color: C.text2 }}>{sub}</div>
    </div>
  );
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 60 }}>
      <Block value={fmt(words)} label="words in the Quran" sub="Every word, counted from the Quranic Arabic Corpus" at={14} />
      <div style={{ width: 1, height: 260, background: C.border, ...enter(frame, 190, { out }) }} />
      <Block value={fmt(lemmas)} label="unique dictionary forms" sub="Lemmas: the base form behind every spelling" at={200} />
    </AbsoluteFill>
  );
};

const TopTen: React.FC<{ frame: number; out: number }> = ({ frame, out }) => {
  const max = topWords[0].freq;
  const total = topWords.reduce((s, w) => s + w.freq, 0);
  const pct = interpolate(prog(frame, 150, 60), [0, 1], [0, stats.cov['10']]);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 110 }}>
      <div style={{ width: 860 }}>
        <div style={{ fontFamily: SANS, fontSize: 20, letterSpacing: 3, color: C.green, textTransform: 'uppercase', fontWeight: 600, ...enter(frame, 0, { out }) }}>
          The ten most frequent words
        </div>
        <div style={{ marginTop: 26, display: 'flex', flexDirection: 'column', gap: 12 }}>
          {topWords.map((w, i) => {
            const p = prog(frame, 14 + i * 7, 40);
            const o = prog(frame, out, 16, EASE_IO);
            return (
              <div key={w.ar} style={{ display: 'flex', alignItems: 'center', gap: 20, opacity: Math.min(1, p * 2) * (1 - o) }}>
                <div style={{ width: 110, textAlign: 'right', fontFamily: ARABIC, fontSize: 40, color: C.text, direction: 'rtl', lineHeight: 1.3 }}>{w.ar}</div>
                <div style={{ width: 150, fontFamily: SANS, fontSize: 19, color: C.text2 }}>{w.gloss}</div>
                <div style={{ flex: 1, height: 26, position: 'relative' }}>
                  <div
                    style={{
                      height: 26,
                      width: `${(w.freq / max) * 100 * p}%`,
                      borderRadius: 7,
                      background: `linear-gradient(90deg, ${C.greenDark}, ${C.green})`,
                      boxShadow: '0 0 24px -6px rgba(52,199,126,0.6)',
                    }}
                  />
                </div>
                <div style={{ width: 70, fontFamily: SANS, fontSize: 18, color: C.text2, fontVariantNumeric: 'tabular-nums' }}>{fmt(w.freq * p)}</div>
              </div>
            );
          })}
        </div>
      </div>
      <div style={{ width: 520, ...enter(frame, 140, { out, dur: 30 }) }}>
        <div style={{ fontFamily: SERIF, fontSize: 230, lineHeight: 0.9, color: C.green, fontVariantNumeric: 'tabular-nums' }}>{Math.round(pct)}%</div>
        <div style={{ marginTop: 24, fontFamily: SERIF, fontSize: 50, color: C.text, lineHeight: 1.1 }}>
          of the Quran is <span style={{ fontStyle: 'italic' }}>just these ten words.</span>
        </div>
        <div style={{ marginTop: 18, fontFamily: SANS, fontSize: 20, color: C.text2 }}>{fmt(total)} occurrences out of {fmt(stats.QURAN_WORD_COUNT)}</div>
      </div>
    </AbsoluteFill>
  );
};

const Curve: React.FC<{ frame: number }> = ({ frame }) => {
  const W = 1180;
  const H = 560;
  const maxX = 2000;
  // Square-root x axis so the steep start and the long tail both read.
  const sx = (n: number) => (Math.sqrt(n) / Math.sqrt(maxX)) * W;
  const sy = (p: number) => H - (p / 100) * H;
  const pts = stats.curve as [number, number][];
  const d = pts.map(([n, p], i) => `${i === 0 ? 'M' : 'L'}${sx(n).toFixed(1)},${sy(p).toFixed(1)}`).join(' ');
  const area = `${d} L${sx(maxX)},${H} L0,${H} Z`;
  const draw = prog(frame, 20, 150, EASE_IO);
  const marks = [
    { n: 10, p: stats.cov['10'], label: '10 words', at: 40 },
    { n: 100, p: stats.cov['100'], label: '100 words', at: 110 },
    { n: 500, p: stats.cov['500'], label: 'About 500 words', at: 200, hero: true },
  ];
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', top: 92, left: 210, ...enter(frame, 0) }}>
        <div style={{ fontFamily: SANS, fontSize: 20, letterSpacing: 3, color: C.green, textTransform: 'uppercase', fontWeight: 600 }}>Coverage by word count</div>
        <div style={{ marginTop: 10, fontFamily: SERIF, fontSize: 64, color: C.text }}>
          A small vocabulary <span style={{ fontStyle: 'italic', color: C.green }}>unlocks most of the Quran.</span>
        </div>
      </div>
      <svg width={W + 200} height={H + 120} style={{ marginTop: 150, overflow: 'visible' }}>
        <defs>
          <linearGradient id="area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor={C.green} stopOpacity="0.28" />
            <stop offset="1" stopColor={C.green} stopOpacity="0" />
          </linearGradient>
          <clipPath id="reveal">
            <rect x="0" y="-20" width={W * draw + 4} height={H + 40} />
          </clipPath>
        </defs>
        <g transform="translate(90,20)">
          {[0, 25, 50, 75, 100].map((p) => (
            <g key={p} opacity={prog(frame, 0, 20)}>
              <line x1={0} x2={W} y1={sy(p)} y2={sy(p)} stroke={C.border} strokeDasharray={p === 0 ? undefined : '4 8'} />
              <text x={-18} y={sy(p) + 6} fill={C.muted} fontFamily={SANS} fontSize={18} textAnchor="end">
                {p}%
              </text>
            </g>
          ))}
          {[0, 10, 100, 500, 1000, 2000].map((n) => (
            <text key={n} x={sx(n)} y={H + 34} fill={C.muted} fontFamily={SANS} fontSize={18} textAnchor="middle" opacity={prog(frame, 0, 20)}>
              {fmt(n)}
            </text>
          ))}
          <text x={W / 2} y={H + 70} fill={C.text2} fontFamily={SANS} fontSize={18} textAnchor="middle" opacity={prog(frame, 0, 20)}>
            Most frequent words learned
          </text>
          <g clipPath="url(#reveal)">
            <path d={area} fill="url(#area)" />
            <path d={d} fill="none" stroke={C.green} strokeWidth={5} strokeLinejoin="round" style={{ filter: 'drop-shadow(0 0 10px rgba(52,199,126,0.7))' }} />
          </g>
          {marks.map((m) => {
            const p = prog(frame, m.at, 26);
            const x = sx(m.n);
            const y = sy(m.p);
            return (
              <g key={m.n} opacity={p}>
                <line x1={x} x2={x} y1={y} y2={H} stroke={m.hero ? C.green : C.text2} strokeDasharray="3 6" opacity={0.6} />
                <circle cx={x} cy={y} r={m.hero ? 11 : 8} fill={C.bg} stroke={m.hero ? C.green : C.text} strokeWidth={4} />
                <g transform={`translate(${x + (m.hero ? 22 : 18)}, ${y + (m.hero ? 70 : 52)})`}>
                  <text fill={m.hero ? C.green : C.text} fontFamily={SERIF} fontSize={m.hero ? 74 : 54}>
                    {Math.round(m.p)}%
                  </text>
                  <text y={m.hero ? 36 : 30} fill={C.text2} fontFamily={SANS} fontSize={m.hero ? 22 : 19}>
                    {m.label}
                  </text>
                </g>
              </g>
            );
          })}
        </g>
      </svg>
    </AbsoluteFill>
  );
};

const PILLARS = [
  {
    n: '01',
    title: 'Learn by frequency',
    body: 'The words the Quran repeats most come first, so every session pays off on the page.',
    at: 10,
    art: 'bars',
  },
  {
    n: '02',
    title: 'Review with FSRS',
    body: 'A modern spaced repetition scheduler brings each word back right before you forget it.',
    at: 170,
    art: 'curve',
  },
  {
    n: '03',
    title: 'Read real ayahs',
    body: 'Every word is shown inside the verses where it appears, and the reader hides what you know.',
    at: 370,
    art: 'ayah',
  },
] as const;

export const MethodScene: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <Background />
      <div style={{ position: 'absolute', top: 120, left: 0, right: 0, textAlign: 'center', ...enter(frame, 0) }}>
        <div style={{ fontFamily: SANS, fontSize: 20, letterSpacing: 3, color: C.green, textTransform: 'uppercase', fontWeight: 600 }}>How Quranki works</div>
        <div style={{ marginTop: 12, fontFamily: SERIF, fontSize: 72, color: C.text }}>
          Three ideas, <span style={{ fontStyle: 'italic', color: C.green }}>one daily habit.</span>
        </div>
      </div>
      <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 40, paddingTop: 170 }}>
        {PILLARS.map((p) => {
          const active = frame >= p.at && (PILLARS.find((q) => q.at > p.at)?.at ?? 99999) > frame;
          const lift = prog(frame, p.at, 20) * (active ? 1 : 0.4);
          return (
            <div
              key={p.n}
              style={{
                width: 500,
                height: 520,
                borderRadius: 28,
                background: 'linear-gradient(180deg, rgba(20,26,22,0.95), rgba(13,17,14,0.95))',
                border: `1px solid ${active ? 'rgba(52,199,126,0.55)' : C.border}`,
                boxShadow: active ? '0 0 80px -20px rgba(52,199,126,0.45)' : '0 30px 80px -30px rgba(0,0,0,0.8)',
                padding: 40,
                display: 'flex',
                flexDirection: 'column',
                transform: `translateY(${-lift * 10}px)`,
                ...enter(frame, p.at, { dur: 30, y: 40 }),
              }}
            >
              <div style={{ height: 210, borderRadius: 18, background: '#0b0f0c', border: `1px solid ${C.border}`, overflow: 'hidden', position: 'relative' }}>
                <PillarArt kind={p.art} frame={frame - p.at} />
              </div>
              <div style={{ marginTop: 34, fontFamily: SANS, fontSize: 18, color: C.green, fontWeight: 700, letterSpacing: 2 }}>{p.n}</div>
              <div style={{ marginTop: 8, fontFamily: SERIF, fontSize: 48, color: C.text }}>{p.title}</div>
              <div style={{ marginTop: 12, fontFamily: SANS, fontSize: 21, lineHeight: 1.45, color: C.text2 }}>{p.body}</div>
            </div>
          );
        })}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

const PillarArt: React.FC<{ kind: string; frame: number }> = ({ kind, frame }) => {
  if (kind === 'bars') {
    const vals = [100, 84, 79, 54, 53, 52, 50, 45, 44, 42];
    return (
      <div style={{ position: 'absolute', inset: 26, display: 'flex', flexDirection: 'column', gap: 8, justifyContent: 'center' }}>
        {vals.map((v, i) => (
          <div key={i} style={{ height: 9, borderRadius: 5, width: `${v * prog(frame, 10 + i * 4, 30)}%`, background: i < 3 ? C.green : 'rgba(52,199,126,0.45)' }} />
        ))}
      </div>
    );
  }
  if (kind === 'curve') {
    // Forgetting curves that reset on each review and decay more slowly every time.
    const W = 420;
    const H = 160;
    const reviews = [0, 40, 110, 230, 420];
    let d = '';
    for (let r = 0; r < reviews.length - 1; r += 1) {
      const a = reviews[r];
      const b = reviews[r + 1];
      const k = 0.045 / (r + 1) ** 1.2;
      for (let x = a; x <= b; x += 4) {
        const y = 10 + (1 - Math.exp(-k * (x - a))) * (H - 20) * 0.55;
        d += `${x === a ? (r === 0 ? 'M' : 'L') : 'L'}${x},${y.toFixed(1)} `;
      }
      d += `L${b},10 `;
    }
    const draw = prog(frame, 10, 90, EASE_IO);
    return (
      <svg width="100%" height="100%" viewBox={`-20 -10 ${W + 40} ${H + 30}`}>
        <defs>
          <clipPath id="fc">
            <rect x={-20} y={-10} width={(W + 40) * draw} height={H + 30} />
          </clipPath>
        </defs>
        <line x1={0} x2={W} y1={10} y2={10} stroke={C.border} strokeDasharray="4 6" />
        <path d={d} fill="none" stroke={C.green} strokeWidth={4} clipPath="url(#fc)" />
        {reviews.slice(1, -1).map((x, i) => (
          <circle key={x} cx={x} cy={10} r={6} fill={C.green} opacity={prog(frame, 10 + (x / W) * 90, 10)} />
        ))}
      </svg>
    );
  }
  const words = [
    { ar: 'ٱلْحَمْدُ', en: 'all praise', known: true },
    { ar: 'لِلَّهِ', en: 'to Allah', known: true },
    { ar: 'رَبِّ', en: 'Lord', known: true },
    { ar: 'ٱلْعَٰلَمِينَ', en: 'of the worlds', known: false },
  ];
  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'row-reverse', justifyContent: 'center', alignItems: 'center', gap: 22 }}>
      {words.map((w, i) => {
        const hide = w.known ? prog(frame, 50 + i * 12, 20) : 0;
        return (
          <div key={w.ar} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, opacity: prog(frame, i * 8, 20) }}>
            <div style={{ fontFamily: ARABIC, fontSize: 42, color: C.text, lineHeight: 1.5 }}>{w.ar}</div>
            <div style={{ fontFamily: SANS, fontSize: 15, color: w.known ? C.text2 : C.green, opacity: 1 - hide, filter: `blur(${hide * 4}px)` }}>{w.en}</div>
          </div>
        );
      })}
    </div>
  );
};
