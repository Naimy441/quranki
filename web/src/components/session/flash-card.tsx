'use client';

import React, { useState, useEffect } from 'react';
import { Volume2, BookOpen } from 'lucide-react';
import type { Word } from '@/lib/levels';
import { getVocabExampleRefs } from '@/lib/vocab-examples';
import { fetchSurahAyahs, type ReaderAyah } from '@/lib/quran-data';
import { useRecitation } from '@/context/recitation-context';

interface FlashCardProps {
  word: Word;
  revealed: boolean;
  onReveal: () => void;
  hideArabic?: boolean;
}

export function FlashCard({ word, revealed, onReveal, hideArabic = false }: FlashCardProps) {
  const { playWordAudio } = useRecitation();
  const refs = getVocabExampleRefs(word);
  const primaryRef = refs[0];

  const [exampleAyah, setExampleAyah] = useState<ReaderAyah | null>(null);

  useEffect(() => {
    if (!primaryRef) {
      setExampleAyah(null);
      return;
    }
    let active = true;
    fetchSurahAyahs(primaryRef.s).then((ayahs) => {
      if (active) {
        const found = ayahs.find((a) => a.a === primaryRef.a) || null;
        setExampleAyah(found);
      }
    });
    return () => {
      active = false;
    };
  }, [primaryRef?.s, primaryRef?.a]);

  const handlePlayWord = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (primaryRef) {
      playWordAudio(primaryRef.s, primaryRef.a, primaryRef.p);
    }
  };

  const plainTranslation = exampleAyah?.tr
    ? exampleAyah.tr
        .map((p) => (p.t !== undefined ? p.t : ''))
        .join('')
        .replace(/\s+/g, ' ')
        .trim()
    : '';

  return (
    <div
      onClick={!revealed ? onReveal : undefined}
      className={`relative w-full max-w-xl min-h-[380px] rounded-large border p-8 flex flex-col justify-between select-none shadow-sm transition-all duration-200 bg-card ${
        revealed
          ? 'border-border'
          : 'border-border hover:border-primary/50 cursor-pointer'
      }`}
    >
      {/* Front / Prompt Section */}
      <div className="flex flex-col items-center justify-center flex-1 py-6 space-y-4 text-center">
        {hideArabic && !revealed ? (
          <div className="space-y-4">
            <div className="w-16 h-16 rounded-full bg-backgroundSelected text-primary flex items-center justify-center mx-auto shadow-xs">
              <Volume2 className="w-8 h-8" />
            </div>
            <div className="text-sm font-semibold text-textSecondary">
              Listening Recall - Listen and recall the meaning
            </div>
            {primaryRef && (
              <button
                type="button"
                onClick={handlePlayWord}
                className="px-5 py-2.5 rounded-medium bg-primary text-onPrimary font-bold text-xs flex items-center gap-2 mx-auto shadow-xs transition-opacity hover:opacity-90"
              >
                <Volume2 className="w-4 h-4" />
                <span>Play Audio (R)</span>
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-center gap-4">
              <h2 className="uthmanic-text text-5xl md:text-6xl font-bold text-text tracking-wide py-2">
                {word.arabic}
              </h2>
              {primaryRef && (
                <button
                  type="button"
                  onClick={handlePlayWord}
                  title="Play pronunciation (R)"
                  className="p-3 rounded-medium bg-backgroundElement hover:bg-backgroundSelected text-textSecondary hover:text-primary transition-colors shadow-xs"
                >
                  <Volume2 className="w-5 h-5" />
                </button>
              )}
            </div>

            {word.transliteration && revealed && (
              <p className="text-sm font-mono text-primary font-bold">
                {word.transliteration}
              </p>
            )}
          </div>
        )}

        {/* Revealed Details */}
        {revealed && (
          <div className="w-full pt-6 mt-4 border-t border-border space-y-4 animate-fadeIn">
            {/* English Meaning */}
            <div className="space-y-1">
              <div className="text-2xl font-bold text-text">
                {word.english}
              </div>
              {word.note && (
                <div className="text-xs text-textSecondary max-w-lg mx-auto">
                  {word.note}
                </div>
              )}
            </div>

            {/* Contraction if applicable */}
            {word.contractionOf && (
              <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-medium bg-backgroundElement text-xs text-textSecondary border border-border">
                <span>Contraction of:</span>
                <span className="uthmanic-text font-bold text-base text-text">{word.contractionOf}</span>
                <span className="text-textMuted">({word.contractionEnglish})</span>
              </div>
            )}

            {/* Quranic Verse Example */}
            {primaryRef && exampleAyah && (
              <div className="mt-4 p-4 rounded-medium bg-backgroundElement border border-border text-left space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-textMuted">
                  <span className="flex items-center gap-1.5 text-primary">
                    <BookOpen className="w-3.5 h-3.5" /> Quranic Verse Example
                  </span>
                  <span>
                    Surah {primaryRef.s}:{primaryRef.a}
                  </span>
                </div>

                {/* Ayah with highlighted target word */}
                <p className="uthmanic-text text-xl leading-loose text-text text-right" dir="rtl">
                  {exampleAyah.w.map((w, i) => {
                    const isTarget = w.p === primaryRef.p;
                    return (
                      <span
                        key={i}
                        className={`inline-block mx-1 ${
                          isTarget
                            ? 'text-primary font-bold underline decoration-primary decoration-2 underline-offset-8'
                            : ''
                        }`}
                      >
                        {w.ar.map((seg) => seg.t).join('')}
                      </span>
                    );
                  })}
                </p>

                {/* Ayah Translation */}
                {plainTranslation && (
                  <p className="text-xs text-textSecondary italic pt-1 border-t border-border/60">
                    &ldquo;{plainTranslation}&rdquo;
                  </p>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Bottom Hint / Flip instruction */}
      {!revealed && (
        <div className="text-center pt-4 border-t border-border">
          <span className="text-xs font-semibold text-textMuted flex items-center justify-center gap-1.5">
            Click card or press <kbd className="px-2 py-0.5 rounded-small bg-backgroundElement border border-border text-text font-mono font-bold">Space</kbd> to reveal answer
          </span>
        </div>
      )}
    </div>
  );
}
