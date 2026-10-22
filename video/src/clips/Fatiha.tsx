import React from 'react';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame } from 'remotion';

import fatiha from '../data/clips/fatiha.json';
import timeline from '../data/clips/fatiha-timeline.json';
import { ARABIC, Background, C, EASE_IO, Logo, SANS, SERIF, enter, prog } from '../ui';
import { ClipAudio, FPS, fmt, useTimeline, type Timeline } from './common';

const T = timeline as Timeline;
export const FATIHA_FRAMES = Math.ceil(T.duration * FPS);

type Ayah = (typeof fatiha.ayahs)[number];
type Word = Ayah['words'][number];

/** Prefixes and suffixes worth pointing out, as [Arabic piece, meaning]. */
const PARTS: Record<string, [string, string][]> = {
  '1:1:1': [['بِ', 'in'], ['ٱسْمِ', 'name']],
  '1:2:1': [['ٱلْ', 'the'], ['حَمْدُ', 'praise']],
  '1:2:2': [['لِ', 'to, for'], ['ٱللَّهِ', 'Allah']],
  '1:5:2': [['نَ', 'we'], ['عْبُدُ', 'worship']],
  '1:5:3': [['وَ', 'and'], ['إِيَّاكَ', 'You alone']],
  '1:5:4': [['نَ', 'we'], ['سْتَعِينُ', 'ask for help']],
  '1:6:1': [['ٱهْدِ', 'guide'], ['نَا', 'us']],
  '1:7:3': [['أَنْعَمْ', 'bestowed favor'], ['تَ', 'you']],
  '1:7:4': [['عَلَيْ', 'on'], ['هِمْ', 'them']],
  '1:7:8': [['وَ', 'and'], ['لَا', 'not']],
};

/** Shorter glosses for the ayah line, where space is tight. */
const SHORT: Record<string, string> = {
  '1:1:1': 'In the name',
  '1:1:2': 'of Allah',
  '1:1:3': 'the Entirely Merciful',
  '1:1:4': 'the Especially Merciful',
  '1:2:1': 'All praise',
  '1:2:2': 'to Allah',
  '1:2:3': 'Lord',
  '1:2:4': 'of the worlds',
  '1:3:1': 'the Entirely Merciful',
  '1:3:2': 'the Especially Merciful',
  '1:4:1': 'Sovereign',
  '1:4:2': 'of the Day',
  '1:4:3': 'of Recompense',
  '1:5:1': 'You alone',
  '1:5:2': 'we worship',
  '1:5:3': 'and You alone',
  '1:5:4': 'we ask for help',
  '1:6:1': 'Guide us',
  '1:6:2': 'to the path',
  '1:6:3': 'the straight',
  '1:7:1': 'the path',
  '1:7:2': 'of those',
  '1:7:3': 'You favored',
  '1:7:4': 'upon them',
  '1:7:5': 'not',
  '1:7:6': 'those with anger',
  '1:7:7': 'upon them',
  '1:7:8': 'and not',
  '1:7:9': 'those astray',
};

export const FatihaVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const tl = useTimeline(T);
  const title = tl.at('title');
  const recap = tl.at('r1');
  const outro = tl.at('o1');
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <Background />
      {frame < title + 10 && <Hook frame={frame} tl={tl} out={title - 10} />}
      {frame >= title - 8 && frame < tl.at('a1-intro') + 10 && <Title frame={frame - title} out={tl.at('a1-intro') - title - 10} />}
      {fatiha.ayahs.map((a, i) => {
        const from = tl.at(`a${a.ayah}-intro`);
        const to = i + 1 < fatiha.ayahs.length ? tl.at(`a${a.ayah + 1}-intro`) : recap;
        if (frame < from - 8 || frame >= to + 10) return null;
        return <AyahSection key={a.ayah} a={a} tl={tl} frame={frame} out={to - 10} />;
      })}
      {frame >= recap - 8 && frame < outro + 10 && <Recap frame={frame} tl={tl} out={outro - 10} />}
      {frame >= outro - 8 && <Outro frame={frame} tl={tl} />}
      <ClipAudio t={T} />
    </AbsoluteFill>
  );
};

// ---------- Hook ----------

const Hook: React.FC<{ frame: number; tl: ReturnType<typeof useTimeline>; out: number }> = ({ frame, tl, out }) => {
  const h2 = tl.at('h2');
  const h3 = tl.at('h3');
  const h4 = tl.at('h4');
  const h5 = tl.at('h5');
  return (
    <AbsoluteFill>
      {frame < h2 + 10 && <Counter frame={frame} out={h2 - 10} />}
      {frame >= h2 - 6 && frame < h3 + 10 && <Question frame={frame - h2} out={h3 - h2 - 10} />}
      {frame >= h3 - 6 && frame < h4 + 10 && <AllWords frame={frame - h3} out={h4 - h3 - 10} />}
      {frame >= h4 - 6 && frame < h5 + 10 && <OneInEight frame={frame - h4} split={tl.say('h4') - h4 + 150} out={h5 - h4 - 10} />}
      {frame >= h5 - 6 && <AllWords frame={frame - h5 + 40} out={out - h5} lit />}
    </AbsoluteFill>
  );
};

const Counter: React.FC<{ frame: number; out: number }> = ({ frame, out }) => {
  const n = interpolate(prog(frame, 20, 90, EASE_IO), [0, 1], [0, 17 * 365 * 15]);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: SANS, fontSize: 30, letterSpacing: 5, color: C.green, fontWeight: 600, ...enter(frame, 0, { out }) }}>AL-FATIHA, RECITED</div>
      <div style={{ fontFamily: SERIF, fontSize: 300, lineHeight: 1, color: C.text, fontVariantNumeric: 'tabular-nums', ...enter(frame, 4, { out }) }}>{fmt(n)}</div>
      <div style={{ fontFamily: SERIF, fontSize: 80, color: C.text2, fontStyle: 'italic', ...enter(frame, 10, { out }) }}>times</div>
      <div style={{ marginTop: 50, display: 'flex', gap: 22, fontFamily: SANS, fontSize: 30, color: C.text2, ...enter(frame, 60, { out }) }}>
        {['17 a day', '365 days a year', '15 years'].map((s, i) => (
          <React.Fragment key={s}>
            {i > 0 && <span style={{ color: C.muted }}>×</span>}
            <span style={{ padding: '10px 22px', borderRadius: 999, border: `1px solid ${C.border}`, background: C.card, color: C.text }}>{s}</span>
          </React.Fragment>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const Question: React.FC<{ frame: number; out: number }> = ({ frame, out }) => {
  const pulse = 0.6 + 0.4 * Math.sin(frame / 7);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: ARABIC, fontSize: 260, lineHeight: 1.5, color: C.text, direction: 'rtl', ...enter(frame, 4, { out, dur: 30 }) }}>نَسۡتَعِينُ</div>
      <div style={{ fontFamily: SERIF, fontSize: 130, color: C.gold, opacity: pulse * prog(frame, 50, 20) * (1 - prog(frame, out, 10)) }}>= ?</div>
    </AbsoluteFill>
  );
};

/** All 29 words, flowing right to left, glosses hidden (or shown when `lit`). */
const AllWords: React.FC<{ frame: number; out: number; lit?: boolean }> = ({ frame, out, lit }) => {
  const words = fatiha.ayahs.flatMap((a) => a.words);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      {!lit && (
        <div style={{ position: 'absolute', top: 90, fontFamily: SERIF, fontSize: 70, color: C.text, ...enter(frame, 0, { out }) }}>
          Every word. <span style={{ fontStyle: 'italic', color: C.green }}>All 29 of them.</span>
        </div>
      )}
      <div style={{ width: 1640, marginTop: 90, display: 'flex', flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: '14px 30px' }}>
        {words.map((w, i) => (
          <div key={w.loc} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...enter(frame, 6 + i * 2, { out, dur: 16 }) }}>
            <div style={{ fontFamily: ARABIC, fontSize: 62, lineHeight: 1.6, color: C.text, direction: 'rtl' }}>{w.ar}</div>
            <div style={{ marginTop: -8, fontFamily: SANS, fontSize: 18, fontWeight: 600, color: lit ? C.green : C.muted }}>{lit ? SHORT[w.loc] : '?'}</div>
          </div>
        ))}
      </div>
    </AbsoluteFill>
  );
};

const OneInEight: React.FC<{ frame: number; split: number; out: number }> = ({ frame, split, out }) => {
  const n = interpolate(prog(frame, 20, 70, EASE_IO), [0, 1], [0, fatiha.occurrences]);
  const phase = prog(frame, split, 20, EASE_IO);
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: 1 - phase, transform: `translateY(${-phase * 40}px)` }}>
        <div style={{ fontFamily: SERIF, fontSize: 280, lineHeight: 1, color: C.green, fontVariantNumeric: 'tabular-nums', textShadow: '0 0 70px rgba(52,199,126,0.4)', ...enter(frame, 4, { out }) }}>{fmt(n)}</div>
        <div style={{ fontFamily: SERIF, fontSize: 64, color: C.text, ...enter(frame, 12, { out }) }}>
          times across the Quran, <span style={{ fontStyle: 'italic', color: C.text2 }}>from just seven verses</span>
        </div>
      </div>
      <div style={{ position: 'absolute', display: 'flex', flexDirection: 'column', alignItems: 'center', opacity: phase * (1 - prog(frame, out, 12)) }}>
        <div style={{ fontFamily: SERIF, fontSize: 240, lineHeight: 1, color: C.text }}>
          1 <span style={{ fontStyle: 'italic', color: C.text2, fontSize: 150 }}>in</span> 8
        </div>
        <div style={{ marginTop: 10, fontFamily: SANS, fontSize: 36, color: C.text2 }}>words of the whole Quran</div>
        <div style={{ marginTop: 50, display: 'flex', gap: 18 }}>
          {Array.from({ length: 8 }, (_, i) => {
            const on = i === 0;
            const p = prog(frame, split + 10 + i * 4, 14);
            return (
              <div
                key={i}
                style={{
                  width: 120,
                  height: 120,
                  borderRadius: 24,
                  border: `2.5px solid ${on ? C.green : C.border}`,
                  background: on ? 'rgba(52,199,126,0.18)' : C.card,
                  boxShadow: on ? '0 0 40px rgba(52,199,126,0.5)' : undefined,
                  opacity: p,
                  transform: `translateY(${(1 - p) * 20}px)`,
                }}
              />
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Title: React.FC<{ frame: number; out: number }> = ({ frame, out }) => {
  const pop = spring({ frame, fps: FPS, config: { damping: 15 } });
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ fontFamily: ARABIC, fontSize: 150, lineHeight: 1.5, color: C.green, direction: 'rtl', opacity: pop, transform: `scale(${0.85 + 0.15 * pop})`, textShadow: '0 0 60px rgba(52,199,126,0.4)', ...enter(frame, 0, { out }) }}>
        سُورَةُ ٱلْفَاتِحَةِ
      </div>
      <div style={{ fontFamily: SERIF, fontSize: 150, color: C.text, lineHeight: 1, ...enter(frame, 10, { out }) }}>Al-Fatiha</div>
      <div style={{ marginTop: 22, fontFamily: SERIF, fontSize: 60, fontStyle: 'italic', color: C.text2, ...enter(frame, 20, { out }) }}>word by word</div>
    </AbsoluteFill>
  );
};

// ---------- One ayah: recitation, then each word, then the translation ----------

const ayahSize = (a: Ayah) => (a.words.length > 6 ? 70 : a.words.length > 3 ? 100 : 120);

const AyahSection: React.FC<{ a: Ayah; tl: ReturnType<typeof useTimeline>; frame: number; out: number }> = ({ a, tl, frame, out }) => {
  const n = a.ayah;
  const intro = tl.at(`a${n}-intro`);
  const rec = tl.at(`a${n}-rec`);
  const recEnd = tl.end(`a${n}-rec`);
  const known = n === 3;
  const trIntro = known ? tl.at('a3-tr') : tl.at(`a${n}-tr-intro`);
  const firstWord = known ? tl.at('a3-known') : tl.at(a.words[0].loc);
  // Which word card is on screen, if any.
  const wordIdx = known ? -1 : a.words.findIndex((w, i) => frame >= tl.at(w.loc) && (i === a.words.length - 1 ? frame < trIntro : frame < tl.at(a.words[i + 1].loc)));
  // The ayah sits in the middle for the recitation, then docks at the top.
  const dock = prog(frame, firstWord - 14, 22, EASE_IO);
  const undock = prog(frame, trIntro - 10, 22, EASE_IO);
  const pos = dock * (1 - undock * 0.55);
  const t = (frame - rec) / FPS;
  const reciting = frame >= rec && frame < recEnd;
  const exit = prog(frame, out, 10, EASE_IO);

  return (
    <AbsoluteFill style={{ opacity: 1 - exit }}>
      <div style={{ position: 'absolute', top: 54, left: 0, right: 0, display: 'flex', justifyContent: 'center', ...enter(frame, intro, { y: 12 }) }}>
        <div style={{ padding: '10px 22px', borderRadius: 999, background: 'rgba(20,26,22,0.85)', border: `1px solid ${C.border}`, fontFamily: SANS, fontSize: 22, color: C.text }}>
          <span style={{ color: C.green, fontWeight: 600 }}>Ayah {n}</span> <span style={{ color: C.muted }}>of 7</span>
        </div>
      </div>

      {/* The ayah line */}
      <div
        style={{
          position: 'absolute',
          left: 100,
          right: 100,
          top: interpolate(pos, [0, 1], [340, 120]),
          display: 'flex',
          flexDirection: 'row-reverse',
          flexWrap: 'wrap',
          justifyContent: 'center',
          gap: `0 ${interpolate(pos, [0, 1], [50, 34])}px`,
          transform: `scale(${interpolate(pos, [0, 1], [1, 0.72])})`,
          transformOrigin: 'top center',
          ...enter(frame, intro + 4, { dur: 26 }),
        }}
      >
        {a.words.map((w, i) => {
          const start = a.wordStarts[i] ?? 0;
          const next = a.wordStarts[i + 1] ?? 999;
          const live = reciting && t >= start && t < next;
          const current = i === wordIdx;
          const taught = known ? frame >= tl.say('a3-known') + i * 25 : wordIdx > i || (current && frame >= tl.say(w.loc)) || frame >= trIntro;
          return (
            <div key={w.loc} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <div
                style={{
                  fontFamily: ARABIC,
                  fontSize: ayahSize(a),
                  lineHeight: 1.6,
                  direction: 'rtl',
                  color: live || current ? C.green : C.text,
                  textShadow: live || current ? '0 0 40px rgba(52,199,126,0.55)' : undefined,
                  opacity: wordIdx >= 0 && !current ? 0.8 : 1,
                }}
              >
                {w.ar}
              </div>
              <div style={{ marginTop: -10, height: 40, fontFamily: SANS, fontSize: 26, fontWeight: 600, color: current ? C.green : C.text2, opacity: prog(taught ? 1 : 0, 0, 1) }}>
                {taught ? SHORT[w.loc] : ''}
              </div>
              {known && (
                <div style={{ marginTop: 8, padding: '6px 14px', borderRadius: 999, background: 'rgba(52,199,126,0.15)', color: C.green, fontFamily: SANS, fontSize: 20, fontWeight: 600, ...enter(frame, tl.say('a3-known') + 70 + i * 10) }}>
                  Already learned
                </div>
              )}
            </div>
          );
        })}
      </div>

      {wordIdx >= 0 && <WordCard key={a.words[wordIdx].loc} w={a.words[wordIdx]} frame={frame - tl.at(a.words[wordIdx].loc)} say={tl.say(a.words[wordIdx].loc) - tl.at(a.words[wordIdx].loc)} />}

      {frame >= trIntro - 4 && (
        <div style={{ position: 'absolute', left: 200, right: 200, top: 560, textAlign: 'center' }}>
          <div style={{ fontFamily: SERIF, fontSize: 64, lineHeight: 1.25, color: C.text, fontStyle: 'italic', ...enter(frame, known ? trIntro : tl.say(`a${n}-tr`) - 6) }}>“{a.translation.replace(/ -$/, '')}”</div>
          <div style={{ marginTop: 20, fontFamily: SANS, fontSize: 22, letterSpacing: 3, color: C.muted, textTransform: 'uppercase', ...enter(frame, (known ? trIntro : tl.say(`a${n}-tr`)) + 6) }}>
            Al-Fatiha 1:{n} - Sahih International
          </div>
        </div>
      )}
    </AbsoluteFill>
  );
};

const WordCard: React.FC<{ w: Word; frame: number; say: number }> = ({ w, frame, say }) => {
  const pop = spring({ frame, fps: FPS, config: { damping: 14, mass: 0.7 } });
  const parts = PARTS[w.loc];
  return (
    <AbsoluteFill style={{ alignItems: 'center', paddingTop: 360 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 90 }}>
        {/* Meaning on the left, the word on the right, as Arabic reads. */}
        <div style={{ width: 640, display: 'flex', flexDirection: 'column', alignItems: 'flex-end', textAlign: 'right' }}>
          <div style={{ fontFamily: SANS, fontSize: 32, color: C.text2, ...enter(frame, 4, { dur: 14 }) }}>{w.tl}</div>
          <div style={{ marginTop: 6, fontFamily: SERIF, fontSize: 88, lineHeight: 1.05, color: C.green, fontStyle: 'italic', ...enter(frame, say - 4, { dur: 14 }) }}>{SHORT[w.loc]}</div>
          <div style={{ marginTop: 30, display: 'flex', gap: 14, flexWrap: 'wrap', justifyContent: 'flex-end', ...enter(frame, say + 20, { dur: 16 }) }}>
            {w.lemmaFreq && (
              <Chip>
                <b style={{ color: C.text }}>{fmt(w.lemmaFreq)}</b> {w.lemmaFreq === 1 ? 'time' : 'times'} in the Quran
              </Chip>
            )}
            {w.root && (
              <Chip>
                root <span style={{ fontFamily: ARABIC, fontSize: 34, color: C.green, lineHeight: 1 }}>{w.root}</span> <b style={{ color: C.text }}>{fmt(w.rootFreq!)}×</b>
              </Chip>
            )}
          </div>
        </div>
        <div style={{ width: 2, height: 330, background: C.border, opacity: pop }} />
        <div style={{ width: 640, display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
          <div style={{ fontFamily: ARABIC, fontSize: 200, lineHeight: 1.5, color: C.text, direction: 'rtl', transform: `scale(${0.7 + 0.3 * pop})`, transformOrigin: 'left center', opacity: Math.min(1, pop * 1.4) }}>{w.ar}</div>
          {parts && (
            <div style={{ marginTop: -10, display: 'flex', flexDirection: 'row-reverse', gap: 14, alignSelf: 'flex-start', ...enter(frame, say + 30, { dur: 16 }) }}>
              {parts.map(([ar, en], i) => (
                <React.Fragment key={ar}>
                  {i > 0 && <div style={{ alignSelf: 'center', fontFamily: SANS, fontSize: 32, color: C.muted }}>+</div>}
                  <div style={{ padding: '6px 20px 12px', borderRadius: 18, background: C.card, border: `1px solid ${C.border}`, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ fontFamily: ARABIC, fontSize: 60, lineHeight: 1.5, color: C.text, direction: 'rtl' }}>{ar}</div>
                    <div style={{ marginTop: -6, fontFamily: SANS, fontSize: 20, color: C.green, fontWeight: 600 }}>{en}</div>
                  </div>
                </React.Fragment>
              ))}
            </div>
          )}
        </div>
      </div>
    </AbsoluteFill>
  );
};

const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 20px', borderRadius: 999, background: C.card, border: `1px solid ${C.border}`, fontFamily: SANS, fontSize: 24, color: C.text2 }}>{children}</div>
);

// ---------- Recap: the whole surah with every meaning ----------

const Recap: React.FC<{ frame: number; tl: ReturnType<typeof useTimeline>; out: number }> = ({ frame, tl, out }) => {
  const r1 = tl.at('r1');
  const first = tl.at('r-1');
  const current = [...fatiha.ayahs].reverse().find((a) => frame >= tl.at(`r-${a.ayah}`) - 6);
  return (
    <AbsoluteFill>
      {frame < first + 10 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: SERIF, fontSize: 110, color: C.text, ...enter(frame, r1, { out: first - 10 }) }}>
            Now, <span style={{ fontStyle: 'italic', color: C.green }}>the whole surah.</span>
          </div>
          <div style={{ marginTop: 20, fontFamily: SANS, fontSize: 30, color: C.text2, ...enter(frame, r1 + 12, { out: first - 10 }) }}>Follow the meaning as you hear it</div>
        </AbsoluteFill>
      )}
      {current && (
        <RecapAyah
          key={current.ayah}
          a={current}
          frame={frame - tl.at(`r-${current.ayah}`)}
          out={current.ayah === 7 ? out - tl.at('r-7') : tl.at(`r-${current.ayah + 1}`) - tl.at(`r-${current.ayah}`) - 8}
        />
      )}
      {frame >= first - 6 && (
        <div style={{ position: 'absolute', bottom: 70, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 14, opacity: 1 - prog(frame, out, 10) }}>
          {fatiha.ayahs.map((a) => (
            <div key={a.ayah} style={{ width: 46, height: 8, borderRadius: 4, background: current && a.ayah <= current.ayah ? C.green : C.border }} />
          ))}
        </div>
      )}
      <div style={{ position: 'absolute', top: 54, left: 0, right: 0, textAlign: 'center', fontFamily: SANS, fontSize: 22, letterSpacing: 3, color: C.muted, opacity: prog(frame, first - 6, 12) * (1 - prog(frame, out, 10)) }}>
        RECITED BY SHEIKH MAHMOUD KHALIL AL-HUSARY
      </div>
    </AbsoluteFill>
  );
};

const RecapAyah: React.FC<{ a: Ayah; frame: number; out: number }> = ({ a, frame, out }) => {
  const t = frame / FPS;
  const size = a.words.length > 6 ? 84 : 130;
  return (
    <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: 1720, display: 'flex', flexDirection: 'row-reverse', flexWrap: 'wrap', justifyContent: 'center', gap: '10px 46px' }}>
        {a.words.map((w, i) => {
          const start = a.wordStarts[i] ?? 0;
          const next = a.wordStarts[i + 1] ?? 999;
          const live = t >= start && t < next;
          const said = t >= start;
          return (
            <div key={w.loc} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', ...enter(frame, i * 2, { out, dur: 14 }) }}>
              <div style={{ fontFamily: ARABIC, fontSize: size, lineHeight: 1.6, direction: 'rtl', color: live ? C.green : said ? C.text : C.muted, textShadow: live ? '0 0 40px rgba(52,199,126,0.55)' : undefined }}>{w.ar}</div>
              <div style={{ marginTop: -12, fontFamily: SANS, fontSize: 30, fontWeight: 600, color: live ? C.green : C.text2 }}>{SHORT[w.loc]}</div>
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};

// ---------- Outro ----------

const Outro: React.FC<{ frame: number; tl: ReturnType<typeof useTimeline> }> = ({ frame, tl }) => {
  const o1 = tl.at('o1');
  const o2 = tl.at('o2');
  const o3 = tl.at('o3');
  const o4 = tl.at('o4');
  const pop = spring({ frame: frame - o3, fps: FPS, config: { damping: 14 } });
  return (
    <AbsoluteFill>
      {frame < o2 + 10 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ fontFamily: SERIF, fontSize: 96, color: C.text2, ...enter(frame, o1, { out: o2 - 10 }) }}>You won&apos;t just hear these words.</div>
          <div style={{ fontFamily: SERIF, fontSize: 120, color: C.green, fontStyle: 'italic', ...enter(frame, tl.say('o1') + 75, { out: o2 - 10 }) }}>You&apos;ll understand them.</div>
        </AbsoluteFill>
      )}
      {frame >= o2 - 6 && frame < o3 + 10 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 120 }}>
          {[
            { big: '23', unit: 'words', res: '1 in 8', sub: 'words of the Quran', at: o2 + 10, gold: false },
            { big: '500', unit: 'words', res: '80%', sub: 'of the Quran', at: o2 + 170, gold: true },
          ].map((s) => (
            <div key={s.big} style={{ width: 560, padding: '40px 0 50px', borderRadius: 40, background: C.card, border: `1.5px solid ${s.gold ? 'rgba(227,180,90,0.5)' : C.border}`, textAlign: 'center', ...enter(frame, s.at, { out: o3 - 10 }) }}>
              <div style={{ fontFamily: SANS, fontSize: 30, color: C.text2 }}>
                <b style={{ color: C.text, fontSize: 44 }}>{s.big}</b> {s.unit}
              </div>
              <div style={{ fontFamily: SANS, fontSize: 40, color: C.muted, margin: '10px 0' }}>↓</div>
              <div style={{ fontFamily: SERIF, fontSize: 170, lineHeight: 1, color: s.gold ? C.gold : C.green }}>{s.res}</div>
              <div style={{ marginTop: 10, fontFamily: SANS, fontSize: 30, color: C.text2 }}>{s.sub}</div>
            </div>
          ))}
        </AbsoluteFill>
      )}
      {frame >= o3 - 6 && (
        <AbsoluteFill style={{ alignItems: 'center', justifyContent: 'center', flexDirection: 'row', gap: 90 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', width: 700 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, opacity: pop, transform: `scale(${0.8 + 0.2 * pop})`, transformOrigin: 'left center' }}>
              <Logo size={120} />
              <div style={{ fontFamily: SERIF, fontSize: 130, color: C.text, lineHeight: 1 }}>Quranki</div>
            </div>
            <div style={{ marginTop: 26, fontFamily: SERIF, fontSize: 56, lineHeight: 1.15, color: C.text2, ...enter(frame, o3 + 20) }}>
              The Quran&apos;s words, in the order <span style={{ fontStyle: 'italic', color: C.green }}>the Quran uses them.</span>
            </div>
            <div style={{ marginTop: 40, display: 'flex', gap: 16, alignItems: 'center', ...enter(frame, o3 + 120) }}>
              <div style={{ padding: '14px 32px', borderRadius: 999, background: C.green, color: '#04140b', fontFamily: SANS, fontWeight: 700, fontSize: 36 }}>quranki.org</div>
              <div style={{ fontFamily: SANS, fontSize: 26, color: C.text2 }}>Free - web, iPhone, Android</div>
            </div>
            {frame >= o4 - 6 && (
              <div style={{ marginTop: 50, display: 'flex', alignItems: 'center', gap: 18, padding: '14px 26px', borderRadius: 18, background: 'rgba(227,180,90,0.12)', border: '1.5px solid rgba(227,180,90,0.5)', fontFamily: SANS, fontSize: 28, color: C.text, ...enter(frame, o4) }}>
                Next: <b style={{ color: C.gold }}>another surah, word by word</b>
              </div>
            )}
          </div>
          <div style={{ width: 860, borderRadius: 22, overflow: 'hidden', border: `1.5px solid ${C.border}`, boxShadow: '0 40px 100px -30px rgba(0,0,0,0.9), 0 0 60px -20px rgba(52,199,126,0.4)', ...enter(frame, o3 + 40, { y: 40, dur: 30 }) }}>
            <Img src={staticFile('shots/d-reader-fatiha.png')} style={{ width: '100%', display: 'block' }} />
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
