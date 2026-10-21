'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useProgress } from '@/context/progress-context';
import { buildGlobalSessionQueue, getTrackContext, type Word } from '@/lib/levels';
import { SessionRunner } from '@/components/session/session-runner';

function ReviewSessionContent({
  progress,
  wordsPerSession,
  canReadQuran,
}: {
  progress: any;
  wordsPerSession: number;
  canReadQuran: boolean;
}) {
  const [initialWords] = useState<Word[]>(() => {
    const now = new Date();
    const track = getTrackContext(progress, canReadQuran);
    const today = buildGlobalSessionQueue(progress, now, wordsPerSession, 0, 0, false, track);
    const session =
      today.length > 0
        ? today
        : buildGlobalSessionQueue(progress, now, wordsPerSession, 0, 0, true, track);
    return session.map((s) => s.word);
  });

  if (initialWords.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-8 text-center animate-fadeIn space-y-4 select-none">
        <div className="w-16 h-16 rounded-large bg-backgroundSelected text-primary flex items-center justify-center border border-border">
          <CheckCircle2 className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-text">
          All Reviews Caught Up
        </h2>
        <p className="text-xs text-textSecondary max-w-sm">
          You&apos;re all caught up. If you just learned new words, they come back in about 10 minutes.
        </p>
        <Link
          href="/learn"
          className="mt-2 py-2.5 px-6 bg-primary hover:opacity-90 text-onPrimary rounded-medium text-xs font-bold inline-flex items-center gap-2 shadow-xs transition-opacity"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Curriculum</span>
        </Link>
      </div>
    );
  }

  return (
    <SessionRunner
      initialWords={initialWords}
      title="Daily Spaced Repetition Review"
      returnHref="/learn"
    />
  );
}

export default function ReviewSessionPage() {
  const { progress, settings, hydrated } = useProgress();

  if (!hydrated) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center text-textMuted text-xs">
        Loading review queue...
      </div>
    );
  }

  return (
    <ReviewSessionContent
      progress={progress}
      wordsPerSession={settings.wordsPerSession ?? 10}
      canReadQuran={settings.canReadQuran ?? true}
    />
  );
}
