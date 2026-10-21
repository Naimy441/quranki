'use client';

import React from 'react';
import { notFound } from 'next/navigation';
import { getLevelById, isStudyWord } from '@/lib/levels';
import { SessionRunner } from '@/components/session/session-runner';

export function SessionClient({ id }: { id: string }) {
  const level = getLevelById(id);
  if (!level) {
    notFound();
  }

  const studyWords = level.words.filter(isStudyWord);

  return (
    <SessionRunner
      initialWords={studyWords}
      title={`Level ${level.number}: ${level.title}`}
      returnHref={`/level/${level.id}`}
    />
  );
}
