'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { CheckCircle2, ChevronLeft, EyeOff, Play, Settings2, X } from 'lucide-react';
import { createNewCard, deserializeCard, formatInterval, previewGrades, State, type GradeName } from '@/lib/fsrs';
import { hifzCardKey, type HifzCardProgress, type HifzSessionCard } from '@/lib/hifz';
import { playRukuCue, stopRukuCue } from '@/lib/hifz-cue-audio';
import { hapticHeavy, hapticLight, hapticMedium, hapticSelection, hapticSuccess } from '@/lib/haptics';
import { formatStudyDuration } from '@/lib/stats';
import { isTypingTarget } from '@/components/layout/command-palette';
import { useStudySessionClock } from '@/hooks/use-study-session-clock';
import { HifzCardFront } from '@/components/hifz/hifz-card-front';
import { RukuReader } from '@/components/hifz/ruku-reader';
import { GradeButtons } from '@/components/session/grade-buttons';
import { ReaderSettingsModal } from '@/components/quran/reader-settings-modal';
import { useHifzStore } from '@/store/hifz-store';
import { playSurah, stopRecitation } from '@/store/recitation-store';

function hapticGrade(grade: GradeName) {
  if (grade === 'again') hapticHeavy();
  else if (grade === 'hard') hapticMedium();
  else if (grade === 'good') hapticLight();
  else hapticSuccess();
}

const EMPTY_COUNTS: Record<GradeName, number> = { again: 0, hard: 0, good: 0, easy: 0 };
type QueuedEntry = HifzSessionCard & { sessionKey: string };
let nextKey = 0;
const tag = (e: HifzSessionCard): QueuedEntry => ({ ...e, sessionKey: `h-${++nextKey}` });

function countsFrom(grades: Record<string, { grade: GradeName }>): Record<GradeName, number> {
  const counts = { ...EMPTY_COUNTS };
  for (const g of Object.values(grades)) counts[g.grade] += 1;
  return counts;
}

export function HifzSessionRunner({ queue }: { queue: HifzSessionCard[] }) {
  const router = useRouter();
  const cards = useHifzStore((s) => s.cards);
  const gradeRuku = useHifzStore((s) => s.gradeRuku);
  const revertSessionRuku = useHifzStore((s) => s.revertSessionRuku);
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [phase, setPhase] = useState<'review' | 'summary'>(queue.length === 0 ? 'summary' : 'review');
  const [counts, setCounts] = useState(EMPTY_COUNTS);
  const [sessionQueue, setSessionQueue] = useState(() => queue.map(tag));
  const [clock] = useState(() => new Date());
  const [settingsOpen, setSettingsOpen] = useState(false);
  const { sessionMs, markInteraction, flushNow } = useStudySessionClock(phase === 'review' && queue.length > 0);
  const preSession = useRef<Record<number, HifzCardProgress | null>>({});
  const sessionGrades = useRef<Record<number, { grade: GradeName }>>({});

  useEffect(
    () => () => {
      stopRecitation();
      stopRukuCue();
    },
    [],
  );

  const current = sessionQueue[index];
  const currentProgress = current ? cards[hifzCardKey(current.ruku.id)] : undefined;
  const currentCard = useMemo(
    () => (current ? (currentProgress ? deserializeCard(currentProgress.card) : createNewCard()) : null),
    [current, currentProgress],
  );
  // Freeze the card for this slot so its interval previews do not shift after grading.
  const slotCard = useMemo(() => currentCard, [current?.sessionKey]); // eslint-disable-line react-hooks/exhaustive-deps
  const previews = useMemo(() => (slotCard ? previewGrades(slotCard, clock) : []), [clock, slotCard]);

  const speak = () => {
    if (!current) return;
    markInteraction();
    hapticSelection();
    stopRecitation();
    if (isSpeaking) {
      stopRukuCue();
      setIsSpeaking(false);
      return;
    }
    setIsSpeaking(true);
    void playRukuCue(current.ruku, () => setIsSpeaking(false))
      .then((ok) => !ok && setIsSpeaking(false))
      .catch(() => setIsSpeaking(false));
  };

  const reveal = () => {
    markInteraction();
    hapticLight();
    stopRukuCue();
    setIsSpeaking(false);
    setRevealed(true);
  };

  const previous = () => {
    if (index <= 0) return;
    markInteraction();
    stopRecitation();
    stopRukuCue();
    setIsSpeaking(false);
    const target = index - 1;
    const entry = sessionQueue[target];
    if (entry) {
      const id = entry.ruku.id;
      if (sessionGrades.current[id]) {
        revertSessionRuku(id, preSession.current[id] ?? undefined);
        delete sessionGrades.current[id];
        setCounts(countsFrom(sessionGrades.current));
      }
      setSessionQueue((prev) => prev.filter((e, i) => i <= target || e.ruku.id !== id));
    }
    setIndex(target);
    setRevealed(false);
  };

  const grade = (g: GradeName) => {
    if (!current) return;
    markInteraction();
    setIsSpeaking(false);
    hapticGrade(g);
    stopRecitation();
    stopRukuCue();
    const id = current.ruku.id;
    if (preSession.current[id] === undefined) {
      preSession.current[id] = currentProgress ? { ...currentProgress, card: { ...currentProgress.card } } : null;
    }
    const nextCard = gradeRuku(id, g, slotCard ? { fromCard: slotCard } : {});
    sessionGrades.current[id] = { grade: g };
    setCounts(countsFrom(sessionGrades.current));
    let nextQueue = sessionQueue.filter((e, i) => i <= index || e.ruku.id !== id);
    if (nextCard.state !== State.Review) nextQueue = [...nextQueue, tag({ ...current, reason: 'due' })];
    setSessionQueue(nextQueue);
    if (index + 1 < nextQueue.length) {
      setIndex(index + 1);
      setRevealed(false);
    } else {
      flushNow();
      setPhase('summary');
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (phase !== 'review' || isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      if ((e.code === 'Space' || e.key === 'Enter') && !revealed) {
        e.preventDefault();
        reveal();
      } else if ((e.key === 'r' || e.key === 'R') && !revealed) {
        e.preventDefault();
        speak();
      } else if (revealed && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault();
        grade((['again', 'hard', 'good', 'easy'] as const)[Number(e.key) - 1]);
      } else if (e.key === 'Escape' && !document.querySelector('[role="dialog"]')) {
        router.push('/memorize');
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  if (phase === 'summary') {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center px-4">
        <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} className="w-full max-w-md text-center">
          <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-backgroundSelected text-primary">
            <CheckCircle2 className="w-10 h-10" />
          </div>
          <h1 className="mt-6 font-display text-5xl tracking-tight">{queue.length === 0 ? 'All caught up' : 'Session complete'}</h1>
          <p className="mt-2 text-textSecondary">
            {queue.length === 0
              ? 'Nothing is due in your Quran memorization deck.'
              : `You reviewed ${queue.length} ${queue.length === 1 ? 'ruku' : 'rukus'}${sessionMs > 0 ? ` in ${formatStudyDuration(sessionMs)}` : ''}.`}
          </p>
          {queue.length > 0 && <UpcomingHifzNote />}
          {queue.length > 0 && (
            <div className="mt-8 grid grid-cols-4 gap-2">
              {(['again', 'hard', 'good', 'easy'] as GradeName[]).map((g) => (
                <div key={g} className="card py-3">
                  <div className="text-2xl font-semibold">{counts[g]}</div>
                  <div className="text-xs capitalize text-textSecondary">{g}</div>
                </div>
              ))}
            </div>
          )}
          <Link href="/memorize" className="btn-primary mt-8 h-11 px-8 rounded-pill">
            Done
          </Link>
        </motion.div>
      </div>
    );
  }

  if (!current || !currentCard) return null;
  const total = sessionQueue.length;
  const kind =
    current.reason === 'new'
      ? 'New'
      : slotCard && (slotCard.state === State.Learning || slotCard.state === State.Relearning)
        ? 'Learn'
        : 'Review';

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="sticky top-0 z-20 bg-background/85 backdrop-blur-xl">
        <div className="mx-auto flex h-14 max-w-3xl items-center gap-2 px-4">
          <Link href="/memorize" className="icon-btn" title="End session (Esc)" onClick={() => { stopRukuCue(); stopRecitation(); }}>
            <X className="w-5 h-5" />
          </Link>
          <span className="flex-1 text-center text-sm text-textSecondary tabular-nums">
            {index + 1}/{total}
          </span>
          {revealed ? (
            <>
              <button
                onClick={() => {
                  markInteraction();
                  stopRukuCue();
                  void playSurah(current.ruku.surah, current.ruku.fromAyah, current.ruku.toAyah);
                }}
                className="icon-btn"
                title="Play this ruku"
              >
                <Play className="w-[18px] h-[18px]" />
              </button>
              <button onClick={() => setSettingsOpen(true)} className="icon-btn" title="Reader settings">
                <Settings2 className="w-[18px] h-[18px]" />
              </button>
              <button
                onClick={() => {
                  markInteraction();
                  stopRecitation();
                  setRevealed(false);
                }}
                className="icon-btn"
                title="Hide ruku"
              >
                <EyeOff className="w-[18px] h-[18px]" />
              </button>
            </>
          ) : index > 0 ? (
            <button onClick={previous} className="icon-btn" title="Previous ruku (undo its grade)">
              <ChevronLeft className="w-5 h-5" />
            </button>
          ) : (
            <span className="w-9" />
          )}
        </div>
        <div className="mx-auto h-1 max-w-3xl px-4">
          <div className="h-1 overflow-hidden rounded-full bg-backgroundElement">
            <motion.div className="h-full bg-primary" animate={{ width: `${(index / total) * 100}%` }} />
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-8">
        {revealed ? (
          <RukuReader
            key={current.ruku.id}
            ruku={current.ruku}
            footer={
              <div className="sticky bottom-4 mt-6">
                <GradeButtons previews={previews} onGrade={grade} />
                <p className="mt-2 text-center text-xs text-textMuted">{kind}</p>
              </div>
            }
          />
        ) : (
          <div className="flex min-h-[60vh] flex-col justify-between">
            <HifzCardFront ruku={current.ruku} onSpeak={speak} isSpeaking={isSpeaking} />
            <button onClick={reveal} className="btn-primary mt-10 h-14 w-full rounded-large text-base">
              Show ruku
              <kbd className="hidden md:inline-flex kbd bg-onPrimary/15 border-onPrimary/20 text-onPrimary">Space</kbd>
            </button>
          </div>
        )}
      </main>
      <ReaderSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
    </div>
  );
}

function UpcomingHifzNote() {
  const cards = useHifzStore((s) => s.cards);
  const [now] = useState(() => Date.now());
  let soonest: number | null = null;
  for (const entry of Object.values(cards)) {
    const due = new Date(entry.card.due).getTime() - now;
    if (due > 0 && (soonest === null || due < soonest)) soonest = due;
  }
  if (soonest === null) return null;
  return <p className="mt-3 text-textSecondary">Next ruku comes back in about {formatInterval(soonest)}.</p>;
}
