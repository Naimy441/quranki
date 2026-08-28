import { StyleSheet, Text, View } from 'react-native';

import { ArabicTextStyle, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

function toArabicIndic(n: number): string {
  return String(n).replace(/\d/g, (d) => ARABIC_INDIC[Number(d)] ?? d);
}

/** Western ayah number, pinned to the top-left corner of each ayah block. */
export function AyahNumberBadge({ number }: { number: number }) {
  const theme = useTheme();

  return (
    <View style={styles.corner} accessibilityLabel={`Ayah ${number}`}>
      <Text style={[styles.cornerText, { color: theme.textMuted }]}>{number}</Text>
    </View>
  );
}

/** End-of-ayah rosette: the Uthmanic Hafs font ligates Arabic-Indic digits into the traditional
 *  numbered marker. Sits in the word row after the last word. */
export function AyahEndMarker({ number, arabicSize }: { number: number; arabicSize: number }) {
  const theme = useTheme();

  return (
    <View style={styles.marker}>
      <Text
        style={[
          styles.markerText,
          ArabicTextStyle,
          { color: theme.text, fontSize: arabicSize, lineHeight: arabicSize * 1.9 },
        ]}>
        {toArabicIndic(number)}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  corner: {
    position: 'absolute',
    top: Spacing.two,
    left: Spacing.three,
    zIndex: 1,
  },
  cornerText: {
    fontSize: 12,
    fontWeight: '700',
  },
  marker: {
    alignItems: 'center',
    paddingHorizontal: Spacing.two,
    paddingVertical: Spacing.one,
  },
  markerText: {
    textAlign: 'center',
  },
});
