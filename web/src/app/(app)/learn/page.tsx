'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, BookOpen, CalendarDays, CheckCheck, Clock, Flame, Play, Sparkles } from 'lucide-react';
import { formatInterval } from '@/lib/fsrs';
import {
  getGrammarIntro,
  getIntroductionFrontier,
  getLevelStatusesForStage,
  getQaidaIntroductionFrontier,
  getStage,
  getStageProgress,
  getUnlockedStage,
  getVisibleStages,
  isStageUnlocked,
  QAIDA_STAGE,
  type LevelStatus,
  type Word,
} from '@/lib/levels';
import { getSurahMeta } from '@/lib/quran-reader';
import { computeStreak, formatCount, formatStudyDuration, studyTimeForDay } from '@/lib/stats';
import { useStudyQueue } from '@/hooks/use-study-queue';
import { useRefreshNowAt } from '@/hooks/use-now';
import { useRecognizedLemmaIds } from '@/hooks/use-lemma-sets';
import { useStoresHydrated } from '@/components/providers/app-state';
import { LevelCard } from '@/components/learn/level-card';
import { GrammarIntroRow } from '@/components/learn/grammar-intro-row';
import { StagePicker } from '@/components/quranki/stage-picker';
import { StudyWeekChart } from '@/components/quranki/study-week-chart';
import { MemorizeEntryRow } from '@/components/hifz/memorize-entry-row';
import { useProgressStore } from '@/store/progress-store';
import { useQuranMarksStore } from '@/store/quran-marks-store';

type LearnRow = { key: string; type: 'grammar'; word: Word } | { key: string; type: 'level'; status: LevelStatus };

function rowsForStatuses(statuses: LevelStatus[]): LearnRow[] {
  const rows: LearnRow[] = [];
  for (const status of statuses) {
    const grammar = getGrammarIntro(status.level);
    if (grammar) rows.push({ key: `grammar-${grammar.id}`, type: 'grammar', word: grammar });
    rows.push({ key: status.level.id, type: 'level', status });
  }
  return rows;
}

export default function LearnPage() {
  const hydrated = useStoresHydrated();
  const progress = useProgressStore((s) => s.progress);
  const wordsPerSession = useProgressStore((s) => s.settings.wordsPerSession);
  const reviewDates = useProgressStore((s) => s.reviewDates);
  const streakGraceDates = useProgressStore((s) => s.streakGraceDates);
  const studyMsByDate = useProgressStore((s) => s.studyMsByDate);
  const maxUnlockedLevel = useProgressStore((s) => s.maxUnlockedLevel);
  const lastRead = useQuranMarksStore((s) => s.lastRead);
  const recognized = useRecognizedLemmaIds();
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);
  const q = useStudyQueue();
  const { now, track } = q;
  useRefreshNowAt(q.upcoming?.dueAt.getTime());

  const visibleStages = getVisibleStages(track.learnToRead);
  const frontier = track.learnToRead && !track.qaidaComplete ? getQaidaIntroductionFrontier(progress) : getIntroductionFrontier(progress);
  const reachedLevel = track.learnToRead && !track.qaidaComplete ? frontier : Math.max(maxUnlockedLevel, getIntroductionFrontier(progress));
  const unlockedStage = getUnlockedStage(reachedLevel, track);
  const masteredCount =
    track.learnToRead && !track.qaidaComplete ? getStageProgress(QAIDA_STAGE, progress, now).mastered : recognized.size;
  const selectedStage = getStage(selectedStageId ?? unlockedStage.id) ?? visibleStages[0] ?? unlockedStage;
  const visibleStage = isStageUnlocked(selectedStage, reachedLevel, track) ? selectedStage : (visibleStages[0] ?? unlockedStage);
  const rows = useMemo(() => rowsForStatuses(getLevelStatusesForStage(visibleStage, progress, now)), [visibleStage, progress, now]);
  const stageEntries = visibleStages.map((stage) => ({
    stage,
    progress: getStageProgress(stage, progress, now),
    unlocked: isStageUnlocked(stage, reachedLevel, track),
  }));
  const streak = computeStreak(reviewDates, streakGraceDates, now);
  const studyTodayMs = studyTimeForDay(studyMsByDate, now);

  if (!hydrated) {
    return (
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-8 lg:grid-cols-12 lg:px-8">
        <div className="space-y-4 lg:col-span-7">
          <div className="skeleton h-52 rounded-xlarge" />
          <div className="skeleton h-12" />
          <div className="skeleton h-20" />
          <div className="skeleton h-20" />
        </div>
        <div className="hidden space-y-4 lg:col-span-5 lg:block">
          <div className="skeleton h-48" />
        </div>
      </div>
    );
  }

  const hasWorkToday = q.studyToday.length > 0;
  const heroHeadline = hasWorkToday
    ? `${q.studyToday.length} ${q.studyToday.length === 1 ? 'word' : 'words'} to review`
    : q.extraSession.length > 0
      ? 'All done for today'
      : 'All caught up';
  const heroSubtitle = hasWorkToday
    ? [q.dueCount > 0 ? `${q.dueCount} due` : null, q.newCount > 0 ? `${q.newCount} new` : null].filter(Boolean).join(' - ')
    : q.extraSession.length > 0
      ? 'Study ahead if you want more.'
      : q.upcoming
        ? `${q.upcoming.count} ${q.upcoming.count === 1 ? 'word' : 'words'} come back in ${formatInterval(q.upcoming.ms)}`
        : q.newRemaining === 0
          ? 'More new words unlock tomorrow.'
          : 'Nothing due right now.';
  const heroButtonLabel = hasWorkToday ? 'Start session' : q.extraStudy.length > 0 ? `Study ${q.extraStudy.length} more` : 'Study more';
  const lastMeta = lastRead ? getSurahMeta(lastRead.surah) : null;
  const currentIndex = rows.findIndex((r) => r.type === 'level' && r.status.level.number === frontier);

  return (
    <div className="mx-auto max-w-6xl px-4 py-6 lg:px-8 lg:py-10">
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-12">
        <div className="flex flex-col gap-5 lg:col-span-7">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-xlarge bg-primary p-6 text-onPrimary shadow-glow sm:p-7"
          >
            <div aria-hidden className="absolute -right-16 -top-16 h-56 w-56 rounded-full bg-white/10 blur-2xl" />
            <div className="relative">
              <div className="flex items-start gap-3">
                <h1 className="flex-1 font-display text-4xl leading-tight sm:text-[2.75rem]">{heroHeadline}</h1>
                <Link href="/word-timeline" className="flex h-10 w-10 items-center justify-center rounded-full bg-onPrimary text-primary" title="Word timeline">
                  <CalendarDays className="w-5 h-5" />
                </Link>
              </div>
              <p className="mt-1 text-sm text-onPrimary/85">{heroSubtitle}</p>
              {q.canStart && (
                <Link
                  href="/session/review"
                  className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-medium bg-onPrimary text-sm font-semibold text-primary transition hover:opacity-95 sm:w-auto sm:inline-flex sm:px-6"
                >
                  <Play className="w-4 h-4 fill-current" />
                  {heroButtonLabel}
                </Link>
              )}
              <div className="mt-6 grid grid-cols-3 gap-2 border-t border-onPrimary/25 pt-4">
                {[
                  { icon: CheckCheck, value: formatCount(masteredCount), label: 'Mastered' },
                  { icon: Flame, value: String(streak), label: 'Day streak' },
                  { icon: Clock, value: formatStudyDuration(studyTodayMs), label: 'Today' },
                ].map((s) => (
                  <div key={s.label}>
                    <div className="flex items-center gap-1.5 font-semibold">
                      <s.icon className="w-4 h-4 opacity-90" />
                      {s.value}
                    </div>
                    <div className="text-xs text-onPrimary/75">{s.label}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>

          <StagePicker
            entries={stageEntries}
            selectedStageId={visibleStage.id}
            wordsPerDay={wordsPerSession}
            learnToRead={track.learnToRead}
            progressMap={progress}
            onSelect={setSelectedStageId}
          />

          {currentIndex > 4 && (
            <button
              onClick={() => document.getElementById(`level-${frontier}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
              className="btn-secondary h-9 self-start rounded-pill px-3.5 text-xs"
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Jump to your current level
            </button>
          )}

          <div className="flex flex-col gap-2">
            {rows.map((row) =>
              row.type === 'grammar' ? (
                <GrammarIntroRow key={row.key} word={row.word} />
              ) : (
                <div key={row.key} id={`level-${row.status.level.number}`} className="scroll-mt-24">
                  <LevelCard status={row.status} isCurrent={row.status.level.number === frontier} learnToRead={track.learnToRead} />
                </div>
              ),
            )}
          </div>
        </div>

        <aside className="flex flex-col gap-4 lg:sticky lg:top-24 lg:col-span-5">
          <StudyWeekChart />
          <MemorizeEntryRow />
          {lastRead && lastMeta && (
            <Link href={`/quran/${lastRead.surah}?ayah=${lastRead.ayah}`} className="group card flex items-center gap-4 p-5 transition-colors hover:border-primary/40">
              <span className="flex h-11 w-11 items-center justify-center rounded-medium bg-primary/10 text-primary">
                <BookOpen className="w-5 h-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block text-xs text-textMuted">Continue reading</span>
                <span className="block truncate font-semibold">
                  {lastMeta.en} {lastRead.surah}:{lastRead.ayah}
                </span>
              </span>
              <ArrowRight className="w-4 h-4 text-textMuted transition group-hover:translate-x-0.5 group-hover:text-primary" />
            </Link>
          )}
          <div className="hidden items-center gap-2 px-1 text-xs text-textMuted lg:flex">
            <kbd className="kbd">Space</kbd> flip
            <kbd className="kbd ml-2">1</kbd>-<kbd className="kbd">4</kbd> grade
            <kbd className="kbd ml-2">⌘K</kbd> search
          </div>
        </aside>
      </div>
    </div>
  );
}
