'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Play } from 'lucide-react';
import { displayArabic } from '@/lib/arabic-display';
import {
  formatLevelLabel,
  getCoverageThroughLevel,
  getGrammarIntro,
  getLevel,
  getLevelStatus,
  isAsmaDigitLevel,
  isAsmaLevel,
  isQaidaLevel,
  type WordState,
} from '@/lib/levels';
import { getQaidaReadableCoverageThroughLevel } from '@/lib/qaida-readable';
import { formatCount } from '@/lib/stats';
import { useNow } from '@/hooks/use-now';
import { useStoresHydrated } from '@/components/providers/app-state';
import { GrammarIntroRow } from '@/components/learn/grammar-intro-row';
import { useProgressStore } from '@/store/progress-store';
import { cn } from '@/lib/cn';

function wordStatusLabel(state: WordState): { label: string; className: string } {
  if (state.isMastered) return { label: 'Mastered', className: 'text-primary' };
  if (state.isNew) return { label: 'Not yet introduced', className: 'text-textSecondary' };
  if (state.isDue) return { label: 'Due', className: 'text-danger' };
  return { label: 'Learning', className: 'text-textSecondary' };
}

export function LevelDetailClient({ id }: { id: string }) {
  const hydrated = useStoresHydrated();
  const progress = useProgressStore((s) => s.progress);
  const learnToRead = useProgressStore((s) => s.settings.canReadQuran === false);
  const now = useNow();
  const level = getLevel(Number(id));
  const status = level ? getLevelStatus(level, progress, now) : null;
  const coverage = level ? getCoverageThroughLevel(level.number) : null;
  const qaidaCoverage = level && isQaidaLevel(level.number) ? getQaidaReadableCoverageThroughLevel(level.number) : null;
  const grammar = level ? getGrammarIntro(level) : undefined;

  if (!level || !status || !coverage) {
    return <div className="mx-auto max-w-3xl px-4 py-16 text-center text-textMuted">Level not found.</div>;
  }
  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl px-4 lg:px-8 py-10 space-y-4">
        <div className="skeleton h-10 w-64" />
        <div className="skeleton h-16" />
        <div className="skeleton h-64" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 lg:px-8 py-6 lg:py-10">
      <Link href="/learn" className="btn-ghost -ml-3 h-9 px-3 text-xs">
        <ArrowLeft className="w-4 h-4" /> Curriculum
      </Link>
      <div className="mt-3 text-xs font-semibold text-primary">{formatLevelLabel(level.number, learnToRead)}</div>
      <h1 className="mt-1 font-display text-4xl lg:text-5xl tracking-tight">{level.title}</h1>

      <div className="mt-3 max-w-xl space-y-1 text-sm text-textSecondary" data-keep-digits={isAsmaDigitLevel(level) ? '' : undefined}>
        {isAsmaDigitLevel(level) ? (
          <p>
            These ten Arabic digits sit with the 99 names. Master a digit and matching numbers across the app switch to it. 1
            becomes ١ as soon as you know 1. 19 becomes ١٩ only after you know both 1 and 9.
          </p>
        ) : isQaidaLevel(level.number) ? (
          <>
            <p>These cards teach you to read Arabic. See the letter or word, say it, then reveal the name or reading. After Stage 1, Stage 2 begins.</p>
            {qaidaCoverage && (
              <p>
                Once mastered through here, you can read {formatCount(qaidaCoverage.readable)} of {formatCount(qaidaCoverage.total)} Quran words
              </p>
            )}
          </>
        ) : isAsmaLevel(level.number) ? (
          <p>
            These names unlock after Stage {learnToRead ? 2 : 1} and are studied as their own stage. When the Quran uses the name itself, that verse
            is the example; otherwise the verse shows the same meaning. Reviews of names you already know are mixed into the same daily session.
          </p>
        ) : (
          <>
            <p>Once mastered through here, {coverage.percent}% of the Quran</p>
            <p className="text-textMuted">{formatCount(coverage.quranWords)} words</p>
            <p>These words are introduced automatically, in this order, during study. Reviews of words you already know are mixed into the same daily session.</p>
          </>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-4">
        {[
          ['bg-primary', `${status.masteredCount} Mastered`],
          ['bg-danger', `${status.dueCount} Due`],
          ['bg-textSecondary', `${status.newCount} Unseen`],
        ].map(([c, l]) => (
          <span key={l} className="flex items-center gap-1.5 text-sm text-textSecondary">
            <span className={cn('h-2 w-2 rounded-full', c)} />
            {l}
          </span>
        ))}
        <Link href="/session/review" className="btn-primary ml-auto h-10 px-4 rounded-pill">
          <Play className="w-4 h-4 fill-current" /> Study
        </Link>
      </div>

      {grammar && (
        <div className="mt-5">
          <GrammarIntroRow word={grammar} />
        </div>
      )}

      <h2 className="mt-8 mb-3 text-sm font-semibold">
        {isQaidaLevel(level.number) ? 'Cards' : 'Words'} ({status.totalCount})
      </h2>
      <div className="card divide-y divide-border">
        {status.wordStates.map((item) => {
          const { label, className } = wordStatusLabel(item);
          return (
            <div key={item.word.id} className="flex items-center gap-4 px-4 py-3">
              <span className="uthmanic-text min-w-[5rem] text-right text-2xl">{displayArabic(item.word)}</span>
              <span className="min-w-0 flex-1 truncate text-sm text-textSecondary">{item.word.transliteration ?? item.word.english}</span>
              <span className={cn('shrink-0 text-xs font-semibold', className)}>{label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
