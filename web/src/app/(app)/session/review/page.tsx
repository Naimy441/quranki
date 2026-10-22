'use client';

import React, { useState } from 'react';
import { buildGlobalSessionQueue, getTrackContext } from '@/lib/levels';
import { SessionRunner } from '@/components/session/session-runner';
import { useStoresHydrated } from '@/components/providers/app-state';
import { newCardsCompletedToday, reviewsCompletedToday, useProgressStore } from '@/store/progress-store';

/** One Anki-style daily session: due reviews plus the next new words, with the same daily caps
 *  as the mobile app. */
function DailyReview() {
  const [queue] = useState(() => {
    const s = useProgressStore.getState();
    const now = new Date();
    const reviewsAlready = reviewsCompletedToday(s.reviewCountDate, s.reviewsToday, now);
    const newAlready = newCardsCompletedToday(s.reviewCountDate, s.newCardsToday, now);
    const track = getTrackContext(s.progress, s.settings.canReadQuran);
    const today = buildGlobalSessionQueue(s.progress, now, s.settings.wordsPerSession, reviewsAlready, newAlready, false, track);
    if (today.length > 0) return today;
    return buildGlobalSessionQueue(s.progress, now, s.settings.wordsPerSession, reviewsAlready, newAlready, true, track);
  });
  return (
    <SessionRunner
      queue={queue}
      emptyMessage="You're all caught up. If you just learned new words, they come back in about 10 minutes."
    />
  );
}

export default function ReviewSessionPage() {
  const hydrated = useStoresHydrated();
  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl px-4 pt-24 space-y-4">
        <div className="skeleton h-80 rounded-xlarge" />
        <div className="skeleton h-14" />
      </div>
    );
  }
  return <DailyReview />;
}
