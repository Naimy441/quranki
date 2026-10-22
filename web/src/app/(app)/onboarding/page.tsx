'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { ChevronLeft, Hand, Loader2, Volume1, Volume2 } from 'lucide-react';
import { Wordmark, LogoMark } from '@/components/brand/logo';
import { GradeButtons } from '@/components/session/grade-buttons';
import { ReminderTimePicker } from '@/components/quranki/reminder-time-picker';
import { useIsDark } from '@/hooks/use-is-dark';
import { createNewCard, previewGrades } from '@/lib/fsrs';
import { hapticMedium, hapticSelection, hapticSuccess } from '@/lib/haptics';
import { shapeQpcArabic } from '@/lib/arabic-display';
import {
  CURRICULUM_LEMMA_COUNT,
  getCoverageThroughLevel,
  LAST_FREQUENCY_LEVEL,
  LEVELS,
  STAGES,
  THEMATIC_WORD_COUNT,
} from '@/lib/levels';
import { DEFAULT_REMINDER_HOUR, DEFAULT_REMINDER_MINUTE, requestReminderPermission } from '@/lib/practice-reminder';
import { glossColor } from '@/lib/quran-colors';
import { getWordLemmaIds, lemmaPeekKey, type LemmaId } from '@/lib/quran-lemmas';
import { BISMILLAH_WORDS } from '@/lib/quran-reader';
import type { ReaderWord } from '@/lib/quran-reader-types';
import { formatCount } from '@/lib/stats';
import { DEFAULT_SETTINGS } from '@/lib/storage';
import { exampleSurface, getVocabExample } from '@/lib/vocab-examples';
import { playWordPronunciation, stopWordPronunciation } from '@/lib/word-pronunciation';
import { useProgressStore } from '@/store/progress-store';
import { cn } from '@/lib/cn';

const DEMO_WORD = LEVELS[0].words[0];
const HIDDEN_DEMO_IDS = allLemmaIds(BISMILLAH_WORDS);

const PACE_OPTIONS = [
  { value: 5, caption: 'Relaxed' },
  { value: 10, caption: 'Comfortable' },
  { value: 15, caption: 'Focused' },
  { value: 20, caption: 'Intense' },
];

const READING_OPTIONS = [
  { value: true, label: 'I already know how to.' },
  { value: false, label: "Sure, let's go!" },
];

function coverageCopy(): { title: string; body: string } {
  const core = getCoverageThroughLevel(STAGES[0].lastLevel);
  const full = getCoverageThroughLevel(LAST_FREQUENCY_LEVEL);
  return {
    title: 'The first words go a long way',
    body: `Stage 1 is ${formatCount(THEMATIC_WORD_COUNT)} words. That is about ${core.percent}% of what you read. All ${formatCount(CURRICULUM_LEMMA_COUNT)} words reach ${full.percent}%.`,
  };
}

/** Same steps and copy as the mobile onboarding screen. */
const STEPS = [
  {
    id: 'welcome',
    title: 'Assalamu alaykum!',
    body: 'Thank you for being here. Quranki helps you understand the Quran by learning its words, then reading them where they appear.',
  },
  {
    id: 'srs',
    title: 'A few words a day',
    body: 'You will see a word, hear it, and say how well you know it. The ones that slip come back sooner.',
  },
  { id: 'quran', title: 'Then open the Quran', body: 'Every word you learn is waiting in the real text, in its own verse.' },
  {
    id: 'hidden',
    title: 'Known words step aside',
    body: 'Once a word is yours, its translation hides. The page starts to look like the mushaf.',
  },
  { id: 'tap', title: 'Tap if you forget', body: 'A hidden word still has its meaning when you need it.' },
  { id: 'coverage', ...coverageCopy() },
  {
    id: 'intention',
    title: 'Take it day by day',
    body: 'A little each day is enough. Keep your intention for the sake of Allah.',
  },
  {
    id: 'reading',
    title: 'Do you want to learn how to read the Quran?',
    body: 'If the letters and vowels are still new, we will start with the Qaida.',
  },
  {
    id: 'pace',
    title: 'How many new words today?',
    body: 'Start with what you can keep. You can change this later in Settings.',
  },
  {
    id: 'reminder',
    title: 'A daily reminder',
    body: 'Pick a time and we will nudge you to practice a few words. You can change this later.',
  },
] as const;

type StepId = (typeof STEPS)[number]['id'];

export default function OnboardingPage() {
  const router = useRouter();
  const completeOnboarding = useProgressStore((s) => s.completeOnboarding);
  const [index, setIndex] = useState(0);
  const [dir, setDir] = useState(1);
  const [wordsPerDay, setWordsPerDay] = useState(DEFAULT_SETTINGS.wordsPerSession);
  const [canReadQuran, setCanReadQuran] = useState(true);
  const [reminderHour, setReminderHour] = useState(DEFAULT_REMINDER_HOUR);
  const [reminderMinute, setReminderMinute] = useState(DEFAULT_REMINDER_MINUTE);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [finishing, setFinishing] = useState(false);

  useEffect(() => () => stopWordPronunciation(), []);

  const step = STEPS[index] ?? STEPS[0];
  const isLast = index === STEPS.length - 1;
  const hasVisual = step.id !== 'pace' && step.id !== 'reminder';

  const handleSpeak = () => {
    setIsSpeaking(true);
    void playWordPronunciation(DEMO_WORD.id, () => setIsSpeaking(false))
      .then((played) => {
        if (!played) setIsSpeaking(false);
      })
      .catch(() => setIsSpeaking(false));
  };

  const finish = async (remind: boolean) => {
    if (finishing) return;
    setFinishing(true);
    hapticSuccess();
    stopWordPronunciation();
    const allowed = remind ? await requestReminderPermission() : false;
    await completeOnboarding(
      wordsPerDay,
      { enabled: allowed, hour: reminderHour, minute: reminderMinute },
      { canReadQuran },
    );
    router.replace('/learn');
  };

  const move = (delta: number) => {
    stopWordPronunciation();
    setIsSpeaking(false);
    setDir(delta);
    setIndex((current) => Math.min(STEPS.length - 1, Math.max(0, current + delta)));
  };

  const goNext = () => {
    if (isLast) {
      void finish(true);
      return;
    }
    hapticMedium();
    move(1);
  };

  const goBack = () => {
    if (index === 0) return;
    hapticSelection();
    move(-1);
  };

  // Desktop keyboard: arrows move between steps, Enter continues.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return;
      // A focused button or link already handles Enter itself.
      const onControl = target?.tagName === 'BUTTON' || target?.tagName === 'A';
      if (event.key === 'ArrowRight' || (event.key === 'Enter' && !onControl)) goNext();
      else if (event.key === 'ArrowLeft') goBack();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  return (
    <div className="min-h-[100dvh] flex flex-col">
      <header className="flex items-center justify-between px-5 sm:px-8 h-16">
        <div className="w-24">
          {index > 0 ? (
            <button onClick={goBack} aria-label="Back" className="icon-btn h-10 w-10 -ml-2">
              <ChevronLeft className="w-6 h-6" />
            </button>
          ) : (
            <Link href="/" aria-label="Quranki home">
              <Wordmark size={28} />
            </Link>
          )}
        </div>
        <div className="flex items-center gap-1.5" aria-label={`Step ${index + 1} of ${STEPS.length}`}>
          {STEPS.map((item, i) => (
            <motion.span
              key={item.id}
              animate={{ width: i === index ? 18 : 6 }}
              className={cn('h-1.5 rounded-full', i === index ? 'bg-primary' : 'bg-border')}
            />
          ))}
        </div>
        <div className="w-24" />
      </header>

      <main className="flex-1 flex items-center justify-center px-5 py-8 overflow-hidden">
        <AnimatePresence mode="wait" custom={dir}>
          <motion.div
            key={step.id}
            initial={{ opacity: 0, x: dir * 32 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: dir * -32 }}
            transition={{ duration: 0.28 }}
            className={cn(
              'w-full grid gap-8 items-center',
              hasVisual ? 'max-w-5xl lg:grid-cols-2 lg:gap-14' : 'max-w-xl',
            )}
          >
            {hasVisual && (
              <div className="flex justify-center min-h-[120px]">
                {renderVisual(step.id, { onSpeak: handleSpeak, isSpeaking })}
              </div>
            )}
            <div className="space-y-2">
              <h1 className="font-display text-3xl sm:text-4xl tracking-tight leading-tight">{step.title}</h1>
              <p className="text-lg text-textSecondary text-pretty">{step.body}</p>
              {step.id === 'reading' && (
                <div className="pt-4 grid gap-2">
                  {READING_OPTIONS.map((option) => (
                    <ChoiceButton
                      key={String(option.value)}
                      selected={canReadQuran === option.value}
                      onClick={() => setCanReadQuran(option.value)}
                    >
                      <span className="font-semibold">{option.label}</span>
                    </ChoiceButton>
                  ))}
                </div>
              )}
              {step.id === 'pace' && (
                <div className="pt-4 grid grid-cols-2 gap-2">
                  {PACE_OPTIONS.map((option) => (
                    <ChoiceButton
                      key={option.value}
                      selected={wordsPerDay === option.value}
                      onClick={() => setWordsPerDay(option.value)}
                      className="py-5 text-center"
                    >
                      <span className="block font-display text-4xl">{option.value}</span>
                      <span className="block text-sm text-textSecondary">{option.caption}</span>
                    </ChoiceButton>
                  ))}
                </div>
              )}
              {step.id === 'reminder' && (
                <div className="pt-6">
                  <ReminderTimePicker
                    hour={reminderHour}
                    minute={reminderMinute}
                    onChange={(hour, minute) => {
                      setReminderHour(hour);
                      setReminderMinute(minute);
                    }}
                  />
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </main>

      <footer className="px-5 sm:px-8 pb-8 pt-2 w-full max-w-md mx-auto space-y-2">
        <button onClick={goNext} disabled={finishing} className="btn-primary w-full h-12 text-base">
          {finishing && <Loader2 className="w-4 h-4 animate-spin" />}
          {isLast ? 'Remind me daily' : 'Continue'}
        </button>
        {isLast ? (
          <button onClick={() => void finish(false)} disabled={finishing} className="btn-ghost w-full h-10 text-textSecondary">
            Not now
          </button>
        ) : index === 0 ? (
          <Link href="/sign-in" className="btn-ghost w-full h-10 text-textSecondary">
            I already have an account
          </Link>
        ) : (
          <div className="h-10" />
        )}
      </footer>
    </div>
  );
}

function ChoiceButton({
  selected,
  onClick,
  className,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={() => {
        hapticSelection();
        onClick();
      }}
      aria-pressed={selected}
      className={cn(
        'rounded-medium border px-4 py-3 text-left transition-colors',
        selected ? 'border-primary bg-backgroundSelected text-primary' : 'border-border bg-card hover:border-primary/40',
        className,
      )}
    >
      {children}
    </button>
  );
}

function renderVisual(id: StepId, flash: { onSpeak: () => void; isSpeaking: boolean }) {
  switch (id) {
    case 'welcome':
      return (
        <div className="py-4">
          <LogoMark size={112} tile priority />
        </div>
      );
    case 'srs':
      return <FlashPreview onSpeak={flash.onSpeak} isSpeaking={flash.isSpeaking} />;
    case 'quran':
      return <AyahPreview mode="shown" />;
    case 'hidden':
      return <AyahPreview mode="hidden" />;
    case 'tap':
      return (
        <div className="w-full">
          <AyahPreview mode="tap" />
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.4 }}
            className="mt-3 flex items-center justify-center gap-1.5 text-sm font-semibold text-primary"
          >
            <Hand className="w-4 h-4" /> Try tapping a word
          </motion.div>
        </div>
      );
    case 'coverage':
      return <CoveragePreview />;
    case 'intention':
      return (
        <ArabicCard>{BISMILLAH_WORDS.map((word) => word.ar.map((seg) => seg.t).join('')).join(' ')}</ArabicCard>
      );
    case 'reading':
      return <ArabicCard>ا ب ت ث</ArabicCard>;
    case 'pace':
    case 'reminder':
      return null;
  }
}

function ArabicCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="w-full rounded-large bg-backgroundElement py-10 px-4 text-center">
      <span className="uthmanic-text text-3xl leading-[2]" dir="rtl">
        {children}
      </span>
    </div>
  );
}

function FlashPreview({ onSpeak, isSpeaking }: { onSpeak: () => void; isSpeaking: boolean }) {
  const previews = useMemo(() => previewGrades(createNewCard(), new Date()), []);
  const example = getVocabExample(DEMO_WORD);
  const spokenSurface = example ? shapeQpcArabic(exampleSurface(example)) : '';
  const showSpoken = isSpeaking && spokenSurface.length > 0;
  return (
    <div className="w-full space-y-3">
      <div className="card flex flex-col items-center justify-center gap-3 py-8 px-6 min-h-[168px]">
        <span className={cn('uthmanic-text text-5xl leading-[1.75] text-center', showSpoken && 'text-primary')} dir="rtl">
          {showSpoken ? spokenSurface : DEMO_WORD.arabic}
        </span>
        <button
          onClick={onSpeak}
          aria-label="Play pronunciation"
          className="h-11 w-11 rounded-full bg-backgroundElement text-primary flex items-center justify-center hover:opacity-80"
        >
          {isSpeaking ? <Volume2 className="w-5 h-5" /> : <Volume1 className="w-5 h-5" />}
        </button>
      </div>
      <div className="pointer-events-none" aria-hidden>
        <GradeButtons previews={previews} onGrade={() => {}} />
      </div>
    </div>
  );
}

function allLemmaIds(words: ReaderWord[]): Set<LemmaId> {
  const ids = new Set<LemmaId>();
  for (const word of words) for (const id of getWordLemmaIds(word)) ids.add(id);
  return ids;
}

function AyahPreview({ mode }: { mode: 'shown' | 'hidden' | 'tap' }) {
  const isDark = useIsDark();
  const [revealed, setRevealed] = useState<Set<string>>(() => new Set());
  const hiddenIds = mode === 'shown' ? new Set<LemmaId>() : HIDDEN_DEMO_IDS;
  const inviteId = mode === 'tap' ? lemmaPeekKey(getWordLemmaIds(BISMILLAH_WORDS[0])) : undefined;

  return (
    <div className="w-full rounded-large border border-border bg-backgroundElement py-5 px-2">
      <div className="flex flex-row-reverse flex-wrap justify-center items-start">
        {BISMILLAH_WORDS.map((word) => {
          const lemmaIds = getWordLemmaIds(word);
          const id = lemmaPeekKey(lemmaIds);
          const hidden = lemmaIds.length > 0 && lemmaIds.every((l) => hiddenIds.has(l)) && !revealed.has(id);
          const invited = mode === 'tap' && id === inviteId && hidden;
          const tappable = mode === 'tap' && lemmaIds.length > 0;
          const glossClass = word.en.find((seg) => seg.c && seg.c !== 'paren' && seg.c !== 'punc')?.c;
          return (
            <button
              key={word.p}
              type="button"
              disabled={!tappable}
              onClick={() => {
                hapticSelection();
                setRevealed((prev) => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id);
                  else next.add(id);
                  return next;
                });
              }}
              className={cn(
                'flex flex-col items-center px-2 py-2 min-w-[64px] rounded-medium',
                invited && 'bg-backgroundSelected',
                tappable && 'hover:bg-backgroundSelected cursor-pointer',
              )}
            >
              <span className="uthmanic-text text-3xl leading-[1.8]" dir="rtl">
                {word.ar.map((seg) => seg.t).join('')}
              </span>
              {!hidden && (
                <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center w-full">
                  <span className="h-px w-[70%] bg-border my-1" />
                  <span
                    className="text-[13px] leading-4 font-medium text-center"
                    style={{ color: glossColor(glossClass, isDark, 'var(--text-secondary)') }}
                  >
                    {word.en.map((seg) => seg.t).join('')}
                  </span>
                </motion.span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CoveragePreview() {
  const core = getCoverageThroughLevel(STAGES[0].lastLevel);
  const full = getCoverageThroughLevel(LAST_FREQUENCY_LEVEL);
  return (
    <div className="w-full flex gap-2">
      {[
        { percent: core.percent, words: THEMATIC_WORD_COUNT },
        { percent: full.percent, words: CURRICULUM_LEMMA_COUNT },
      ].map((item) => (
        <div key={item.words} className="flex-1 rounded-large bg-backgroundElement py-6 px-4 text-center">
          <div className="font-display text-5xl text-primary">{item.percent}%</div>
          <div className="mt-1 text-sm text-textSecondary">{formatCount(item.words)} words</div>
        </div>
      ))}
    </div>
  );
}
