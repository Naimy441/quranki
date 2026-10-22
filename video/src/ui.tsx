import { loadFont as loadInter } from '@remotion/google-fonts/Inter';
import { loadFont as loadSerif } from '@remotion/google-fonts/InstrumentSerif';
import { loadFont as loadLocal } from '@remotion/fonts';
import React from 'react';
import { AbsoluteFill, Easing, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

export const { fontFamily: SANS } = loadInter('normal', { weights: ['400', '500', '600', '700'], subsets: ['latin'] });
export const { fontFamily: SERIF } = loadSerif('normal', { subsets: ['latin'] });
loadSerif('italic', { subsets: ['latin'] });
export const ARABIC = 'QurankiHafs';
loadLocal({ family: ARABIC, url: staticFile('fonts/UthmanicHafs1Ver18.ttf') });

export const C = {
  bg: '#070a08',
  card: '#10150f',
  element: '#141a16',
  border: '#212a24',
  text: '#f1f5f2',
  text2: '#9db0a5',
  muted: '#67776e',
  green: '#34c77e',
  greenDark: '#1e8e5a',
  gold: '#e3b45a',
};

export const EASE = Easing.bezier(0.22, 1, 0.36, 1);
export const EASE_IO = Easing.bezier(0.65, 0, 0.35, 1);

/** 0 → 1 between `start` and `start + dur` frames. */
export function prog(frame: number, start: number, dur: number, easing = EASE): number {
  return interpolate(frame, [start, start + dur], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing,
  });
}

/** Fade + rise + unblur entrance, optional exit. */
export function enter(frame: number, at: number, opts: { dur?: number; y?: number; out?: number; outDur?: number } = {}): React.CSSProperties {
  const { dur = 24, y = 24, out, outDur = 16 } = opts;
  const p = prog(frame, at, dur);
  const o = out === undefined ? 0 : prog(frame, out, outDur, EASE_IO);
  return {
    opacity: p * (1 - o),
    transform: `translateY(${(1 - p) * y - o * 10}px)`,
    filter: `blur(${(1 - p) * 8 + o * 6}px)`,
  };
}

export const Background: React.FC<{ glow?: number }> = ({ glow = 1 }) => {
  const frame = useCurrentFrame();
  const t = frame / 30;
  const x1 = 30 + Math.sin(t / 7) * 8;
  const y1 = 20 + Math.cos(t / 9) * 6;
  const x2 = 75 + Math.cos(t / 8) * 8;
  const y2 = 85 + Math.sin(t / 6) * 5;
  return (
    <AbsoluteFill style={{ background: C.bg }}>
      <AbsoluteFill
        style={{
          opacity: glow,
          background: `radial-gradient(900px 600px at ${x1}% ${y1}%, rgba(52,199,126,0.13), transparent 70%), radial-gradient(800px 600px at ${x2}% ${y2}%, rgba(30,142,90,0.10), transparent 70%)`,
        }}
      />
      <AbsoluteFill
        style={{
          opacity: 0.35,
          backgroundImage: 'radial-gradient(rgba(255,255,255,0.06) 1px, transparent 1px)',
          backgroundSize: '28px 28px',
          maskImage: 'radial-gradient(ellipse at center, black 30%, transparent 75%)',
        }}
      />
    </AbsoluteFill>
  );
};

/** Small section label at the top of product scenes. */
export const Chapter: React.FC<{ index: string; label: string; at?: number; out?: number; top?: number }> = ({ index, label, at = 6, out, top = 34 }) => {
  const frame = useCurrentFrame();
  return (
    <div style={{ position: 'absolute', top, left: 0, right: 0, display: 'flex', justifyContent: 'center', ...enter(frame, at, { out, y: 12 }) }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          padding: '8px 18px 8px 10px',
          borderRadius: 999,
          background: 'rgba(20,26,22,0.8)',
          border: `1px solid ${C.border}`,
          fontFamily: SANS,
          fontSize: 19,
          color: C.text2,
          letterSpacing: 0.2,
        }}
      >
        <span style={{ background: 'rgba(52,199,126,0.15)', color: C.green, borderRadius: 999, padding: '3px 10px', fontWeight: 600, fontSize: 15 }}>{index}</span>
        <span style={{ color: C.text, fontWeight: 500 }}>{label}</span>
      </div>
    </div>
  );
};

// ---------- Desktop stage: browser window + camera ----------

export interface CamKey {
  at: number;
  /** Focus point in content CSS px (1440x900 space). */
  f: [number, number];
  s: number;
}

export interface Layer {
  src: string;
  at: number;
  fade?: number;
  /** Scroll keyframes for tall screenshots: [frame, cssY]. */
  scroll?: [number, number][];
  /** Native CSS height of the screenshot (image px / 2). */
  height?: number;
}

export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const WIN = { x: 240, y: 104, w: 1440, h: 900, bar: 44 };

function camAt(keys: CamKey[], frame: number): { f: [number, number]; s: number } {
  if (keys.length === 0) return { f: [720, 450], s: 1 };
  if (frame <= keys[0].at) return keys[0];
  for (let i = 0; i < keys.length - 1; i += 1) {
    const a = keys[i];
    const b = keys[i + 1];
    if (frame <= b.at) {
      if (b.at === a.at) return b;
      const p = interpolate(frame, [a.at, b.at], [0, 1], { easing: EASE_IO, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
      return { f: [a.f[0] + (b.f[0] - a.f[0]) * p, a.f[1] + (b.f[1] - a.f[1]) * p], s: a.s + (b.s - a.s) * p };
    }
  }
  return keys[keys.length - 1];
}

/** Maps a content point to screen space for the current camera. */
export function makeMapper(keys: CamKey[], frame: number, win = WIN) {
  const { f, s } = camAt(keys, frame);
  const ox = win.x;
  const oy = win.y + win.bar;
  return {
    s,
    f,
    pt: (x: number, y: number): [number, number] => [ox + f[0] + (x - f[0]) * s, oy + f[1] + (y - f[1]) * s],
  };
}

function keyframed(keys: [number, number][], frame: number): number {
  if (frame <= keys[0][0]) return keys[0][1];
  for (let i = 0; i < keys.length - 1; i += 1) {
    const [fa, va] = keys[i];
    const [fb, vb] = keys[i + 1];
    if (frame <= fb) {
      return interpolate(frame, [fa, fb], [va, vb], { easing: EASE_IO, extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
    }
  }
  return keys[keys.length - 1][1];
}

export const BrowserWindow: React.FC<{ url: string; layers: Layer[]; cam?: CamKey[]; intro?: number; out?: number; children?: React.ReactNode }> = ({
  url,
  layers,
  cam = [],
  intro = 0,
  out,
  children,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const { f, s } = camAt(cam, frame);
  const pop = spring({ frame: frame - intro, fps, config: { damping: 200, mass: 0.9 } });
  const o = out === undefined ? 0 : prog(frame, out, 18, EASE_IO);
  return (
    <>
      <div
        style={{
          position: 'absolute',
          left: WIN.x,
          top: WIN.y,
          width: WIN.w,
          height: WIN.h + WIN.bar,
          transformOrigin: `${f[0]}px ${f[1] + WIN.bar}px`,
          transform: `scale(${s}) translateY(${(1 - pop) * 60}px) scale(${0.96 + pop * 0.04})`,
          opacity: pop * (1 - o),
          borderRadius: 16,
          overflow: 'hidden',
          background: C.card,
          boxShadow: '0 0 0 1px rgba(255,255,255,0.07), 0 40px 120px -20px rgba(0,0,0,0.8), 0 0 80px -30px rgba(52,199,126,0.35)',
        }}
      >
        <div style={{ height: WIN.bar, display: 'flex', alignItems: 'center', padding: '0 18px', gap: 8, background: '#0e120f', borderBottom: `1px solid ${C.border}` }}>
          {['#ff5f57', '#febc2e', '#28c840'].map((c) => (
            <div key={c} style={{ width: 12, height: 12, borderRadius: 6, background: c, opacity: 0.85 }} />
          ))}
          <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
            <div
              style={{
                fontFamily: SANS,
                fontSize: 14,
                color: C.text2,
                background: C.element,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: '5px 80px',
                display: 'flex',
                gap: 8,
                alignItems: 'center',
              }}
            >
              <svg width="11" height="12" viewBox="0 0 11 12">
                <rect x="1" y="5" width="9" height="7" rx="1.5" fill={C.muted} />
                <path d="M3 5V3.5a2.5 2.5 0 015 0V5" stroke={C.muted} strokeWidth="1.4" fill="none" />
              </svg>
              {url}
            </div>
          </div>
          <div style={{ width: 60 }} />
        </div>
        <div style={{ position: 'relative', width: WIN.w, height: WIN.h, overflow: 'hidden', background: C.bg }}>
          {layers.map((layer) => {
            const op = layer.at === 0 ? 1 : prog(frame, layer.at, layer.fade ?? 14, EASE_IO);
            if (op <= 0) return null;
            const y = layer.scroll ? keyframed(layer.scroll, frame) : 0;
            return (
              <Img
                key={layer.src + layer.at}
                src={staticFile(`shots/${layer.src}.png`)}
                style={{ position: 'absolute', left: 0, top: -y, width: WIN.w, height: layer.height ?? WIN.h, opacity: op }}
              />
            );
          })}
        </div>
      </div>
      {children}
    </>
  );
};

/** Green ring around a content box plus a label pill, rendered in screen space. */
export const Callout: React.FC<{
  cam: CamKey[];
  box: Box;
  label: string;
  sub?: string;
  at: number;
  out: number;
  side?: 'top' | 'bottom' | 'left' | 'right';
  ring?: boolean;
}> = ({ cam, box, label, sub, at, out, side = 'bottom', ring = true }) => {
  const frame = useCurrentFrame();
  if (frame < at - 2 || frame > out + 24) return null;
  const m = makeMapper(cam, frame);
  const [x1, y1] = m.pt(box.x, box.y);
  const [x2, y2] = m.pt(box.x + box.w, box.y + box.h);
  const p = prog(frame, at, 22);
  const o = prog(frame, out, 16, EASE_IO);
  const alpha = p * (1 - o);
  const gap = 18;
  let lx = (x1 + x2) / 2;
  let ly = y2 + gap;
  let tx = '-50%';
  let ty = '0';
  if (side === 'top') {
    ly = y1 - gap;
    ty = '-100%';
  } else if (side === 'left') {
    lx = x1 - gap;
    ly = (y1 + y2) / 2;
    tx = '-100%';
    ty = '-50%';
  } else if (side === 'right') {
    lx = x2 + gap;
    ly = (y1 + y2) / 2;
    tx = '0';
    ty = '-50%';
  }
  const pad = 8;
  return (
    <>
      {ring && (
        <div
          style={{
            position: 'absolute',
            left: x1 - pad,
            top: y1 - pad,
            width: x2 - x1 + pad * 2,
            height: y2 - y1 + pad * 2,
            borderRadius: 18,
            border: `2px solid ${C.green}`,
            boxShadow: `0 0 0 6px rgba(52,199,126,0.12), 0 0 40px rgba(52,199,126,0.35)`,
            opacity: alpha,
            transform: `scale(${1.04 - p * 0.04})`,
          }}
        />
      )}
      <div
        style={{
          position: 'absolute',
          left: lx,
          top: ly,
          transform: `translate(${tx}, ${ty}) translateY(${(1 - p) * 10}px)`,
          opacity: alpha,
          filter: `blur(${(1 - p) * 6}px)`,
          background: 'rgba(10,14,11,0.92)',
          border: `1px solid rgba(52,199,126,0.45)`,
          borderRadius: 14,
          padding: sub ? '12px 18px' : '10px 18px',
          fontFamily: SANS,
          color: C.text,
          fontSize: 22,
          fontWeight: 600,
          whiteSpace: 'nowrap',
          boxShadow: '0 20px 50px -10px rgba(0,0,0,0.7)',
        }}
      >
        {label}
        {sub && <div style={{ fontSize: 16, fontWeight: 400, color: C.text2, marginTop: 4 }}>{sub}</div>}
      </div>
    </>
  );
};

/** macOS-style pointer that glides between content points and pulses on click. */
export const Cursor: React.FC<{ cam: CamKey[]; path: { at: number; x: number; y: number; click?: boolean }[]; from: number; to: number }> = ({ cam, path, from, to }) => {
  const frame = useCurrentFrame();
  if (frame < from || frame > to) return null;
  const xs = keyframed(path.map((p) => [p.at, p.x]), frame);
  const ys = keyframed(path.map((p) => [p.at, p.y]), frame);
  const m = makeMapper(cam, frame);
  const [sx, sy] = m.pt(xs, ys);
  const vis = prog(frame, from, 10) * (1 - prog(frame, to - 10, 10));
  let ripple = 0;
  let press = 0;
  for (const p of path) {
    if (!p.click) continue;
    const d = frame - p.at;
    if (d >= 0 && d < 24) ripple = d / 24;
    if (d >= -4 && d < 6) press = 1 - Math.abs(d - 1) / 5;
  }
  return (
    <>
      {ripple > 0 && (
        <div
          style={{
            position: 'absolute',
            left: sx - 28,
            top: sy - 28,
            width: 56,
            height: 56,
            borderRadius: 28,
            border: `3px solid ${C.green}`,
            opacity: (1 - ripple) * vis,
            transform: `scale(${0.4 + ripple * 1.1})`,
          }}
        />
      )}
      <svg
        width="34"
        height="34"
        viewBox="0 0 24 24"
        style={{ position: 'absolute', left: sx - 4, top: sy - 3, opacity: vis, transform: `scale(${1 - press * 0.15})`, transformOrigin: '4px 3px', filter: 'drop-shadow(0 3px 6px rgba(0,0,0,0.6))' }}
      >
        <path d="M4 2.5l15 8.6-6.6 1.6 3.9 7.2-3 1.6-3.9-7.3L4 19.2z" fill="#fff" stroke="#000" strokeWidth="1.2" strokeLinejoin="round" />
      </svg>
    </>
  );
};

/** On-screen keyboard hint, bottom center. */
export const KeyHint: React.FC<{ keys: { at: number; key: string; label: string }[] }> = ({ keys }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {keys.map((k) => {
        const d = frame - k.at;
        if (d < -10 || d > 60) return null;
        const p = prog(frame, k.at - 10, 12);
        const o = prog(frame, k.at + 40, 14, EASE_IO);
        const press = d >= 0 && d < 8 ? 1 - d / 8 : 0;
        return (
          <div key={k.at} style={{ position: 'absolute', bottom: 34, left: 0, right: 0, display: 'flex', justifyContent: 'center', opacity: p * (1 - o) }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, background: 'rgba(16,21,15,0.92)', border: `1px solid ${C.border}`, borderRadius: 16, padding: '10px 20px 10px 12px', fontFamily: SANS, color: C.text, fontSize: 20, fontWeight: 500, transform: `translateY(${(1 - p) * 16}px)` }}>
              <span
                style={{
                  minWidth: 44,
                  textAlign: 'center',
                  padding: '6px 12px',
                  borderRadius: 10,
                  background: press > 0 ? C.green : '#1d241f',
                  color: press > 0 ? '#06140d' : C.text,
                  border: '1px solid #2c3630',
                  boxShadow: `0 ${3 - press * 2}px 0 #0a0d0b`,
                  transform: `translateY(${press * 2}px)`,
                  fontWeight: 700,
                }}
              >
                {k.key}
              </span>
              {k.label}
            </div>
          </div>
        );
      })}
    </>
  );
};

// ---------- Phone ----------

export const PHONE = { w: 380, h: 826 };

export const Phone: React.FC<{ screens: { src: string; at: number }[]; style?: React.CSSProperties; scale?: number }> = ({ screens, style, scale = 1 }) => {
  const frame = useCurrentFrame();
  const w = PHONE.w * scale;
  const h = PHONE.h * scale;
  const bezel = 11 * scale;
  return (
    <div
      style={{
        position: 'absolute',
        width: w + bezel * 2,
        height: h + bezel * 2,
        borderRadius: 66 * scale,
        background: 'linear-gradient(145deg, #2b302d, #0d0f0e 40%, #1d211f)',
        padding: bezel,
        boxShadow: '0 0 0 1.5px rgba(255,255,255,0.12), 0 50px 120px -20px rgba(0,0,0,0.85), 0 0 90px -30px rgba(52,199,126,0.35)',
        ...style,
      }}
    >
      <div style={{ position: 'relative', width: w, height: h, borderRadius: 56 * scale, overflow: 'hidden', background: '#000' }}>
        {screens.map((s, i) => {
          const op = i === 0 ? 1 : prog(frame, s.at, 14, EASE_IO);
          if (op <= 0) return null;
          return <Img key={s.src + s.at} src={staticFile(`shots/${s.src}.png`)} style={{ position: 'absolute', inset: 0, width: w, height: h, opacity: op }} />;
        })}
      </div>
    </div>
  );
};

export const Logo: React.FC<{ size: number; style?: React.CSSProperties }> = ({ size, style }) => (
  <Img src={staticFile('brand/logo-mark.png')} style={{ width: size, height: size, borderRadius: size * 0.24, ...style }} />
);

/** Wraps a scene with a soft crossfade at both ends. */
export const SceneFade: React.FC<{ dur: number; over: number; children: React.ReactNode }> = ({ dur, over, children }) => {
  const frame = useCurrentFrame();
  const fin = prog(frame, 0, over, EASE_IO);
  const fout = prog(frame, dur, over, EASE_IO);
  return <AbsoluteFill style={{ opacity: fin * (1 - fout) }}>{children}</AbsoluteFill>;
};
