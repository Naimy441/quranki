'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAccountStore } from '@/store/account-store';
import { useHifzStore } from '@/store/hifz-store';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';
import { useQuranMarksStore } from '@/store/quran-marks-store';
import { useSnackbarStore } from '@/store/snackbar-store';
import { mergeAccountCloud, scheduleAccountSync } from '@/lib/account-sync';
import { migrateLegacyWebData } from '@/lib/legacy-web-migration';
import { applyTheme } from '@/lib/theme-apply';
import { getStreakReclaimOpportunity, dayKey } from '@/lib/stats';
import { setStudiedTodayCheck, syncPracticeReminder } from '@/lib/practice-reminder';
import { Modal } from '@/components/ui/modal';
import { useToast } from '@/components/ui/toast';

/** True once every persisted store has loaded from localStorage. */
export function useStoresHydrated(): boolean {
  const a = useProgressStore((s) => s.hydrated);
  const b = useKnownWordsStore((s) => s.hydrated);
  const c = useQuranMarksStore((s) => s.hydrated);
  const d = useHifzStore((s) => s.hydrated);
  const e = useAccountStore((s) => s.hydrated);
  return a && b && c && d && e;
}

const PRE_ONBOARDING_PATHS = ['/onboarding', '/sign-in', '/signup', '/reset-password'];

/**
 * Boots the app the way the mobile root layout does: hydrate every store, merge with the cloud
 * when signed in, apply theme and accent, keep reminders scheduled, and route first-time visitors
 * to onboarding.
 */
export function AppState({ children }: { children: React.ReactNode }) {
  const hydrated = useStoresHydrated();
  const themePreference = useProgressStore((s) => s.settings.themePreference);
  const accentColor = useProgressStore((s) => s.settings.accentColor);
  const onboardingCompleted = useProgressStore((s) => s.onboardingCompleted);
  const reviewDates = useProgressStore((s) => s.reviewDates);
  const streakGraceDates = useProgressStore((s) => s.streakGraceDates);
  const reminderEnabled = useProgressStore((s) => s.settings.reminderEnabled);
  const reminderHour = useProgressStore((s) => s.settings.reminderHour);
  const reminderMinute = useProgressStore((s) => s.settings.reminderMinute);
  const snackbar = useSnackbarStore();
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const [dismissedReclaim, setDismissedReclaim] = useState<number | null>(null);

  useEffect(() => {
    migrateLegacyWebData();
    void useProgressStore.getState().hydrate();
    void useKnownWordsStore.getState().hydrate();
    void useQuranMarksStore.getState().hydrate();
    void useHifzStore.getState().hydrate();
    void useAccountStore.getState().hydrate();
  }, []);

  useEffect(() => {
    if (hydrated) void mergeAccountCloud();
  }, [hydrated]);

  // Returning to the tab: spread a long-absence backlog and pick up changes from the phone.
  useEffect(() => {
    let lastMerge = Date.now();
    const onVisible = () => {
      if (document.visibilityState !== 'visible') return;
      useProgressStore.getState().easeReturnBacklog();
      if (Date.now() - lastMerge > 60_000) {
        lastMerge = Date.now();
        void mergeAccountCloud();
      }
    };
    const onHide = () => {
      if (document.visibilityState === 'hidden') scheduleAccountSync();
    };
    document.addEventListener('visibilitychange', onVisible);
    document.addEventListener('visibilitychange', onHide);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      document.removeEventListener('visibilitychange', onHide);
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    applyTheme(themePreference, accentColor);
    if (themePreference !== 'system') return;
    const media = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => applyTheme(themePreference, accentColor);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, [hydrated, themePreference, accentColor]);

  useEffect(() => {
    if (!hydrated) return;
    setStudiedTodayCheck(() => useProgressStore.getState().reviewDates.includes(dayKey(new Date())));
    void syncPracticeReminder({ reminderEnabled, reminderHour, reminderMinute }, { requestPermission: false });
  }, [hydrated, reminderEnabled, reminderHour, reminderMinute]);

  useEffect(() => {
    if (hydrated && !onboardingCompleted && !PRE_ONBOARDING_PATHS.includes(pathname)) router.replace('/onboarding');
  }, [hydrated, onboardingCompleted, pathname, router]);

  useEffect(() => {
    if (snackbar.visible) {
      toast(snackbar.message, { kind: 'info' });
      snackbar.hide();
    }
  }, [snackbar, toast]);

  const reclaimable = hydrated ? getStreakReclaimOpportunity(reviewDates, streakGraceDates) : 0;

  return (
    <>
      {children}
      <Modal
        open={onboardingCompleted && reclaimable > 0 && dismissedReclaim !== reclaimable}
        onClose={() => setDismissedReclaim(reclaimable)}
        title="Your streak can be saved"
      >
        <p className="text-sm text-textSecondary">
          You missed yesterday. Complete a review today to keep your {reclaimable}-day streak going.
        </p>
        <button onClick={() => setDismissedReclaim(reclaimable)} className="btn-primary mt-5 h-10 w-full">
          Got it
        </button>
      </Modal>
    </>
  );
}
