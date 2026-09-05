import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ArabicTextStyle, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';

function toArabicIndic(n: number): string {
  return String(n).replace(/\d/g, (d) => ARABIC_INDIC[Number(d)] ?? d);
}

/** Western ayah number, pinned to the top-left corner of each ayah block. Marks sit in this
 *  same row so they follow the number (and optional coverage %) instead of a fixed offset. */
export function AyahNumberBadge({
  number,
  understanding,
  children,
  onNumberWidth,
}: {
  number: number;
  understanding?: number;
  children?: ReactNode;
  onNumberWidth?: (width: number) => void;
}) {
  const theme = useTheme();
  const percent = understanding === undefined ? undefined : Math.round(understanding * 100);

  return (
    <View
      style={styles.corner}
      accessibilityLabel={percent === undefined ? `Ayah ${number}` : `Ayah ${number}, ${percent} percent vocabulary understood`}>
      <Text style={[styles.cornerText, { color: theme.text }]} onLayout={onNumberWidth ? (event) => onNumberWidth(event.nativeEvent.layout.width) : undefined}>{number}</Text>
      {percent !== undefined && <Text style={[styles.understanding, { color: theme.primary }]}>{percent}%</Text>}
      {children}
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
    left: Spacing.three - 3,
    minHeight: 26,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    zIndex: 1,
  },
  cornerText: {
    fontSize: 16,
    lineHeight: 20,
    fontWeight: '700',
    includeFontPadding: false,
  },
  understanding: {
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '700',
    includeFontPadding: false,
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
