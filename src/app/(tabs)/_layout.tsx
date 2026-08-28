import { NativeTabs } from 'expo-router/unstable-native-tabs';

import { useTheme } from '@/hooks/use-theme';
import { hapticSelection } from '@/lib/haptics';
import { totalDueWords } from '@/lib/levels';
import { useProgressStore } from '@/store/progress-store';

export default function TabLayout() {
  const theme = useTheme();
  const progress = useProgressStore((s) => s.progress);
  const dueCount = totalDueWords(progress, new Date());
  const screenStyle = { backgroundColor: theme.background };

  return (
    <NativeTabs
      backgroundColor={theme.background}
      indicatorColor={theme.backgroundSelected}
      tintColor={theme.primary}
      disableTransparentOnScrollEdge
      screenListeners={{ tabPress: hapticSelection }}>
      <NativeTabs.Trigger name="index" contentStyle={screenStyle}>
        <NativeTabs.Trigger.Label>Learn</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="book.fill" md="menu_book" />
        {dueCount > 0 && (
          <NativeTabs.Trigger.Badge>{dueCount > 99 ? '99+' : String(dueCount)}</NativeTabs.Trigger.Badge>
        )}
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="quran" contentStyle={screenStyle}>
        <NativeTabs.Trigger.Label>Qur&apos;an</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="text.book.closed.fill" md="import_contacts" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="progress" contentStyle={screenStyle}>
        <NativeTabs.Trigger.Label>Progress</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="chart.bar.fill" md="bar_chart" />
      </NativeTabs.Trigger>

      <NativeTabs.Trigger name="settings" contentStyle={screenStyle}>
        <NativeTabs.Trigger.Label>Settings</NativeTabs.Trigger.Label>
        <NativeTabs.Trigger.Icon sf="gearshape.fill" md="settings" />
      </NativeTabs.Trigger>
    </NativeTabs>
  );
}
