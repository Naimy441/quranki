'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Volume2 } from 'lucide-react';
import { displayArabic, shapeQpcArabic } from '@/lib/arabic-display';
import type { Word } from '@/lib/levels';
import { exampleSurface, getVocabExamples } from '@/lib/vocab-examples';
import { useQuranDataVersion } from '@/lib/quran-reader';
import { GrammarCard } from '@/components/session/grammar-card';
import { VerseExamplePager } from '@/components/session/verse-example';
import { cn } from '@/lib/cn';

interface FlashCardProps {
  word: Word;
  revealed: boolean;
  /** Listening recall: a cover hides the Arabic until clicked (or the answer is shown). */
  hideArabic?: boolean;
  /** Resets the cover when the same word appears again in the sitting. */
  appearanceKey?: string;
  onSpeak: () => void;
  isSpeaking: boolean;
}

/** The study card, matching the mobile flashcard. */
export function FlashCard({ word, revealed, hideArabic = false, appearanceKey, onSpeak, isSpeaking }: FlashCardProps) {
  const dataVersion = useQuranDataVersion((s) => s.version);
  const examples = useMemo(
    () => (word.kind === 'digit' || word.kind === 'qaida' ? [] : getVocabExamples(word)),
    [word, dataVersion], // eslint-disable-line react-hooks/exhaustive-deps
  );
  const [covered, setCovered] = useState(hideArabic);

  useEffect(() => {
    setCovered(hideArabic && !revealed);
  }, [appearanceKey, hideArabic, revealed, word.id]);

  if (word.kind === 'grammar') return <GrammarCard word={word} />;

  const spokenSurface = examples[0] ? shapeQpcArabic(exampleSurface(examples[0])) : '';
  const showSpoken = isSpeaking && spokenSurface.length > 0 && !covered;
  const canSpeak = examples.length > 0 || word.kind === 'qaida';

  return (
    <div className="flex w-full flex-col items-center text-center">
      <div className={cn('flex items-center justify-center gap-3', revealed ? 'pt-2' : 'pt-10')}>
        <div className="relative">
          <span
            className={cn(
              'uthmanic-text block leading-[1.7] transition-colors',
              revealed ? 'text-6xl' : word.kind === 'qaida' ? 'text-8xl' : 'text-7xl',
              showSpoken && 'text-primary',
            )}
          >
            {showSpoken ? spokenSurface : displayArabic(word)}
          </span>
          {hideArabic && covered && (
            <motion.button
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={(e) => {
                e.stopPropagation();
                setCovered(false);
              }}
              className="absolute inset-0 rounded-large bg-primary"
              aria-label="Show Arabic"
              title="Listen first, then click to see the Arabic"
            />
          )}
        </div>
        {canSpeak && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSpeak();
            }}
            className={cn('icon-btn rounded-full bg-backgroundElement text-primary', revealed ? 'h-9 w-9' : 'h-11 w-11')}
            title="Play pronunciation (R)"
          >
            <Volume2 className={cn(revealed ? 'w-4 h-4' : 'w-5 h-5', isSpeaking && 'animate-pulse')} />
          </button>
        )}
      </div>
      {revealed && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.28 }}
          className="flex w-full flex-col items-center"
        >
          <div className="my-5 h-px w-full bg-border" />
          <h2 className="text-3xl font-semibold tracking-tight">{word.english}</h2>
          {word.transliteration && <p className="mt-1 text-sm text-textSecondary">{word.transliteration}</p>}
          {word.contractionOf && (
            <div className="mt-3 flex flex-col items-center">
              <span className="uthmanic-text text-2xl">{word.contractionOf}</span>
              {word.contractionEnglish && <span className="text-sm text-textSecondary">{word.contractionEnglish}</span>}
            </div>
          )}
          {word.note && <p className="mt-3 max-w-md text-sm text-textSecondary">{word.note}</p>}
          {examples.length > 0 && <VerseExamplePager word={word} examples={examples} />}
        </motion.div>
      )}
    </div>
  );
}
