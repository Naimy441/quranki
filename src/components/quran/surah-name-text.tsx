import { StyleSheet, Text, type TextProps } from 'react-native';

import { SurahNameTextStyle } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { getSurahNameGlyph } from '@/lib/quran-reader';

/** One calligraphic surah name (including "سورة") from the QCF FullSurah font. Uses `Text`
 *  rather than ThemedText so a surrounding `fontWeight` can't make Android faux-bold the glyph
 *  or make iOS fail to resolve the single Regular face. */
export function SurahNameText({
  surahNumber,
  style,
  ...rest
}: { surahNumber: number } & Omit<TextProps, 'children'>) {
  const theme = useTheme();

  return (
    <Text
      accessible={false}
      style={[styles.base, SurahNameTextStyle, { color: theme.text }, style]}
      {...rest}>
      {getSurahNameGlyph(surahNumber)}
    </Text>
  );
}

const styles = StyleSheet.create({
  base: {
    // Android resolves unset/'auto' textAlign from the app's *layout* direction (LTR here), not
    // from the text's own script the way iOS does.
    textAlign: 'right',
  },
});
