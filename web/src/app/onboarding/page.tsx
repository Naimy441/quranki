'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import {
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Check,
  BookOpen,
  Volume2,
  CheckCircle2,
  Lock,
  User,
} from 'lucide-react';
import { useProgress } from '@/context/progress-context';

export default function OnboardingPage() {
  const router = useRouter();
  const { completeOnboarding, signUp } = useProgress();

  const [step, setStep] = useState(0);
  const [canReadArabic, setCanReadArabic] = useState<boolean>(true);
  const [wordsPace, setWordsPace] = useState<number>(10);
  const [demoRevealed, setDemoRevealed] = useState<boolean>(false);

  // Optional account creation
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const TOTAL_STEPS = 5;

  const handleNext = () => {
    if (step < TOTAL_STEPS - 1) {
      setStep((s) => s + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => {
    if (step > 0) setStep((s) => s - 1);
  };

  const handleFinish = async (skipAccount = false) => {
    setIsSubmitting(true);
    setAuthError('');

    if (!skipAccount && email.trim() && password.trim()) {
      if (!email.includes('@')) {
        setAuthError('Please enter a valid email address.');
        setIsSubmitting(false);
        return;
      }
      if (password.length < 6) {
        setAuthError('Password must be at least 6 characters.');
        setIsSubmitting(false);
        return;
      }
      await signUp(email.trim(), password.trim());
    }

    completeOnboarding({
      canReadQuran: canReadArabic,
      wordsPerSession: wordsPace,
    });

    router.replace('/learn');
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col justify-between p-6 select-none animate-fadeIn">
      {/* Top Header */}
      <div className="max-w-xl w-full mx-auto flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="relative w-8 h-8 rounded-full overflow-hidden bg-backgroundSelected border border-border flex items-center justify-center">
            <Image
              src="/images/Quranki.png"
              alt="Quranki Logo"
              width={32}
              height={32}
              className="w-full h-full object-cover rounded-full"
            />
          </div>
          <span className="font-bold text-sm text-text">Quranki</span>
        </div>

        {/* Progress Dots */}
        <div className="flex items-center gap-1.5">
          {Array.from({ length: TOTAL_STEPS }).map((_, idx) => (
            <div
              key={idx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                idx === step
                  ? 'w-6 bg-primary'
                  : idx < step
                  ? 'w-2 bg-primary/40'
                  : 'w-2 bg-border'
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => handleFinish(true)}
          className="text-xs font-semibold text-textSecondary hover:text-text"
        >
          Skip
        </button>
      </div>

      {/* Main Step Content */}
      <div className="max-w-xl w-full mx-auto my-auto py-8">
        {step === 0 && (
          <div className="space-y-6 text-center animate-fadeIn">
            <div className="w-16 h-16 rounded-large bg-backgroundSelected border border-border flex items-center justify-center mx-auto text-primary">
              <Sparkles className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <h1 className="text-3xl font-extrabold text-text tracking-tight">
                Assalamu alaykum!
              </h1>
              <p className="text-sm text-textSecondary leading-relaxed max-w-md mx-auto">
                Thank you for being here. Quranki helps you understand the Quran by learning its
                words through spaced repetition, then reading them where they appear in the real
                text.
              </p>
            </div>

            <div className="p-4 rounded-large bg-card border border-border text-left space-y-2 text-xs text-textSecondary">
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>
                  <strong className="text-text">80% of Quran vocabulary</strong> is mastered across 141 structured levels.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>
                  <strong className="text-text">FSRS memory scheduler</strong> reviews words right before you forget them.
                </span>
              </div>
              <div className="flex items-start gap-2.5">
                <Check className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                <span>
                  <strong className="text-text">Authentic Mushaf Reader</strong> with Tajweed rules and 10 world-class reciters.
                </span>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-6 text-center animate-fadeIn">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-text">A few words a day</h2>
              <p className="text-xs text-textSecondary max-w-md mx-auto leading-relaxed">
                You will see a word, hear it, and say how well you know it. The ones that slip come
                back sooner. Tap the card below to see:
              </p>
            </div>

            {/* Interactive Flashcard Mini Preview */}
            <div
              onClick={() => setDemoRevealed((prev) => !prev)}
              className="p-8 rounded-large bg-card border border-border hover:border-primary/40 cursor-pointer shadow-xs max-w-md mx-auto flex flex-col items-center justify-center min-h-[220px] transition-all space-y-3"
            >
              <span className="uthmanic-text text-4xl font-bold text-text">
                كِتَابٌ
              </span>

              {demoRevealed ? (
                <div className="space-y-1 animate-fadeIn">
                  <div className="text-lg font-bold text-primary">A book / Scripture</div>
                  <div className="text-xs text-textMuted font-mono">kitāb</div>
                </div>
              ) : (
                <div className="text-xs text-textMuted font-bold">
                  Tap to reveal meaning
                </div>
              )}
            </div>

            <p className="text-xs text-textMuted">
              Review sessions only take 3 to 5 minutes a day.
            </p>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-6 text-center animate-fadeIn">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-text">
                Do you want to learn how to read Arabic?
              </h2>
              <p className="text-xs text-textSecondary max-w-md mx-auto leading-relaxed">
                If Arabic letters and vowel marks are still new, we will start with the Qaida
                foundation track.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-md mx-auto text-left">
              <button
                type="button"
                onClick={() => setCanReadArabic(true)}
                className={`p-4 rounded-large border text-left transition-all ${
                  canReadArabic
                    ? 'border-primary bg-backgroundSelected ring-1 ring-primary/30 shadow-xs'
                    : 'border-border bg-card hover:bg-backgroundElement'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-text">I can read Arabic</span>
                  {canReadArabic && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-xs text-textSecondary">
                  Start immediately with Stage 1 vocabulary and Quran comprehension.
                </p>
              </button>

              <button
                type="button"
                onClick={() => setCanReadArabic(false)}
                className={`p-4 rounded-large border text-left transition-all ${
                  !canReadArabic
                    ? 'border-primary bg-backgroundSelected ring-1 ring-primary/30 shadow-xs'
                    : 'border-border bg-card hover:bg-backgroundElement'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-text">Start with the Qaida</span>
                  {!canReadArabic && <CheckCircle2 className="w-4 h-4 text-primary" />}
                </div>
                <p className="text-xs text-textSecondary">
                  Learn the alphabet, letter joint shapes, and pronunciation step by step.
                </p>
              </button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-6 text-center animate-fadeIn">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-text">
                How many new words each day?
              </h2>
              <p className="text-xs text-textSecondary max-w-md mx-auto leading-relaxed">
                Start with a pace you can comfortably sustain. You can adjust this anytime in Settings.
              </p>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 max-w-lg mx-auto">
              {[
                { count: 5, label: 'Relaxed', desc: '~3 mins / day' },
                { count: 10, label: 'Comfortable', desc: '~5 mins / day' },
                { count: 15, label: 'Focused', desc: '~8 mins / day' },
                { count: 20, label: 'Intense', desc: '~12 mins / day' },
              ].map((pace) => {
                const isSelected = wordsPace === pace.count;
                return (
                  <button
                    key={pace.count}
                    type="button"
                    onClick={() => setWordsPace(pace.count)}
                    className={`p-4 rounded-large border text-center transition-all ${
                      isSelected
                        ? 'border-primary bg-backgroundSelected ring-1 ring-primary/30 shadow-xs'
                        : 'border-border bg-card hover:bg-backgroundElement'
                    }`}
                  >
                    <div className="text-2xl font-black text-text mb-0.5">
                      {pace.count}
                    </div>
                    <div className="text-xs font-bold text-primary mb-1">
                      {pace.label}
                    </div>
                    <div className="text-[10px] text-textMuted">
                      {pace.desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-6 text-center animate-fadeIn max-w-md mx-auto">
            <div className="space-y-2">
              <h2 className="text-2xl font-bold text-text">
                Create Account (Optional)
              </h2>
              <p className="text-xs text-textSecondary leading-relaxed">
                Save your progress in the cloud so you can review cards across desktop and mobile.
              </p>
            </div>

            {authError && (
              <div className="p-3 rounded-medium bg-danger/10 border border-danger/30 text-danger text-xs font-bold">
                {authError}
              </div>
            )}

            <div className="space-y-3 text-left">
              <div>
                <label className="text-xs font-bold text-textSecondary block mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full px-3.5 py-2.5 rounded-medium bg-card border border-border text-sm text-text placeholder-textMuted focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-textSecondary block mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="w-full px-3.5 py-2.5 rounded-medium bg-card border border-border text-sm text-text placeholder-textMuted focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <button
                type="button"
                onClick={() => handleFinish(false)}
                disabled={isSubmitting}
                className="w-full h-11 bg-primary hover:opacity-90 text-onPrimary font-bold text-xs rounded-medium shadow-xs transition-opacity flex items-center justify-center gap-2"
              >
                <span>{email ? 'Create Account & Begin' : 'Complete Setup'}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>

              <button
                type="button"
                onClick={() => handleFinish(true)}
                disabled={isSubmitting}
                className="w-full py-2 text-xs font-semibold text-textSecondary hover:text-text transition-colors"
              >
                Continue without account (Guest mode)
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom Navigation Actions */}
      <div className="max-w-xl w-full mx-auto flex items-center justify-between pt-4 border-t border-border">
        {step > 0 ? (
          <button
            type="button"
            onClick={handleBack}
            className="py-2 px-3 rounded-medium text-xs font-bold text-textSecondary hover:text-text flex items-center gap-1 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back</span>
          </button>
        ) : (
          <div />
        )}

        {step < TOTAL_STEPS - 1 ? (
          <button
            type="button"
            onClick={handleNext}
            className="py-2.5 px-6 rounded-medium bg-primary hover:opacity-90 text-onPrimary text-xs font-bold flex items-center gap-1.5 transition-opacity shadow-xs"
          >
            <span>Next</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}
