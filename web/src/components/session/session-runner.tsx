'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { Trophy, ArrowRight } from 'lucide-react';
import { useProgress } from '@/context/progress-context';
import { useRecitation } from '@/context/recitation-context';
import type { Word } from '@/lib/levels';
import {
  createNewCard,
  deserializeCard,
  type Card,
  type GradeName,
} from '@/lib/fsrs';
import { FlashCard } from '@/components/session/flash-card';
import { GradeButtons } from '@/components/session/grade-buttons';
import { getVocabExampleRefs } from '@/lib/vocab-examples';

interface SessionRunnerProps {
  initialWords: Word[];
  title: string;
  returnHref: string;
}

export function SessionRunner({ initialWords, title, returnHref }: SessionRunnerProps) {
  const { progress, gradeWord, recordStudySeconds } = useProgress();
  const { playWordAudio } = useRecitation();

  const [queue, setQueue] = useState<Word[]>(initialWords);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [revealed, setRevealed] = useState<boolean>(false);
  const [studiedCount, setStudiedCount] = useState<number>(0);
  const [isCompleted, setIsCompleted] = useState<boolean>(false);

  const startTimeRef = useRef<number>(0);

  useEffect(() => {
    startTimeRef.current = Date.now();
    return () => {
      const elapsed = Math.round((Date.now() - startTimeRef.current) / 1000);
      if (elapsed > 2) {
        recordStudySeconds(elapsed);
      }
    };
  }, [recordStudySeconds]);

  const currentWord = queue[currentIndex];

  const currentCard: Card = currentWord
    ? progress[currentWord.id]
      ? deserializeCard(progress[currentWord.id].card)
      : createNewCard()
    : createNewCard();

  const handleReveal = useCallback(() => {
    if (!revealed) {
      setRevealed(true);
    }
  }, [revealed]);

  const handleGrade = useCallback(
    (grade: GradeName) => {
      if (!currentWord) return;

      gradeWord(currentWord.id, grade);
      setStudiedCount((prev) => prev + 1);

      if (grade === 'again') {
        setQueue((prev) => [...prev, currentWord]);
      }

      if (currentIndex + 1 >= queue.length && grade !== 'again') {
        setIsCompleted(true);
      } else {
        setCurrentIndex((prev) => prev + 1);
        setRevealed(false);
      }
    },
    [currentIndex, currentWord, gradeWord, queue.length]
  );

  const handlePlayAudio = useCallback(() => {
    if (!currentWord) return;
    const refs = getVocabExampleRefs(currentWord);
    if (refs.length > 0) {
      playWordAudio(refs[0].s, refs[0].a, refs[0].p);
    }
  }, [currentWord, playWordAudio]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        if (!revealed) {
          handleReveal();
        }
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handlePlayAudio();
      } else if (revealed) {
        if (e.key === '1') {
          e.preventDefault();
          handleGrade('again');
        } else if (e.key === '2') {
          e.preventDefault();
          handleGrade('hard');
        } else if (e.key === '3') {
          e.preventDefault();
          handleGrade('good');
        } else if (e.key === '4') {
          e.preventDefault();
          handleGrade('easy');
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleGrade, handlePlayAudio, handleReveal, revealed]);

  if (isCompleted || !currentWord) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 text-center animate-fadeIn space-y-5 select-none">
        <div className="w-16 h-16 rounded-large bg-backgroundSelected text-primary flex items-center justify-center shadow-xs border border-border">
          <Trophy className="w-8 h-8" />
        </div>

        <div className="space-y-1.5">
          <h2 className="text-2xl font-bold text-text">
            Session Complete
          </h2>
          <p className="text-xs text-textSecondary max-w-sm">
            You completed {studiedCount} card {studiedCount === 1 ? 'review' : 'reviews'} in this sitting.
          </p>
        </div>

        <div className="pt-2">
          <Link
            href={returnHref}
            className="py-2.5 px-6 bg-primary hover:opacity-90 text-onPrimary font-bold text-xs rounded-medium flex items-center gap-2 shadow-xs transition-opacity"
          >
            <span>Continue</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  const progressPercent = Math.round((currentIndex / queue.length) * 100);

  return (
    <div className="max-w-xl mx-auto px-4 py-6 flex flex-col items-center space-y-4 animate-fadeIn select-none">
      {/* Session Header & Progress */}
      <div className="w-full flex items-center justify-between text-xs font-bold text-textSecondary">
        <Link href={returnHref} className="hover:text-text transition-colors">
          ✕ End Session
        </Link>
        <span className="text-text">{title}</span>
        <span className="text-textMuted">
          {currentIndex + 1} of {queue.length}
        </span>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-1.5 bg-backgroundElement border border-border rounded-full overflow-hidden">
        <div
          className="bg-primary h-full transition-all duration-300"
          style={{ width: `${progressPercent}%` }}
        />
      </div>

      {/* Flashcard */}
      <FlashCard
        word={currentWord}
        revealed={revealed}
        onReveal={handleReveal}
        hideArabic={(progress[currentWord.id]?.easyStreak ?? 0) >= 2}
      />

      {/* Grading Controls */}
      {revealed ? (
        <GradeButtons card={currentCard} onGrade={handleGrade} />
      ) : (
        <button
          type="button"
          onClick={handleReveal}
          className="w-full h-12 bg-primary hover:opacity-95 text-onPrimary font-bold text-sm rounded-medium shadow-xs transition-opacity flex items-center justify-center"
        >
          Show Answer (Space)
        </button>
      )}
    </div>
  );
}
