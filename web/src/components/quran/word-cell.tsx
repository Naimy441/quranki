'use client';

import React, { memo, useEffect, useRef, useState } from 'react';
import { shapeQpcArabic } from '@/lib/arabic-display';
import { attachLeadingCombiningMarks } from '@/lib/arabic-segments';
import { hapticSelection, hapticWarning } from '@/lib/haptics';
import { getHiddenStudyWordIdForLemmas } from '@/lib/levels';
import { glossColor, tajweedColor } from '@/lib/quran-colors';
import { getWordLemmaIds, lemmaPeekKey, type LemmaId } from '@/lib/quran-lemmas';
import type { ReaderWord } from '@/lib/quran-reader-types';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';
import { cn } from '@/lib/cn';

interface WordCellProps {
  word: ReaderWord;
  showTranslation: boolean;
  hideMeaning?: boolean;
  showTransliteration: boolean;
  showTajweed: boolean;
  isDark: boolean;
  arabicSize: number;
  glossSize: number;
  transliterationSize: number;
  hiddenLemmaIds: Set<LemmaId>;
  knownLemmaIds: Set<LemmaId>;
  speaking?: boolean;
  /** Opens the word details. Called with whether the gloss is currently on screen. */
  onOpenDetails?: (word: ReaderWord, translationRevealed: boolean) => void;
}

/**
 * One Quran word. Same rules as the mobile reader: a word you are learning or know hides its
 * gloss; clicking reveals it as a hint, and a second hint for the same word lapses the card
 * (grades it Again, and forgets a manual "known" mark). Right-click or long-press opens details.
 */
export const WordCell = memo(function WordCell({
  word,
  showTranslation,
  hideMeaning = false,
  showTransliteration,
  showTajweed,
  isDark,
  arabicSize,
  glossSize,
  transliterationSize,
  hiddenLemmaIds,
  knownLemmaIds,
  speaking = false,
  onOpenDetails,
}: WordCellProps) {
  const gradeWord = useProgressStore((s) => s.gradeWord);
  const noteReaderPeek = useProgressStore((s) => s.noteReaderPeek);
  const lemmaIds = getWordLemmaIds(word);
  const peekKey = lemmaPeekKey(lemmaIds);
  const peekCount = useProgressStore((s) => s.readerPeeks[peekKey] ?? 0);
  const unmarkKnown = useKnownWordsStore((s) => s.unmarkKnown);
  const [revealed, setRevealed] = useState(false);
  const pressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const longPressed = useRef(false);

  const isHideEligible =
    lemmaIds.length > 0 && peekCount < 2 && lemmaIds.every((id) => hiddenLemmaIds.has(id) || knownLemmaIds.has(id));
  const isHidden = isHideEligible && !revealed;
  const previousEligibility = useRef(isHideEligible);
  useEffect(() => {
    if (isHideEligible && !previousEligibility.current) setRevealed(false);
    previousEligibility.current = isHideEligible;
  }, [isHideEligible]);

  const joinedArabic = shapeQpcArabic(word.ar.map((s) => s.t).join(''));
  const keepJoined = /[۪۬]/.test(joinedArabic);
  const segments = keepJoined ? [{ t: joinedArabic }] : attachLeadingCombiningMarks(word.ar);
  const showGloss = showTranslation && !hideMeaning && !isHidden && word.en.length > 0;
  const translationRevealed = showTranslation && !hideMeaning && !isHidden;

  const handlePress = () => {
    if (!isHideEligible || !showTranslation) {
      onOpenDetails?.(word, translationRevealed);
      return;
    }
    if (revealed) {
      setRevealed(false);
      return;
    }
    setRevealed(true);
    if (lemmaIds.length === 0) return;
    const peeks = noteReaderPeek(peekKey);
    if (peeks < 2) {
      hapticSelection();
      return;
    }
    hapticWarning();
    const progress = useProgressStore.getState().progress;
    const studyWordId = getHiddenStudyWordIdForLemmas(lemmaIds, progress);
    if (studyWordId) gradeWord(studyWordId, 'again');
    if (lemmaIds.some((id) => knownLemmaIds.has(id))) unmarkKnown(lemmaIds);
  };

  return (
    <div
      role="button"
      tabIndex={0}
      title={isHidden ? 'You know this word. Click for a hint, right-click for details.' : undefined}
      onClick={() => {
        if (longPressed.current) {
          longPressed.current = false;
          return;
        }
        handlePress();
      }}
      onContextMenu={(e) => {
        if (!onOpenDetails) return;
        e.preventDefault();
        onOpenDetails(word, translationRevealed);
      }}
      onPointerDown={(e) => {
        if (e.pointerType !== 'touch' || !onOpenDetails) return;
        longPressed.current = false;
        pressTimer.current = setTimeout(() => {
          longPressed.current = true;
          onOpenDetails(word, translationRevealed);
        }, 380);
      }}
      onPointerUp={() => pressTimer.current && clearTimeout(pressTimer.current)}
      onPointerLeave={() => pressTimer.current && clearTimeout(pressTimer.current)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handlePress();
        } else if (e.key === 'i' && onOpenDetails) {
          onOpenDetails(word, translationRevealed);
        }
      }}
      className={cn(
        'inline-flex flex-col items-center min-w-[40px] max-w-[170px] rounded-medium px-2 py-1 cursor-pointer select-none outline-none transition-colors',
        'hover:bg-backgroundSelected/70 focus-visible:bg-backgroundSelected',
      )}
    >
      <span
        className="uthmanic-text text-center whitespace-nowrap"
        style={{ fontSize: arabicSize, lineHeight: `${Math.round(arabicSize * 1.9)}px`, color: 'var(--text)' }}
      >
        {segments.map((seg, i) => (
          <span key={i} style={{ color: showTajweed ? tajweedColor(seg.c, isDark, 'var(--text)') : undefined }}>
            {seg.t}
          </span>
        ))}
      </span>
      {showTransliteration && word.tl ? (
        <span
          dir="ltr"
          className="text-center font-semibold text-primary line-clamp-2"
          style={{ fontSize: transliterationSize, lineHeight: `${Math.round(transliterationSize * 1.3)}px` }}
        >
          {word.tl}
        </span>
      ) : null}
      {(showGloss || speaking) && (
        <span className={cn('my-1 h-px w-4/5', speaking ? 'bg-primary h-0.5' : 'bg-border')} />
      )}
      {showGloss && (
        <span
          dir="ltr"
          className="text-center font-medium line-clamp-2"
          style={{ fontSize: glossSize, lineHeight: `${Math.round(glossSize * 1.25)}px` }}
        >
          {word.en.map((seg, i) => (
            <span key={i} style={{ color: glossColor(seg.c, isDark, 'var(--text-secondary)') }}>
              {seg.t}
            </span>
          ))}
        </span>
      )}
    </div>
  );
});
