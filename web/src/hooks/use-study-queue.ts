'use client';

import { useMemo } from 'react';
import { buildGlobalSessionQueue, getTrackContext, getUpcomingLearning, isStudyWord } from '@/lib/levels';
import { useNow } from '@/hooks/use-now';
import { newCardsCompletedToday, reviewsCompletedToday, useProgressStore } from '@/store/progress-store';

/** Today's queue exactly as the mobile Learn tab builds it (daily caps included). */
export function useStudyQueue() {
  const progress = useProgressStore((s) => s.progress);
  const wordsPerSession = useProgressStore((s) => s.settings.wordsPerSession);
  const canReadQuran = useProgressStore((s) => s.settings.canReadQuran);
  const reviewsToday = useProgressStore((s) => s.reviewsToday);
  const newCardsToday = useProgressStore((s) => s.newCardsToday);
  const reviewCountDate = useProgressStore((s) => s.reviewCountDate);
  const hydrated = useProgressStore((s) => s.hydrated);
  const now = useNow();

  return useMemo(() => {
    const reviewsAlready = reviewsCompletedToday(reviewCountDate, reviewsToday, now);
    const newAlready = newCardsCompletedToday(reviewCountDate, newCardsToday, now);
    const track = getTrackContext(progress, canReadQuran);
    const todaySession = hydrated
      ? buildGlobalSessionQueue(progress, now, wordsPerSession, reviewsAlready, newAlready, false, track)
      : [];
    const extraSession =
      !hydrated || todaySession.length > 0
        ? []
        : buildGlobalSessionQueue(progress, now, wordsPerSession, reviewsAlready, newAlready, true, track);
    const studyToday = todaySession.filter((e) => isStudyWord(e.word));
    const extraStudy = extraSession.filter((e) => isStudyWord(e.word));
    return {
      now,
      track,
      reviewsAlready,
      newAlready,
      todaySession,
      extraSession,
      studyToday,
      extraStudy,
      canStart: todaySession.length > 0 || extraSession.length > 0,
      dueCount: studyToday.filter((e) => e.reason === 'due').length,
      newCount: studyToday.filter((e) => e.reason === 'new').length,
      upcoming: hydrated ? getUpcomingLearning(progress, now) : null,
      newRemaining: Math.max(0, wordsPerSession - newAlready),
    };
  }, [progress, wordsPerSession, canReadQuran, reviewsToday, newCardsToday, reviewCountDate, hydrated, now]);
}
