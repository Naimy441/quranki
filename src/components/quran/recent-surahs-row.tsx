import { Pressable, ScrollView, StyleSheet, View } from 'react-native';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { formatAyahRef } from '@/lib/quran-marks';
import { openQuranLocation } from '@/lib/quran-nav';
import { getSurahMeta } from '@/lib/quran-reader';
import { useQuranMarksStore } from '@/store/quran-marks-store';

export function RecentSurahsRow() {
  const theme = useTheme();
  const recentSurahs = useQuranMarksStore((s) => s.recentSurahs);
  if (recentSurahs.length === 0) return null;

  return (
    <View style={styles.section}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
        {recentSurahs.map((entry) => {
          const meta = getSurahMeta(entry.n);
          if (!meta) return null;
          return (
            <Pressable
              key={entry.n}
              onPress={() => openQuranLocation(entry.n, entry.ayah)}
              accessibilityRole="button"
              accessibilityLabel={`${meta.en} ${formatAyahRef(entry.n, entry.ayah)}`}
              style={({ pressed }) => [
                styles.chip,
                { backgroundColor: theme.card, borderColor: theme.border },
                pressed && styles.pressed,
              ]}>
              <ThemedText type="smallBold" numberOfLines={1}>
                {meta.en}
              </ThemedText>
              <ThemedText type="small" themeColor="textSecondary">
                {formatAyahRef(entry.n, entry.ayah)}
              </ThemedText>
            </Pressable>
          );
        })}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: Spacing.one,
  },
  heading: {
    letterSpacing: 0.6,
  },
  row: {
    gap: Spacing.one,
    paddingRight: Spacing.two,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
    paddingVertical: 6,
    paddingHorizontal: Spacing.two,
    borderRadius: Radius.pill,
    borderWidth: 1,
  },
  pressed: {
    opacity: 0.75,
  },
});
