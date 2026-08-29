import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { memo, useEffect, useRef, useState } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

import { AyahActionMenu } from '@/components/quran/ayah-action-menu';
import { AyahNumberBadge } from '@/components/quran/ayah-number-badge';
import { AyahTranslation } from '@/components/quran/ayah-translation';
import { WordCell } from '@/components/quran/word-cell';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticLight, hapticSelection, hapticSuccess } from '@/lib/haptics';
import { buildAyahShareText } from '@/lib/quran-reader';
import type { ReaderAyah, ReaderWord } from '@/lib/quran-reader-types';
import { useQuranMarksStore } from '@/store/quran-marks-store';
import { playAyah, useRecitationStore } from '@/store/recitation-store';

interface AyahBlockProps {
  ayah: ReaderAyah;
  surahNumber: number;
  surahName: string;
  showTranslation: boolean;
  arabicSize: number;
  glossSize: number;
  hiddenVocabIds: Set<string>;
  knownWordIds: Set<string>;
  highlighted?: boolean;
  actionsOpen?: boolean;
  onToggleActions?: (ayah: number) => void;
  onLongPressWord?: (word: ReaderWord) => void;
  onOpenMarks?: (ayah: number) => void;
}

/**
 * Renders one ayah as a right-to-left wrapping grid of word cells (Arabic + gloss). `row-reverse`
 * fills each line from the right, and because `flexWrap` only affects the cross-axis, overflow
 * wraps to a new line beneath - still right-to-left - matching how a Mushaf's word-by-word
 * layout reads. The ayah number sits as a badge in the top-left corner, with small colored pin
 * and bookmark icons when the verse is marked. The top-right corner has a single menu control that
 * slides out save, copy, play, and translation actions.
 *
 * Memoized so scroll-driven pagination and unrelated screen state (e.g. opening settings) don't
 * re-render every already-mounted ayah - only the ones whose props actually changed.
 */
export const AyahBlock = memo(function AyahBlock({
  ayah,
  surahNumber,
  surahName,
  showTranslation,
  arabicSize,
  glossSize,
  hiddenVocabIds,
  knownWordIds,
  highlighted = false,
  actionsOpen = false,
  onToggleActions,
  onLongPressWord,
  onOpenMarks,
}: AyahBlockProps) {
  const theme = useTheme();
  const marksKey = useQuranMarksStore((s) => {
    const pins = s.pinPlacements
      .filter((entry) => entry.surah === surahNumber && entry.ayah === ayah.a)
      .map((entry) => s.pins.find((pin) => pin.id === entry.pinId)?.color)
      .filter((color): color is string => Boolean(color))
      .map((color) => `pin:${color}`);
    const bookmarks = s.bookmarks
      .filter((bookmark) => bookmark.surah === surahNumber && bookmark.ayah === ayah.a)
      .map((bookmark) => s.collections.find((collection) => collection.id === bookmark.collectionId)?.color)
      .filter((color): color is string => Boolean(color))
      .map((color) => `bookmark:${color}`);
    return [...pins, ...bookmarks].join(',');
  });
  const marks = marksKey
    ? marksKey.split(',').map((entry) => {
        const sep = entry.indexOf(':');
        return { kind: entry.slice(0, sep) as 'pin' | 'bookmark', color: entry.slice(sep + 1) };
      })
    : [];
  const bookmarked = useQuranMarksStore((s) =>
    s.bookmarks.some((bookmark) => bookmark.surah === surahNumber && bookmark.ayah === ayah.a),
  );
  const [showFullTranslation, setShowFullTranslation] = useState(false);
  const [copied, setCopied] = useState(false);
  const copiedTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const highlightOpacity = useRef(new Animated.Value(0)).current;
  const playback = useRecitationStore((s) => {
    const active = s.visible && s.surahNumber === surahNumber && s.ayahNumber === ayah.a;
    if (!active) return 'idle' as const;
    if (s.awaitingAudio && !s.playing) return 'loading' as const;
    if (s.playing) return 'playing' as const;
    return 'paused' as const;
  });

  useEffect(() => () => {
    if (copiedTimeout.current) clearTimeout(copiedTimeout.current);
  }, []);

  useEffect(() => {
    if (!highlighted) {
      highlightOpacity.setValue(0);
      return;
    }
    highlightOpacity.setValue(1);
    const fade = Animated.timing(highlightOpacity, {
      toValue: 0,
      duration: 450,
      delay: 1400,
      useNativeDriver: true,
    });
    fade.start();
    return () => fade.stop();
  }, [highlighted, ayah.a, highlightOpacity]);

  const handleCopy = async () => {
    await Clipboard.setStringAsync(buildAyahShareText(surahName, ayah));
    hapticSuccess();
    setCopied(true);
    if (copiedTimeout.current) clearTimeout(copiedTimeout.current);
    copiedTimeout.current = setTimeout(() => setCopied(false), 1500);
  };

  const handlePlayAyah = () => {
    hapticLight();
    void playAyah(surahNumber, ayah.a);
  };

  return (
    <View
      style={[
        styles.container,
        { borderBottomColor: theme.border },
        playback !== 'idle' && { backgroundColor: theme.backgroundSelected },
      ]}>
      <Animated.View
        pointerEvents="none"
        style={[styles.highlight, { backgroundColor: theme.backgroundSelected, opacity: highlightOpacity }]}
      />
      <AyahNumberBadge number={ayah.a} />
      {marks.length > 0 ? (
        <View style={styles.markIcons} accessibilityLabel={`${marks.length} saved marks`}>
          {marks.map((mark, index) =>
            mark.kind === 'pin' ? (
              <MaterialCommunityIcons
                key={`${mark.kind}-${mark.color}-${index}`}
                name="pin"
                size={13}
                color={mark.color}
              />
            ) : (
              <Ionicons
                key={`${mark.kind}-${mark.color}-${index}`}
                name="bookmark"
                size={11}
                color={mark.color}
              />
            ),
          )}
        </View>
      ) : null}

      <AyahActionMenu
        open={actionsOpen}
        onToggle={() => onToggleActions?.(ayah.a)}
        bookmarked={bookmarked}
        copied={copied}
        playback={playback}
        showTranslation={showFullTranslation}
        onSave={
          onOpenMarks
            ? () => {
                onToggleActions?.(ayah.a);
                onOpenMarks(ayah.a);
              }
            : undefined
        }
        onCopy={handleCopy}
        onPlay={handlePlayAyah}
        onTranslate={() => {
          hapticSelection();
          setShowFullTranslation((v) => !v);
        }}
      />

      <View style={styles.row}>
        {ayah.w.map((word) => (
          <WordCell
            key={word.p}
            word={word}
            showTranslation={showTranslation}
            arabicSize={arabicSize}
            glossSize={glossSize}
            hiddenVocabIds={hiddenVocabIds}
            knownWordIds={knownWordIds}
            onLongPressWord={onLongPressWord}
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
  highlight: {
    ...StyleSheet.absoluteFill,
  },
  markIcons: {
    position: 'absolute',
    top: Spacing.two + 1,
    left: Spacing.three + 22,
    zIndex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
});
