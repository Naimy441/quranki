import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReminderTimePicker } from '@/components/quranki/reminder-time-picker';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSuccess } from '@/lib/haptics';
import { requestReminderPermission } from '@/lib/practice-reminder';
import { useProgressStore } from '@/store/progress-store';

export default function ReminderSetupScreen() {
  const theme = useTheme();
  const settings = useProgressStore((state) => state.settings);
  const completeOnboarding = useProgressStore((state) => state.completeOnboarding);
  const setOnboardingCompleted = useProgressStore((state) => state.setOnboardingCompleted);
  const updateSettings = useProgressStore((state) => state.updateSettings);
  const [hour, setHour] = useState(settings.reminderHour);
  const [minute, setMinute] = useState(settings.reminderMinute);
  const [finishing, setFinishing] = useState(false);

  const finish = async (remind: boolean) => {
    if (finishing) return;
    setFinishing(true);
    hapticSuccess();
    const allowed = remind ? await requestReminderPermission() : false;
    const state = useProgressStore.getState();
    if (!state.onboardingCompleted) {
      await completeOnboarding(state.settings.wordsPerSession, {
        enabled: allowed,
        hour,
        minute,
      });
    } else {
      updateSettings({ reminderEnabled: allowed, reminderHour: hour, reminderMinute: minute });
    }
    setOnboardingCompleted(true);
    router.replace('/');
  };

  return (
    <ThemedView style={styles.flex} collapsable={false}>
      <SafeAreaView style={styles.flex} edges={['top', 'bottom']}>
        <View style={styles.shell}>
          <View style={styles.topBar} />
          <View style={styles.body}>
            <View style={styles.copy}>
              <ThemedText type="subtitle" style={styles.title}>
                A daily reminder
              </ThemedText>
              <ThemedText themeColor="textSecondary" style={styles.subtitle}>
                Pick a time and we will nudge you to practice a few words. You can change this later.
              </ThemedText>
              <ReminderTimePicker hour={hour} minute={minute} onChange={(nextHour, nextMinute) => {
                setHour(nextHour);
                setMinute(nextMinute);
              }} />
            </View>
          </View>
          <View style={styles.footer}>
            <Pressable
              onPress={() => void finish(true)}
              disabled={finishing}
              accessibilityRole="button"
              style={({ pressed }) => [
                styles.cta,
                { backgroundColor: theme.primary },
                (pressed || finishing) && styles.pressed,
              ]}>
              <ThemedText type="smallBold" themeColor="onPrimary" style={styles.ctaLabel}>
                Remind me daily
              </ThemedText>
            </Pressable>
            <Pressable
              onPress={() => void finish(false)}
              disabled={finishing}
              accessibilityRole="button"
              style={({ pressed }) => [styles.skip, (pressed || finishing) && styles.pressed]}>
              <ThemedText type="smallBold" themeColor="textSecondary">
                Not now
              </ThemedText>
            </Pressable>
          </View>
        </View>
      </SafeAreaView>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  shell: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
    paddingHorizontal: Spacing.four,
  },
  topBar: {
    height: 44,
  },
  body: {
    flex: 1,
    justifyContent: 'center',
    gap: Spacing.four,
  },
  copy: {
    gap: Spacing.two,
  },
  title: {
    fontSize: 28,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 17,
    lineHeight: 24,
  },
  footer: {
    gap: Spacing.three,
    paddingBottom: Spacing.two,
    paddingTop: Spacing.three,
  },
  cta: {
    height: 52,
    borderRadius: Radius.medium,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaLabel: {
    fontSize: 17,
    lineHeight: 22,
  },
  skip: {
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.85,
  },
});
