'use client';

import React from 'react';
import { displayArabic } from '@/lib/arabic-display';
import type { Word } from '@/lib/levels';
import { getVocabExamples } from '@/lib/vocab-examples';
import { useQuranDataVersion } from '@/lib/quran-reader';
import { VerseExamplePager } from '@/components/session/verse-example';

const ARABIC_SCRIPT = /[؀-ۿݐ-ݿࢠ-ࣿﭐ-﷿ﹰ-﻿]+/g;

function splitNoteRuns(text: string): { text: string; arabic: boolean }[] {
  const runs: { text: string; arabic: boolean }[] = [];
  let last = 0;
  const re = new RegExp(ARABIC_SCRIPT.source, 'g');
  let match: RegExpExecArray | null;
  while ((match = re.exec(text))) {
    if (match.index > last) runs.push({ text: text.slice(last, match.index), arabic: false });
    runs.push({ text: match[0], arabic: true });
    last = match.index + match[0].length;
  }
  if (last < text.length) runs.push({ text: text.slice(last), arabic: false });
  return runs.filter((r) => r.text.length > 0);
}

export function LessonNote({ text }: { text: string }) {
  return (
    <p dir="ltr" className="text-left leading-relaxed text-text">
      {splitNoteRuns(text).map((run, i) =>
        run.arabic ? (
          <bdi key={i} className="uthmanic-text text-xl">
            {run.text}
          </bdi>
        ) : (
          <span key={i}>{run.text}</span>
        ),
      )}
    </p>
  );
}

/** One-time grammar lesson shown in the study flow. */
export function GrammarCard({ word }: { word: Word }) {
  useQuranDataVersion((s) => s.version);
  const examples = getVocabExamples(word);
  return (
    <div className="flex w-full flex-col items-center text-center">
      <div className="uthmanic-text text-6xl leading-[1.7]">{displayArabic(word)}</div>
      <div className="my-5 h-px w-full bg-border" />
      <h2 className="text-2xl font-semibold">{word.english}</h2>
      {word.note && (
        <div className="mt-3 w-full">
          <LessonNote text={word.note} />
        </div>
      )}
      {examples.length > 0 && <VerseExamplePager word={word} examples={examples} />}
    </div>
  );
}
