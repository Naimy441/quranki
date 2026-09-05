import { useState } from 'react';

import { SessionRunner } from '@/components/quranki/session-runner';
import { buildGlobalSessionQueue } from '@/lib/levels';
import { newCardsCompletedToday, reviewsCompletedToday, useProgressStore } from '@/store/progress-store';

/** One Anki-style daily session over the whole deck: due reviews plus the next new words
 *  in curriculum order. */
export default function DailyReviewScreen() {
  const progress = useProgressStore((state) => state.progress);
  const wordsPerSession = useProgressStore((state) => state.settings.wordsPerSession);
  const reviewsToday = useProgressStore((state) => state.reviewsToday);
  const newCardsToday = useProgressStore((state) => state.newCardsToday);
  const reviewCountDate = useProgressStore((state) => state.reviewCountDate);

  const [queue] = useState(() => {
    const now = new Date();
    const reviewsAlready = reviewsCompletedToday(reviewCountDate, reviewsToday, now);
    const newAlready = newCardsCompletedToday(reviewCountDate, newCardsToday, now);
    const today = buildGlobalSessionQueue(progress, now, wordsPerSession, reviewsAlready, newAlready);
    if (today.length > 0) return today;
    return buildGlobalSessionQueue(progress, now, wordsPerSession, reviewsAlready, newAlready, true);
  });

  return (
    <SessionRunner
      queue={queue}
      emptyMessage="You're all caught up. If you just learned new words, they come back in about 10 minutes."
    />
  );
}
