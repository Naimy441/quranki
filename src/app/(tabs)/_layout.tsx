import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useAppColorScheme } from '@/hooks/use-theme';
import { useProgressStore } from '@/store/progress-store';
import { totalDueWords } from '@/lib/levels';

export default function TabLayout() {
  const scheme = useAppColorScheme();
  const progress = useProgressStore((s) => s.progress);
  const maxUnlockedLevel = useProgressStore((s) => s.maxUnlockedLevel);
  const dueCount = totalDueWords(progress, new Date(), maxUnlockedLevel);

  return (
    <NativeTabs
      backgroundColor={scheme === 'dark' ? '#0A0D0B' : '#FFFFFF'}
      indicatorColor={scheme === 'dark' ? '#1E2B23' : '#E4F1E8'}
      tintColor={scheme === 'dark' ? '#34C77E' : '#1E8E5A'}>
      <NativeTabs.Trigger name="index">
        <NativeTabs.Trigger.Label>Learn</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book.fill" md="menu_book" />
        {dueCount > 0 && (
          <NativeTabs.Trigger.Badge>{dueCount > 99 ? '99+' : String(dueCount)}</NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="quran">
        <NativeTabs.Trigger.Label>Qur&apos;an</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="text.book.closed.fill" md="import_contacts" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="progress">
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="bar_chart" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings">
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
