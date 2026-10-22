'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { displayArabic } from '@/lib/arabic-display';
import { formatInterval } from '@/lib/fsrs';
import { getWordReviewTimeline, type TimelineWord } from '@/lib/levels';
import { useNow } from '@/hooks/use-now';
import { useStoresHydrated } from '@/components/providers/app-state';
import { useProgressStore } from '@/store/progress-store';

function rowDueLabel(item: TimelineWord): string | null {
  if (item.dueMs <= 0) return 'Due';
  if (item.dueMs < 86_400_000) return formatInterval(item.dueMs);
  return null;
}

/** Every studied word grouped by the day it comes back, as in the mobile timeline. */
export default function WordTimelinePage() {
  const hydrated = useStoresHydrated();
  const progress = useProgressStore((s) => s.progress);
  const now = useNow();
  const buckets = hydrated ? getWordReviewTimeline(progress, now) : [];
  const total = buckets.reduce((sum, b) => sum + b.words.length, 0);
  const dueNow = buckets[0]?.key === 'due' ? buckets[0].words.length : 0;

  return (
    <div className="mx-auto max-w-3xl px-4 lg:px-8 py-6 lg:py-10">
      <Link href="/learn" className="btn-ghost -ml-3 h-9 px-3 text-xs">
        <ArrowLeft className="w-4 h-4" /> Learn
      </Link>
      <h1 className="mt-2 font-display text-4xl tracking-tight">Word timeline</h1>
      <p className="mt-2 text-sm text-textSecondary">
        {total === 0
          ? 'Words you study show up here with the day they come back for review.'
          : dueNow > 0
            ? `${total} scheduled - ${dueNow} due now`
            : `${total} scheduled`}
      </p>
      {hydrated && total === 0 && (
        <p className="mt-10 text-center text-sm text-textMuted">Nothing scheduled yet. Start a session and reviews will land on this timeline.</p>
      )}
      <div className="mt-6 space-y-6">
        {buckets.map((bucket) => (
          <section key={bucket.key}>
            <div className="sticky top-14 lg:top-16 z-10 flex items-baseline justify-between bg-background/90 py-2 backdrop-blur">
              <h2 className="text-sm font-semibold">{bucket.title}</h2>
              <span className="text-xs text-textMuted">{bucket.words.length}</span>
            </div>
            <div className="card divide-y divide-border">
              {bucket.words.map((item) => {
                const when = rowDueLabel(item);
                return (
                  <Link key={item.word.id} href={`/level/${item.levelNumber}`} className="flex items-center gap-4 px-4 py-2.5 hover:bg-backgroundElement/60">
                    <span className="uthmanic-text min-w-[4.5rem] text-right text-2xl">{displayArabic(item.word)}</span>
                    <span className="min-w-0 flex-1 truncate text-sm text-textSecondary">{item.word.transliteration ?? item.word.english}</span>
                    {when && <span className={item.dueMs <= 0 ? 'text-xs font-semibold text-danger' : 'text-xs text-textSecondary'}>{when}</span>}
                  </Link>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
