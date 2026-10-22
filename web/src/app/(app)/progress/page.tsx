'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { BookCheck, CheckCheck, Flame, Layers, Search, Volume2 } from 'lucide-react';
import { deserializeCard, isWordMastered } from '@/lib/fsrs';
import {
  getIntroductionFrontier,
  getLevelForWord,
  getLevelStatusesForStage,
  getQaidaIntroductionFrontier,
  getStage,
  getStageProgress,
  getTrackContext,
  getUnlockedStage,
  getVisibleStages,
  getWord,
  isStageUnlocked,
  levelDisplayNumber,
  QAIDA_STAGE,
  stageDisplayTitle,
  stagePillLabel,
} from '@/lib/levels';
import { getQaidaReadableCoverage } from '@/lib/qaida-readable';
import { SURAH_INDEX } from '@/lib/quran-reader';
import { computeStreak, dayKey, formatCount, formatStudyDuration, studyTimeWeek } from '@/lib/stats';
import { getVocabExamples } from '@/lib/vocab-examples';
import { playWordPronunciation } from '@/lib/word-pronunciation';
import { useNow } from '@/hooks/use-now';
import { useQuranCoverage, useRecognizedLemmaIds } from '@/hooks/use-lemma-sets';
import { useStoresHydrated } from '@/components/providers/app-state';
import { Segmented } from '@/components/ui/controls';
import { useProgressStore } from '@/store/progress-store';
import { cn } from '@/lib/cn';

function Meter({ value }: { value: number }) {
  return (
    <div className="h-2.5 overflow-hidden rounded-full bg-card">
      <motion.div className="h-full rounded-full bg-primary" initial={{ width: 0 }} animate={{ width: `${Math.min(100, value * 100)}%` }} transition={{ duration: 0.9, ease: 'easeOut' }} />
    </div>
  );
}

function Panel({ title, accent, children, foot }: { title: string; accent?: React.ReactNode; children: React.ReactNode; foot?: string }) {
  return (
    <div className="rounded-large bg-backgroundElement p-5 space-y-3">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">{title}</h2>
        {accent && <span className="text-sm font-semibold text-primary">{accent}</span>}
      </div>
      {children}
      {foot && <p className="text-xs text-textSecondary">{foot}</p>}
    </div>
  );
}

export default function ProgressPage() {
  const hydrated = useStoresHydrated();
  const progress = useProgressStore((s) => s.progress);
  const maxUnlockedLevel = useProgressStore((s) => s.maxUnlockedLevel);
  const canReadQuran = useProgressStore((s) => s.settings.canReadQuran);
  const reviewDates = useProgressStore((s) => s.reviewDates);
  const streakGraceDates = useProgressStore((s) => s.streakGraceDates);
  const studyMsByDate = useProgressStore((s) => s.studyMsByDate);
  const recognized = useRecognizedLemmaIds();
  const coverage = useQuranCoverage();
  const now = useNow();
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const [selectedStudyKey, setSelectedStudyKey] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'mastered' | 'learning'>('all');

  const track = getTrackContext(progress, canReadQuran);
  const visibleStages = getVisibleStages(track.learnToRead);
  const frontier = track.learnToRead && !track.qaidaComplete ? getQaidaIntroductionFrontier(progress) : getIntroductionFrontier(progress);
  const reachedLevel = track.learnToRead && !track.qaidaComplete ? frontier : Math.max(maxUnlockedLevel, getIntroductionFrontier(progress));
  const unlockedStage = getUnlockedStage(reachedLevel, track);
  const selectedStage = getStage(selectedStageId ?? unlockedStage.id) ?? visibleStages[0] ?? unlockedStage;
  const visibleStage = isStageUnlocked(selectedStage, reachedLevel, track) ? selectedStage : (visibleStages[0] ?? unlockedStage);
  const levelStatuses = useMemo(() => getLevelStatusesForStage(visibleStage, progress, now), [visibleStage, progress, now]);
  const streak = computeStreak(reviewDates, streakGraceDates, now);
  const showQaidaReadable = track.learnToRead && !track.qaidaComplete;
  const qaidaReadable = showQaidaReadable ? getQaidaReadableCoverage(progress) : null;
  const qaidaReadProgress = qaidaReadable && qaidaReadable.total > 0 ? qaidaReadable.readable / qaidaReadable.total : 0;
  const masteredCount = showQaidaReadable ? getStageProgress(QAIDA_STAGE, progress, now).mastered : recognized.size;
  const overallProgress = coverage ? coverage.memorized / Math.max(1, coverage.total) : 0;
  const studyWeek = studyTimeWeek(studyMsByDate, now);
  const selectedDay = studyWeek.find((d) => d.key === selectedStudyKey) ?? studyWeek.find((d) => d.isToday) ?? studyWeek[studyWeek.length - 1];
  const weekMax = Math.max(...studyWeek.map((d) => d.ms), 10 * 60_000);

  const words = useMemo(() => {
    const list: { id: string; mastered: boolean }[] = [];
    for (const [id, wp] of Object.entries(progress)) {
      const w = getWord(id);
      if (!w || w.kind === 'grammar') continue;
      list.push({ id, mastered: isWordMastered(deserializeCard(wp.card), wp.lastGrade) });
    }
    return list;
  }, [progress]);
  const filteredWords = useMemo(() => {
    const q = query.trim().toLowerCase();
    return words
      .filter((w) => filter === 'all' || (filter === 'mastered' ? w.mastered : !w.mastered))
      .map((w) => ({ ...w, word: getWord(w.id)! }))
      .filter((w) => !q || w.word.arabic.includes(q) || w.word.english.toLowerCase().includes(q) || w.word.transliteration?.toLowerCase().includes(q))
      .sort((a, b) => a.id.localeCompare(b.id));
  }, [words, filter, query]);

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-5xl px-4 lg:px-8 py-10 space-y-4">
        <div className="skeleton h-10 w-56" />
        <div className="grid grid-cols-3 gap-3">{[0, 1, 2].map((i) => <div key={i} className="skeleton h-24" />)}</div>
        <div className="skeleton h-32" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-5xl px-4 lg:px-8 py-6 lg:py-10 space-y-5">
      <h1 className="font-display text-4xl lg:text-5xl tracking-tight">Progress</h1>

      <div className="grid grid-cols-3 gap-3">
        {[
          { icon: CheckCheck, label: showQaidaReadable ? 'Mastered' : 'Words mastered', value: formatCount(masteredCount) },
          { icon: Flame, label: 'Day streak', value: String(streak) },
          { icon: Layers, label: 'Level', value: String(levelDisplayNumber(reachedLevel, !canReadQuran)) },
        ].map((s) => (
          <div key={s.label} className="rounded-large bg-backgroundElement p-4">
            <s.icon className="w-4 h-4 text-primary" />
            <div className="mt-3 text-3xl font-semibold tracking-tight">{s.value}</div>
            <div className="text-xs text-textSecondary">{s.label}</div>
          </div>
        ))}
      </div>

      <Panel
        title={showQaidaReadable ? 'Quran you can read' : 'Overall memorization'}
        accent={`${Math.round((showQaidaReadable ? qaidaReadProgress : overallProgress) * 100)}%`}
        foot={
          showQaidaReadable
            ? `${formatCount(qaidaReadable?.readable ?? 0)} of ${formatCount(qaidaReadable?.total ?? 0)} words in the Quran`
            : `${formatCount(coverage?.memorized ?? 0)} of ${formatCount(coverage?.total ?? 0)} words in the Quran`
        }
      >
        <Meter value={showQaidaReadable ? qaidaReadProgress : overallProgress} />
      </Panel>

      <div className="grid gap-5 lg:grid-cols-2">
        {!showQaidaReadable && coverage && (
          <Panel title="Average ayah understanding" accent={`${Math.round(coverage.summary.average * 100)}%`} foot="The share of vocabulary you know in a typical ayah">
            <Meter value={coverage.summary.average} />
            <Histogram bins={coverage.summary.histogram} />
          </Panel>
        )}
        <Panel
          title="Study time"
          accent={`${formatStudyDuration(selectedDay.ms)} ${selectedDay.caption}`}
          foot={showQaidaReadable ? 'Time spent studying each day' : 'Time spent memorizing words each day'}
        >
          <div className="flex h-36 items-end gap-2">
            {studyWeek.map((d) => (
              <button key={d.key} onClick={() => setSelectedStudyKey(d.key)} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
                <motion.span
                  initial={{ height: 0 }}
                  animate={{ height: `${d.ms > 0 ? Math.max(6, (d.ms / weekMax) * 100) : 3}%` }}
                  className={cn('w-full max-w-[36px] rounded-[7px]', d.key === selectedDay.key ? 'bg-primary' : d.ms > 0 ? 'bg-primary/45' : 'bg-border')}
                />
                <span className={cn('text-[11px]', d.isToday ? 'font-bold' : 'text-textMuted')}>{d.weekday}</span>
              </button>
            ))}
          </div>
        </Panel>
      </div>

      {!showQaidaReadable && coverage && (
        <Panel title="Average surah understanding" foot="Each bar is one surah, in Quran order">
          <div className="flex h-28 items-end gap-[2px]">
            {coverage.summary.surahAverages.map((avg, i) => (
              <Link
                key={i}
                href={`/quran/${i + 1}`}
                title={`${SURAH_INDEX[i].en}: ${Math.round(avg * 100)}%`}
                className="flex-1 rounded-t-[2px] bg-primary/70 transition-colors hover:bg-primary"
                style={{ height: `${Math.max(2, avg * 100)}%` }}
              />
            ))}
          </div>
        </Panel>
      )}

      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold">{stageDisplayTitle(visibleStage, !canReadQuran)}</h2>
        <div className="flex items-center gap-0.5 rounded-medium border border-border bg-card p-1">
          {visibleStages.map((stage) => {
            const selected = visibleStage.id === stage.id;
            const unlocked = isStageUnlocked(stage, reachedLevel, track);
            return (
              <button
                key={stage.id}
                disabled={!unlocked}
                onClick={() => setSelectedStageId(stage.id)}
                className={cn('h-8 min-w-[2rem] rounded-small px-2 text-xs font-semibold', selected ? 'bg-backgroundSelected text-primary' : unlocked ? 'text-text' : 'text-textMuted opacity-50')}
              >
                {stagePillLabel(stage, !canReadQuran)}
              </button>
            );
          })}
        </div>
      </div>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(2.75rem,1fr))] gap-1.5">
        {levelStatuses.map((status) => {
          const ratio = status.totalCount === 0 ? 0 : status.masteredCount / status.totalCount;
          return (
            <Link
              key={status.level.id}
              href={`/level/${status.level.number}`}
              title={`${status.level.title}: ${status.masteredCount} of ${status.totalCount}`}
              className="flex aspect-square items-center justify-center rounded-medium border border-border text-xs font-semibold transition-transform hover:scale-105"
              style={{
                background: ratio > 0 ? `color-mix(in srgb, rgb(var(--primary-rgb)) ${Math.round(ratio * 100)}%, var(--background-element))` : 'var(--background-element)',
                color: ratio > 0.5 ? 'rgb(var(--on-primary-rgb))' : 'var(--text)',
              }}
            >
              {levelDisplayNumber(status.level.number, !canReadQuran)}
            </Link>
          );
        })}
      </div>

      <ReviewCalendar dates={reviewDates} />

      <div className="card p-5 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="flex items-center gap-2 text-sm font-semibold">
            <BookCheck className="w-4 h-4 text-primary" /> Your words <span className="font-normal text-textMuted">{filteredWords.length}</span>
          </h2>
          <div className="flex gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
              <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search" className="input h-10 w-40 pl-9 sm:w-56" />
            </div>
            <Segmented
              value={filter}
              onChange={setFilter}
              options={[
                { value: 'all', label: 'All' },
                { value: 'mastered', label: 'Mastered' },
                { value: 'learning', label: 'Learning' },
              ]}
            />
          </div>
        </div>
        {filteredWords.length === 0 ? (
          <p className="py-12 text-center text-sm text-textMuted">{words.length === 0 ? 'Words you study will appear here.' : 'No words match.'}</p>
        ) : (
          <div className="mt-4 grid max-h-[520px] gap-2 overflow-y-auto pr-1 sm:grid-cols-2 lg:grid-cols-3">
            {filteredWords.slice(0, 400).map(({ id, word, mastered }) => {
              const level = getLevelForWord(id);
              const playable = word.kind === 'qaida' || getVocabExamples(word).length > 0;
              return (
                <div key={id} className="flex items-center gap-3 rounded-medium border border-border px-3 py-2.5">
                  <span className="uthmanic-text min-w-[3.5rem] text-center text-2xl">{word.arabic}</span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{word.english}</span>
                    <span className="block text-[11px] text-textMuted">
                      {level ? `Level ${levelDisplayNumber(level.number, !canReadQuran)}` : ''} - {mastered ? 'mastered' : 'learning'}
                    </span>
                  </span>
                  {playable && (
                    <button onClick={() => void playWordPronunciation(id)} className="icon-btn h-8 w-8" title="Listen">
                      <Volume2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function Histogram({ bins }: { bins: { label: string; ayahCount: number }[] }) {
  const max = Math.max(...bins.map((b) => b.ayahCount), 1);
  return (
    <div>
      <div className="flex h-28 items-end gap-1">
        {bins.map((b) => (
          <div key={b.label} title={`${b.label}: ${b.ayahCount} ayahs`} className="flex-1 rounded-t-[4px] bg-primary/70" style={{ height: `${Math.max(2, (b.ayahCount / max) * 100)}%` }} />
        ))}
      </div>
      <div className="mt-1 flex justify-between text-[10px] text-textMuted" data-keep-digits>
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
}

function ReviewCalendar({ dates }: { dates: string[] }) {
  const set = useMemo(() => new Set(dates), [dates]);
  const weeks = 26;
  const today = new Date();
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - (weeks * 7 - 1) - start.getUTCDay());
  const cells: { key: string; on: boolean; future: boolean }[] = [];
  for (let i = 0; i < (weeks + 1) * 7; i++) {
    const d = new Date(start);
    d.setUTCDate(start.getUTCDate() + i);
    cells.push({ key: dayKey(d), on: set.has(dayKey(d)), future: d > today });
  }
  return (
    <div className="card p-5 sm:p-6">
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Review calendar</h3>
        <span className="text-xs text-textMuted">
          <span className="font-semibold text-text">{cells.filter((c) => c.on).length}</span> days in the last six months
        </span>
      </div>
      <div className="no-scrollbar mt-4 overflow-x-auto">
        <div className="grid w-max grid-flow-col grid-rows-7 gap-1">
          {cells.map((c) => (
            <span key={c.key} title={c.key} className={cn('h-3.5 w-3.5 rounded-[3px]', c.future ? 'bg-transparent' : c.on ? 'bg-primary' : 'bg-backgroundElement')} />
          ))}
        </div>
      </div>
    </div>
  );
}
