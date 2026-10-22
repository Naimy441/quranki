'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { BookMarked, ChevronLeft, Eye, Plus, Sparkles, Unlock } from 'lucide-react';
import { HIFZ_UNLOCK_RATIO } from '@/lib/ruku';
import { hapticMedium, hapticSuccess } from '@/lib/haptics';
import { useHifzStore } from '@/store/hifz-store';
import { cn } from '@/lib/cn';

const UNLOCK_PERCENT = Math.round(HIFZ_UNLOCK_RATIO * 100);

const STEPS = [
  {
    id: 'unlock',
    title: 'A ruku just opened',
    body: `You know ${UNLOCK_PERCENT}% of the words in a section of the Quran. That is enough to start memorizing it.`,
    icon: Unlock,
  },
  { id: 'add', title: 'Add it to your deck', body: 'Open the surah on this list and click + on a ruku. That enrolls it for review.', icon: Plus },
  {
    id: 'cue',
    title: 'A few words are the prompt',
    body: 'You will see the opening of the ruku. Recite the rest from memory, then reveal to check.',
    icon: Eye,
  },
  {
    id: 'grade',
    title: 'Grade how it felt',
    body: 'Same Again, Hard, Good, and Easy as words. The ones that slip come back sooner.',
    icon: Sparkles,
  },
  {
    id: 'start',
    title: 'Start from Quran',
    body: 'The Memorize card at the top of the Quran list is your session. More rukus appear as you learn their words.',
    icon: BookMarked,
  },
] as const;

const GRADES = [
  ['Again', 'bg-gradeAgain'],
  ['Hard', 'bg-gradeHard'],
  ['Good', 'bg-gradeGood'],
  ['Easy', 'bg-gradeEasy'],
] as const;

function Visual({ id }: { id: (typeof STEPS)[number]['id'] }) {
  if (id === 'unlock') {
    return (
      <div className="card w-full max-w-sm p-5">
        <div className="flex justify-between text-sm"><span className="font-semibold">Al-Fatihah - Ruku 1</span><span className="font-semibold text-primary">{UNLOCK_PERCENT}%</span></div>
        <div className="mt-3 h-2 rounded-full bg-border overflow-hidden"><motion.div className="h-full bg-primary" initial={{ width: 0 }} animate={{ width: `${UNLOCK_PERCENT}%` }} transition={{ duration: 1 }} /></div>
      </div>
    );
  }
  if (id === 'add') {
    return (
      <div className="card w-full max-w-sm divide-y divide-border">
        {[1, 2].map((n) => (
          <div key={n} className="flex items-center justify-between px-4 py-3 text-sm">
            <span><span className="font-semibold">Ruku {n}</span> <span className="text-textMuted">2:{n * 8 - 7} - {n * 8}</span></span>
            <span className={cn('flex h-8 w-8 items-center justify-center rounded-medium', n === 1 ? 'bg-primary text-onPrimary' : 'text-primary')}><Plus className="w-4 h-4" /></span>
          </div>
        ))}
      </div>
    );
  }
  if (id === 'cue') {
    return (
      <div className="card w-full max-w-sm p-6 text-center">
        <div dir="rtl" className="uthmanic-text text-4xl leading-[1.9]">ٱلۡحَمۡدُ لِلَّهِ رَبِّ ...</div>
        <div className="mt-2 text-xs text-textMuted">Recite the rest, then reveal</div>
      </div>
    );
  }
  if (id === 'grade') {
    return (
      <div className="grid w-full max-w-sm grid-cols-4 gap-2">
        {GRADES.map(([label, cls]) => (
          <div key={label} className={cn('rounded-large py-4 text-center text-sm font-semibold text-white', cls)}>{label}</div>
        ))}
      </div>
    );
  }
  return (
    <div className="card flex w-full max-w-sm items-center gap-3 p-3">
      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-backgroundSelected text-primary"><BookMarked className="w-4 h-4" /></span>
      <span className="flex-1"><span className="block text-sm font-semibold">Memorize</span><span className="block text-xs text-textSecondary">1 new</span></span>
      <span className="btn-primary h-8 px-3 rounded-pill text-xs">Start</span>
    </div>
  );
}

export default function HifzIntroPage() {
  const router = useRouter();
  const markIntroSeen = useHifzStore((s) => s.markIntroSeen);
  const [index, setIndex] = useState(0);
  const step = STEPS[index];
  const isLast = index === STEPS.length - 1;

  const next = () => {
    if (isLast) {
      hapticSuccess();
      markIntroSeen();
      router.replace('/quran');
      return;
    }
    hapticMedium();
    setIndex((i) => i + 1);
  };

  return (
    <div className="mx-auto flex min-h-[100dvh] max-w-lg flex-col px-5 py-6">
      <div className="h-10">
        {index > 0 && (
          <button onClick={() => setIndex((i) => i - 1)} className="icon-btn" aria-label="Back">
            <ChevronLeft className="w-5 h-5" />
          </button>
        )}
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={step.id}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="flex flex-1 flex-col items-center justify-center gap-10 text-center"
        >
          <Visual id={step.id} />
          <div>
            <h1 className="font-display text-4xl tracking-tight">{step.title}</h1>
            <p className="mt-3 text-textSecondary">{step.body}</p>
          </div>
        </motion.div>
      </AnimatePresence>
      <div className="flex flex-col items-center gap-5 pb-4">
        <div className="flex gap-1.5">
          {STEPS.map((s, i) => (
            <span key={s.id} className={cn('h-1.5 rounded-full transition-all', i === index ? 'w-5 bg-primary' : 'w-1.5 bg-border')} />
          ))}
        </div>
        <button onClick={next} className="btn-primary h-12 w-full rounded-large">
          {isLast ? 'Show my rukus' : 'Continue'}
        </button>
      </div>
    </div>
  );
}
