import { Platform } from 'react-native';

import { reminderPermissionGranted } from '@/lib/practice-reminder';
import { useProgressStore } from '@/store/progress-store';

export async function hrefAfterAccountAuth(): Promise<'/' | '/onboarding' | '/reminder-setup'> {
  if (Platform.OS !== 'web' && !(await reminderPermissionGranted())) return '/reminder-setup';
  return useProgressStore.getState().onboardingCompleted ? '/' : '/onboarding';
}
