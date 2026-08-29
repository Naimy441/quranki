import { Ionicons } from '@expo/vector-icons';
import { Pressable, StyleSheet, View } from 'react-native';

import { SurahNameText } from '@/components/quran/surah-name-text';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { openQuranLocation } from '@/lib/quran-nav';
import type { SurahIndexEntry } from '@/lib/quran-reader-types';

export function SurahListRow({ surah }: { surah: SurahIndexEntry }) {
  const theme = useTheme();

  const handlePress = () => {
    openQuranLocation(surah.n);
  };

  const revelation = surah.rp === 'meccan' ? 'Meccan' : 'Medinan';
  const ayahsLabel = `${surah.ac} ${surah.ac === 1 ? 'ayah' : 'ayahs'}`;

  return (
    <Pressable
      onPress={handlePress}
      accessibilityRole="button"
      accessibilityLabel={`${surah.n}, ${surah.tr}, ${surah.nt}, ${surah.ar}, ${ayahsLabel}, ${revelation}`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.card, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={styles.lead}>
        <View style={[styles.numberBadge, { backgroundColor: theme.backgroundSelected }]}>
          <ThemedText type="smallBold" themeColor="primary">
            {surah.n}
          </ThemedText>
        </View>
        <ThemedText type="small" themeColor="textMuted" style={styles.ayahCount}>
          {surah.ac}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted" style={styles.ayahUnit}>
          {surah.ac === 1 ? 'ayah' : 'ayahs'}
        </ThemedText>
      </View>

      <View style={styles.info}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {surah.en}
        </ThemedText>
        <ThemedText type="small" themeColor="textSecondary">
          {surah.nt}
        </ThemedText>
      </View>

      <View style={styles.trailing}>
        <View style={styles.arabicNameWrap}>
          <SurahNameText surahNumber={surah.n} style={styles.arabicName} />
        </View>
        <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.large,
    borderWidth: 1,
    overflow: 'visible',
  },
  pressed: {
    opacity: 0.75,
  },
  lead: {
    width: 40,
    alignItems: 'center',
    gap: 1,
  },
  numberBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ayahCount: {
    marginTop: 2,
    fontSize: 12,
    lineHeight: 14,
    fontVariant: ['tabular-nums'],
  },
  ayahUnit: {
    fontSize: 10,
    lineHeight: 12,
  },
  info: {
    flex: 1,
    minWidth: 0,
    gap: 2,
  },
  trailing: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0,
    gap: Spacing.one,
  },
  arabicNameWrap: {
    justifyContent: 'center',
    overflow: 'visible',
    // Room for the downward shift so flourishes stay inside the row, not clipped.
    paddingBottom: 12,
  },
  arabicName: {
    fontSize: 30,
    lineHeight: 60,
    includeFontPadding: false,
    textAlign: 'right',
    transform: [{ translateY: 12 }],
  },
});
