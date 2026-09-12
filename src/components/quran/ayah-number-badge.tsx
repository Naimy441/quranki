import { type ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { ArabicTextStyle, Spacing } from '@/constants/theme';
import { useMasteredArabicDigits } from '@/hooks/use-mastered-arabic-digits';
import { useTheme } from '@/hooks/use-theme';
import { formatAppDigits } from '@/lib/arabic-digits';

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
  const mastered = useMasteredArabicDigits();
  const percent = understanding === undefined ? undefined : Math.round(understanding * 100);
  const numberLabel = formatAppDigits(String(number), mastered);
  const percentLabel = percent === undefined ? undefined : formatAppDigits(String(percent), mastered);

  return (
    <View
      style={styles.corner}
      accessibilityLabel={percent === undefined ? `Ayah ${number}` : `Ayah ${number}, ${percent} percent vocabulary understood`}>
      <Text style={[styles.cornerText, { color: theme.text }]} onLayout={onNumberWidth ? (event) => onNumberWidth(event.nativeEvent.layout.width) : undefined}>{numberLabel}</Text>
      {percentLabel !== undefined && (
        <View style={styles.understandingRow}>
          <Text style={[styles.understanding, { color: theme.primary }]}>{percentLabel}</Text>
          <Text style={[styles.understanding, { color: theme.primary }]}>%</Text>
        </View>
      )}
      {children}
    </View>
  );
}

/** End-of-ayah rosette: the Uthmanic Hafs font ligates Arabic-Indic digits into the traditional
 *  numbered marker. Sits in the word row after the last word. */
export function AyahEndMarker({
  number,
  arabicSize,
  compact = false,
}: {
  number: number;
  arabicSize: number;
  compact?: boolean;
}) {
  const theme = useTheme();

  return (
    <View style={[styles.marker, compact && styles.markerCompact]}>
      <Text
        style={[
          styles.markerText,
          ArabicTextStyle,
          {
            color: theme.text,
            fontSize: arabicSize,
            lineHeight: compact ? arabicSize * 1.87 : arabicSize * 1.9,
            includeFontPadding: false,
          },
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
  understandingRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
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
  markerCompact: {
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  markerText: {
    textAlign: 'center',
  },
});
