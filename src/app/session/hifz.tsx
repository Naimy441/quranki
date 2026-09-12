import { useState } from 'react';

import { HifzSessionRunner } from '@/components/hifz/hifz-session-runner';
import { buildHifzSessionQueue } from '@/lib/hifz';
import { useHifzStore } from '@/store/hifz-store';

export default function HifzReviewScreen() {
  const enrolledRukuIds = useHifzStore((state) => state.enrolledRukuIds);
  const cards = useHifzStore((state) => state.cards);

  const [queue] = useState(() =>
    buildHifzSessionQueue({ enrolledRukuIds, cards }, new Date()),
  );

  return <HifzSessionRunner queue={queue} />;
}
