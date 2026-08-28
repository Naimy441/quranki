/* eslint-disable react-hooks/immutability -- react-native-reanimated's SharedValue.value is
   designed to be mutated directly, outside React's render cycle; this rule (aimed at the React
   Compiler, which doesn't know about Reanimated) can't tell that apart from mutating real
   React state. */
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import { useLayoutEffect, useMemo, useState } from 'react';
import { Pressable, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ReaderSettingsSheet } from '@/components/quran/reader-settings-sheet';
import { SurahPage } from '@/components/quran/surah-page';
import { WordDetailSheet } from '@/components/quran/word-detail-sheet';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticLight, hapticSelection } from '@/lib/haptics';
import { getKnownWordIds } from '@/lib/known-words';
import { getHiddenVocabIds, getLevelForWord, getMasteredVocabIds } from '@/lib/levels';
import { getSurahMeta, SURAH_COUNT } from '@/lib/quran-reader';
import type { ReaderWord } from '@/lib/quran-reader-types';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';

const ARABIC_SIZE_RANGE = { min: 18, max: 38, step: 4 };
const GLOSS_SIZE_RANGE = { min: 11, max: 19, step: 2 };
const DEFAULT_ARABIC_SIZE = 30;
const DEFAULT_GLOSS_SIZE = 15;

const ACTIVE_INITIAL_BATCH = 12;
// The neighboring surahs a swipe away only need a handful of ayahs pre-rendered so they already
// have real content the instant they slide into view, without paying to mount a whole surah for
// a chapter the user might not even swipe to.
const PEEK_INITIAL_BATCH = 5;

// Fraction of the screen width (or a fast enough flick) a drag needs to cross before it commits
// to changing chapters instead of springing back to the current one.
const COMMIT_DISTANCE_FRACTION = 0.3;
const COMMIT_VELOCITY_THRESHOLD = 800;
const SWIPE_ANIMATION_MS = 220;

export default function SurahReaderScreen() {
  const { surah } = useLocalSearchParams<{ surah: string }>();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const theme = useTheme();

  // `active` is the source of truth for what's on screen; the route param is kept in sync via
  // router.setParams (which updates this same screen instance in place, no remount) so the URL
  // and back button stay correct. Three surahs - active-1/active/active+1 - are always mounted
  // side by side; swiping just slides between them and then shifts which three are mounted,
  // rather than navigating to a whole new screen.
  const [active, setActive] = useState(() => Number(surah));
  // Re-sync from the route itself if it ever disagrees with our own `active` (not the other way
  // around - see the comment above). Adjusting state during render, rather than in an effect,
  // avoids an extra cascading render pass: React bails out and re-renders immediately with the
  // synced value before anything commits.
  const paramSurah = Number(surah);
  if (paramSurah !== active) setActive(paramSurah);

  const progress = useProgressStore((s) => s.progress);
  const hiddenVocabIds = useMemo(() => getHiddenVocabIds(progress), [progress]);
  const masteredVocabIds = useMemo(() => getMasteredVocabIds(progress), [progress]);
  const knownWords = useKnownWordsStore((s) => s.knownWords);
  const markKnown = useKnownWordsStore((s) => s.markKnown);
  const unmarkKnown = useKnownWordsStore((s) => s.unmarkKnown);
  const knownWordIds = useMemo(() => getKnownWordIds(knownWords), [knownWords]);
  const [showTranslation, setShowTranslation] = useState(true);
  const [arabicSize, setArabicSize] = useState(DEFAULT_ARABIC_SIZE);
  const [glossSize, setGlossSize] = useState(DEFAULT_GLOSS_SIZE);
  const [settingsVisible, setSettingsVisible] = useState(false);
  const [selectedWord, setSelectedWord] = useState<ReaderWord | null>(null);

  const meta = getSurahMeta(active);

  // Each mounted surah sits at its OWN permanent absolute offset (`-surahNumber * screenWidth`),
  // not at a position derived from its index among "currently mounted" slots. That means the
  // resting transform is always just `active * screenWidth` - a plain number that's already
  // correct the instant a swipe's settle animation finishes, before `active` (React state) even
  // updates. The previous design kept 3 flex-adjacent slots re-keyed to whichever surahs were
  // current, which meant every swipe had to *renumber* which slot held which surah at exactly the
  // same instant the transform snapped back to a shared "middle slot" offset - two independent
  // systems (a React commit reordering children, a Reanimated shared value mutating the UI
  // thread) that had to land in the same frame. On Android that pairing isn't guaranteed - Fabric
  // commits shadow-tree mutations on its own schedule relative to JS - so the renumbering would
  // occasionally paint a frame late, flashing the surah just swiped away from. Since nothing here
  // needs renumbering anymore (mounting/unmounting the far edge as `active` changes is purely a
  // memory optimization, decoupled from what's on screen), that whole class of race is gone: React
  // updating `active` a beat late just means an already-correctly-positioned peek page has its
  // `initialBatch` bumped up, with no visible effect either way.
  //
  // Surah number increases from right to left across the strip (`-surahNumber * screenWidth`,
  // rather than the more obvious `+surahNumber * screenWidth`) to match how a physical Arabic
  // book turns pages: swiping right (like turning to the next page in an RTL book) advances to
  // the next, higher-numbered surah, and swiping left goes back - the reverse of an English book.
  const translateX = useSharedValue(active * screenWidth);
  // Only needed for cases where `active` changes *without* a swipe (e.g. `screenWidth` changing
  // on rotation, or `active` resyncing from an external route change) - after a swipe, translateX
  // is already sitting at exactly `active * screenWidth` because that's what the settle
  // animation just animated it to, so this is a harmless no-op in the common case.
  useLayoutEffect(() => {
    translateX.value = active * screenWidth;
  }, [screenWidth, active, translateX]);

  const commitShift = (direction: 1 | -1) => {
    const next = active + direction;
    setActive(next);
    router.setParams({ surah: String(next) });
  };

  const swipeGesture = Gesture.Pan()
    .activeOffsetX([-20, 20])
    .failOffsetY([-15, 15])
    .onUpdate((event) => {
      'worklet';
      // Nothing is mounted past surah 1 or 114, so don't let the drag reveal empty space there.
      // Swiping right (positive translationX) goes to the next surah, so surah 1 - which has no
      // previous surah - blocks the opposite, leftward drag, and vice versa for the last surah.
      let translation = event.translationX;
      if (active <= 1) translation = Math.max(translation, 0);
      if (active >= SURAH_COUNT) translation = Math.min(translation, 0);
      const base = active * screenWidth;
      translateX.value = Math.max(base - screenWidth, Math.min(base + screenWidth, base + translation));
    })
    .onEnd((event) => {
      'worklet';
      const base = active * screenWidth;
      const goingNext =
        active < SURAH_COUNT &&
        (event.translationX >= screenWidth * COMMIT_DISTANCE_FRACTION || event.velocityX >= COMMIT_VELOCITY_THRESHOLD);
      const goingPrev =
        active > 1 &&
        (event.translationX <= -screenWidth * COMMIT_DISTANCE_FRACTION || event.velocityX <= -COMMIT_VELOCITY_THRESHOLD);

      if (goingNext) {
        runOnJS(hapticSelection)();
        translateX.value = withTiming(base + screenWidth, { duration: SWIPE_ANIMATION_MS }, (finished) => {
          if (finished) runOnJS(commitShift)(1);
        });
      } else if (goingPrev) {
        runOnJS(hapticSelection)();
        translateX.value = withTiming(base - screenWidth, { duration: SWIPE_ANIMATION_MS }, (finished) => {
          if (finished) runOnJS(commitShift)(-1);
        });
      } else {
        translateX.value = withTiming(base, { duration: SWIPE_ANIMATION_MS });
      }
    });

  const rowStyle = useAnimatedStyle(() => ({ transform: [{ translateX: translateX.value }] }));

  if (!meta) {
    return <ThemedView style={styles.flex} />;
  }

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          title: meta.tr,
          headerBackTitle: "Qur'an",
          headerRight: () => (
            <Pressable
              onPress={() => {
                hapticLight();
                setSettingsVisible(true);
              }}
              hitSlop={10}
              style={styles.headerButton}>
              <Ionicons name="settings-outline" size={22} color={theme.text} />
            </Pressable>
          ),
        }}
      />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <GestureDetector gesture={swipeGesture}>
          <Animated.View style={[styles.row, rowStyle]}>
            {[active - 1, active, active + 1].map((surahNumber) => {
              if (surahNumber < 1 || surahNumber > SURAH_COUNT) return null;
              return (
                <View
                  key={surahNumber}
                  style={[styles.slot, { left: -surahNumber * screenWidth, width: screenWidth }]}>
                  <SurahPage
                    surahNumber={surahNumber}
                    showTranslation={showTranslation}
                    arabicSize={arabicSize}
                    glossSize={glossSize}
                    hiddenVocabIds={hiddenVocabIds}
                    knownWordIds={knownWordIds}
                    onLongPressWord={setSelectedWord}
                    initialBatch={surahNumber === active ? ACTIVE_INITIAL_BATCH : PEEK_INITIAL_BATCH}
                  />
                </View>
              );
            })}
          </Animated.View>
        </GestureDetector>
      </SafeAreaView>

      <ReaderSettingsSheet
        visible={settingsVisible}
        onDismiss={() => setSettingsVisible(false)}
        arabicSize={arabicSize}
        onArabicSizeChange={setArabicSize}
        arabicSizeRange={ARABIC_SIZE_RANGE}
        glossSize={glossSize}
        onGlossSizeChange={setGlossSize}
        glossSizeRange={GLOSS_SIZE_RANGE}
        showTranslation={showTranslation}
        onShowTranslationChange={setShowTranslation}
      />

      <WordDetailSheet
        word={selectedWord}
        isKnown={selectedWord?.v !== undefined && knownWordIds.has(selectedWord.v)}
        masteredLevel={
          selectedWord?.v !== undefined && !knownWordIds.has(selectedWord.v) && masteredVocabIds.has(selectedWord.v)
            ? getLevelForWord(selectedWord.v)
            : undefined
        }
        onDismiss={() => setSelectedWord(null)}
        onMarkKnown={(word) => {
          if (word.v === undefined) return;
          markKnown(word.v, word.ar.map((seg) => seg.t).join(''));
        }}
        onForget={(word) => {
          if (word.v === undefined) return;
          unmarkKnown(word.v);
        }}
      />
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, overflow: 'hidden' },
  // Just a full-size, positioned ancestor for the absolutely-placed slots below - no flex layout
  // involved, since each slot's horizontal position comes from its own `left` offset instead.
  row: { flex: 1 },
  slot: { position: 'absolute', top: 0, bottom: 0 },
  headerButton: { padding: Spacing.one },
});
