import { type ReactNode } from 'react';
import { Platform, StyleSheet, Text, type TextProps } from 'react-native';

import { Fonts, ThemeColor } from '@/constants/theme';
import { useMasteredArabicDigits } from '@/hooks/use-mastered-arabic-digits';
import { useTheme } from '@/hooks/use-theme';
import { formatAppDigits } from '@/lib/arabic-digits';

export type ThemedTextProps = TextProps & {
  type?: 'default' | 'title' | 'small' | 'smallBold' | 'subtitle' | 'link' | 'linkPrimary' | 'code';
  themeColor?: ThemeColor;
  /** Keep Western digits (teaching copy). Default converts once each digit is mastered. */
  convertDigits?: boolean;
};

function applyMasteredDigitChildren(node: ReactNode, mastered: ReadonlySet<number>): ReactNode {
  if (typeof node === 'string' || typeof node === 'number') {
    return formatAppDigits(String(node), mastered);
  }
  if (Array.isArray(node)) {
    return node.map((child) => applyMasteredDigitChildren(child, mastered));
  }
  return node;
}

export function ThemedText({
  style,
  type = 'default',
  themeColor,
  children,
  convertDigits = true,
  ...rest
}: ThemedTextProps) {
  const theme = useTheme();
  const mastered = useMasteredArabicDigits();

  return (
    <Text
      style={[
        { color: theme[themeColor ?? 'text'] },
        type === 'default' && styles.default,
        type === 'title' && styles.title,
        type === 'small' && styles.small,
        type === 'smallBold' && styles.smallBold,
        type === 'subtitle' && styles.subtitle,
        type === 'link' && styles.link,
        type === 'linkPrimary' && styles.linkPrimary,
        type === 'code' && styles.code,
        style,
      ]}
      {...rest}>
      {convertDigits ? applyMasteredDigitChildren(children, mastered) : children}
    </Text>
  );
}

const styles = StyleSheet.create({
  small: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 500,
  },
  smallBold: {
    fontSize: 14,
    lineHeight: 20,
    fontWeight: 700,
  },
  default: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: 500,
  },
  title: {
    fontSize: 48,
    fontWeight: 600,
    lineHeight: 52,
  },
  subtitle: {
    fontSize: 32,
    lineHeight: 44,
    fontWeight: 600,
  },
  link: {
    lineHeight: 30,
    fontSize: 14,
  },
  linkPrimary: {
    lineHeight: 30,
    fontSize: 14,
    color: '#3c87f7',
  },
  code: {
    fontFamily: Fonts.mono,
    fontWeight: Platform.select({ android: 700 }) ?? 500,
    fontSize: 12,
  },
});
