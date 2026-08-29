import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { ArabicTextStyle } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { splitArabicFallbackRuns } from '@/lib/arabic-display';

const SystemFont = Platform.OS === 'ios' ? 'System' : 'sans-serif';

interface ArabicTextProps extends TextProps {
  children: string;
}

/**
 * Renders study-card Arabic in the bundled Uthmanic Hafs font, but drops to the system font
 * for punctuation the Quran font has no glyph for (Arabic/ASCII commas, plus signs, ...).
 * Color defaults to the theme body text so the custom font does not stay black in dark mode.
 */
export function ArabicText({ children, style, ...rest }: ArabicTextProps) {
  const theme = useTheme();
  const runs = splitArabicFallbackRuns(children);
  const color = StyleSheet.flatten(style)?.color ?? theme.text;

  return (
    <Text style={[ArabicTextStyle, { color: theme.text }, style]} {...rest}>
      {runs.map((run, i) =>
        run.fallback ? (
          <Text key={i} style={{ fontFamily: SystemFont, fontWeight: '500', color }}>
            {run.text}
          </Text>
        ) : (
          run.text
        ),
      )}
    </Text>
  );
}
