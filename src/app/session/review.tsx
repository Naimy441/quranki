import { useState } from 'react';

import { SessionRunner } from '@/components/quranki/session-runner';
import { buildGlobalSessionQueue } from '@/lib/levels';
import { reviewsCompletedToday, useProgressStore } from '@/store/progress-store';

/** One Anki-style daily session over the whole deck: due reviews plus the next new words
 *  in curriculum order. */
export default function DailyReviewScreen() {
  const progress = useProgressStore((state) => state.progress);
  const wordsPerSession = useProgressStore((state) => state.settings.wordsPerSession);
  const reviewsToday = useProgressStore((state) => state.reviewsToday);
  const reviewCountDate = useProgressStore((state) => state.reviewCountDate);

  const [queue] = useState(() =>
    buildGlobalSessionQueue(
      progress,
      new Date(),
      wordsPerSession,
      reviewsCompletedToday(reviewCountDate, reviewsToday),
    ),
  );

  return (
    <SessionRunner
      queue={queue}
      emptyMessage="You're all caught up. Check back later."
      showLevelTag
    />
  );
}
