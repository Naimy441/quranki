import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { memo, useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';

import { AyahNumberBadge } from '@/components/quran/ayah-number-badge';
import { AyahTranslation } from '@/components/quran/ayah-translation';
import { WordCell } from '@/components/quran/word-cell';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { buildAyahShareText } from '@/lib/quran-reader';
import type { ReaderAyah } from '@/lib/quran-reader-types';

interface AyahBlockProps {
  ayah: ReaderAyah;
  surahName: string;
  showTranslation: boolean;
  arabicSize: number;
  glossSize: number;
  masteredVocabIds: Set<string>;
}

/**
 * Renders one ayah as a right-to-left wrapping grid of word cells (Arabic + gloss). `row-reverse`
 * fills each line from the right, and because `flexWrap` only affects the cross-axis, overflow
 * wraps to a new line beneath - still right-to-left - matching how a Mushaf's word-by-word
 * layout reads. The ayah number sits as a badge in the top-left corner. The top-right corner has
 * a copy button (copies surah name, verse number, Arabic, and translation as plain text) and a
 * translate icon that reveals the full Sahih International translation beneath, on demand.
 *
 * Memoized so scroll-driven pagination and unrelated screen state (e.g. opening settings) don't
 * re-render every already-mounted ayah - only the ones whose props actually changed.
 */
export const AyahBlock = memo(function AyahBlock({
  ayah,
  surahName,
  showTranslation,
  arabicSize,
  glossSize,
  masteredVocabIds,
}: AyahBlockProps) {
  const theme = useTheme();
  const [showFullTranslation, setShowFullTranslation] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (copiedTimeout.current) clearTimeout(copiedTimeout.current);
  }, []);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(buildAyahShareText(surahName, ayah));
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    if (copiedTimeout.current) clearTimeout(copiedTimeout.current);
    copiedTimeout.current = setTimeout(() => setCopied(false), 1500);
  };

  return (
    <View style={[styles.container, { borderBottomColor: theme.border }]}>
      <AyahNumberBadge number={ayah.a} />

      <View style={styles.actionsRow}>
        <Pressable
          onPress={handleCopy}
          hitSlop={10}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: copied ? theme.backgroundSelected : theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <Ionicons name={copied ? 'checkmark' : 'copy-outline'} size={14} color={copied ? theme.primary : theme.textMuted} />
        </Pressable>

        <Pressable
          onPress={() => setShowFullTranslation((v) => !v)}
          hitSlop={10}
          style={({ pressed }) => [
            styles.actionButton,
            { backgroundColor: showFullTranslation ? theme.backgroundSelected : theme.backgroundElement },
            pressed && styles.pressed,
          ]}>
          <Ionicons
            name={showFullTranslation ? 'language' : 'language-outline'}
            size={15}
            color={showFullTranslation ? theme.primary : theme.textMuted}
          />
        </Pressable>
      </View>

      <View style={styles.row}>
        {ayah.w.map((word) => (
          <WordCell
            key={word.p}
            word={word}
            showTranslation={showTranslation}
            arabicSize={arabicSize}
            glossSize={glossSize}
            masteredVocabIds={masteredVocabIds}
          />
        ))}
      </View>

      {showFullTranslation && <AyahTranslation parts={ayah.tr} fontSize={glossSize} />}
    </View>
  );
});

const styles = StyleSheet.create({
  container: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.three,
    borderBottomWidth: 1,
  },
  row: {
    flexDirection: 'row-reverse',
    flexWrap: 'wrap',
    alignItems: 'flex-start',
    // 'flex-start' packs items toward the start of the main axis, which - because the axis is
    // reversed - is the *right* edge, so Arabic correctly reads flush-right instead of centered.
    justifyContent: 'flex-start',
    paddingTop: Spacing.five,
    paddingBottom: Spacing.one,
    paddingHorizontal: Spacing.four,
  },
  actionsRow: {
    position: 'absolute',
    top: Spacing.two,
    right: Spacing.two,
    flexDirection: 'row',
    gap: Spacing.two,
    zIndex: 1,
  },
  actionButton: {
    width: 26,
    height: 26,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
