'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import { CheckCheck, Flame, Clock, Keyboard, Sparkles, BookOpen, ArrowRight } from 'lucide-react';
import { useProgress } from '@/context/progress-context';
import {
  buildGlobalSessionQueue,
  getIntroductionFrontier,
  getLevelStatusesForStage,
  getMasteredLemmaIds,
  getQaidaIntroductionFrontier,
  getStage,
  getStageProgress,
  getTrackContext,
  getUnlockedStage,
  getVisibleStages,
  isStageUnlocked,
  isStudyWord,
  QAIDA_STAGE,
} from '@/lib/levels';
import { LevelCard } from '@/components/learn/level-card';
import { StagePicker } from '@/components/quranki/stage-picker';

export default function LearnPage() {
  const { progress, settings, streak, studySeconds, maxUnlockedLevel, hydrated } = useProgress();
  const [selectedStageId, setSelectedStageId] = useState<number | null>(null);

  const now = useMemo(() => new Date(), []);
  const wordsPerSession = settings.wordsPerSession ?? 10;
  const canReadQuran = settings.canReadQuran ?? true;

  const track = useMemo(
    () => getTrackContext(progress, canReadQuran),
    [progress, canReadQuran]
  );

  const todaySession = useMemo(
    () => buildGlobalSessionQueue(progress, now, wordsPerSession, 0, 0, false, track),
    [progress, now, wordsPerSession, track]
  );

  const extraSession = useMemo(
    () =>
      todaySession.length > 0
        ? []
        : buildGlobalSessionQueue(progress, now, wordsPerSession, 0, 0, true, track),
    [progress, now, wordsPerSession, todaySession.length, track]
  );

  const canStart = todaySession.length > 0 || extraSession.length > 0;
  const studyToday = todaySession.filter((e) => isStudyWord(e.word));
  const extraStudy = extraSession.filter((e) => isStudyWord(e.word));
  const hasWorkToday = studyToday.length > 0;
  const dueCount = studyToday.filter((e) => e.reason === 'due').length;
  const newCount = studyToday.filter((e) => e.reason === 'new').length;

  const visibleStages = getVisibleStages(track.learnToRead);
  const frontier =
    track.learnToRead && !track.qaidaComplete
      ? getQaidaIntroductionFrontier(progress)
      : getIntroductionFrontier(progress);

  const reachedLevel =
    track.learnToRead && !track.qaidaComplete
      ? frontier
      : Math.max(maxUnlockedLevel, frontier);

  const unlockedStage = getUnlockedStage(reachedLevel, track);

  const masteredLemmaIds = useMemo(() => {
    return getMasteredLemmaIds(progress);
  }, [progress]);

  const masteredCount =
    track.learnToRead && !track.qaidaComplete
      ? getStageProgress(QAIDA_STAGE, progress, now).mastered
      : masteredLemmaIds.size;

  const selectedStage =
    getStage(selectedStageId ?? unlockedStage.id) ?? visibleStages[0] ?? unlockedStage;
  const selectedUnlocked = isStageUnlocked(selectedStage, reachedLevel, track);
  const visibleStage = selectedUnlocked ? selectedStage : (visibleStages[0] ?? unlockedStage);

  const stageEntries = useMemo(() => {
    return visibleStages.map((stage) => ({
      stage,
      progress: getStageProgress(stage, progress, now),
      unlocked: isStageUnlocked(stage, reachedLevel, track),
    }));
  }, [visibleStages, progress, now, reachedLevel, track]);

  const levelStatuses = useMemo(() => {
    return getLevelStatusesForStage(visibleStage, progress, now);
  }, [visibleStage, progress, now]);

  if (!hydrated) {
    return (
      <div className="max-w-xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-44 rounded-large bg-card border border-border" />
        <div className="h-14 rounded-medium bg-card border border-border" />
        <div className="h-20 rounded-large bg-card border border-border" />
      </div>
    );
  }

  const heroHeadline = hasWorkToday
    ? `${studyToday.length} ${studyToday.length === 1 ? 'word' : 'words'} to review`
    : extraSession.length > 0
    ? 'All done for today'
    : 'All caught up';

  const heroSubtitle = hasWorkToday
    ? [dueCount > 0 ? `${dueCount} due` : null, newCount > 0 ? `${newCount} new` : null]
        .filter(Boolean)
        .join(' - ')
    : extraSession.length > 0
    ? 'Study ahead if you want more.'
    : 'Nothing due right now.';

  const heroButtonLabel = hasWorkToday
    ? 'Start session'
    : extraStudy.length > 0
    ? `Study ${extraStudy.length} more`
    : 'Study more';

  const studyMinutes = Math.round((studySeconds || 0) / 60);
  const studyDurationLabel = studyMinutes > 60 ? `${Math.floor(studyMinutes / 60)}h ${studyMinutes % 60}m` : `${studyMinutes}m`;

  return (
    <div className="max-w-5xl mx-auto px-6 py-6 animate-fadeIn select-none">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Left / Primary Curriculum Column */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          {/* Hero Card matching mobile src/app/(tabs)/index.tsx */}
          <div className="rounded-large p-6 flex flex-col gap-3.5 bg-primary text-onPrimary shadow-sm transition-all">
            <div className="flex items-start justify-between gap-3">
              <h2 className="text-2xl font-bold leading-tight text-onPrimary">
                {heroHeadline}
              </h2>
            </div>

            <p className="text-sm text-onPrimary/90 font-medium">
              {heroSubtitle}
            </p>

            {(hasWorkToday || canStart) && (
              <Link
                href="/session/review"
                className="w-full h-11 rounded-medium bg-onPrimary text-primary text-sm font-bold flex items-center justify-center hover:opacity-95 transition-opacity shadow-xs"
              >
                {heroButtonLabel}
              </Link>
            )}

            {/* Hairline Divider */}
            <div className="h-px bg-onPrimary/25 my-1" />

            {/* 3 Stats Row */}
            <div className="grid grid-cols-3 gap-2 pt-1 text-onPrimary">
              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-onPrimary">
                  <CheckCheck className="w-4 h-4 opacity-90" />
                  <span className="text-sm font-bold text-onPrimary">
                    {masteredCount.toLocaleString()}
                  </span>
                </div>
                <span className="text-xs text-onPrimary/75 font-medium">Mastered</span>
              </div>

              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-onPrimary">
                  <Flame className="w-4 h-4 opacity-90 fill-onPrimary" />
                  <span className="text-sm font-bold text-onPrimary">{streak}</span>
                </div>
                <span className="text-xs text-onPrimary/75 font-medium">Day streak</span>
              </div>

              <div className="flex flex-col gap-0.5">
                <div className="flex items-center gap-1.5 text-onPrimary">
                  <Clock className="w-4 h-4 opacity-90" />
                  <span className="text-sm font-bold text-onPrimary">{studyDurationLabel}</span>
                </div>
                <span className="text-xs text-onPrimary/75 font-medium">Today</span>
              </div>
            </div>
          </div>

          {/* Stage Picker */}
          <div className="pt-2">
            <StagePicker
              entries={stageEntries}
              selectedStageId={visibleStage.id}
              wordsPerDay={wordsPerSession}
              learnToRead={track.learnToRead}
              progressMap={progress}
              onSelect={setSelectedStageId}
            />
          </div>

          {/* Level List Cards */}
          <div className="flex flex-col gap-3 pt-2">
            {levelStatuses.map((status) => (
              <LevelCard
                key={status.level.id}
                status={status}
                isCurrent={status.level.number === frontier}
                learnToRead={track.learnToRead}
              />
            ))}
          </div>
        </div>

        {/* Right / Desktop Companion Column (Optimized for larger screens) */}
        <div className="hidden lg:flex lg:col-span-5 flex-col gap-5 sticky top-6">
          {/* Daily Study Agenda */}
          <div className="p-5 rounded-large bg-card border border-border shadow-xs space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h3 className="text-sm font-bold text-text flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-primary" /> Today&apos;s Agenda
              </h3>
              <span className="text-[11px] font-semibold text-textMuted">
                {wordsPerSession} new / day
              </span>
            </div>

            <div className="space-y-2.5 text-xs text-textSecondary">
              <div className="flex justify-between items-center py-1">
                <span>Reviews Due</span>
                <span className="font-bold text-text">{dueCount}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>New Cards Waiting</span>
                <span className="font-bold text-text">{newCount}</span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span>Total Cards in Session</span>
                <span className="font-bold text-primary">{studyToday.length}</span>
              </div>
            </div>

            {canStart && (
              <Link
                href="/session/review"
                className="w-full py-2.5 px-3 bg-backgroundSelected hover:bg-primary hover:text-onPrimary text-primary font-bold text-xs rounded-medium flex items-center justify-center gap-1.5 transition-all mt-2"
              >
                <span>Launch Session</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {/* Quick Reader Jump */}
          <div className="p-5 rounded-large bg-card border border-border shadow-xs space-y-3">
            <h3 className="text-sm font-bold text-text flex items-center gap-1.5">
              <BookOpen className="w-4 h-4 text-primary" /> Read the Quran
            </h3>
            <p className="text-xs text-textSecondary">
              Words you master here are tracked in real-time inside the Mushaf reader.
            </p>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <Link
                href="/quran/1"
                className="p-2.5 rounded-medium bg-backgroundElement hover:bg-backgroundSelected text-xs font-bold text-text hover:text-primary transition-colors flex items-center justify-between"
              >
                <span>Al-Fatihah</span>
                <span className="text-[10px] text-textMuted">1</span>
              </Link>
              <Link
                href="/quran/36"
                className="p-2.5 rounded-medium bg-backgroundElement hover:bg-backgroundSelected text-xs font-bold text-text hover:text-primary transition-colors flex items-center justify-between"
              >
                <span>Ya-Sin</span>
                <span className="text-[10px] text-textMuted">36</span>
              </Link>
              <Link
                href="/quran/67"
                className="p-2.5 rounded-medium bg-backgroundElement hover:bg-backgroundSelected text-xs font-bold text-text hover:text-primary transition-colors flex items-center justify-between"
              >
                <span>Al-Mulk</span>
                <span className="text-[10px] text-textMuted">67</span>
              </Link>
              <Link
                href="/quran"
                className="p-2.5 rounded-medium bg-backgroundElement hover:bg-backgroundSelected text-xs font-bold text-primary transition-colors flex items-center justify-between"
              >
                <span>All 114 Surahs</span>
                <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>

          {/* Desktop Keyboard Quick Reference */}
          <div className="p-5 rounded-large bg-backgroundElement/60 border border-border shadow-xs space-y-2.5">
            <h4 className="text-xs font-bold text-text flex items-center gap-1.5">
              <Keyboard className="w-3.5 h-3.5 text-primary" /> Desktop Shortcuts
            </h4>
            <div className="space-y-1.5 text-[11px] text-textSecondary">
              <div className="flex justify-between items-center">
                <span>Flip card / Show answer</span>
                <kbd className="px-1.5 py-0.5 bg-card border border-border rounded font-mono text-[10px] text-text font-bold">Space</kbd>
              </div>
              <div className="flex justify-between items-center">
                <span>Grade card</span>
                <span className="flex gap-1 font-mono text-[10px]">
                  <kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-text font-bold">1</kbd>
                  <kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-text font-bold">2</kbd>
                  <kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-text font-bold">3</kbd>
                  <kbd className="px-1.5 py-0.5 bg-card border border-border rounded text-text font-bold">4</kbd>
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span>Play pronunciation audio</span>
                <kbd className="px-1.5 py-0.5 bg-card border border-border rounded font-mono text-[10px] text-text font-bold">R</kbd>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
