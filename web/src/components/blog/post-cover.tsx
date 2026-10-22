import React from 'react';
import type { CoverVariant, PostMeta } from '@/lib/blog/posts';
import { cn } from '@/lib/cn';

const P = 'rgb(var(--primary-rgb))';

/** Decorative cover art for a post: the headline stat plus a small motif that hints at the chart inside. */
export function PostCover({ post, size = 'card', className }: { post: PostMeta; size?: 'card' | 'hero'; className?: string }) {
  const hero = size === 'hero';
  return (
    <div
      className={cn(
        'relative isolate overflow-hidden border border-border bg-card',
        hero ? 'aspect-[16/9] sm:aspect-[21/9] rounded-xlarge' : 'aspect-[16/10] rounded-large',
        className,
      )}
    >
      <div aria-hidden className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/[0.16] via-transparent to-gold/[0.12]" />
        <div className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_80%_80%_at_70%_40%,black,transparent)]" />
        <div className="absolute -right-16 -top-20 h-64 w-64 rounded-full bg-primary/25 blur-[70px]" />
      </div>
      <svg
        aria-hidden
        viewBox="0 0 400 250"
        preserveAspectRatio="xMaxYMid meet"
        className={cn('absolute w-[66%]', hero ? 'inset-y-6 right-6 h-[calc(100%-3rem)] sm:inset-y-10 sm:right-10 sm:h-[calc(100%-5rem)]' : 'inset-y-4 right-4 h-[calc(100%-2rem)]')}
      >
        <Motif variant={post.cover} />
      </svg>
      <div className={cn('absolute left-0 bottom-0 max-w-[58%]', hero ? 'p-6 sm:p-10' : 'p-5')}>
        <div
          className={cn(
            'font-display leading-none tracking-tight text-text',
            hero ? 'text-5xl sm:text-7xl' : 'text-4xl sm:text-[2.6rem]',
          )}
        >
          {post.stat.value}
        </div>
        <div className={cn('mt-2 text-textSecondary text-pretty', hero ? 'text-sm sm:text-base' : 'text-xs sm:text-[13px]')}>
          {post.stat.label}
        </div>
      </div>
      <span
        className={cn(
          'absolute chip bg-card/80 backdrop-blur',
          hero ? 'left-6 top-6 sm:left-10 sm:top-10' : 'left-4 top-4',
        )}
      >
        {post.category}
      </span>
    </div>
  );
}

function Motif({ variant }: { variant: CoverVariant }) {
  switch (variant) {
    case 'roadmap': {
      const nodes = [
        [70, 205],
        [140, 170],
        [200, 185],
        [255, 130],
        [310, 110],
        [360, 50],
      ];
      const d = nodes.map(([x, y], i) => `${i ? 'L' : 'M'}${x},${y}`).join(' ');
      return (
        <g>
          <path d={d} fill="none" stroke={P} strokeOpacity="0.25" strokeWidth="16" strokeLinecap="round" strokeLinejoin="round" />
          <path d={d} fill="none" stroke={P} strokeWidth="3" strokeDasharray="2 9" strokeLinecap="round" />
          {nodes.map(([x, y], i) => (
            <g key={i}>
              <circle cx={x} cy={y} r={i === nodes.length - 1 ? 17 : 13} fill={i === nodes.length - 1 ? P : 'var(--card)'} stroke={P} strokeWidth="3" />
              <text x={x} y={y + 5} textAnchor="middle" fontSize="13" fontWeight="700" fill={i === nodes.length - 1 ? 'rgb(var(--on-primary-rgb))' : P}>
                {i + 1}
              </text>
            </g>
          ))}
        </g>
      );
    }
    case 'bars': {
      const words = ['مِن', 'ٱللَّه', 'مَا', 'لَا', 'فِى'];
      const freqs = [3226, 2699, 2565, 1738, 1701];
      return (
        <g>
          {words.map((w, i) => {
            const len = (freqs[i] / freqs[0]) * 230;
            const y = 24 + i * 42;
            return (
              <g key={w}>
                <rect x={380 - len} y={y} width={len} height="28" rx="9" fill={P} fillOpacity={0.95 - i * 0.14} />
                <text x={368 - len} y={y + 22} textAnchor="end" fontSize="26" fill="var(--text)" style={{ fontFamily: 'UthmanicHafs, serif' }}>
                  {w}
                </text>
              </g>
            );
          })}
        </g>
      );
    }
    case 'curve': {
      const pts: string[] = [];
      for (let i = 0; i <= 60; i++) {
        const t = i / 60;
        const x = 60 + t * 320;
        const y = 220 - 190 * (1 - Math.exp(-t * 4.2));
        pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
      }
      const line = `M${pts.join(' L')}`;
      const cx = 60 + 0.37 * 320;
      const cy = 220 - 190 * (1 - Math.exp(-0.37 * 4.2));
      return (
        <g>
          <defs>
            <linearGradient id="cover-curve" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0" stopColor={P} stopOpacity="0.4" />
              <stop offset="1" stopColor={P} stopOpacity="0" />
            </linearGradient>
          </defs>
          <path d={`${line} L380,220 L60,220 Z`} fill="url(#cover-curve)" />
          <path d={line} fill="none" stroke={P} strokeWidth="4" strokeLinecap="round" />
          <line x1={cx} x2={cx} y1={cy} y2={220} stroke={P} strokeDasharray="3 5" />
          <circle cx={cx} cy={cy} r="9" fill="var(--card)" stroke={P} strokeWidth="4" />
          <rect x={cx + 14} y={cy - 40} width="64" height="28" rx="14" fill={P} />
          <text x={cx + 46} y={cy - 21} textAnchor="middle" fontSize="14" fontWeight="700" fill="rgb(var(--on-primary-rgb))">
            80%
          </text>
        </g>
      );
    }
    case 'clock': {
      const months = 12;
      return (
        <g transform="translate(270 125)">
          {Array.from({ length: months }, (_, i) => {
            const a0 = (i / months) * Math.PI * 2 - Math.PI / 2 + 0.05;
            const a1 = ((i + 1) / months) * Math.PI * 2 - Math.PI / 2 - 0.05;
            const r = 98;
            const p = (a: number, rr: number) => `${(Math.cos(a) * rr).toFixed(1)},${(Math.sin(a) * rr).toFixed(1)}`;
            const filled = i < 3;
            return (
              <path
                key={i}
                d={`M${p(a0, r)} A${r},${r} 0 0 1 ${p(a1, r)} L${p(a1, r - 26)} A${r - 26},${r - 26} 0 0 0 ${p(a0, r - 26)} Z`}
                fill={P}
                fillOpacity={filled ? 0.95 - i * 0.12 : 0.13}
              />
            );
          })}
          <text textAnchor="middle" y="4" fontSize="30" fontWeight="700" fill="var(--text)">
            80%
          </text>
          <text textAnchor="middle" y="24" fontSize="11" fill="var(--text-muted)">
            by month 3
          </text>
        </g>
      );
    }
    case 'forgetting': {
      const reviews = [40, 90, 160, 260, 380];
      const stab = [22, 45, 80, 140, 400];
      const seg: string[] = [];
      reviews.forEach((r, i) => {
        const end = reviews[i + 1] ?? 392;
        for (let x = r; x <= end; x += 3) seg.push(`${x},${(40 + 170 * (1 - Math.exp(-(x - r) / stab[i]))).toFixed(1)}`);
      });
      return (
        <g>
          <path
            d={`M40,40 ${Array.from({ length: 120 }, (_, i) => {
              const x = 40 + i * 3;
              return `L${x},${(40 + 170 * (1 - Math.exp(-(x - 40) / 22))).toFixed(1)}`;
            }).join(' ')}`}
            fill="none"
            stroke="var(--grade-again)"
            strokeOpacity="0.55"
            strokeWidth="3"
            strokeDasharray="6 6"
          />
          <path d={`M${seg.join(' L')}`} fill="none" stroke={P} strokeWidth="4" strokeLinejoin="round" />
          {reviews.slice(1).map((r) => (
            <circle key={r} cx={r} cy={40} r="7" fill={P} stroke="var(--card)" strokeWidth="3" />
          ))}
        </g>
      );
    }
    case 'cycle': {
      return (
        <g transform="translate(270 125)">
          {[
            [100, 0.5, 1],
            [70, 0.3, 0.72],
            [40, 0.2, 0.44],
          ].map(([r, share, op]) => {
            const c = 2 * Math.PI * r;
            return (
              <g key={r} transform="rotate(-90)">
                <circle r={r} fill="none" stroke={P} strokeOpacity="0.12" strokeWidth="20" />
                <circle r={r} fill="none" stroke={P} strokeOpacity={op} strokeWidth="20" strokeLinecap="round" strokeDasharray={`${c * share} ${c}`} />
              </g>
            );
          })}
        </g>
      );
    }
    case 'venn': {
      return (
        <g>
          <circle cx="215" cy="125" r="88" fill={P} fillOpacity="0.18" stroke={P} strokeWidth="3" />
          <circle cx="315" cy="125" r="88" fill={P} fillOpacity="0.18" stroke={P} strokeWidth="3" strokeDasharray="7 6" />
          <text x="185" y="132" textAnchor="middle" fontSize="30" fill="var(--text)" style={{ fontFamily: 'UthmanicHafs, serif' }}>
            قُرْآن
          </text>
          <text x="348" y="131" textAnchor="middle" fontSize="20" fontWeight="700" fill="var(--text)">
            MSA
          </text>
        </g>
      );
    }
    case 'letters': {
      const letters = ['ا', 'ب', 'ت', 'ث', 'ج', 'ح', 'خ', 'د', 'ذ', 'ر', 'ز', 'س'];
      return (
        <g>
          {letters.map((l, i) => {
            const col = i % 4;
            const row = Math.floor(i / 4);
            const x = 360 - col * 66 - 54;
            const y = 22 + row * 70;
            const on = i === 1;
            return (
              <g key={l}>
                <rect x={x} y={y} width="54" height="58" rx="12" fill={P} fillOpacity={on ? 0.95 : 0.12 + (11 - i) * 0.02} />
                <text
                  x={x + 27}
                  y={y + 42}
                  textAnchor="middle"
                  fontSize="30"
                  fill={on ? 'rgb(var(--on-primary-rgb))' : 'var(--text)'}
                  style={{ fontFamily: 'UthmanicHafs, serif' }}
                >
                  {l}
                </text>
              </g>
            );
          })}
        </g>
      );
    }
    case 'ayah': {
      const words = ['بِسْمِ', 'ٱللَّهِ', 'ٱلرَّحْمَٰنِ', 'ٱلرَّحِيمِ'];
      const widths = [70, 74, 98, 92];
      let x = 392;
      return (
        <g>
          {words.map((w, i) => {
            x -= widths[i];
            const bx = x;
            x -= 10;
            const y = i % 2 ? 70 : 92;
            return (
              <g key={w}>
                <rect x={bx} y={y} width={widths[i]} height="96" rx="14" fill="var(--card)" stroke={P} strokeOpacity={0.35 + i * 0.15} strokeWidth="2" />
                <text x={bx + widths[i] / 2} y={y + 52} textAnchor="middle" fontSize="25" fill="var(--text)" style={{ fontFamily: 'UthmanicHafs, serif' }}>
                  {w}
                </text>
                <rect x={bx + widths[i] / 2 - 22} y={y + 68} width="44" height="14" rx="7" fill={P} fillOpacity={0.4 + i * 0.15} />
              </g>
            );
          })}
        </g>
      );
    }
    case 'names': {
      return (
        <g transform="translate(275 125)">
          {Array.from({ length: 99 }, (_, i) => {
            const ring = i < 15 ? 0 : i < 42 ? 1 : 2;
            const inRing = ring === 0 ? i : ring === 1 ? i - 15 : i - 42;
            const count = ring === 0 ? 15 : ring === 1 ? 27 : 57;
            const r = [38, 72, 106][ring];
            const a = (inRing / count) * Math.PI * 2 - Math.PI / 2;
            return (
              <circle
                key={i}
                cx={Math.cos(a) * r}
                cy={Math.sin(a) * r}
                r={ring === 2 ? 4.2 : 5.5}
                fill={P}
                fillOpacity={i % 11 === 0 ? 1 : 0.28 + ring * 0.08}
              />
            );
          })}
          <text textAnchor="middle" y="11" fontSize="28" fill="var(--text)" style={{ fontFamily: 'UthmanicHafs, serif' }}>
            ٱللَّه
          </text>
        </g>
      );
    }
  }
}
