'use client';

import React, { useState } from 'react';
import { buildHifzSessionQueue } from '@/lib/hifz';
import { HifzSessionRunner } from '@/components/hifz/hifz-session-runner';
import { useStoresHydrated } from '@/components/providers/app-state';
import { useHifzStore } from '@/store/hifz-store';
import { useCanonicalReady } from '@/lib/quran-lemma-index';

function Session() {
  const enrolledRukuIds = useHifzStore((s) => s.enrolledRukuIds);
  const cards = useHifzStore((s) => s.cards);
  const [queue] = useState(() => buildHifzSessionQueue({ enrolledRukuIds, cards, introSeen: true }, new Date()));
  return <HifzSessionRunner queue={queue} />;
}

export default function HifzReviewPage() {
  const hydrated = useStoresHydrated();
  useCanonicalReady((s) => s.ready);
  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl px-4 pt-24 space-y-4">
        <div className="skeleton h-72 rounded-xlarge" />
        <div className="skeleton h-14" />
      </div>
    );
  }
  return <Session />;
}
