'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { BookOpen, CheckCircle2, ChevronLeft, EyeOff, Flag, X } from 'lucide-react';
import {
  createNewCard,
  deserializeCard,
  formatInterval,
  previewGrades,
  serializeCard,
  State,
  type Card,
  type GradeName,
  type GradePreview,
} from '@/lib/fsrs';
import {
  computeReachedQaidaLevel,
  formatLevelLabel,
  getStageForLevel,
  getUpcomingLearning,
  hidesPromptArabic,
  isQaidaComplete,
  isStudyWord,
  stageDisplayNumber,
  usesListeningOverlay,
  type SessionWord,
  type WordProgress,
} from '@/lib/levels';
import { hapticHeavy, hapticLight, hapticMedium, hapticSelection, hapticSuccess } from '@/lib/haptics';
import { formatStudyDuration } from '@/lib/stats';
import { playWordPronunciation, prefetchWordPronunciation, stopWordPronunciation } from '@/lib/word-pronunciation';
import { isTypingTarget } from '@/components/layout/command-palette';
import { useStudySessionClock } from '@/hooks/use-study-session-clock';
import { FlashCard } from '@/components/session/flash-card';
import { GradeButtons } from '@/components/session/grade-buttons';
import { useProgressStore } from '@/store/progress-store';
import { stopRecitation } from '@/store/recitation-store';

function hapticGrade(grade: GradeName) {
  if (grade === 'again') hapticHeavy();
  else if (grade === 'hard') hapticMedium();
  else if (grade === 'good') hapticLight();
  else hapticSuccess();
}

const EMPTY_COUNTS: Record<GradeName, number> = { again: 0, hard: 0, good: 0, easy: 0 };
type QueuedEntry = SessionWord & { sessionKey: string };
let nextSessionKey = 0;
const tagEntry = (e: SessionWord): QueuedEntry => ({ ...e, sessionKey: `q-${++nextSessionKey}` });

function countsFrom(grades: Record<string, { grades: GradeName[] }>): Record<GradeName, number> {
  const counts = { ...EMPTY_COUNTS };
  for (const entry of Object.values(grades)) for (const g of entry.grades) counts[g] += 1;
  return counts;
}

/** Position in the sitting, counting a later copy of a word only if it still lies ahead. */
function sessionStudyProgress(queue: QueuedEntry[], index: number, current: QueuedEntry) {
  const completed = queue.slice(0, index).filter((e) => isStudyWord(e.word)).length;
  const ahead = new Set<string>();
  for (let i = index; i < queue.length; i += 1) if (isStudyWord(queue[i].word)) ahead.add(queue[i].word.id);
  const total = completed + ahead.size;
  return {
    studyTotal: total,
    studyPosition: isStudyWord(current.word) ? completed + 1 : completed,
    studyProgress: total === 0 ? 0 : completed / total,
  };
}

export function SessionRunner({ queue, emptyMessage, returnHref = '/learn' }: { queue: SessionWord[]; emptyMessage: string; returnHref?: string }) {
  const router = useRouter();
  const progress = useProgressStore((s) => s.progress);
  const hideNextSessionPrompts = useProgressStore((s) => s.hideNextSessionPrompts);
  const maxUnlockedLevel = useProgressStore((s) => s.maxUnlockedLevel);
  const learnToRead = useProgressStore((s) => s.settings.canReadQuran === false);
  const autoPlay = useProgressStore((s) => s.settings.autoPlayWordAudio !== false);
  const gradeWord = useProgressStore((s) => s.gradeWord);
  const revertSessionWord = useProgressStore((s) => s.revertSessionWord);
  const [initialMax] = useState(() => maxUnlockedLevel);
  const [initialQaidaComplete] = useState(() => isQaidaComplete(progress));
  const [initialQaidaLevel] = useState(() => computeReachedQaidaLevel(progress));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [phase, setPhase] = useState<'review' | 'summary'>(queue.length === 0 ? 'summary' : 'review');
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [sessionQueue, setSessionQueue] = useState(() => queue.map(tagEntry));
  const { sessionMs, markInteraction, flushNow } = useStudySessionClock(phase === 'review' && queue.length > 0);
  const firstSeenCards = useRef<Record<string, Card>>({});
  const firstSeenPreviews = useRef<Record<string, GradePreview[]>>({});
  const firstSeenByWord = useRef<Record<string, Card>>({});
  const preSession = useRef<Record<string, WordProgress | null>>({});
  const sessionGrades = useRef<Record<string, { grades: GradeName[]; countedAsNew: boolean; countedAsReview: boolean }>>({});
  const autoplayOnAdvance = useRef(true);
  const autoplayTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const cancelAutoplay = () => {
    if (autoplayTimer.current) clearTimeout(autoplayTimer.current);
    autoplayTimer.current = null;
  };

  useEffect(
    () => () => {
      stopRecitation();
      stopWordPronunciation();
    },
    [],
  );

  const current = sessionQueue[index];
  const currentWordId = current?.word.id;
  const nextWordId = sessionQueue[index + 1]?.word.id;

  useEffect(() => {
    setIsSpeaking(false);
    stopWordPronunciation();
    if (currentWordId) prefetchWordPronunciation(currentWordId);
  }, [currentWordId]);
  useEffect(() => {
    if (nextWordId) prefetchWordPronunciation(nextWordId);
  }, [nextWordId]);

  const speakWord = (wordId: string) => {
    stopRecitation();
    setIsSpeaking(true);
    void playWordPronunciation(wordId, () => setIsSpeaking(false))
      .then((played) => !played && setIsSpeaking(false))
      .catch(() => setIsSpeaking(false));
  };

  // Listening-recall cards speak on their own when they come up.
  useEffect(() => {
    if (!current || !autoplayOnAdvance.current) return;
    autoplayOnAdvance.current = false;
    const store = useProgressStore.getState();
    const hide =
      usesListeningOverlay(current.word) && (store.hideNextSessionPrompts || hidesPromptArabic(store.progress[current.word.id]));
    if (!hide) return;
    const id = current.word.id;
    autoplayTimer.current = setTimeout(() => {
      autoplayTimer.current = null;
      speakWord(id);
    }, 400);
    return cancelAutoplay;
  }, [current?.sessionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const currentProgress = current ? progress[current.word.id] : undefined;
  const currentCard = useMemo(() => {
    if (!current) return null;
    return currentProgress ? deserializeCard(currentProgress.card) : createNewCard();
  }, [current?.word.id, currentProgress?.reviewedAt]); // eslint-disable-line react-hooks/exhaustive-deps

  if (current && currentCard && !firstSeenCards.current[current.sessionKey]) {
    firstSeenCards.current[current.sessionKey] = deserializeCard(serializeCard(currentCard));
  }
  if (current && currentCard && !firstSeenByWord.current[current.word.id]) {
    firstSeenByWord.current[current.word.id] = deserializeCard(serializeCard(currentCard));
    preSession.current[current.word.id] = currentProgress ? { ...currentProgress, card: { ...currentProgress.card } } : null;
  }
  const previewCard = current ? (firstSeenCards.current[current.sessionKey] ?? currentCard) : null;
  const previews = useMemo(() => {
    if (!previewCard || !current) return [];
    const key = current.sessionKey;
    firstSeenPreviews.current[key] ??= previewGrades(previewCard, new Date());
    return firstSeenPreviews.current[key];
  }, [previewCard, current?.sessionKey]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSpeak = () => {
    if (!current || current.word.kind === 'digit') return;
    cancelAutoplay();
    markInteraction();
    hapticSelection();
    speakWord(current.word.id);
  };

  const reveal = () => {
    if (!current || revealed) return;
    markInteraction();
    hapticLight();
    setRevealed(true);
    const listening = usesListeningOverlay(current.word) && (hideNextSessionPrompts || hidesPromptArabic(currentProgress));
    if (autoPlay && !listening && current.word.kind !== 'digit' && current.word.kind !== 'grammar') speakWord(current.word.id);
  };

  const hideAnswer = () => {
    markInteraction();
    stopRecitation();
    setRevealed(false);
  };

  const previous = () => {
    if (index <= 0) return;
    autoplayOnAdvance.current = false;
    cancelAutoplay();
    markInteraction();
    stopRecitation();
    stopWordPronunciation();
    setIsSpeaking(false);
    const targetIndex = index - 1;
    const target = sessionQueue[targetIndex];
    if (target && isStudyWord(target.word)) {
      const id = target.word.id;
      const recorded = sessionGrades.current[id];
      if (recorded) {
        revertSessionWord(id, preSession.current[id] ?? undefined, {
          countedAsNew: recorded.countedAsNew,
          countedAsReview: recorded.countedAsReview,
        });
        delete sessionGrades.current[id];
        setCounts(countsFrom(sessionGrades.current));
      }
      setSessionQueue((prev) => prev.filter((e, i) => i <= targetIndex || e.word.id !== id));
    }
    setIndex(targetIndex);
    setRevealed(false);
  };

  const grade = (g: GradeName) => {
    if (!current) return;
    markInteraction();
    setIsSpeaking(false);
    hapticGrade(g);
    stopRecitation();
    const id = current.word.id;
    const already = sessionGrades.current[id];
    const fromCard = firstSeenCards.current[current.sessionKey] ?? firstSeenByWord.current[id];
    const existing = progress[id];
    const baseCard = fromCard ?? (existing ? deserializeCard(existing.card) : createNewCard());
    const countedAsReview = !already && existing !== undefined && baseCard.state === State.Review;
    const countedAsNew = !already && existing === undefined && isStudyWord(current.word);
    const nextCard = gradeWord(id, g, { ...(fromCard ? { fromCard } : {}), replaceSessionGrade: already !== undefined });
    if (isStudyWord(current.word)) {
      sessionGrades.current[id] = {
        grades: [...(already?.grades ?? []), g],
        countedAsNew: already?.countedAsNew ?? countedAsNew,
        countedAsReview: already?.countedAsReview ?? countedAsReview,
      };
      setCounts(countsFrom(sessionGrades.current));
    }
    const requeue = nextCard.state !== State.Review && isStudyWord(current.word);
    let nextQueue = sessionQueue.filter((e, i) => i <= index || e.word.id !== id);
    if (requeue) nextQueue = [...nextQueue, tagEntry({ ...current, reason: 'due' })];
    setSessionQueue(nextQueue);
    if (index + 1 < nextQueue.length) {
      autoplayOnAdvance.current = true;
      setIndex(index + 1);
      setRevealed(false);
    } else {
      stopWordPronunciation();
      flushNow();
      setPhase('summary');
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'review' || !current || isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if (document.querySelector('[role="dialog"]')) return;
      const grammar = current.word.kind === 'grammar';
      if (e.code === 'Space' || e.key === 'Enter') {
        e.preventDefault();
        if (grammar) grade('easy');
        else if (!revealed) reveal();
        else grade('good');
      } else if (e.key === 'r' || e.key === 'R') {
        e.preventDefault();
        handleSpeak();
      } else if ((e.key === 'z' || e.key === 'Z' || e.key === 'Backspace') && index > 0 && !revealed) {
        e.preventDefault();
        previous();
      } else if (revealed && !grammar && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        grade((['again', 'hard', 'good', 'easy'] as const)[Number(e.key) - 1]);
      } else if (e.key === 'Escape') {
        router.push(returnHref);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (phase === 'summary') {
    const qaidaJustFinished = !initialQaidaComplete && isQaidaComplete(progress);
    const qaidaLevelNow = computeReachedQaidaLevel(progress);
    const unlockedNewStage = getStageForLevel(maxUnlockedLevel).id > getStageForLevel(initialMax).id;
    const unlockedNewLevel = maxUnlockedLevel > initialMax || unlockedNewStage || qaidaJustFinished || qaidaLevelNow > initialQaidaLevel;
    const unlockedStage = getStageForLevel(maxUnlockedLevel);
    let unlockMessage = `Now studying ${formatLevelLabel(maxUnlockedLevel, learnToRead)}`;
    if (qaidaJustFinished) unlockMessage = 'Stage 1 is complete - Stage 2 is open';
    else if (unlockedNewStage)
      unlockMessage = unlockedStage.kind === 'asma' ? 'The 99 Names unlocked' : `Stage ${stageDisplayNumber(unlockedStage, learnToRead)} unlocked`;
    else if (qaidaLevelNow > initialQaidaLevel) unlockMessage = `Now studying ${formatLevelLabel(qaidaLevelNow, learnToRead)}`;
    const reviewed = queue.filter((e) => isStudyWord(e.word)).length;
    const upcoming = getUpcomingLearning(progress, new Date());

    return (
      <div className="flex min-h-[100dvh] items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <motion.div
            initial={{ scale: 0.6 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 260, damping: 14 }}
            className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-backgroundSelected text-primary"
          >
            <CheckCircle2 className="w-10 h-10" />
          </motion.div>
          <h1 className="mt-6 font-display text-5xl tracking-tight">{queue.length === 0 ? 'All caught up' : 'Session complete'}</h1>
          <p className="mt-2 text-textSecondary">
            {queue.length === 0
              ? emptyMessage
              : reviewed === 0
                ? 'Grammar intro done.'
                : `You reviewed ${reviewed} ${reviewed === 1 ? 'word' : 'words'}${sessionMs > 0 ? ` in ${formatStudyDuration(sessionMs)}` : ''}.`}
          </p>
          {reviewed > 0 && upcoming && (
            <p className="mt-2 text-textSecondary">
              {upcoming.count} {upcoming.count === 1 ? 'word comes' : 'words come'} back in about {formatInterval(upcoming.ms)}.
            </p>
          )}
          {reviewed > 0 && (
            <div className="mt-8 grid grid-cols-4 gap-2">
              {(['again', 'hard', 'good', 'easy'] as GradeName[]).map((g) => (
                <div key={g} className="card py-3">
                  <div className="text-2xl font-semibold">{counts[g]}</div>
                  <div className="text-xs capitalize text-textSecondary">{g}</div>
                </div>
              ))}
            </div>
          )}
          {unlockedNewLevel && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-6 inline-flex items-center gap-2 rounded-pill bg-primary px-4 py-2 text-sm font-semibold text-onPrimary"
            >
              <Flag className="w-4 h-4" /> {unlockMessage}
            </motion.div>
          )}
          <div className="mt-8 flex flex-col gap-2 sm:flex-row sm:justify-center">
            <Link href={returnHref} className="btn-primary h-11 px-8 rounded-pill">
              Done
            </Link>
            <Link href="/quran" className="btn-secondary h-11 px-6 rounded-pill">
              <BookOpen className="w-4 h-4" /> Read the Quran
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  if (!current || !currentCard) return null;
  const { studyTotal, studyPosition, studyProgress } = sessionStudyProgress(sessionQueue, index, current);
  const grammar = current.word.kind === 'grammar';
  const kind = grammar
    ? 'Lesson'
    : current.reason === 'new'
      ? 'New'
      : previewCard && (previewCard.state === State.Learning || previewCard.state === State.Relearning)
        ? 'Learn'
        : 'Review';
  const listening = usesListeningOverlay(current.word) && (hideNextSessionPrompts || hidesPromptArabic(currentProgress));

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-2xl items-center gap-2 px-4">
          <Link href={returnHref} className="icon-btn" title="End session (Esc)">
            <X className="w-5 h-5" />
          </Link>
          <span className="flex-1 text-center text-sm text-textSecondary tabular-nums">
            {studyTotal === 0 ? '' : `${Math.max(studyPosition, 1)}/${studyTotal}`}
          </span>
          {!grammar && revealed ? (
            <button onClick={hideAnswer} className="icon-btn" title="Hide answer">
              <EyeOff className="w-[18px] h-[18px]" />
            </button>
          ) : index > 0 ? (
            <button onClick={previous} className="icon-btn" title="Previous word (Z)">
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <span className="w-9" />
          )}
        </div>
        <div className="mx-auto max-w-2xl px-4">
          <div className="h-1 overflow-hidden rounded-full bg-backgroundElement">
            <motion.div className="h-full bg-primary" animate={{ width: `${studyProgress * 100}%` }} />
          </div>
        </div>
      </header>

      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col px-4 pb-6">
        <div onClick={!revealed && !grammar ? reveal : undefined} className={!revealed && !grammar ? 'flex-1 cursor-pointer' : 'flex-1'}>
          <motion.div
            key={current.sessionKey}
            initial={{ opacity: 0, x: 32 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ type: 'spring', stiffness: 320, damping: 30 }}
            className="py-8"
          >
            <FlashCard
              word={current.word}
              revealed={revealed || grammar}
              hideArabic={listening}
              appearanceKey={current.sessionKey}
              onSpeak={handleSpeak}
              isSpeaking={isSpeaking}
            />
          </motion.div>
        </div>
        <div className="sticky bottom-4">
          <p className="mb-2 text-center text-xs text-textMuted">
            {formatLevelLabel(current.levelNumber, learnToRead)} - {kind}
          </p>
          {grammar ? (
            <button onClick={() => grade('easy')} className="btn-primary h-14 w-full rounded-large text-base">
              Got it
            </button>
          ) : revealed ? (
            <GradeButtons previews={previews} onGrade={grade} />
          ) : (
            <button onClick={reveal} className="btn-primary h-14 w-full rounded-large text-base shadow-glow">
              Show answer
              <kbd className="hidden md:inline-flex kbd bg-onPrimary/15 border-onPrimary/20 text-onPrimary">Space</kbd>
            </button>
          )}
          <p className="mt-3 hidden md:block text-center text-[11px] text-textMuted">
            <kbd className="kbd">R</kbd> listen <kbd className="kbd ml-2">1</kbd>-<kbd className="kbd">4</kbd> grade{' '}
            <kbd className="kbd ml-2">Z</kbd> back <kbd className="kbd ml-2">Esc</kbd> end
          </p>
        </div>
      </main>
    </div>
  );
}
