'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowRight,
  ArrowUpRight,
  AudioLines,
  BookOpenText,
  Brain,
  ChartNoAxesColumnIncreasing,
  Cloud,
  Eye,
  EyeOff,
  Keyboard,
  Languages,
  Play,
  Plus,
  Sparkles,
} from 'lucide-react';
import { TextEffect } from '@/components/motion/text-effect';
import { Reveal } from '@/components/motion/reveal';
import { LogoMark, Wordmark } from '@/components/brand/logo';
import { useReturningVisitor } from '@/hooks/use-returning-visitor';
import { useIsDark } from '@/hooks/use-is-dark';
import { createNewCard, previewGrades, type GradeName } from '@/lib/fsrs';
import { glossColor, tajweedColor } from '@/lib/quran-colors';
import { APP_STORE_URL, DEMO_VIDEO_ID, DEMO_VIDEO_URL, FACTS, GITHUB_URL, PLAY_STORE_URL } from '@/lib/site';
import { FAQS } from './faqs';
import { cn } from '@/lib/cn';

export interface DemoAyah {
  a: number;
  words: { ar: { t: string; c?: string }[]; en: { t: string; c?: string }[]; tl: string }[];
  translation: string;
}

interface LandingProps {
  ayahs: DemoAyah[];
  curve: { level: number; pct: number }[];
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);

export function Landing({ ayahs, curve }: LandingProps) {
  const visitor = useReturningVisitor();
  const startHref = visitor.hasCompletedOnboarding ? '/learn' : '/onboarding';
  const startLabel = visitor.hasCompletedOnboarding ? 'Continue learning' : 'Start learning free';

  return (
    <div className="relative min-h-screen overflow-x-clip bg-background text-text">
      <Nav startHref={startHref} />
      <Hero startHref={startHref} startLabel={startLabel} ayahs={ayahs} />
      <StatsStrip />
      <CoverageSection curve={curve} />
      <Features />
      <HowItWorks />
      <DemoVideo />
      <MobileApps />
      <Faq />
      <FinalCta startHref={startHref} startLabel={startLabel} />
      <Footer />
    </div>
  );
}

/* ------------------------------------------------------------------ */

export function Nav({ startHref }: { startHref: string }) {
  const visitor = useReturningVisitor();
  return (
    <header className="fixed top-0 inset-x-0 z-50">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 pt-3">
        <nav className="flex h-14 items-center justify-between rounded-pill border border-border/70 bg-background/70 pl-4 pr-2 backdrop-blur-xl shadow-soft">
          <Link href="/" aria-label="Quranki home" className="flex items-center">
            <Wordmark size={30} />
          </Link>
          <div className="hidden md:flex items-center gap-1 text-sm text-textSecondary">
            {[
              ['/#features', 'Features'],
              ['/#how', 'How it works'],
              ['/quran', 'Read the Quran'],
              ['/blog', 'Blog'],
            ].map(([href, label]) => (
              <Link key={href} href={href} className="px-3 py-1.5 rounded-pill hover:text-text hover:bg-backgroundElement transition-colors">
                {label}
              </Link>
            ))}
          </div>
          <div className="flex items-center gap-1.5">
            {visitor.ready && !visitor.signedIn && (
              <Link href="/sign-in" className="hidden sm:inline-flex btn-ghost h-9 px-3.5 rounded-pill">
                Sign in
              </Link>
            )}
            <Link href={startHref} className="btn-primary h-10 px-4 rounded-pill">
              {visitor.signedIn || visitor.hasCompletedOnboarding ? 'Open app' : 'Get started'}
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </nav>
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */

function Hero({ startHref, startLabel, ayahs }: { startHref: string; startLabel: string; ayahs: DemoAyah[] }) {
  return (
    <section className="relative pt-36 sm:pt-44 pb-16">
      {/* Ambient background */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-[0.35] [mask-image:radial-gradient(ellipse_70%_55%_at_50%_0%,black,transparent)]" />
        <div className="absolute left-1/2 top-[-12rem] h-[42rem] w-[64rem] -translate-x-1/2 rounded-full bg-primary/20 blur-[120px]" />
        <div className="absolute right-[-10rem] top-[18rem] h-[24rem] w-[24rem] rounded-full bg-gold/10 blur-[100px]" />
      </div>

      <div className="mx-auto max-w-6xl px-4 sm:px-6 text-center">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="inline-flex items-center gap-2 rounded-pill border border-border bg-card/70 px-3 py-1.5 text-xs font-medium text-textSecondary backdrop-blur"
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
          </span>
          Free on web, iPhone, and Android
        </motion.div>

        <h1 className="mt-7 font-display text-[3.1rem] leading-[0.98] sm:text-7xl md:text-[5.6rem] tracking-[-0.02em] text-balance">
          <TextEffect per="word" preset="fade-in-blur" delay={0.1}>
            Understand the Quran,
          </TextEffect>
          <br />
          <TextEffect per="char" preset="fade-in-blur" delay={0.55} className="italic text-primary">
            word by word.
          </TextEffect>
        </h1>

        <motion.p
          initial={{ opacity: 0, y: 12, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{ delay: 1.05, duration: 0.6 }}
          className="mx-auto mt-6 max-w-2xl text-base sm:text-lg text-textSecondary text-pretty leading-relaxed"
        >
          Quranki teaches you the words of the Quran in order of how often they appear, schedules reviews with
          FSRS so they stick, and hides each translation in the reader the moment you know it.
        </motion.p>

        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.25, duration: 0.5 }}
          className="mt-9 flex flex-col sm:flex-row items-center justify-center gap-3"
        >
          <Link href={startHref} className="btn-primary h-12 px-6 rounded-pill text-[15px] shadow-glow w-full sm:w-auto">
            {startLabel}
            <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/quran" className="btn-secondary h-12 px-6 rounded-pill text-[15px] w-full sm:w-auto">
            <BookOpenText className="w-4 h-4" />
            Open the reader
          </Link>
        </motion.div>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5 }}
          className="mt-4 text-xs text-textMuted"
        >
          No account needed. Your progress is saved in your browser.
        </motion.p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 40, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 1.35, type: 'spring', stiffness: 70, damping: 18 }}
        className="relative mx-auto mt-16 max-w-6xl px-4 sm:px-6"
      >
        <ProductPreview ayahs={ayahs} />
      </motion.div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

// Words the demo pretends you have learned: lillahi and rabbi in 1:2, yawmi in 1:4 (ayah:word index).
const DEMO_KNOWN = new Set(['2:1', '2:2', '4:1']);

function ProductPreview({ ayahs }: { ayahs: DemoAyah[] }) {
  const isDark = useIsDark();
  const [hideKnown, setHideKnown] = useState(true);
  const [peeked, setPeeked] = useState<Set<string>>(new Set());

  return (
    <div className="relative">
      <div className="absolute -inset-px rounded-xlarge bg-gradient-to-b from-primary/30 via-border to-transparent" aria-hidden />
      <div className="relative rounded-xlarge border border-border bg-card shadow-lift overflow-hidden">
        {/* window chrome */}
        <div className="flex items-center justify-between border-b border-border px-4 h-11">
          <div className="flex gap-1.5">
            <span className="h-3 w-3 rounded-full bg-[#ff5f57]/80" />
            <span className="h-3 w-3 rounded-full bg-[#febc2e]/80" />
            <span className="h-3 w-3 rounded-full bg-[#28c840]/80" />
          </div>
          <div className="hidden sm:flex items-center gap-2 rounded-pill bg-backgroundElement px-3 py-1 text-[11px] text-textMuted font-mono">
            quranki.org/quran/1
          </div>
          <div className="w-12" />
        </div>

        <div className="grid lg:grid-cols-[1fr_340px]">
          {/* Reader */}
          <div className="p-5 sm:p-8 border-b lg:border-b-0 lg:border-r border-border">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
              <div className="text-left">
                <div className="text-sm font-semibold">Al-Fatihah</div>
                <div className="text-xs text-textMuted">The Opener - 7 ayahs</div>
              </div>
              <button
                onClick={() => {
                  setHideKnown((v) => !v);
                  setPeeked(new Set());
                }}
                className={cn(
                  'chip transition-colors',
                  hideKnown && 'border-primary/40 bg-primary/10 text-primary',
                )}
              >
                {hideKnown ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                {hideKnown ? 'Hiding words you know' : 'Showing every gloss'}
              </button>
            </div>

            <div className="space-y-7">
              {ayahs.map((ayah) => (
                <div key={ayah.a}>
                  <div dir="rtl" className="flex flex-wrap items-start gap-x-2 gap-y-3">
                    {ayah.words.map((w, i) => {
                      const key = `${ayah.a}:${i}`;
                      const masked = hideKnown && DEMO_KNOWN.has(key) && !peeked.has(key);
                      return (
                        <button
                          key={key}
                          onClick={() =>
                            setPeeked((prev) => {
                              const next = new Set(prev);
                              if (next.has(key)) next.delete(key);
                              else next.add(key);
                              return next;
                            })
                          }
                          className="group flex flex-col items-center rounded-medium px-2 py-1 hover:bg-backgroundElement transition-colors"
                        >
                          <span className="uthmanic-text text-[1.9rem] sm:text-[2.2rem] leading-[1.9]">
                            {w.ar.map((s, j) => (
                              <span key={j} style={{ color: tajweedColor(s.c, isDark, 'var(--text)') }}>
                                {s.t}
                              </span>
                            ))}
                          </span>
                          <span dir="ltr" className="h-5 text-[12px] font-medium">
                            <AnimatePresence mode="wait" initial={false}>
                              {masked ? (
                                <motion.span
                                  key="hint"
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 4 }}
                                  className="inline-block rounded-[6px] bg-primary/10 px-1.5 text-[10px] font-bold uppercase tracking-wider text-primary"
                                >
                                  known
                                </motion.span>
                              ) : (
                                <motion.span
                                  key="gloss"
                                  initial={{ opacity: 0, y: -4 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: 4 }}
                                  className="inline-block"
                                >
                                  {w.en.map((s, j) => (
                                    <span key={j} style={{ color: glossColor(s.c, isDark, 'var(--text-secondary)') }}>
                                      {s.t}
                                    </span>
                                  ))}
                                </motion.span>
                              )}
                            </AnimatePresence>
                          </span>
                        </button>
                      );
                    })}
                    <span className="uthmanic-text text-[1.9rem] sm:text-[2.2rem] leading-[1.9] text-primary px-1">
                      {toArabicDigits(ayah.a)}
                    </span>
                  </div>
                  <p className="mt-2 text-left text-sm text-textSecondary">{ayah.translation}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Flashcard */}
          <div className="p-5 sm:p-6 bg-backgroundElement/40">
            <DemoFlashcard />
          </div>
        </div>
      </div>
    </div>
  );
}

const GRADE_STYLE: Record<GradeName, string> = {
  again: 'text-gradeAgain border-gradeAgain/30 hover:bg-gradeAgain/10',
  hard: 'text-gradeHard border-gradeHard/30 hover:bg-gradeHard/10',
  good: 'text-gradeGood border-gradeGood/30 hover:bg-gradeGood/10',
  easy: 'text-gradeEasy border-gradeEasy/30 hover:bg-gradeEasy/10',
};

const DEMO_DECK = [
  { ar: 'رَبّ', en: 'Lord', tl: 'rabb', count: 975 },
  { ar: 'يَوْم', en: 'day', tl: 'yawm', count: 475 },
  { ar: 'قَالَ', en: 'to say', tl: 'qala', count: 1618 },
];

function DemoFlashcard() {
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const previews = useMemo(() => previewGrades(createNewCard(new Date(0)), new Date(0)), []);
  const card = DEMO_DECK[index % DEMO_DECK.length];

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between text-xs text-textMuted mb-3">
        <span className="font-semibold uppercase tracking-wider">Today&apos;s review</span>
        <span className="font-mono">{(index % DEMO_DECK.length) + 1} / {DEMO_DECK.length}</span>
      </div>
      <div className="h-1 rounded-full bg-border overflow-hidden mb-4">
        <motion.div
          className="h-full bg-primary"
          animate={{ width: `${(((index % DEMO_DECK.length) + (flipped ? 1 : 0.5)) / DEMO_DECK.length) * 100}%` }}
        />
      </div>

      <button
        onClick={() => setFlipped(true)}
        className="relative flex-1 min-h-[220px] rounded-large border border-border bg-card shadow-soft [perspective:1000px]"
        aria-label="Reveal answer"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={`${index}-${flipped}`}
            initial={{ rotateY: flipped ? -90 : 0, opacity: 0 }}
            animate={{ rotateY: 0, opacity: 1 }}
            exit={{ rotateY: 90, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="absolute inset-0 flex flex-col items-center justify-center gap-2 p-5"
          >
            <span className="uthmanic-text text-6xl leading-[1.6]">{card.ar}</span>
            {flipped ? (
              <>
                <span className="text-xl font-semibold">{card.en}</span>
                <span className="text-xs text-textMuted">
                  {card.tl} - appears {card.count.toLocaleString()} times
                </span>
              </>
            ) : (
              <span className="text-xs text-textMuted flex items-center gap-1.5">
                Tap to reveal <kbd className="kbd">Space</kbd>
              </span>
            )}
          </motion.div>
        </AnimatePresence>
      </button>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {previews.map((p) => (
          <button
            key={p.grade}
            disabled={!flipped}
            onClick={() => {
              setFlipped(false);
              setIndex((i) => i + 1);
            }}
            className={cn(
              'flex flex-col items-center rounded-medium border bg-card py-2 text-xs font-semibold capitalize transition-all disabled:opacity-40',
              GRADE_STYLE[p.grade],
            )}
          >
            {p.grade}
            <span className="text-[10px] font-mono text-textMuted">{p.label}</span>
          </button>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-textMuted text-center">FSRS picks the next review for each grade.</p>
    </div>
  );
}

/* ------------------------------------------------------------------ */

function StatsStrip() {
  const stats = [
    { value: `${FACTS.stage1Coverage}%`, label: `of Quran words covered by the first ${FACTS.stage1Levels} levels` },
    { value: FACTS.words.toLocaleString(), label: 'vocabulary cards across every stage' },
    { value: String(FACTS.surahs), label: 'surahs with word-by-word Tajweed' },
    { value: String(FACTS.recitations), label: 'recitations with word timing' },
  ];
  return (
    <section className="border-y border-border bg-card/40">
      <div className="mx-auto grid max-w-6xl grid-cols-2 lg:grid-cols-4 divide-x divide-y lg:divide-y-0 divide-border">
        {stats.map((s, i) => (
          <Reveal key={s.label} delay={i * 0.06} className="px-5 py-8 sm:px-8">
            <div className="font-display text-4xl sm:text-5xl tracking-tight">{s.value}</div>
            <div className="mt-1.5 text-sm text-textSecondary text-pretty">{s.label}</div>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function CoverageSection({ curve }: { curve: { level: number; pct: number }[] }) {
  const W = 640;
  const H = 300;
  const maxLevel = 160;
  const pts = curve.filter((p) => p.level <= maxLevel);
  const x = (l: number) => (l / maxLevel) * W;
  const y = (p: number) => H - (p / 100) * H;
  const path = pts.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(p.level).toFixed(1)},${y(p.pct).toFixed(1)}`).join(' ');
  const area = `${path} L${x(pts[pts.length - 1].level)},${H} L0,${H} Z`;
  const marker = pts.find((p) => p.level === FACTS.stage1Levels) ?? pts[0];
  const [hover, setHover] = useState<{ level: number; pct: number } | null>(null);

  return (
    <section className="py-24 sm:py-32">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 grid lg:grid-cols-2 gap-14 items-center">
        <Reveal>
          <p className="text-sm font-semibold text-primary">The idea</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight text-balance">
            A small vocabulary unlocks most of the Quran.
          </h2>
          <p className="mt-5 text-textSecondary leading-relaxed text-pretty">
            Words like <span className="uthmanic-text text-text text-lg">قَالَ</span>,{' '}
            <span className="uthmanic-text text-text text-lg">ٱللَّه</span>, and{' '}
            <span className="uthmanic-text text-text text-lg">رَبّ</span> appear thousands of times. Quranki teaches
            the most frequent words first, so every level you finish lights up more of the text you actually read.
          </p>
          <ul className="mt-7 space-y-3 text-sm">
            {[
              `Stage 1: ${FACTS.stage1Levels} curated levels covering ${FACTS.stage1Coverage}% of all word occurrences`,
              'Stage 2: the 99 Names of Allah, with Arabic numerals',
              'Stages 3 to 5: every remaining word, down to the ones that appear once',
            ].map((t) => (
              <li key={t} className="flex gap-3">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="text-textSecondary">{t}</span>
              </li>
            ))}
          </ul>
        </Reveal>

        <Reveal delay={0.1}>
          <div className="card p-5 sm:p-7 shadow-soft">
            <div className="flex items-baseline justify-between">
              <div>
                <div className="text-sm font-semibold">Quran words you can understand</div>
                <div className="text-xs text-textMuted">By curriculum level, out of {FACTS.quranWords.toLocaleString()}</div>
              </div>
              <div className="text-right">
                <div className="font-display text-3xl text-primary">{Math.round((hover ?? marker).pct)}%</div>
                <div className="text-[11px] text-textMuted">at level {(hover ?? marker).level}</div>
              </div>
            </div>
            <svg
              viewBox={`-8 -8 ${W + 16} ${H + 32}`}
              className="mt-5 w-full h-auto touch-none"
              onPointerMove={(e) => {
                const rect = (e.currentTarget as SVGSVGElement).getBoundingClientRect();
                const lvl = ((e.clientX - rect.left) / rect.width) * (maxLevel + 1);
                const nearest = pts.reduce((a, b) => (Math.abs(b.level - lvl) < Math.abs(a.level - lvl) ? b : a));
                setHover(nearest);
              }}
              onPointerLeave={() => setHover(null)}
              role="img"
              aria-label={`Coverage reaches ${FACTS.stage1Coverage}% at level ${FACTS.stage1Levels}`}
            >
              <defs>
                <linearGradient id="cov" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="rgb(var(--primary-rgb))" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="rgb(var(--primary-rgb))" stopOpacity="0" />
                </linearGradient>
              </defs>
              {[25, 50, 75, 100].map((g) => (
                <g key={g}>
                  <line x1={0} x2={W} y1={y(g)} y2={y(g)} stroke="var(--border)" strokeDasharray="3 5" />
                  <text x={W} y={y(g) - 5} textAnchor="end" fontSize="11" fill="var(--text-muted)">
                    {g}%
                  </text>
                </g>
              ))}
              <motion.path
                d={area}
                fill="url(#cov)"
                initial={{ opacity: 0 }}
                whileInView={{ opacity: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1, delay: 0.4 }}
              />
              <motion.path
                d={path}
                fill="none"
                stroke="rgb(var(--primary-rgb))"
                strokeWidth="2.5"
                strokeLinejoin="round"
                initial={{ pathLength: 0 }}
                whileInView={{ pathLength: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 1.4, ease: 'easeOut' }}
              />
              {(() => {
                const p = hover ?? marker;
                return (
                  <g>
                    <line x1={x(p.level)} x2={x(p.level)} y1={y(p.pct)} y2={H} stroke="rgb(var(--primary-rgb))" strokeOpacity="0.4" />
                    <circle cx={x(p.level)} cy={y(p.pct)} r="5.5" fill="var(--card)" stroke="rgb(var(--primary-rgb))" strokeWidth="2.5" />
                  </g>
                );
              })()}
              <text x={0} y={H + 20} fontSize="11" fill="var(--text-muted)">Level 1</text>
              <text x={W} y={H + 20} textAnchor="end" fontSize="11" fill="var(--text-muted)">Level {maxLevel}</text>
            </svg>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Features() {
  const items = [
    {
      icon: Brain,
      title: 'Spaced repetition that adapts',
      body: 'FSRS schedules every word around your own memory. Grade Again, Hard, Good, or Easy and the next review lands right before you would forget.',
      className: 'lg:col-span-2',
      visual: <FsrsVisual />,
    },
    {
      icon: EyeOff,
      title: 'Translations fade as you learn',
      body: 'Mastered words lose their English gloss everywhere in the reader. Tap for a hint when you need it.',
    },
    {
      icon: AudioLines,
      title: 'Recitation that follows along',
      body: `${FACTS.recitations} recitations highlight each word as it is recited, from Al-Husary to Al-Dosari.`,
    },
    {
      icon: Languages,
      title: 'Tajweed, roots, and grammar',
      body: 'Color-coded Tajweed, transliteration, and a tap-through word panel with root, lemma, and morphology.',
    },
    {
      icon: Sparkles,
      title: 'Start from the alphabet',
      body: 'A complete Qaida track teaches letters, harakat, and madd before vocabulary begins.',
    },
    {
      icon: ChartNoAxesColumnIncreasing,
      title: 'Progress you can feel',
      body: 'See exactly how much of each surah you understand, with streaks and daily study time.',
    },
    {
      icon: Keyboard,
      title: 'Built for the keyboard',
      body: 'Space to flip, 1 to 4 to grade, and a command palette to jump to any surah or ayah.',
    },
    {
      icon: Cloud,
      title: 'Synced with your phone',
      body: 'One free account keeps reviews, bookmarks, and settings in sync with the iOS and Android apps.',
      className: 'sm:col-span-2 lg:col-span-4',
    },
  ];

  return (
    <section id="features" className="py-24 sm:py-32 border-t border-border bg-card/30 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="max-w-2xl">
          <p className="text-sm font-semibold text-primary">Everything in one place</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight text-balance">
            A study app and a Mushaf that know about each other.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {items.map((item, i) => {
            const Icon = item.icon;
            return (
              <Reveal key={item.title} delay={(i % 4) * 0.05} className={cn('card p-6 flex flex-col', item.className)}>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-medium bg-primary/10 text-primary">
                  <Icon className="w-5 h-5" />
                </span>
                <h3 className="mt-5 font-semibold text-[15px]">{item.title}</h3>
                <p className="mt-2 text-sm text-textSecondary leading-relaxed">{item.body}</p>
                {item.visual && <div className="mt-6">{item.visual}</div>}
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}

function FsrsVisual() {
  // Memory decays after each review; every successful review flattens the next curve,
  // so reviews (dots) spread further apart.
  const stabilities = [1, 2.2, 4.6, 9.5];
  const total = stabilities.reduce((a, b) => a + b, 0);
  const W = 400;
  const top = 8;
  const span = 64;
  let x0 = 0;
  return (
    <svg viewBox={`0 0 ${W} 92`} className="w-full h-auto" aria-hidden>
      <line x1="0" x2={W} y1={top + span * 0.8} y2={top + span * 0.8} stroke="var(--border)" strokeDasharray="3 5" />
      {stabilities.map((s, i) => {
        const len = (s / total) * (W - 8);
        const pts = Array.from({ length: 30 }, (_, k) => {
          const t = k / 29;
          const r = Math.exp(-t * 1.6 * 0.14 * 7);
          return `${(x0 + t * len).toFixed(1)},${(top + (1 - r) * span * 1.3).toFixed(1)}`;
        });
        const sx = x0;
        x0 += len;
        return (
          <g key={i}>
            <motion.path
              d={`M${pts.join(' L')}`}
              fill="none"
              stroke="rgb(var(--primary-rgb))"
              strokeWidth="2"
              strokeLinecap="round"
              initial={{ pathLength: 0 }}
              whileInView={{ pathLength: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.4 }}
            />
            <circle cx={sx + 2} cy={top} r="4" fill="rgb(var(--primary-rgb))" />
            <text x={sx + 2} y={88} fontSize="10" fill="var(--text-muted)">
              {i === 0 ? 'learn' : `review ${i}`}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

/* ------------------------------------------------------------------ */

function HowItWorks() {
  const steps = [
    {
      n: '01',
      title: 'Learn a few words a day',
      body: 'Pick a daily goal. Each card shows the word, its meaning, audio, and a real ayah where it appears.',
    },
    {
      n: '02',
      title: 'Review when FSRS says so',
      body: 'Come back daily. Reviews are short because you only see what is about to fade.',
    },
    {
      n: '03',
      title: 'Read and recognize',
      body: 'Open any surah. Words you know appear without a translation, so you read the Arabic itself.',
    },
  ];
  return (
    <section id="how" className="py-24 sm:py-32 scroll-mt-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-semibold text-primary">How it works</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight text-balance">
            Ten minutes a day is enough.
          </h2>
        </Reveal>
        <div className="mt-14 grid gap-4 md:grid-cols-3">
          {steps.map((s, i) => (
            <Reveal key={s.n} delay={i * 0.08} className="relative card p-7 overflow-hidden">
              <span className="absolute -right-2 -top-6 font-display text-[7rem] leading-none text-primary/10 select-none">
                {s.n}
              </span>
              <h3 className="relative font-semibold text-lg">{s.title}</h3>
              <p className="relative mt-3 text-sm text-textSecondary leading-relaxed">{s.body}</p>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function StoreButton({ href, kind }: { href: string; kind: 'apple' | 'google' }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-3 h-14 pl-4 pr-5 rounded-medium bg-text text-background hover:opacity-90 transition-opacity"
    >
      {kind === 'apple' ? (
        <svg viewBox="0 0 24 24" className="w-6 h-6" fill="currentColor" aria-hidden>
          <path d="M16.37 12.6c-.02-2.2 1.8-3.26 1.88-3.31-1.03-1.5-2.62-1.7-3.18-1.73-1.35-.14-2.64.8-3.33.8-.69 0-1.74-.78-2.87-.76-1.47.02-2.83.86-3.59 2.18-1.53 2.66-.39 6.6 1.1 8.76.73 1.06 1.6 2.24 2.73 2.2 1.1-.04 1.51-.71 2.84-.71 1.32 0 1.7.71 2.86.69 1.18-.02 1.93-1.07 2.65-2.13.84-1.22 1.18-2.41 1.2-2.47-.03-.01-2.29-.88-2.31-3.5zM14.2 6.1c.6-.73 1.01-1.75.9-2.76-.87.04-1.92.58-2.54 1.31-.56.64-1.05 1.68-.92 2.67.97.08 1.96-.49 2.56-1.22z" />
        </svg>
      ) : (
        <svg viewBox="0 0 24 24" className="w-6 h-6" aria-hidden>
          <path fill="#34A853" d="M3.6 2.3 13.4 12l-9.8 9.7c-.4-.2-.6-.6-.6-1.1V3.4c0-.5.2-.9.6-1.1z" />
          <path fill="#FBBC04" d="m16.7 15.3-3.3-3.3 3.3-3.3 3.7 2.1c1 .6 1 1.9 0 2.4z" />
          <path fill="#4285F4" d="M16.7 8.7 13.4 12 3.6 2.3c.3-.2.8-.2 1.2 0z" />
          <path fill="#EA4335" d="M16.7 15.3 4.8 21.7c-.4.2-.9.2-1.2 0l9.8-9.7z" />
        </svg>
      )}
      <span className="flex flex-col leading-tight text-left">
        <span className="text-[10px] opacity-70">{kind === 'apple' ? 'Download on the' : 'Get it on'}</span>
        <span className="text-[15px] font-semibold">{kind === 'apple' ? 'App Store' : 'Google Play'}</span>
      </span>
    </a>
  );
}

function DemoVideo() {
  // Load the YouTube player only after a click so the landing page stays light.
  const [playing, setPlaying] = useState(false);
  return (
    <section id="demo" className="pb-24 sm:pb-32 scroll-mt-20">
      <div className="mx-auto max-w-4xl px-4 sm:px-6">
        <Reveal className="text-center max-w-2xl mx-auto">
          <p className="text-sm font-semibold text-primary">Demo</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight text-balance">
            See Quranki in action.
          </h2>
        </Reveal>
        <Reveal delay={0.08} className="mt-12">
          <div className="relative aspect-video overflow-hidden rounded-large border border-border bg-backgroundElement shadow-soft">
            {playing ? (
              <iframe
                src={`https://www.youtube-nocookie.com/embed/${DEMO_VIDEO_ID}?autoplay=1&rel=0`}
                title="Quranki demo video"
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                allowFullScreen
                className="absolute inset-0 h-full w-full"
              />
            ) : (
              <button
                type="button"
                onClick={() => setPlaying(true)}
                aria-label="Play the Quranki demo video"
                className="group absolute inset-0 h-full w-full"
              >
                <Image
                  src="/images/demo-thumbnail.jpg"
                  alt=""
                  fill
                  sizes="(min-width: 896px) 896px, 100vw"
                  className="object-cover transition-transform duration-500 group-hover:scale-[1.02]"
                />
                <span className="absolute inset-0 grid place-items-center bg-black/10 group-hover:bg-black/20 transition-colors">
                  <span className="grid place-items-center w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-primary text-white shadow-soft transition-transform group-hover:scale-105">
                    <Play className="w-7 h-7 sm:w-8 sm:h-8 translate-x-0.5" fill="currentColor" />
                  </span>
                </span>
              </button>
            )}
          </div>
        </Reveal>
        <p className="mt-4 text-center text-sm text-textSecondary">
          <Link
            href={DEMO_VIDEO_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 hover:text-text transition-colors"
          >
            Watch on YouTube
            <ArrowUpRight className="w-3.5 h-3.5 opacity-60" />
          </Link>
        </p>
      </div>
    </section>
  );
}

function MobileApps() {
  const shots = ['/images/screenshots/app-1.jpg', '/images/screenshots/app-2.jpg', '/images/screenshots/app-3.jpg'];
  return (
    <section className="py-24 sm:py-32 border-t border-border bg-card/30 overflow-hidden">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 grid lg:grid-cols-[1fr_1.2fr] gap-14 items-center">
        <Reveal>
          <p className="text-sm font-semibold text-primary">On your phone too</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight text-balance">
            Review on the go. Pick up where you left off.
          </h2>
          <p className="mt-5 text-textSecondary leading-relaxed">
            The Quranki apps for iPhone and Android add offline study, daily reminders, and a Hifz mode for
            memorizing by ruku. Sign in with the same account and your progress follows you.
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <StoreButton kind="apple" href={APP_STORE_URL} />
            <StoreButton kind="google" href={PLAY_STORE_URL} />
          </div>
        </Reveal>
        <div className="relative flex justify-center gap-4 sm:gap-6">
          {shots.map((src, i) => (
            <motion.div
              key={src}
              initial={{ opacity: 0, y: 60 }}
              whileInView={{ opacity: 1, y: i === 1 ? -24 : 12 }}
              viewport={{ once: true, margin: '-60px' }}
              transition={{ type: 'spring', stiffness: 80, damping: 18, delay: i * 0.1 }}
              className="relative w-[30%] max-w-[210px] overflow-hidden rounded-[22px] border border-border shadow-lift"
            >
              <Image src={src} alt="" width={420} height={908} className="w-full h-auto" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function Faq() {
  const [open, setOpen] = useState<number | null>(0);
  return (
    <section id="faq" className="py-24 sm:py-32 scroll-mt-20">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <Reveal className="text-center">
          <p className="text-sm font-semibold text-primary">FAQ</p>
          <h2 className="mt-3 font-display text-4xl sm:text-5xl tracking-tight">Questions, answered.</h2>
        </Reveal>
        <div className="mt-12 divide-y divide-border border-y border-border">
          {FAQS.map((faq, i) => {
            const isOpen = open === i;
            return (
              <div key={faq.q}>
                <button
                  onClick={() => setOpen(isOpen ? null : i)}
                  className="flex w-full items-center justify-between gap-6 py-5 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-medium text-[15px]">{faq.q}</span>
                  <motion.span animate={{ rotate: isOpen ? 45 : 0 }} className="shrink-0 text-textMuted">
                    <Plus className="w-5 h-5" />
                  </motion.span>
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.25 }}
                      className="overflow-hidden"
                    >
                      <p className="pb-6 pr-10 text-sm text-textSecondary leading-relaxed">{faq.a}</p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ */

function FinalCta({ startHref, startLabel }: { startHref: string; startLabel: string }) {
  return (
    <section className="px-4 sm:px-6 pb-24">
      <Reveal className="relative mx-auto max-w-6xl overflow-hidden rounded-xlarge border border-primary/30 bg-primary/[0.07] px-6 py-16 sm:py-24 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          <div className="absolute left-1/2 top-full h-[30rem] w-[50rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/25 blur-[100px]" />
        </div>
        <div className="relative">
          <LogoMark size={56} tile className="mx-auto" />
          <h2 className="mt-6 font-display text-4xl sm:text-6xl tracking-tight text-balance">
            Your first ten words are <span className="italic text-primary">waiting.</span>
          </h2>
          <p className="mt-4 text-textSecondary">Set up takes less than a minute.</p>
          <Link href={startHref} className="btn-primary mt-8 h-12 px-7 rounded-pill text-[15px] shadow-glow">
            {startLabel}
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </Reveal>
    </section>
  );
}

export function Footer() {
  const cols: { title: string; links: [string, string][] }[] = [
    {
      title: 'Study',
      links: [
        ['/onboarding', 'Get started'],
        ['/learn', 'Curriculum'],
        ['/progress', 'Progress'],
      ],
    },
    {
      title: 'Read',
      links: [
        ['/quran', 'All surahs'],
        ['/quran/1', 'Al-Fatihah'],
        ['/quran/36', 'Ya-Sin'],
        ['/quran/67', 'Al-Mulk'],
      ],
    },
    {
      title: 'Guides',
      links: [
        ['/blog', 'Blog'],
        ['/blog/how-to-learn-quranic-arabic-fast', 'Learn Quranic Arabic fast'],
        ['/blog/most-common-words-in-the-quran', 'Most common Quran words'],
        ['/blog/how-to-memorize-the-quran-without-forgetting', 'Memorize without forgetting'],
        ['/blog/surah-al-fatihah-word-by-word', 'Al-Fatihah word by word'],
        ['/blog/99-names-of-allah-meanings', '99 Names of Allah'],
      ],
    },
    {
      title: 'Apps',
      links: [
        [APP_STORE_URL, 'iPhone'],
        [PLAY_STORE_URL, 'Android'],
        [DEMO_VIDEO_URL, 'Demo video'],
        [GITHUB_URL, 'GitHub'],
      ],
    },
  ];
  return (
    <footer className="border-t border-border">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-14 grid gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_repeat(4,1fr)]">
        <div>
          <Wordmark size={30} />
          <p className="mt-4 max-w-xs text-sm text-textSecondary">
            Learn the words of the Quran with spaced repetition, then read it with understanding.
          </p>
        </div>
        {cols.map((c) => (
          <div key={c.title}>
            <div className="text-xs font-semibold uppercase tracking-wider text-textMuted">{c.title}</div>
            <ul className="mt-4 space-y-2.5 text-sm">
              {c.links.map(([href, label]) => {
                const external = href.startsWith('http');
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      {...(external ? { target: '_blank', rel: 'noopener noreferrer' } : {})}
                      className="inline-flex items-center gap-1 text-textSecondary hover:text-text transition-colors"
                    >
                      {href === GITHUB_URL && (
                        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5" fill="currentColor" aria-hidden>
                          <path d="M12 .5C5.65.5.5 5.65.5 12a11.5 11.5 0 0 0 7.86 10.92c.58.1.79-.25.79-.56v-2c-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.76 2.69 1.25 3.35.96.1-.75.4-1.25.73-1.54-2.55-.29-5.24-1.28-5.24-5.69 0-1.26.45-2.29 1.19-3.1-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11 11 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.84 1.19 3.1 0 4.42-2.69 5.39-5.26 5.68.41.36.78 1.06.78 2.14v3.17c0 .31.21.67.8.56A11.5 11.5 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5z" />
                        </svg>
                      )}
                      {label}
                      {external && <ArrowUpRight className="w-3 h-3 opacity-60" />}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-border">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 py-6 text-xs text-textMuted flex flex-col sm:flex-row justify-between gap-2">
          <span>&copy; {new Date().getFullYear()} Quranki</span>
          <span>Translation: Sahih International.</span>
        </div>
      </div>
    </footer>
  );
}
