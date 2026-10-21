'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Play } from 'lucide-react';
import { useProgress } from '@/context/progress-context';
import {
  formatLevelLabel,
  getCoverageThroughLevel,
  getLevelById,
  getLevelStatus,
  isAsmaDigitLevel,
  isAsmaLevel,
  isQaidaLevel,
  type WordState,
} from '@/lib/levels';

function wordStatusLabel(state: WordState): { label: string; color: string } {
  if (state.isMastered) return { label: 'Mastered', color: 'text-primary' };
  if (state.isNew) return { label: 'Not yet introduced', color: 'text-textSecondary' };
  if (state.isDue) return { label: 'Due', color: 'text-danger' };
  return { label: 'Learning', color: 'text-textSecondary' };
}

export function LevelDetailClient({ id }: { id: string }) {
  const { progress } = useProgress();
  const level = getLevelById(id);

  const now = useMemo(() => new Date(), []);
  const status = useMemo(() => {
    return level ? getLevelStatus(level, progress, now) : null;
  }, [level, progress, now]);

  const coverage = useMemo(() => {
    return level ? getCoverageThroughLevel(level.number) : null;
  }, [level]);

  if (!level || !status || !coverage) {
    notFound();
  }

  const qaida = isQaidaLevel(level.number);
  const asma = isAsmaLevel(level.number);
  const asmaDigit = isAsmaDigitLevel(level);

  return (
    <div className="max-w-xl mx-auto px-4 py-6 flex flex-col gap-5 select-none animate-fadeIn">
      {/* Back button & Start button */}
      <div className="flex items-center justify-between">
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-textSecondary hover:text-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Curriculum</span>
        </Link>

        <Link
          href={`/session/${level.id}`}
          className="py-2 px-4 bg-primary hover:opacity-90 text-onPrimary rounded-medium text-xs font-bold flex items-center gap-1.5 transition-opacity shadow-xs"
        >
          <Play className="w-3.5 h-3.5 fill-onPrimary" />
          <span>Start Session</span>
        </Link>
      </div>

      {/* Header Info matching mobile src/app/level/[id].tsx */}
      <div className="flex flex-col gap-2.5">
        <div className="text-xs font-bold text-primary">
          {formatLevelLabel(level.number)}
        </div>
        <h1 className="text-2xl font-bold text-text leading-tight">{level.title}</h1>

        {asmaDigit ? (
          <p className="text-xs text-textSecondary leading-relaxed">
            These ten Arabic digits sit with the 99 names. Master a digit and matching numbers
            across the app switch to it. 1 becomes ١ as soon as you know 1.
          </p>
        ) : qaida ? (
          <p className="text-xs text-textSecondary leading-relaxed">
            These cards teach you to read Arabic. See the letter or word, say it, then reveal the
            name or reading.
          </p>
        ) : asma ? (
          <p className="text-xs text-textSecondary leading-relaxed">
            These names are studied as their own stage. Reviews of names you already know are mixed
            into the same daily session.
          </p>
        ) : (
          <div className="text-xs text-textSecondary space-y-1">
            <p>
              Once mastered through here,{' '}
              <span className="font-bold text-text">{coverage.percent}% of the Quran</span> (
              {coverage.quranWords.toLocaleString()} words).
            </p>
            <p className="text-textMuted">
              These words are introduced automatically, in this order, during study. Reviews of
              words you already know are mixed into the same daily session.
            </p>
          </div>
        )}

        {/* Summary Pills: Mastered, Due, Unseen */}
        <div className="flex items-center gap-4 pt-1">
          <div className="flex items-center gap-1.5 text-xs text-textSecondary">
            <div className="w-2 h-2 rounded-full bg-primary" />
            <span>
              {status.masteredCount} Mastered
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-textSecondary">
            <div className="w-2 h-2 rounded-full bg-danger" />
            <span>
              {status.dueCount} Due
            </span>
          </div>

          <div className="flex items-center gap-1.5 text-xs text-textSecondary">
            <div className="w-2 h-2 rounded-full bg-textMuted" />
            <span>
              {status.newCount} Unseen
            </span>
          </div>
        </div>
      </div>

      {/* Words List Header */}
      <div className="pt-2">
        <h2 className="text-sm font-bold text-text mb-2">
          {qaida ? 'Cards' : 'Words'} ({status.totalCount})
        </h2>

        {/* Word rows matching mobile wordRow */}
        <div className="flex flex-col divide-y divide-border border-y border-border">
          {status.wordStates.map((item) => {
            const { label, color } = wordStatusLabel(item);

            return (
              <div
                key={item.word.id}
                className="py-3 px-1 flex items-center gap-4 hover:bg-backgroundElement/50 transition-colors"
              >
                <span className="uthmanic-text text-xl min-w-[90px] text-right font-bold text-text select-none">
                  {item.word.arabic}
                </span>

                <span className="flex-1 text-xs text-textSecondary truncate font-medium">
                  {item.word.transliteration ?? item.word.english}
                </span>

                <span className={`text-xs font-semibold ${color} shrink-0`}>
                  {label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
