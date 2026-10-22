import React from 'react';
import { cn } from '@/lib/cn';

/*
 * Static SVG charts for blog posts. They render on the server, read theme colors from CSS
 * variables, and scale with their container, so they work in light and dark mode with no JS.
 */

const PRIMARY = 'rgb(var(--primary-rgb))';
const MUTED = 'var(--text-muted)';
const GRID = 'var(--border)';

export function Figure({
  title,
  subtitle,
  caption,
  children,
  className,
}: {
  title?: string;
  subtitle?: string;
  caption?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <figure className={cn('not-prose my-10 card p-5 sm:p-7 shadow-soft', className)}>
      {(title || subtitle) && (
        <div className="mb-5">
          {title && <div className="text-[15px] font-semibold text-text">{title}</div>}
          {subtitle && <div className="mt-0.5 text-xs text-textMuted">{subtitle}</div>}
        </div>
      )}
      {children}
      {caption && <figcaption className="mt-4 text-xs leading-relaxed text-textMuted">{caption}</figcaption>}
    </figure>
  );
}

/* ------------------------------------------------------------------ */

export function CoverageChart({
  points,
  milestones,
  maxWords,
  id = 'cov',
}: {
  points: { words: number; pct: number }[];
  milestones: { words: number; pct: number }[];
  maxWords: number;
  id?: string;
}) {
  const W = 640;
  const H = 280;
  const pts = points.filter((p) => p.words <= maxWords);
  const x = (w: number) => (w / maxWords) * W;
  const y = (p: number) => H - (p / 100) * H;
  const line = pts.map((p, i) => `${i ? 'L' : 'M'}${x(p.words).toFixed(1)},${y(p.pct).toFixed(1)}`).join(' ');
  const area = `${line} L${x(pts[pts.length - 1].words)},${H} L0,${H} Z`;
  const ticks = [0, maxWords / 4, maxWords / 2, (maxWords * 3) / 4, maxWords];

  return (
    <svg viewBox={`-36 -16 ${W + 52} ${H + 44}`} className="w-full h-auto" role="img" aria-label="Quran word coverage by number of words learned">
      <defs>
        <linearGradient id={`${id}-fill`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={PRIMARY} stopOpacity="0.32" />
          <stop offset="100%" stopColor={PRIMARY} stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0, 25, 50, 75, 100].map((g) => (
        <g key={g}>
          <line x1={0} x2={W} y1={y(g)} y2={y(g)} stroke={GRID} strokeDasharray={g ? '3 5' : undefined} />
          <text x={-10} y={y(g) + 4} textAnchor="end" fontSize="12" fill={MUTED}>
            {g}%
          </text>
        </g>
      ))}
      {ticks.map((t) => (
        <text key={t} x={x(t)} y={H + 22} textAnchor={t === 0 ? 'start' : t === maxWords ? 'end' : 'middle'} fontSize="12" fill={MUTED}>
          {Math.round(t).toLocaleString()}
        </text>
      ))}
      <path d={area} fill={`url(#${id}-fill)`} />
      <path d={line} fill="none" stroke={PRIMARY} strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
      {milestones.map((m, i) => {
        const cx = x(m.words);
        const cy = y(m.pct);
        const right = cx < W * 0.7;
        return (
          <g key={m.words}>
            <line x1={cx} x2={cx} y1={cy} y2={H} stroke={PRIMARY} strokeOpacity="0.35" strokeDasharray="2 4" />
            <circle cx={cx} cy={cy} r="6" fill="var(--card)" stroke={PRIMARY} strokeWidth="3" />
            <g transform={`translate(${right ? cx + 12 : cx - 12}, ${cy + (i % 2 ? 26 : 22)})`}>
              <text textAnchor={right ? 'start' : 'end'} fontSize="15" fontWeight="700" fill="var(--text)">
                {m.pct.toFixed(0)}%
              </text>
              <text y="16" textAnchor={right ? 'start' : 'end'} fontSize="11.5" fill={MUTED}>
                {m.words.toLocaleString()} words
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */

export function TopWordsBars({ rows }: { rows: { ar: string; gloss: string; freq: number }[] }) {
  const max = rows[0]?.freq ?? 1;
  return (
    <ol className="space-y-2.5">
      {rows.map((r, i) => (
        <li key={r.ar} className="grid grid-cols-[1.5rem_4.5rem_1fr] sm:grid-cols-[1.5rem_5rem_7.5rem_1fr] items-center gap-3">
          <span className="text-xs tabular-nums text-textMuted text-right">{i + 1}</span>
          <span className="uthmanic-text text-xl leading-none text-text text-right">{r.ar}</span>
          <span className="hidden sm:block truncate text-sm text-textSecondary">{r.gloss}</span>
          <span className="flex h-7 items-center gap-2">
            <span
              className="flex h-full shrink-0 items-center rounded-[8px] bg-gradient-to-r from-primary/80 to-primary"
              style={{ width: `${(r.freq / max) * 100}%`, opacity: 1 - i * 0.03 }}
            >
              {r.freq / max >= 0.18 && (
                <span className="pl-2.5 text-xs font-semibold tabular-nums text-onPrimary">{r.freq.toLocaleString()}</span>
              )}
            </span>
            {r.freq / max < 0.18 && <span className="text-xs font-semibold tabular-nums text-text">{r.freq.toLocaleString()}</span>}
          </span>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */

export function ColumnChart({ bars, highlight }: { bars: { label: string; count: number }[]; highlight?: number }) {
  const W = 640;
  const H = 230;
  const max = Math.max(...bars.map((b) => b.count));
  const slot = W / bars.length;
  const bw = slot * 0.62;
  return (
    <svg viewBox={`0 -24 ${W} ${H + 56}`} className="w-full h-auto" role="img" aria-label="Number of words by how often they appear">
      <line x1={0} x2={W} y1={H} y2={H} stroke={GRID} />
      {bars.map((b, i) => {
        const h = (b.count / max) * H;
        const cx = i * slot + slot / 2;
        const on = i === highlight;
        return (
          <g key={b.label}>
            <rect
              x={cx - bw / 2}
              y={H - h}
              width={bw}
              height={h}
              rx="8"
              fill={on ? PRIMARY : 'rgb(var(--primary-rgb) / 0.28)'}
            />
            <text x={cx} y={H - h - 8} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--text)">
              {b.count.toLocaleString()}
            </text>
            <text x={cx} y={H + 22} textAnchor="middle" fontSize="12" fill={MUTED}>
              {b.label}
            </text>
          </g>
        );
      })}
      <text x={W / 2} y={H + 46} textAnchor="middle" fontSize="11.5" fill={MUTED}>
        Times the word appears in the Quran
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */

/** Retention over 30 days: one review vs. reviews spaced at growing intervals. */
export function ForgettingChart() {
  const W = 640;
  const H = 240;
  const days = 30;
  const x = (d: number) => (d / days) * W;
  const y = (r: number) => H - r * H;
  const decay = (from: number, to: number, stability: number) => {
    const out: string[] = [];
    for (let d = from; d <= to + 1e-9; d += 0.25) out.push(`${x(d).toFixed(1)},${y(Math.exp(-(d - from) / stability)).toFixed(1)}`);
    return out;
  };
  const once = `M${decay(0, days, 1.6).join(' L')}`;
  const reviews = [0, 1, 3, 7, 15];
  const stability = [1.6, 4, 9, 22, 60];
  const spacedPts: string[] = [];
  reviews.forEach((r, i) => {
    const end = reviews[i + 1] ?? days;
    spacedPts.push(...decay(r, end, stability[i]));
  });
  const spaced = `M${spacedPts.join(' L')}`;

  return (
    <div>
      <svg viewBox={`-36 -12 ${W + 48} ${H + 40}`} className="w-full h-auto" role="img" aria-label="Forgetting curve with and without spaced reviews">
        {[0, 0.5, 1].map((g) => (
          <g key={g}>
            <line x1={0} x2={W} y1={y(g)} y2={y(g)} stroke={GRID} strokeDasharray={g ? '3 5' : undefined} />
            <text x={-10} y={y(g) + 4} textAnchor="end" fontSize="12" fill={MUTED}>
              {g * 100}%
            </text>
          </g>
        ))}
        {[0, 7, 14, 21, 30].map((d) => (
          <text key={d} x={x(d)} y={H + 22} textAnchor={d === 0 ? 'start' : d === 30 ? 'end' : 'middle'} fontSize="12" fill={MUTED}>
            Day {d}
          </text>
        ))}
        <path d={once} fill="none" stroke="var(--grade-again)" strokeWidth="2.5" strokeDasharray="6 5" opacity="0.8" />
        <path d={spaced} fill="none" stroke={PRIMARY} strokeWidth="3" strokeLinejoin="round" />
        {reviews.slice(1).map((r) => (
          <g key={r}>
            <circle cx={x(r)} cy={y(1)} r="5.5" fill={PRIMARY} stroke="var(--card)" strokeWidth="2" />
          </g>
        ))}
      </svg>
      <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-xs text-textSecondary">
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 rounded bg-primary" /> Reviewed on days 1, 3, 7, and 15
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-0.5 w-5 rounded bg-gradeAgain opacity-80" /> Studied once, never reviewed
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function IntervalLadder() {
  const steps = [
    { label: 'Learn', when: 'Today' },
    { label: 'Review 1', when: '+1 day' },
    { label: 'Review 2', when: '+3 days' },
    { label: 'Review 3', when: '+1 week' },
    { label: 'Review 4', when: '+3 weeks' },
    { label: 'Review 5', when: '+2 months' },
  ];
  return (
    <div className="flex items-end gap-1.5 sm:gap-2.5">
      {steps.map((s, i) => (
        <div key={s.label} className="flex-1 min-w-0 text-center">
          <div className="text-[11px] sm:text-xs font-semibold text-text truncate">{s.when}</div>
          <div
            className="mt-2 rounded-t-[10px] bg-gradient-to-t from-primary/25 to-primary"
            style={{ height: 18 + i * 22, opacity: 0.45 + i * 0.11 }}
          />
          <div className="mt-2 text-[10.5px] sm:text-[11px] text-textMuted truncate">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function HorizontalBars({
  rows,
  unit,
  highlight,
}: {
  rows: { label: string; value: number; note?: string }[];
  unit: string;
  highlight?: number;
}) {
  const max = Math.max(...rows.map((r) => r.value));
  return (
    <div className="space-y-3.5">
      {rows.map((r, i) => (
        <div key={r.label} className="grid grid-cols-[6.5rem_1fr] sm:grid-cols-[8.5rem_1fr] items-center gap-3">
          <div className="text-sm text-textSecondary">{r.label}</div>
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={cn('h-8 rounded-[9px] shrink-0', i === highlight ? 'bg-primary' : 'bg-primary/30')}
              style={{ width: `${Math.max((r.value / max) * 78, 4)}%` }}
            />
            <div className="min-w-0 text-sm">
              <span className="font-semibold tabular-nums text-text">
                {r.value.toLocaleString()}
                {unit === '%' ? unit : ` ${unit}`}
              </span>
              {r.note && <span className="hidden sm:inline text-textMuted"> {r.note}</span>}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Roadmap({ steps }: { steps: { title: string; body: string; time: string }[] }) {
  return (
    <ol className="relative grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {steps.map((s, i) => (
        <li key={s.title} className="relative rounded-medium border border-border bg-backgroundElement/60 p-4">
          <div className="flex items-center justify-between">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-onPrimary">
              {i + 1}
            </span>
            <span className="text-[11px] font-semibold text-textMuted">{s.time}</span>
          </div>
          <div className="mt-3 text-sm font-semibold text-text">{s.title}</div>
          <div className="mt-1 text-[13px] leading-relaxed text-textSecondary">{s.body}</div>
        </li>
      ))}
    </ol>
  );
}

/* ------------------------------------------------------------------ */

/** Three concentric revision tracks for hifz. */
export function RevisionRings() {
  const rings = [
    { r: 128, label: 'Old', sub: 'Manzil', share: 0.5 },
    { r: 92, label: 'Recent', sub: 'Sabqi', share: 0.3 },
    { r: 56, label: 'New', sub: 'Sabaq', share: 0.2 },
  ];
  return (
    <div className="grid items-center gap-6 sm:grid-cols-[260px_1fr]">
      <svg viewBox="-150 -150 300 300" className="mx-auto w-full max-w-[260px] h-auto" role="img" aria-label="Daily hifz time split between new, recent, and old revision">
        {rings.map((ring, i) => {
          const c = 2 * Math.PI * ring.r;
          return (
            <g key={ring.label} transform="rotate(-90)">
              <circle r={ring.r} fill="none" stroke="var(--background-element)" strokeWidth="26" />
              <circle
                r={ring.r}
                fill="none"
                stroke={PRIMARY}
                strokeOpacity={1 - i * 0.28}
                strokeWidth="26"
                strokeLinecap="round"
                strokeDasharray={`${c * ring.share} ${c}`}
              />
            </g>
          );
        })}
        <text textAnchor="middle" y="-2" fontSize="22" fontWeight="700" fill="var(--text)">
          30
        </text>
        <text textAnchor="middle" y="16" fontSize="11" fill={MUTED}>
          min a day
        </text>
      </svg>
      <ul className="space-y-3">
        {[
          { name: 'New (sabaq)', mins: '6 min', body: 'Today’s new lines. Small enough to master in one sitting.' },
          { name: 'Recent (sabqi)', mins: '9 min', body: 'The last week or two. Still fragile, so it gets daily attention.' },
          { name: 'Old (manzil)', mins: '15 min', body: 'Everything older, rotated so each part comes back on schedule.' },
        ].map((t, i) => (
          <li key={t.name} className="flex gap-3">
            <span className="mt-1.5 h-3 w-3 shrink-0 rounded-full bg-primary" style={{ opacity: 1 - (2 - i) * 0.28 }} />
            <div>
              <div className="text-sm font-semibold text-text">
                {t.name} <span className="font-normal text-textMuted">- {t.mins}</span>
              </div>
              <div className="text-[13px] leading-relaxed text-textSecondary">{t.body}</div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function StatRow({ stats }: { stats: { value: string; label: string }[] }) {
  return (
    <div className="not-prose my-10 grid grid-cols-2 sm:grid-cols-4 overflow-hidden rounded-large border border-border bg-card divide-x divide-y sm:divide-y-0 divide-border">
      {stats.map((s) => (
        <div key={s.label} className="p-4 sm:p-5">
          <div className="font-display text-3xl sm:text-4xl tracking-tight text-primary">{s.value}</div>
          <div className="mt-1 text-xs leading-snug text-textSecondary">{s.label}</div>
        </div>
      ))}
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** One ayah as word tiles, right to left, each with its gloss and how often it recurs in the Quran. */
export function AyahWords({
  n,
  words,
  translation,
}: {
  n: number;
  words: { ar: string; tl: string; en: string; quranCount: number }[];
  translation: string;
}) {
  return (
    <figure className="not-prose my-6 card p-4 sm:p-6 shadow-soft">
      <div className="flex items-center justify-between">
        <span className="chip">Ayah {n}</span>
        <span className="text-[11px] text-textMuted">Read right to left</span>
      </div>
      <div dir="rtl" className="mt-4 flex flex-wrap gap-2.5">
        {words.map((w, i) => (
          <div key={i} className="min-w-[5.5rem] flex-1 sm:flex-none rounded-medium border border-border bg-backgroundElement/60 px-3 py-2.5 text-center">
            <div className="uthmanic-text text-[1.7rem] leading-[1.6] text-text" lang="ar">
              {w.ar}
            </div>
            <div dir="ltr" className="mt-1 text-[11px] italic text-textMuted">
              {w.tl}
            </div>
            <div dir="ltr" className="mt-0.5 text-[12.5px] font-medium leading-snug text-textSecondary">
              {w.en}
            </div>
            {w.quranCount > 0 && (
              <div
                dir="ltr"
                className={cn(
                  'mt-2 inline-flex rounded-pill px-2 py-0.5 text-[10.5px] font-semibold tabular-nums',
                  w.quranCount >= 100 ? 'bg-primary text-onPrimary' : 'bg-primary/15 text-primary',
                )}
              >
                {w.quranCount.toLocaleString()}x in Quran
              </div>
            )}
          </div>
        ))}
      </div>
      <figcaption className="mt-4 border-t border-border pt-3 text-sm leading-relaxed text-textSecondary">{translation}</figcaption>
    </figure>
  );
}

/* ------------------------------------------------------------------ */

/** Cumulative share of Quran words a reader can sound out after each Qaida rule. */
export function ReadableSteps({ steps }: { steps: { label: string; pct: number }[] }) {
  const W = 640;
  const H = 220;
  const slot = W / steps.length;
  const bw = slot * 0.6;
  return (
    <svg viewBox={`0 -28 ${W} ${H + 58}`} className="w-full h-auto" role="img" aria-label="Share of Quran words you can read after each reading rule">
      {[0, 50, 100].map((g) => (
        <line key={g} x1={0} x2={W} y1={H - (g / 100) * H} y2={H - (g / 100) * H} stroke={GRID} strokeDasharray={g ? '3 5' : undefined} />
      ))}
      {steps.map((s, i) => {
        const h = (s.pct / 100) * H;
        const cx = i * slot + slot / 2;
        const prev = i ? (steps[i - 1].pct / 100) * H : 0;
        return (
          <g key={s.label}>
            <rect x={cx - bw / 2} y={H - prev} width={bw} height={prev} rx="7" fill="rgb(var(--primary-rgb) / 0.22)" />
            <rect x={cx - bw / 2} y={H - h} width={bw} height={h - prev} rx="7" fill={PRIMARY} />
            <text x={cx} y={H - h - 9} textAnchor="middle" fontSize="14" fontWeight="700" fill="var(--text)">
              {Math.round(s.pct)}%
            </text>
            <text x={cx} y={H + 21} textAnchor="middle" fontSize="12" fill={MUTED}>
              {s.label}
            </text>
          </g>
        );
      })}
      <text x={W / 2} y={H + 44} textAnchor="middle" fontSize="11.5" fill={MUTED}>
        Each bar adds one rule to everything before it
      </text>
    </svg>
  );
}

/* ------------------------------------------------------------------ */

export function LetterGrid({ letters }: { letters: { ar: string; name: string; connects: boolean }[] }) {
  return (
    <div>
      <div dir="rtl" className="grid grid-cols-4 sm:grid-cols-7 gap-2">
        {letters.map((l) => (
          <div
            key={l.name}
            className={cn(
              'rounded-medium border px-1 py-2 text-center',
              l.connects ? 'border-border bg-backgroundElement/60' : 'border-primary/40 bg-primary/10',
            )}
          >
            {/* Uthmanic Hafs draws isolated yā without dots, so the alphabet uses a standard Naskh face. */}
            <div className="text-3xl leading-[1.5] text-text" lang="ar" style={{ fontFamily: "'Noto Naskh Arabic', 'Geeza Pro', 'Arabic Typesetting', serif" }}>
              {l.ar}
            </div>
            <div dir="ltr" className="text-[11px] text-textMuted">
              {l.name}
            </div>
          </div>
        ))}
      </div>
      <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs text-textSecondary">
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-[4px] border border-primary/40 bg-primary/10" /> Never joins to the next letter
        </span>
        <span className="inline-flex items-center gap-2">
          <span className="h-3 w-3 rounded-[4px] border border-border bg-backgroundElement" /> Joins on both sides
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */

/** Two overlapping circles with what each side has on its own and what they share. */
export function OverlapDiagram({
  left,
  right,
  shared,
}: {
  left: { title: string; items: string[] };
  right: { title: string; items: string[] };
  shared: { title: string; items: string[] };
}) {
  const Column = ({ title, items, strong }: { title: string; items: string[]; strong?: boolean }) => (
    <div className={cn('rounded-medium p-4', strong ? 'bg-primary/10 border border-primary/30' : 'bg-backgroundElement/60 border border-border')}>
      <div className={cn('text-sm font-semibold', strong ? 'text-primary' : 'text-text')}>{title}</div>
      <ul className="mt-2 space-y-1.5 text-[13px] leading-snug text-textSecondary">
        {items.map((it) => (
          <li key={it} className="flex gap-2">
            <span className={cn('mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full', strong ? 'bg-primary' : 'bg-textMuted')} />
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
  return (
    <div>
      <svg viewBox="0 0 640 210" className="mx-auto w-full max-w-[560px] h-auto" aria-hidden>
        <circle cx="262" cy="105" r="98" fill="rgb(var(--primary-rgb) / 0.16)" stroke={PRIMARY} strokeWidth="2" />
        <circle cx="378" cy="105" r="98" fill="rgb(var(--primary-rgb) / 0.16)" stroke={PRIMARY} strokeWidth="2" strokeDasharray="6 5" />
        <text x="205" y="110" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--text)">
          {left.title}
        </text>
        <text x="435" y="110" textAnchor="middle" fontSize="15" fontWeight="700" fill="var(--text)">
          {right.title}
        </text>
        <text x="320" y="104" textAnchor="middle" fontSize="13" fontWeight="700" fill={PRIMARY}>
          Shared
        </text>
        <text x="320" y="121" textAnchor="middle" fontSize="11" fill={MUTED}>
          core
        </text>
      </svg>
      <div className="mt-5 grid gap-3 sm:grid-cols-3">
        <Column {...left} />
        <Column {...shared} strong />
        <Column {...right} />
      </div>
    </div>
  );
}
