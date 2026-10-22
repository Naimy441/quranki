'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { BookOpen, Minus, Plus } from 'lucide-react';
import { formatInterval } from '@/lib/fsrs';
import { hifzCardKey } from '@/lib/hifz';
import { getSurahMeta } from '@/lib/quran-reader';
import { formatRukuAyahRange, formatRukuTitle, getRuku, getRukuCoverage, HIFZ_UNLOCK_RATIO, RUKUS } from '@/lib/ruku';
import { useCanonicalReady } from '@/lib/quran-lemma-index';
import { useHifzAvailable, useRecognizedLemmaIds } from '@/hooks/use-lemma-sets';
import { useNow } from '@/hooks/use-now';
import { MemorizeEntryRow } from '@/components/hifz/memorize-entry-row';
import { useHifzStore } from '@/store/hifz-store';

export default function MemorizePage() {
  const ready = useCanonicalReady((s) => s.ready);
  const recognized = useRecognizedLemmaIds();
  const available = useHifzAvailable();
  const enrolledRukuIds = useHifzStore((s) => s.enrolledRukuIds);
  const cards = useHifzStore((s) => s.cards);
  const enroll = useHifzStore((s) => s.enrollRuku);
  const unenroll = useHifzStore((s) => s.unenrollRuku);
  const resetIntro = useHifzStore((s) => s.resetIntroSeen);
  const now = useNow().getTime();
  const enrolled = new Set(enrolledRukuIds);

  const rows = useMemo(() => {
    if (!ready) return [];
    return RUKUS.map((ruku) => ({ ruku, coverage: getRukuCoverage(ruku, recognized) }));
  }, [ready, recognized]);
  const unlocked = rows.filter((r) => r.coverage >= HIFZ_UNLOCK_RATIO && !enrolled.has(r.ruku.id));
  const closest = rows
    .filter((r) => r.coverage < HIFZ_UNLOCK_RATIO)
    .sort((a, b) => b.coverage - a.coverage)
    .slice(0, 6);

  return (
    <div className="mx-auto max-w-5xl px-4 lg:px-8 py-6 lg:py-10 space-y-8">
      <div>
        <h1 className="font-display text-4xl lg:text-5xl tracking-tight">Memorize</h1>
        <p className="mt-2 max-w-2xl text-sm text-textSecondary">
          Hifz by ruku. A ruku unlocks once you understand {Math.round(HIFZ_UNLOCK_RATIO * 100)}% of the words in its ayahs.
          Each enrolled ruku is one card, scheduled with the same FSRS reviews as your words.
        </p>
      </div>

      <MemorizeEntryRow />

      {enrolledRukuIds.length > 0 && (
        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-textMuted">Your rukus</h2>
          <div className="card divide-y divide-border">
            {enrolledRukuIds.map((id) => {
              const ruku = getRuku(id);
              if (!ruku) return null;
              const stored = cards[hifzCardKey(id)];
              const dueMs = stored ? new Date(stored.card.due).getTime() - now : 0;
              return (
                <div key={id} className="flex items-center gap-3 px-4 py-3">
                  <Link href={`/quran/${ruku.surah}?ayah=${ruku.fromAyah}`} className="flex-1 min-w-0">
                    <span className="block truncate text-sm font-semibold">{formatRukuTitle(ruku)}</span>
                    <span className="block text-xs text-textMuted">
                      {formatRukuAyahRange(ruku)} - {ruku.ayahCount} ayahs
                    </span>
                  </Link>
                  <span className={dueMs <= 0 ? 'text-xs font-semibold text-primary' : 'text-xs text-textSecondary'}>
                    {!stored || stored.lastGrade === null ? 'New' : dueMs <= 0 ? 'Due now' : `Due in ${formatInterval(dueMs)}`}
                  </span>
                  <button
                    onClick={() => {
                      if (window.confirm(`Remove this ruku?\n${formatRukuTitle(ruku)} will leave memorization, and its review history will be cleared.`)) unenroll(id);
                    }}
                    className="icon-btn w-8 h-8 text-danger"
                    title="Remove"
                  >
                    <Minus className="w-4 h-4" />
                  </button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {!ready ? (
        <div className="space-y-3">
          <div className="skeleton h-14" />
          <div className="skeleton h-14" />
        </div>
      ) : unlocked.length > 0 ? (
        <section>
          <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-textMuted">Ready to add</h2>
          <div className="card divide-y divide-border">
            {unlocked.map(({ ruku, coverage }) => (
              <div key={ruku.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/quran/${ruku.surah}?ayah=${ruku.fromAyah}`} className="flex-1 min-w-0">
                  <span className="block truncate text-sm font-semibold">{formatRukuTitle(ruku)}</span>
                  <span className="block text-xs text-textMuted">
                    {formatRukuAyahRange(ruku)} - {Math.round(coverage * 100)}% understood
                  </span>
                </Link>
                <button onClick={() => enroll(ruku.id)} className="btn-secondary h-8 px-3 text-xs">
                  <Plus className="w-3.5 h-3.5" /> Add
                </button>
              </div>
            ))}
          </div>
        </section>
      ) : (
        !available && (
          <section className="card p-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
                <BookOpen className="w-5 h-5" />
              </span>
              <div>
                <div className="font-semibold">No rukus unlocked yet</div>
                <div className="text-sm text-textSecondary">Keep learning words. These are the closest:</div>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              {closest.map(({ ruku, coverage }) => (
                <div key={ruku.id}>
                  <div className="flex justify-between text-sm">
                    <span>
                      {getSurahMeta(ruku.surah)?.en} - Ruku {ruku.surahRukuNumber}
                    </span>
                    <span className="font-semibold text-primary">{Math.round(coverage * 100)}%</span>
                  </div>
                  <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-border">
                    <div className="h-full bg-primary" style={{ width: `${(coverage / HIFZ_UNLOCK_RATIO) * 100}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )
      )}

      <Link href="/hifz-intro" onClick={() => resetIntro()} className="inline-block text-xs text-textMuted hover:text-text">
        How memorization works
      </Link>
    </div>
  );
}
