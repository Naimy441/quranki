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
      accessibilityLabel={`${surah.n}, ${surah.tr}, ${surah.ar}, ${ayahsLabel}, ${revelation}`}
      style={({ pressed }) => [
        styles.row,
        { backgroundColor: theme.card, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.numberBadge, { backgroundColor: theme.backgroundSelected }]}>
        <ThemedText type="smallBold" themeColor="primary">
          {surah.n}
        </ThemedText>
      </View>

      <View style={styles.info}>
        <ThemedText type="smallBold" numberOfLines={1}>
          {surah.en}
        </ThemedText>
        <View style={styles.metaRow}>
          <ThemedText type="small" themeColor="textSecondary">
            {ayahsLabel}
          </ThemedText>


        </View>
      </View>

      <SurahNameText surahNumber={surah.n} style={styles.arabicName} />

      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} style={styles.chevron} />
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
  },
  pressed: {
    opacity: 0.75,
  },
  numberBadge: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  info: {
    flex: 1,
    gap: 2,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
  capitalize: {
    textTransform: 'capitalize',
  },
  arabicName: {
    fontSize: 28,
    lineHeight: 44,
    flexShrink: 0,
    // Android resolves unset/'auto' textAlign from the app's *layout* direction (LTR here), not
    // from the text's own script the way iOS does - without this, Arabic renders left-aligned.
    textAlign: 'right',
  },
  chevron: {
    marginLeft: -Spacing.one,
  },
});
