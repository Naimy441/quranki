'use client';

import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, BookOpen, Bookmark, ChevronDown, ChevronRight, Minus, Navigation, Plus, Search, X } from 'lucide-react';
import { SURAH_INDEX, getSurahMeta, getSurahNameGlyph } from '@/lib/quran-reader';
import type { SurahIndexEntry } from '@/lib/quran-reader-types';
import { formatInterval } from '@/lib/fsrs';
import { hifzCardKey, type HifzProgressMap } from '@/lib/hifz';
import { formatAyahRef } from '@/lib/quran-marks';
import { formatRukuAyahRange, formatRukuTitle, groupUnlockedRukusBySurah, type Ruku } from '@/lib/ruku';
import { useHifzAvailable, useQuranCoverage, useRecognizedLemmaIds } from '@/hooks/use-lemma-sets';
import { useCanonicalReady } from '@/lib/quran-lemma-index';
import { useNow } from '@/hooks/use-now';
import { useHifzStore } from '@/store/hifz-store';
import { useQuranMarksStore } from '@/store/quran-marks-store';
import { QuranJumpDialog } from '@/components/quran/play-dialogs';
import { MemorizeEntryRow } from '@/components/hifz/memorize-entry-row';
import { cn } from '@/lib/cn';

type Unlocked = { ruku: Ruku; coverage: number }[];
const EMPTY: Unlocked = [];

function normalize(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '');
}

function Ring({ pct }: { pct: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg viewBox="0 0 36 36" className="w-10 h-10 -rotate-90 shrink-0" aria-hidden>
      <circle cx="18" cy="18" r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
      <circle
        cx="18"
        cy="18"
        r={r}
        fill="none"
        stroke="rgb(var(--primary-rgb))"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={`${(pct / 100) * c} ${c}`}
        className="transition-[stroke-dasharray] duration-700"
      />
    </svg>
  );
}

export function SurahList() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [jumpOpen, setJumpOpen] = useState(false);
  const [openSurah, setOpenSurah] = useState<number | null>(null);
  const now = useNow().getTime();
  const coverage = useQuranCoverage();
  const lastRead = useQuranMarksStore((s) => s.lastRead);
  const recentSurahs = useQuranMarksStore((s) => s.recentSurahs);
  const hasSaved = useQuranMarksStore((s) => s.pinPlacements.length > 0 || s.bookmarks.length > 0);
  const marksHydrated = useQuranMarksStore((s) => s.hydrated);
  const hifzAvailable = useHifzAvailable();
  const hifzHydrated = useHifzStore((s) => s.hydrated);
  const hifzIntroSeen = useHifzStore((s) => s.introSeen);
  const enrolledRukuIds = useHifzStore((s) => s.enrolledRukuIds);
  const cards = useHifzStore((s) => s.cards);
  const enrollRuku = useHifzStore((s) => s.enrollRuku);
  const unenrollRuku = useHifzStore((s) => s.unenrollRuku);
  const enrolledSet = useMemo(() => new Set(enrolledRukuIds), [enrolledRukuIds]);
  const recognized = useRecognizedLemmaIds();
  const canonicalReady = useCanonicalReady((s) => s.ready);
  const presentedIntro = useRef(false);

  // The first time a ruku unlocks, introduce memorization (mobile pushes the same intro).
  useEffect(() => {
    if (!hifzHydrated || !hifzAvailable || hifzIntroSeen || presentedIntro.current) return;
    presentedIntro.current = true;
    router.push('/hifz-intro');
  }, [hifzAvailable, hifzHydrated, hifzIntroSeen, router]);

  const unlockedBySurah = useMemo(
    () => (hifzAvailable && canonicalReady ? groupUnlockedRukusBySurah(recognized) : new Map<number, Unlocked>()),
    [hifzAvailable, canonicalReady, recognized],
  );

  const dueByRukuId = useMemo(() => {
    const labels = new Map<number, string>();
    for (const id of enrolledRukuIds) {
      const stored = cards[hifzCardKey(id)];
      if (!stored) continue;
      const dueMs = new Date(stored.card.due).getTime() - now;
      labels.set(id, dueMs <= 0 ? 'Due now' : `Due in ${formatInterval(dueMs)}`);
    }
    return labels;
  }, [cards, enrolledRukuIds, now]);

  const q = normalize(query.trim());
  const surahs = q
    ? SURAH_INDEX.filter(
        (s) =>
          normalize(s.tr).includes(q) ||
          normalize(s.en).includes(q) ||
          normalize(s.nt).includes(q) ||
          s.ar.includes(query.trim()) ||
          String(s.n) === q,
      )
    : SURAH_INDEX;

  const toggle = useCallback((n: number) => setOpenSurah((cur) => (cur === n ? null : n)), []);
  const lastMeta = lastRead ? getSurahMeta(lastRead.surah) : null;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search surahs"
            className="input pl-10 pr-9 bg-card"
          />
          {query && (
            <button onClick={() => setQuery('')} className="absolute right-2 top-1/2 -translate-y-1/2 icon-btn w-7 h-7" aria-label="Clear">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        <button onClick={() => setJumpOpen(true)} className="icon-btn h-11 w-11 bg-card border border-border text-primary" title="Jump to surah and ayah">
          <Navigation className="w-[18px] h-[18px]" />
        </button>
        <Link href="/saved" className="icon-btn h-11 w-11 bg-card border border-border text-primary" title="Saved pins and bookmarks">
          <Bookmark className={cn('w-[18px] h-[18px]', hasSaved && 'fill-current')} />
        </Link>
      </div>

      {marksHydrated && lastRead && lastMeta && !q && (
        <Link
          href={`/quran/${lastRead.surah}?ayah=${lastRead.ayah}`}
          className="group relative overflow-hidden card p-4 flex items-center gap-4 hover:border-primary/40 transition-colors"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-transparent" aria-hidden />
          <span className="relative h-11 w-11 rounded-medium bg-primary text-onPrimary flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </span>
          <span className="relative flex-1 min-w-0">
            <span className="block text-xs font-semibold text-primary">Continue reading</span>
            <span className="block truncate font-semibold">
              {lastMeta.en} {formatAyahRef(lastRead.surah, lastRead.ayah)}
            </span>
          </span>
          <ArrowRight className="relative w-5 h-5 text-textMuted group-hover:translate-x-1 group-hover:text-primary transition" />
        </Link>
      )}

      {marksHydrated && recentSurahs.length > 0 && !q && (
        <div className="flex gap-2 overflow-x-auto no-scrollbar">
          {recentSurahs.map((entry) => {
            const meta = getSurahMeta(entry.n);
            if (!meta) return null;
            return (
              <Link
                key={entry.n}
                href={`/quran/${entry.n}?ayah=${entry.ayah}`}
                className="shrink-0 rounded-medium border border-border bg-card px-3 py-2 hover:border-primary/40 transition-colors"
              >
                <div className="text-sm font-semibold whitespace-nowrap">{meta.en}</div>
                <div className="text-xs text-textSecondary">{formatAyahRef(entry.n, entry.ayah)}</div>
              </Link>
            );
          })}
        </div>
      )}

      {!q && <MemorizeEntryRow />}

      {surahs.length === 0 ? (
        <div className="card py-16 text-center text-sm text-textMuted">No surah matches &quot;{query}&quot;</div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 items-start">
          {surahs.map((surah) => (
            <SurahRukuCard
              key={surah.n}
              surah={surah}
              understanding={coverage?.summary.surahAverages[surah.n - 1] ?? 0}
              unlocked={unlockedBySurah.get(surah.n) ?? EMPTY}
              open={openSurah === surah.n}
              enrolledSet={enrolledSet}
              dueByRukuId={dueByRukuId}
              cards={cards}
              now={now}
              onToggle={toggle}
              onEnroll={enrollRuku}
              onUnenroll={unenrollRuku}
            />
          ))}
        </div>
      )}

      <QuranJumpDialog
        open={jumpOpen}
        onClose={() => setJumpOpen(false)}
        onJump={(s, a) => {
          setJumpOpen(false);
          router.push(`/quran/${s}?ayah=${a}`);
        }}
      />
    </div>
  );
}

const SurahRukuCard = memo(function SurahRukuCard({
  surah,
  understanding,
  unlocked,
  open,
  enrolledSet,
  dueByRukuId,
  cards,
  now,
  onToggle,
  onEnroll,
  onUnenroll,
}: {
  surah: SurahIndexEntry;
  understanding: number;
  unlocked: Unlocked;
  open: boolean;
  enrolledSet: Set<number>;
  dueByRukuId: Map<number, string>;
  cards: HifzProgressMap;
  now: number;
  onToggle: (n: number) => void;
  onEnroll: (id: number) => void;
  onUnenroll: (id: number) => void;
}) {
  const router = useRouter();
  const pct = understanding * 100;
  const rukusLabel = unlocked.length > 0 ? `${unlocked.length} ${unlocked.length === 1 ? 'ruku' : 'rukus'}` : null;
  return (
    <div className="card overflow-hidden">
      <div className="group flex items-center gap-3.5 p-3.5">
        <Link href={`/quran/${surah.n}`} className="relative" aria-label={`Open ${surah.en}`}>
          <Ring pct={pct} />
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold">{surah.n}</span>
        </Link>
        <div className="flex-1 min-w-0">
          <Link href={`/quran/${surah.n}`} className="block truncate font-semibold group-hover:text-primary transition-colors">
            {surah.en}
          </Link>
          <p className="truncate text-xs text-textMuted">
            {surah.nt} - {surah.ac} {surah.ac === 1 ? 'ayah' : 'ayahs'}
            {pct >= 1 && <span className="font-semibold text-primary"> - {Math.round(pct)}% understood</span>}
          </p>
          {rukusLabel && (
            <button onClick={() => onToggle(surah.n)} className="mt-1 inline-flex items-center gap-1 text-xs font-semibold text-primary">
              {rukusLabel}
              <ChevronDown className={cn('w-3 h-3 transition-transform', open && 'rotate-180')} />
            </button>
          )}
        </div>
        <Link href={`/quran/${surah.n}`} className="flex items-center gap-1.5" tabIndex={-1}>
          <span className="surah-name-glyph text-[2.1rem] text-textSecondary group-hover:text-text transition-colors">
            {getSurahNameGlyph(surah.n)}
          </span>
          <ChevronRight className="w-4 h-4 text-textMuted" />
        </Link>
      </div>
      {open &&
        unlocked.map((entry) => {
          const enrolled = enrolledSet.has(entry.ruku.id);
          const due = dueByRukuId.get(entry.ruku.id) ?? null;
          return (
            <div key={entry.ruku.id} className="flex items-center gap-3 border-t border-border px-4 py-2.5">
              <button
                onClick={() => {
                  const stored = cards[hifzCardKey(entry.ruku.id)];
                  const isDue = stored && new Date(stored.card.due).getTime() - now <= 0;
                  if (enrolled && isDue) router.push('/session/hifz');
                  else router.push(`/quran/${entry.ruku.surah}?ayah=${entry.ruku.fromAyah}`);
                }}
                className="flex flex-1 items-center gap-3 text-left"
              >
                <span className="w-16 text-sm font-semibold tabular-nums">Ruku {entry.ruku.surahRukuNumber}</span>
                <span className="min-w-0">
                  <span className="block text-xs text-textSecondary">
                    {formatRukuAyahRange(entry.ruku)} - {Math.round(entry.coverage * 100)}%
                  </span>
                  {enrolled && due && <span className="block text-xs font-semibold text-primary">{due}</span>}
                </span>
              </button>
              {enrolled ? (
                <button
                  onClick={() => {
                    if (window.confirm(`Remove this ruku?\n${formatRukuTitle(entry.ruku)} will leave memorization, and its review history will be cleared.`)) {
                      onUnenroll(entry.ruku.id);
                    }
                  }}
                  className="icon-btn w-8 h-8 text-danger"
                  title="Remove from memorization"
                >
                  <Minus className="w-4 h-4" />
                </button>
              ) : (
                <button onClick={() => onEnroll(entry.ruku.id)} className="icon-btn w-8 h-8 text-primary" title="Add to memorize">
                  <Plus className="w-4 h-4" />
                </button>
              )}
            </div>
          );
        })}
    </div>
  );
});
