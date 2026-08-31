import { TabList, TabSlot, TabTrigger, Tabs, type TabTriggerSlotProps } from 'expo-router/ui';
import { Pressable, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';

export default function TabLayout() {
  return (
    <Tabs>
      <TabSlot style={styles.slot} />
      <TabList asChild>
        <TabBarContainer>
          <TabTrigger name="index" href="/" asChild>
            <TabButton icon="📖">Learn</TabButton>
          </TabTrigger>
          <TabTrigger name="quran" href="/quran" asChild>
            <TabButton icon="📗">Quran</TabButton>
          </TabTrigger>
          <TabTrigger name="progress" href="/progress" asChild>
            <TabButton icon="📊">Progress</TabButton>
          </TabTrigger>
          <TabTrigger name="settings" href="/settings" asChild>
            <TabButton icon="⚙️">Settings</TabButton>
          </TabTrigger>
        </TabBarContainer>
      </TabList>
    </Tabs>
  );
}

function TabBarContainer({ children }: { children: React.ReactNode }) {
  return (
    <View style={styles.container}>
      <ThemedView type="backgroundElement" style={styles.inner}>
        {children}
      </ThemedView>
    </View>
  );
}

function TabButton({ children, icon, isFocused, ...props }: TabTriggerSlotProps & { icon: string }) {
  return (
    <Pressable {...props} style={({ pressed }) => [styles.tabButton, pressed && styles.pressed]}>
      <ThemedView type={isFocused ? 'backgroundSelected' : 'backgroundElement'} style={styles.tabButtonInner}>
        <ThemedText type="small" themeColor={isFocused ? 'primary' : 'textSecondary'}>
          {icon} {children}
        </ThemedText>
      </ThemedView>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  slot: { height: '100%' },
  container: {
    position: 'absolute',
    bottom: Spacing.four,
    width: '100%',
    alignItems: 'center',
  },
  inner: {
    flexDirection: 'row',
    gap: Spacing.two,
    padding: Spacing.two,
    borderRadius: Spacing.five,
    maxWidth: MaxContentWidth,
  },
  tabButton: { flexShrink: 0 },
  pressed: { opacity: 0.7 },
  tabButtonInner: {
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.four,
    borderRadius: Spacing.four,
  },
});
