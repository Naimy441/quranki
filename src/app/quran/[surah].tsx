/* eslint-disable react-hooks/immutability -- react-native-reanimated's SharedValue.value is
   designed to be mutated directly, outside React's render cycle; this rule (aimed at the React
   Compiler, which doesn't know about Reanimated) can't tell that apart from mutating real
   React state. */
import { Ionicons } from '@expo/vector-icons';
import { Stack, useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, AppState, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import { AyahMarkSheet } from '@/components/quran/ayah-mark-sheet';
import { PlayOptionsSheet } from '@/components/quran/play-options-sheet';
import { QuranJumpSheet } from '@/components/quran/quran-jump-sheet';
import { RecitationPlayer } from '@/components/quran/recitation-player';
import { SurahPage } from '@/components/quran/surah-page';
import { WordDetailSheet } from '@/components/quran/word-detail-sheet';
import { ThemedView } from '@/components/themed-view';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticLight, hapticSelection } from '@/lib/haptics';
import { getKnownLemmaIds } from '@/lib/known-words';
import { getHiddenLemmaIds, getMasteredLemmaIds, getMasteredStudyWordForLemmas } from '@/lib/levels';
import { getWordLemmaIds, hasEveryLemma } from '@/lib/quran-lemmas';
import { getPendingReaderTarget, noteQuranReaderMounted } from '@/lib/quran-nav';
import { getSurahMeta, SURAH_COUNT } from '@/lib/quran-reader';
import type { ReaderWordRef } from '@/lib/quran-reader-types';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';
import { useQuranMarksStore } from '@/store/quran-marks-store';
import {
  playSurah,
  setAutoScrollSuspended,
  stopRecitation,
  toggleSurahPlayback,
  useRecitationStore,
} from '@/store/recitation-store';

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
  const { surah, ayah: ayahParam } = useLocalSearchParams<{ surah: string; ayah?: string }>();
  const router = useRouter();
  const { width: screenWidth } = useWindowDimensions();
  const theme = useTheme();

  // `active` is the source of truth for what's on screen; the route param is kept in sync via
  // router.setParams (which updates this same screen instance in place, no remount) so the URL
  // and back button stay correct. Three surahs - active-1/active/active+1 - are always mounted
  // side by side; swiping just slides between them and then shifts which three are mounted,
  // rather than navigating to a whole new screen.
  const [active, setActive] = useState(() => Number(surah));
  // Header title tracks the chapter the swipe has committed to, immediately - `active` only
  // updates after the page animation so the strip doesn't remount mid-slide. A custom
  // `headerTitle` also skips the native stack's title-slide interpolation.
  const [headerSurah, setHeaderSurah] = useState(() => Number(surah));
  // Re-sync from the route itself if it ever disagrees with our own `active` (not the other way
  // around - see the comment above). Adjusting state during render, rather than in an effect,
  // avoids an extra cascading render pass: React bails out and re-renders immediately with the
  // synced value before anything commits.
  const paramSurah = Number(surah);
  if (paramSurah !== active) {
    setActive(paramSurah);
    setHeaderSurah(paramSurah);
  }

  const progress = useProgressStore((s) => s.progress);
  const hiddenLemmaIds = useMemo(() => getHiddenLemmaIds(progress), [progress]);
  const knownWords = useKnownWordsStore((s) => s.knownWords);
  const markKnown = useKnownWordsStore((s) => s.markKnown);
  const unmarkKnown = useKnownWordsStore((s) => s.unmarkKnown);
  const knownLemmaIds = useMemo(() => getKnownLemmaIds(knownWords), [knownWords]);
  const recognizedLemmaIds = useMemo(() => {
    const ids = getMasteredLemmaIds(progress);
    for (const id of knownLemmaIds) ids.add(id);
    return ids;
  }, [knownLemmaIds, progress]);
  const arabicSize = useProgressStore((s) => s.settings.readerArabicSize);
  const glossSize = useProgressStore((s) => s.settings.readerGlossSize);
  const showTranslation = useProgressStore((s) => s.settings.readerShowTranslation);
  const showAyahCoverage = useProgressStore((s) => s.settings.readerShowAyahCoverage);
  const showTransliteration = useProgressStore((s) => s.settings.readerTransliteration);
  const transliterationSize = useProgressStore((s) => s.settings.readerTransliterationSize);
  const [selectedWord, setSelectedWord] = useState<ReaderWordRef | null>(null);
  const [markAyah, setMarkAyah] = useState<number | null>(null);
  const [jumpVisible, setJumpVisible] = useState(false);
  const [playOptionsVisible, setPlayOptionsVisible] = useState(false);
  // Bumped only on a genuinely fresh play-button press (not when reopening after a reciter-picker
  // round trip below) - keyed onto `PlayOptionsSheet` to force a fresh range selection then, while
  // leaving the in-progress range alone when the reader just went to switch reciters.
  const [playOptionsOpenId, setPlayOptionsOpenId] = useState(0);
  const [playFromAyah, setPlayFromAyah] = useState(1);
  const returningToPlayOptionsRef = useRef(false);
  // Latest ayah at the top of the viewport - snapshotted into `playFromAyah` when the header
  // play button opens a fresh range picker, so the start wheel matches where the reader is.
  const visibleAyahRef = useRef(1);
  const lastAppliedNavToken = useRef(0);
  const [readerFocusEpoch, setReaderFocusEpoch] = useState(0);
  const noteOpenedSurah = useQuranMarksStore((s) => s.noteOpenedSurah);
  const setLastRead = useQuranMarksStore((s) => s.setLastRead);
  const hasSaved = useQuranMarksStore((s) => s.pinPlacements.length > 0 || s.bookmarks.length > 0);
  const playerVisible = useRecitationStore((s) => s.visible);
  const recitationSurah = useRecitationStore((s) => s.surahNumber);
  const recitationAyahNumber = useRecitationStore((s) => s.ayahNumber);
  const recitationPlaying = useRecitationStore((s) => s.playing);
  const recitationAwaiting = useRecitationStore((s) => s.awaitingAudio);
  const recitationFinished = useRecitationStore((s) => s.rangeFinished);

  const meta = getSurahMeta(active);
  const headerMeta = getSurahMeta(headerSurah) ?? meta;
  const requestedAyah = Number(Array.isArray(ayahParam) ? ayahParam[0] : ayahParam);
  const focusAyah =
    Number.isFinite(requestedAyah) && requestedAyah >= 1 && meta
      ? Math.min(meta.ac, Math.round(requestedAyah))
      : 0;
  const hasSessionForActiveSurah = playerVisible && recitationSurah === active;
  const thisSurahPlaying = hasSessionForActiveSurah && recitationPlaying;
  const thisSurahLoading = hasSessionForActiveSurah && recitationAwaiting && !recitationPlaying;
  // The session ran all the way to the end of its chosen range - the header button re-opens the
  // picker rather than silently replaying the same range (the bottom player bar's own play
  // button still just replays it; see the header `onPress` below vs `togglePlayPause`).
  const thisSurahFinished = hasSessionForActiveSurah && recitationFinished;

  useEffect(() => noteQuranReaderMounted(), []);

  // Play after focus-effect cleanup has finished - starting it inside `useFocusEffect` would
  // lose the session if React remounts the effect (the blur path calls `stopRecitation`).
  useEffect(() => {
    if (readerFocusEpoch === 0) return;
    const target = getPendingReaderTarget();
    if (!target || target.token !== readerFocusEpoch || !target.play) return;
    setAutoScrollSuspended(false);
    void playSurah(target.surah, target.ayah);
  }, [readerFocusEpoch]);

  useFocusEffect(
    useCallback(() => {
      // Coming back from `/reciter-picker` after tapping "Reciter" inside `PlayOptionsSheet`
      // (see its `onPressReciter` below) - reopen that sheet. The reciter list can't be embedded
      // inline in it: wrapping a sheet's content in a `Pressable` (needed to swallow backdrop
      // taps) also swallows a nested scrollable's drag before it becomes the touch responder, so
      // it's a real pushed screen instead.
      if (returningToPlayOptionsRef.current) {
        returningToPlayOptionsRef.current = false;
        setPlayOptionsVisible(true);
      }
      // Saved stashes a jump here so we update this same reader instead of pushing
      // another `/quran/[surah]`. Applied on focus so `setParams` hits this route.
      const target = getPendingReaderTarget();
      if (target && target.token !== lastAppliedNavToken.current) {
        lastAppliedNavToken.current = target.token;
        setReaderFocusEpoch(target.token);
        router.setParams({ surah: String(target.surah), ayah: String(target.ayah) });
      }
      return () => {
        // Backgrounding the app blurs this screen on some platforms; keep recitation going.
        const appState = AppState.currentState;
        if (appState === 'background' || appState === 'inactive') return;
        stopRecitation();
      };
    }, [router]),
  );

  useLayoutEffect(() => {
    noteOpenedSurah(active);
    if (focusAyah > 0) setLastRead(active, focusAyah);
  }, [active, focusAyah, noteOpenedSurah, setLastRead]);

  useLayoutEffect(() => {
    visibleAyahRef.current = focusAyah > 0 ? focusAyah : 1;
  }, [active]);

  useLayoutEffect(() => {
    if (focusAyah > 0) visibleAyahRef.current = focusAyah;
  }, [focusAyah]);

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
    router.setParams({ surah: String(next), ayah: '' });
  };

  // Player bar title tap: jump straight back to whatever's currently being recited, even if the
  // reader has swiped to a different chapter or scrolled away from it - mirrors `QuranJumpSheet`'s
  // `onJump` below, plus clearing `autoScrollSuspended` so the reciter's position starts driving
  // the scroll again.
  const jumpToRecitation = () => {
    if (!playerVisible || recitationSurah == null) return;
    hapticSelection();
    const jumpAyah = recitationAyahNumber > 0 ? recitationAyahNumber : 1;
    setAutoScrollSuspended(false);
    setHeaderSurah(recitationSurah);
    setActive(recitationSurah);
    setLastRead(recitationSurah, jumpAyah);
    router.setParams({ surah: String(recitationSurah), ayah: String(jumpAyah) });
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
        runOnJS(setHeaderSurah)(active + 1);
        runOnJS(hapticSelection)();
        translateX.value = withTiming(base + screenWidth, { duration: SWIPE_ANIMATION_MS }, (finished) => {
          if (finished) runOnJS(commitShift)(1);
        });
      } else if (goingPrev) {
        runOnJS(setHeaderSurah)(active - 1);
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
  const displayedHeaderMeta = headerMeta ?? meta;

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen
        options={{
          title: displayedHeaderMeta.tr,
          headerBackTitle: "Quran",
          headerTitle: () => (
            <Text numberOfLines={1} style={[styles.headerTitle, { color: theme.text }]}>{displayedHeaderMeta.tr}</Text>
          ),
          // Horizontal pans change chapters. The stack's edge-swipe would otherwise
          // pop back to the list and leave the reader.
          gestureEnabled: false,
          fullScreenGestureEnabled: false,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                onPress={() => {
                  hapticLight();
                  // A session already exists for this surah and hasn't finished (playing, paused
                  // mid-way, or loading) - just toggle it, same as before. Otherwise (no session
                  // yet, or the previous one played through to the end of its range) let the
                  // reader pick a fresh range and reciter instead of always resuming/replaying.
                  if (hasSessionForActiveSurah && !thisSurahFinished) {
                    toggleSurahPlayback(active);
                  } else {
                    setPlayFromAyah(Math.max(1, Math.min(meta.ac, visibleAyahRef.current)));
                    setPlayOptionsOpenId((id) => id + 1);
                    setPlayOptionsVisible(true);
                  }
                }}
                hitSlop={10}
                accessibilityLabel={thisSurahPlaying ? 'Pause recitation' : 'Play surah recitation'}
                style={styles.headerButton}>
                {thisSurahLoading ? (
                  <ActivityIndicator size="small" color={theme.text} />
                ) : (
                  <Ionicons name={thisSurahPlaying ? 'pause' : 'play'} size={22} color={theme.text} />
                )}
              </Pressable>
              <Pressable
                onPress={() => {
                  hapticLight();
                  router.push('/saved');
                }}
                hitSlop={10}
                accessibilityLabel="Saved pins and bookmarks"
                style={styles.headerButton}>
                <Ionicons name={hasSaved ? 'bookmark' : 'bookmark-outline'} size={22} color={theme.text} />
              </Pressable>
              <Pressable
                onPress={() => setJumpVisible(true)}
                hitSlop={10}
                accessibilityLabel="Jump to surah and ayah"
                style={styles.headerButton}>
                <Ionicons name="navigate-outline" size={21} color={theme.text} />
              </Pressable>
              <Pressable
                onPress={() => {
                  hapticLight();
                  router.push('/reader-settings');
                }}
                hitSlop={10}
                accessibilityLabel="Settings"
                style={styles.headerButton}>
                <Ionicons name="settings-outline" size={22} color={theme.text} />
              </Pressable>
            </View>
          ),
        }}
      />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <View style={styles.flex}>
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
                      showTransliteration={showTransliteration}
                      arabicSize={arabicSize}
                      glossSize={glossSize}
                      transliterationSize={transliterationSize}
                      hiddenLemmaIds={hiddenLemmaIds}
                      knownLemmaIds={knownLemmaIds}
                      recognizedLemmaIds={recognizedLemmaIds}
                      showAyahCoverage={showAyahCoverage}
                      onLongPressWord={setSelectedWord}
                      onOpenMarks={setMarkAyah}
                      focusAyah={surahNumber === active ? focusAyah : 0}
                      focusEpoch={surahNumber === active ? readerFocusEpoch : 0}
                      isActive={surahNumber === active}
                      onVisibleAyah={(ayah) => {
                        setLastRead(surahNumber, ayah);
                        visibleAyahRef.current = ayah;
                      }}
                      initialBatch={
                        surahNumber === active
                          ? Math.max(ACTIVE_INITIAL_BATCH, focusAyah > 0 ? focusAyah + 2 : 0)
                          : PEEK_INITIAL_BATCH
                      }
                    />
                  </View>
                );
              })}
            </Animated.View>
          </GestureDetector>
        </View>
        {playerVisible && <RecitationPlayer onPressTitle={jumpToRecitation} />}
      </SafeAreaView>

      <AyahMarkSheet surah={active} ayah={markAyah} onDismiss={() => setMarkAyah(null)} />

      <PlayOptionsSheet
        key={playOptionsOpenId}
        visible={playOptionsVisible}
        surahNumber={active}
        initialFromAyah={playFromAyah}
        onDismiss={() => setPlayOptionsVisible(false)}
        onPressReciter={() => {
          setPlayOptionsVisible(false);
          returningToPlayOptionsRef.current = true;
          router.push('/reciter-picker');
        }}
        onPlay={(fromAyah, toAyah) => {
          setPlayOptionsVisible(false);
          void playSurah(active, fromAyah, toAyah);
        }}
      />

      <QuranJumpSheet
        visible={jumpVisible}
        initialSurah={active}
        initialAyah={focusAyah || 1}
        onDismiss={() => setJumpVisible(false)}
        onJump={(jumpSurah, jumpAyah) => {
          setJumpVisible(false);
          setHeaderSurah(jumpSurah);
          setActive(jumpSurah);
          setLastRead(jumpSurah, jumpAyah);
          router.setParams({ surah: String(jumpSurah), ayah: String(jumpAyah) });
        }}
      />

      <WordDetailSheet
        selection={selectedWord}
        isKnown={selectedWord !== null && hasEveryLemma(selectedWord.word, knownLemmaIds)}
        masteredLevel={
          selectedWord && !hasEveryLemma(selectedWord.word, knownLemmaIds)
            ? getMasteredStudyWordForLemmas(getWordLemmaIds(selectedWord.word), progress)?.level
            : undefined
        }
        onDismiss={() => setSelectedWord(null)}
        onMarkKnown={(word) => {
          const ids = getWordLemmaIds(word);
          if (ids.length === 0) return;
          markKnown(ids, word.ar.map((seg) => seg.t).join(''));
        }}
        onForget={(word) => {
          const ids = getWordLemmaIds(word);
          if (ids.length === 0) return;
          unmarkKnown(ids);
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
  headerActions: { flexDirection: 'row', alignItems: 'center' },
  headerButton: { padding: Spacing.one },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
  },
});
