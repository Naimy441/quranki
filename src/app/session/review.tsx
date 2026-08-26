import { useState } from 'react';

import { SessionRunner } from '@/components/quranki/session-runner';
import { buildGlobalSessionQueue } from '@/lib/levels';
import { useProgressStore } from '@/store/progress-store';

/** The unified, Anki-style daily review: every due word across every unlocked level, mixed
 * together oldest-due-first, topped up with new words from the current frontier level. */
export default function DailyReviewScreen() {
  const progress = useProgressStore((state) => state.progress);
  const wordsPerSession = useProgressStore((state) => state.settings.wordsPerSession);
  const maxUnlockedLevel = useProgressStore((state) => state.maxUnlockedLevel);

  const [queue] = useState(() => buildGlobalSessionQueue(progress, new Date(), wordsPerSession, maxUnlockedLevel));

  return (
    <SessionRunner
      queue={queue}
      emptyMessage="You're all caught up across every level. Check back later."
      showLevelTag
    />
  );
}
