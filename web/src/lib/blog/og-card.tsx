import { readFile } from 'fs/promises';
import path from 'path';
import { ImageResponse } from 'next/og';

export const OG_SIZE = { width: 1200, height: 630 };

/** Social share card shared by the blog index and every post. Satori only supports flexbox and inline styles. */
export async function renderOgCard({ eyebrow, title, stat, statLabel }: { eyebrow: string; title: string; stat?: string; statLabel?: string }) {
  const logo = await readFile(path.join(process.cwd(), 'public/images/logo-mark.png'));
  const logoSrc = `data:image/png;base64,${logo.toString('base64')}`;

  const curve: string[] = [];
  for (let i = 0; i <= 50; i++) {
    const t = i / 50;
    curve.push(`${(t * 520).toFixed(1)},${(300 - 270 * (1 - Math.exp(-t * 4.2))).toFixed(1)}`);
  }
  const line = `M${curve.join(' L')}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          position: 'relative',
          background: 'linear-gradient(135deg, #07130d 0%, #0c2418 55%, #123524 100%)',
          color: '#f1f5f2',
          fontFamily: 'sans-serif',
          padding: '64px 72px',
        }}
      >
        <svg width="400" height="260" viewBox="-20 -20 560 340" style={{ position: 'absolute', right: 48, bottom: 104, opacity: 0.9 }}>
          <defs>
            <linearGradient id="g" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor="#34c77e" stopOpacity="0.45" />
              <stop offset="1" stopColor="#34c77e" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L520,300 L0,300 Z`} fill="url(#g)" />
          <path d={line} fill="none" stroke="#34c77e" strokeWidth="6" strokeLinecap="round" />
        </svg>
        <div
          style={{
            position: 'absolute',
            left: -120,
            top: -160,
            width: 620,
            height: 620,
            borderRadius: 9999,
            background: 'radial-gradient(circle, rgba(52,199,126,0.28), rgba(52,199,126,0) 70%)',
          }}
        />
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', width: '100%', position: 'relative' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={56} height={56} alt="" />
            <div style={{ fontSize: 32, fontWeight: 700, letterSpacing: -0.5 }}>Quranki</div>
            <div
              style={{
                marginLeft: 14,
                fontSize: 20,
                color: '#9db0a5',
                border: '1px solid rgba(157,176,165,0.35)',
                borderRadius: 999,
                padding: '6px 16px',
              }}
            >
              {eyebrow}
            </div>
          </div>
          <div style={{ display: 'flex', fontSize: title.length > 60 ? 52 : 62, fontWeight: 700, lineHeight: 1.08, letterSpacing: -1.5, maxWidth: 720 }}>
            {title}
          </div>
          <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between' }}>
            {stat ? (
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 18 }}>
                <div style={{ fontSize: 76, fontWeight: 800, color: '#34c77e', letterSpacing: -2 }}>{stat}</div>
                <div style={{ fontSize: 26, color: '#9db0a5', maxWidth: 420 }}>{statLabel}</div>
              </div>
            ) : (
              <div style={{ fontSize: 26, color: '#9db0a5' }}>Learn the words of the Quran with spaced repetition</div>
            )}
            <div style={{ fontSize: 24, color: '#9db0a5' }}>quranki.org/blog</div>
          </div>
        </div>
      </div>
    ),
    OG_SIZE,
  );
}
