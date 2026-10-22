'use client';

import React, { useEffect, useMemo } from 'react';
import Link from 'next/link';
import { BookMarked } from 'lucide-react';
import { buildHifzSessionQueue, countDueHifzCards } from '@/lib/hifz';
import { loadSurahAyahs } from '@/lib/quran-reader';
import { useHifzAvailable } from '@/hooks/use-lemma-sets';
import { useNow } from '@/hooks/use-now';
import { useHifzStore } from '@/store/hifz-store';

/** Slim Quran entry for memorization. Hidden until a ruku unlocks, like the mobile row. */
export function MemorizeEntryRow() {
  const available = useHifzAvailable();
  const enrolledRukuIds = useHifzStore((s) => s.enrolledRukuIds);
  const cards = useHifzStore((s) => s.cards);
  const now = useNow();
  const { due, next } = useMemo(
    () => countDueHifzCards({ enrolledRukuIds, cards, introSeen: true }, now),
    [cards, enrolledRukuIds, now],
  );
  const sessionSize = due + next;

  useEffect(() => {
    if (sessionSize === 0) return;
    const first = buildHifzSessionQueue({ enrolledRukuIds, cards, introSeen: true }, new Date())[0];
    if (first) void loadSurahAyahs(first.ruku.surah).catch(() => {});
  }, [cards, enrolledRukuIds, sessionSize]);

  if (!available) return null;
  const subtitle =
    sessionSize > 0
      ? [due > 0 ? `${due} due` : null, next > 0 ? `${next} new` : null].filter(Boolean).join(' - ')
      : enrolledRukuIds.length > 0
        ? 'Nothing due right now'
        : 'Add an unlocked ruku';

  return (
    <div className="card flex items-center gap-3 p-3">
      <Link href="/memorize" className="flex flex-1 items-center gap-3 min-w-0">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-backgroundSelected text-primary">
          <BookMarked className="w-[18px] h-[18px]" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold">Memorize</span>
          <span className="block truncate text-xs text-textSecondary">{subtitle}</span>
        </span>
      </Link>
      {sessionSize > 0 && (
        <Link href="/session/hifz" className="btn-primary h-9 px-4 rounded-pill text-xs">
          Start
        </Link>
      )}
    </div>
  );
}
