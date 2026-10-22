'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronLeft, ChevronRight, Loader2, Volume2 } from 'lucide-react';
import { highlightAffix, shapeQpcArabic } from '@/lib/arabic-display';
import { getWord, type Word } from '@/lib/levels';
import { glossColor } from '@/lib/quran-colors';
import { getSurahMeta, useQuranDataVersion } from '@/lib/quran-reader';
import type { ReaderWord } from '@/lib/quran-reader-types';
import type { VocabExample } from '@/lib/vocab-examples';
import { stopWordPronunciation } from '@/lib/word-pronunciation';
import { useIsDark } from '@/hooks/use-is-dark';
import { playAyah, stopRecitation, useRecitationStore } from '@/store/recitation-store';
import { cn } from '@/lib/cn';

function isExampleHit(example: VocabExample, position: number): boolean {
  if (example.hits) return example.hits.includes(position);
  const span = example.n ?? 1;
  return position >= example.p && position < example.p + span;
}

function ExampleWord({ surface, gloss, isHit, target, speaking }: { surface: string; gloss: ReaderWord['en']; isHit: boolean; target: Word; speaking: boolean }) {
  const isDark = useIsDark();
  const shaped = shapeQpcArabic(surface);
  const parts = isHit ? highlightAffix(shaped, target) : null;
  return (
    <span className="inline-flex min-w-[2.5rem] max-w-[9rem] flex-col items-center px-1">
      <span className="uthmanic-text text-[1.6rem] leading-[1.9]">
        {parts ? (
          <>
            {parts.before && <span>{parts.before}</span>}
            <span className="text-primary">{parts.hit}</span>
            {parts.after && <span>{parts.after}</span>}
          </>
        ) : (
          shaped
        )}
      </span>
      <span className={cn('my-0.5 h-px w-4/5', speaking || isHit ? 'bg-primary' : 'bg-border')} />
      {gloss.length > 0 && (
        <span dir="ltr" className="text-center text-[11px] leading-tight line-clamp-3">
          {gloss.map((seg, i) => (
            <span key={i} style={{ color: glossColor(seg.c, isDark, isHit ? 'rgb(var(--primary-rgb))' : 'var(--text-secondary)') }}>
              {seg.t}
            </span>
          ))}
        </span>
      )}
    </span>
  );
}

export function VerseExample({ word, example }: { word: Word; example: VocabExample }) {
  const target = word.exampleOf ? (getWord(word.exampleOf) ?? word) : word;
  const surah = getSurahMeta(example.s);
  const [busy, setBusy] = useState(false);
  const playback = useRecitationStore((s) => {
    if (!(s.mode === 'ayah' && s.surahNumber === example.s && s.ayahNumber === example.a && s.visible)) return 'idle' as const;
    return s.awaitingAudio && !s.playing ? ('loading' as const) : s.playing ? ('playing' as const) : ('paused' as const);
  });
  const speakingWord = useRecitationStore((s) =>
    s.playing && s.mode === 'ayah' && s.surahNumber === example.s && s.ayahNumber === example.a ? s.wordNumber : 0,
  );

  useEffect(
    () => () => {
      const st = useRecitationStore.getState();
      if (st.mode === 'ayah' && st.surahNumber === example.s && st.ayahNumber === example.a) stopRecitation();
    },
    [example.s, example.a],
  );

  return (
    <div className="text-left">
      <div className="flex items-center justify-between">
        <Link href={`/quran/${example.s}?ayah=${example.a}`} className="text-xs font-semibold text-textSecondary hover:text-primary">
          {surah ? `${surah.en} ${example.s}:${example.a}` : `${example.s}:${example.a}`}
        </Link>
        <button
          onClick={(e) => {
            e.stopPropagation();
            stopWordPronunciation();
            setBusy(true);
            void playAyah(example.s, example.a).finally(() => setBusy(false));
          }}
          className={cn('icon-btn h-8 w-8', playback === 'playing' ? 'bg-backgroundSelected text-primary' : 'bg-backgroundElement text-primary')}
          title="Play the ayah"
        >
          {busy || playback === 'loading' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Volume2 className="w-3.5 h-3.5" />}
        </button>
      </div>
      <div dir="rtl" className="mt-2 flex flex-wrap justify-start gap-y-1">
        {example.words
          ? example.words.map((item) => (
              <ExampleWord
                key={item.p}
                surface={item.ar.map((s) => s.t).join('')}
                gloss={item.en}
                isHit={isExampleHit(example, item.p)}
                target={target}
                speaking={speakingWord === item.p}
              />
            ))
          : (example.w ?? []).map((raw, i) => (
              <ExampleWord key={i + 1} surface={raw} gloss={[]} isHit={isExampleHit(example, i + 1)} target={target} speaking={speakingWord === i + 1} />
            ))}
      </div>
      {example.tr && <p className="mt-2 text-sm text-textSecondary">{example.tr}</p>}
    </div>
  );
}

/** Examples for a word with arrows and dots (the mobile pager swipes). */
export function VerseExamplePager({ word, examples }: { word: Word; examples: VocabExample[] }) {
  useQuranDataVersion((s) => s.version);
  const [index, setIndex] = useState(0);
  const count = examples.length;
  const safe = Math.min(index, Math.max(0, count - 1));
  useEffect(() => setIndex(0), [word.id]);
  useEffect(() => {
    stopRecitation();
  }, [safe, word.id]);
  if (count === 0) return null;
  return (
    <div className="mt-5 w-full rounded-large border border-border bg-backgroundElement/50 p-4">
      <VerseExample key={`${examples[safe].s}:${examples[safe].a}:${examples[safe].p}`} word={word} example={examples[safe]} />
      {count > 1 && (
        <div className="mt-3 flex items-center justify-center gap-3">
          <button onClick={(e) => { e.stopPropagation(); setIndex(Math.max(0, safe - 1)); }} disabled={safe === 0} className="icon-btn h-7 w-7 disabled:opacity-30" aria-label="Previous example">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex gap-1.5">
            {examples.map((ex, i) => (
              <button
                key={`${ex.s}:${ex.a}:${ex.p}`}
                onClick={(e) => { e.stopPropagation(); setIndex(i); }}
                className={cn('h-1.5 rounded-full transition-all', i === safe ? 'w-4 bg-primary' : 'w-1.5 bg-border')}
                aria-label={`Example ${i + 1} of ${count}`}
              />
            ))}
          </div>
          <button onClick={(e) => { e.stopPropagation(); setIndex(Math.min(count - 1, safe + 1)); }} disabled={safe === count - 1} className="icon-btn h-7 w-7 disabled:opacity-30" aria-label="Next example">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
