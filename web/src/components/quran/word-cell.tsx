'use client';

import React, { useState } from 'react';
import type { ReaderWord } from '@/lib/quran-data';
import { tajweedColor, glossColor } from '@/lib/quran-colors';

interface WordCellProps {
  word: ReaderWord;
  isSpeaking: boolean;
  isDark: boolean;
  arabicSize: number;
  glossSize: number;
  transliterationSize: number;
  showTranslation: boolean;
  showTransliteration: boolean;
  showTajweed: boolean;
  hideLearnedWords: boolean;
  isMastered: boolean;
  onClickWord: (word: ReaderWord) => void;
}

export function WordCell({
  word,
  isSpeaking,
  isDark,
  arabicSize,
  glossSize,
  transliterationSize,
  showTranslation,
  showTransliteration,
  showTajweed,
  hideLearnedWords,
  isMastered,
  onClickWord,
}: WordCellProps) {
  const [peeked, setPeeked] = useState<boolean>(false);

  const shouldHideGloss = hideLearnedWords && isMastered && !peeked;

  const handleGlossClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setPeeked((prev) => !prev);
  };

  return (
    <div
      onClick={() => onClickWord(word)}
      className={`inline-flex flex-col items-center justify-start p-1.5 rounded-medium transition-all cursor-pointer select-none group ${
        isSpeaking
          ? 'bg-backgroundSelected ring-2 ring-primary shadow-xs'
          : 'hover:bg-backgroundElement'
      }`}
      style={{ minWidth: `${Math.max(42, arabicSize * 1.4)}px` }}
    >
      {/* Arabic text with Tajweed coloring */}
      <div
        className="uthmanic-text text-center select-none leading-relaxed"
        style={{ fontSize: `${arabicSize}px`, lineHeight: `${arabicSize * 1.8}px` }}
      >
        {word.ar.map((segment, idx) => {
          const color = showTajweed
            ? tajweedColor(segment.c, isDark, isDark ? '#F2F6F3' : '#101913')
            : isDark
            ? '#F2F6F3'
            : '#101913';

          return (
            <span key={idx} style={{ color }}>
              {segment.t}
            </span>
          );
        })}
      </div>

      {/* WBW Transliteration */}
      {showTransliteration && word.tl && (
        <div
          className="text-center font-mono font-medium text-primary mt-0.5 select-none"
          style={{ fontSize: `${transliterationSize}px` }}
        >
          {word.tl}
        </div>
      )}

      {/* Active Word Accent Divider */}
      {isSpeaking && <div className="w-4/5 h-0.5 bg-primary rounded-full my-0.5" />}

      {/* WBW English Gloss */}
      {showTranslation && word.en && word.en.length > 0 && (
        <div className="mt-0.5 text-center select-none">
          {shouldHideGloss ? (
            <button
              onClick={handleGlossClick}
              title="Click to reveal meaning (Hint)"
              className="px-1.5 py-0.5 rounded-small bg-backgroundElement hover:bg-backgroundSelected text-[10px] text-textMuted font-bold transition-colors"
            >
              hint
            </button>
          ) : (
            <div
              onClick={isMastered ? handleGlossClick : undefined}
              className="font-medium text-center"
              style={{ fontSize: `${glossSize}px` }}
            >
              {word.en.map((segment, idx) => (
                <span
                  key={idx}
                  style={{
                    color: glossColor(segment.c, isDark, isDark ? '#9CB0A5' : '#5C6B62'),
                  }}
                >
                  {segment.t}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
