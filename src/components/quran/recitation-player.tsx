import { Ionicons } from '@expo/vector-icons';
import { useEffect } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, {
    Easing,
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticLight, hapticSelection } from '@/lib/haptics';
import { getSurahMeta } from '@/lib/quran-reader';
import {
    skipNextAyah,
    skipPreviousAyah,
    stopRecitation,
    togglePlayPause,
    useRecitationStore,
} from '@/store/recitation-store';

/** Height of the player chrome (progress + controls), not including the home-indicator inset. */
export const RECITATION_PLAYER_BAR_HEIGHT = 96;

function formatBytes(n: number): string {
  if (!Number.isFinite(n) || n <= 0) return '0 B';
  if (n < 1024) return `${Math.round(n)} B`;
  if (n < 1024 * 1024) return `${Math.round(n / 1024)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

function SmoothProgressBar({
  value,
  remainingMs,
  run,
  color,
  trackColor,
  indeterminate,
}: {
  value: number;
  remainingMs: number;
  run: boolean;
  color: string;
  trackColor: string;
  indeterminate: boolean;
}) {
  const progress = useSharedValue(0);
  const trackWidth = useSharedValue(0);
  const idleValue = run ? 0 : value;

  useEffect(() => {
    cancelAnimation(progress);
    if (indeterminate) {
      progress.value = 0;
      progress.value = withRepeat(withTiming(1, { duration: 900, easing: Easing.inOut(Easing.quad) }), -1, true);
      return;
    }
    const clamped = Math.min(1, Math.max(0, value));
    progress.value = clamped;
    if (run && remainingMs > 80) {
      progress.value = withTiming(1, { duration: remainingMs, easing: Easing.linear });
    }
    // Sync on play/pause/ayah remount, not on every 250ms status tick - remainingMs is read from
    // the render that flipped `run`.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- see above
  }, [run, indeterminate, idleValue, progress]);

  const fillStyle = useAnimatedStyle(() => ({
    width: trackWidth.value * progress.value,
  }));

  return (
    <View
      style={[styles.progressTrack, { backgroundColor: trackColor }]}
      onLayout={(e) => {
        trackWidth.value = e.nativeEvent.layout.width;
      }}>
      <Animated.View style={[styles.progressFill, { backgroundColor: color }, fillStyle]} />
    </View>
  );
}

interface RecitationPlayerProps {
  /** Tapping the surah name/status jumps back to whatever's currently being recited. */
  onPressTitle?: () => void;
}

export function RecitationPlayer({ onPressTitle }: RecitationPlayerProps) {
  const theme = useTheme();
  const mode = useRecitationStore((s) => s.mode);
  const surahNumber = useRecitationStore((s) => s.surahNumber);
  const ayahNumber = useRecitationStore((s) => s.ayahNumber);
  const playingBismillah = useRecitationStore((s) => s.playingBismillah);
  const playing = useRecitationStore((s) => s.playing);
  const awaitingAudio = useRecitationStore((s) => s.awaitingAudio);
  const downloadBytesWritten = useRecitationStore((s) => s.downloadBytesWritten);
  const downloadBytesTotal = useRecitationStore((s) => s.downloadBytesTotal);
  const positionSeconds = useRecitationStore((s) => s.positionSeconds);
  const durationSeconds = useRecitationStore((s) => s.durationSeconds);
  const rangeStartAyah = useRecitationStore((s) => s.rangeStartAyah);
  const rangeEndAyah = useRecitationStore((s) => s.rangeEndAyah);
  const error = useRecitationStore((s) => s.error);
  const progressEpoch = useRecitationStore((s) => s.progressEpoch);

  const meta = surahNumber ? getSurahMeta(surahNumber) : undefined;
  const downloading = downloadBytesTotal > 0 && downloadBytesWritten < downloadBytesTotal;
  const downloadProgress = downloadBytesTotal > 0 ? downloadBytesWritten / downloadBytesTotal : 0;
  // Every clip (Bismillah, or one ayah in either mode) is its own file, so `positionSeconds`/
  // `durationSeconds` are always relative to whatever's currently loaded.
  const ayahProgress = durationSeconds > 0 ? Math.min(1, positionSeconds / durationSeconds) : 0;
  const showDownloadBar = (downloading || (awaitingAudio && downloadBytesWritten === 0)) && !playing;
  const remainingMs = Math.max(0, (durationSeconds - positionSeconds) * 1000);
  const mediaReady = durationSeconds > 0;
  const barValue = error ? 0 : showDownloadBar ? downloadProgress : ayahProgress;
  const barRun = !error && !showDownloadBar && playing && mediaReady;
  const canPrev =
    playingBismillah ||
    ayahNumber > rangeStartAyah ||
    Boolean(mode === 'surah' && meta?.b && rangeStartAyah <= 1 && ayahNumber <= rangeStartAyah);
  const canNext = playingBismillah || ayahNumber < rangeEndAyah;
  const busy = awaitingAudio && !playing;

  // Bounded by the chosen range, not the whole surah - matches `ayahCount` exactly when playing
  // the default full range, so this is a no-op for the common case.
  let status = playingBismillah ? 'Bismillah' : `Ayah ${ayahNumber} of ${rangeEndAyah}`;
  if (error) {
    status = error;
  } else if (downloading && !playingBismillah) {
    status =
      downloadBytesTotal > 0
        ? `Downloading ${formatBytes(downloadBytesWritten)} of ${formatBytes(downloadBytesTotal)}`
        : 'Downloading…';
  } else if (awaitingAudio && !playing) {
    status = 'Loading…';
  }

  return (
    <View
      style={[styles.bar, { backgroundColor: theme.card, borderTopColor: theme.border }]}
      accessibilityRole="toolbar"
      accessibilityLabel="Recitation player">
      <SmoothProgressBar
        key={
          showDownloadBar
            ? 'download'
            : `${progressEpoch}-${ayahNumber}-${playingBismillah}-${mode}-${mediaReady}`
        }
        value={barValue}
        remainingMs={showDownloadBar ? 0 : remainingMs}
        run={barRun}
        color={error ? theme.danger : theme.primary}
        trackColor={theme.backgroundElement}
        indeterminate={Boolean(!error && showDownloadBar && downloadBytesTotal <= 0)}
      />

      <View style={styles.row}>
        <Pressable
          onPress={() => {
            hapticSelection();
            onPressTitle?.();
          }}
          disabled={!onPressTitle}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Jump to the ayah being recited"
          style={({ pressed }) => [styles.copy, pressed && styles.pressed]}>
          <ThemedText type="smallBold" numberOfLines={1}>
            {meta?.en ?? 'Recitation'}
          </ThemedText>
          <ThemedText type="small" themeColor={error ? 'danger' : 'textSecondary'} numberOfLines={1}>
            {status}
          </ThemedText>
        </Pressable>

        <View style={styles.controls}>
          <Pressable
            onPress={() => {
              hapticSelection();
              skipPreviousAyah();
            }}
            disabled={!canPrev && !playing}
            hitSlop={8}
            accessibilityLabel="Previous ayah"
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Ionicons name="play-skip-back" size={22} color={canPrev || playing ? theme.text : theme.textMuted} />
          </Pressable>

          <Pressable
            onPress={() => {
              hapticLight();
              togglePlayPause();
            }}
            hitSlop={8}
            accessibilityLabel={playing ? 'Pause' : 'Play'}
            style={({ pressed }) => [
              styles.playButton,
              { backgroundColor: theme.backgroundSelected },
              pressed && styles.pressed,
            ]}>
            {busy ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <Ionicons name={playing ? 'pause' : 'play'} size={22} color={theme.primary} />
            )}
          </Pressable>

          <Pressable
            onPress={() => {
              hapticSelection();
              skipNextAyah();
            }}
            disabled={!canNext}
            hitSlop={8}
            accessibilityLabel="Next ayah"
            style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
            <Ionicons name="play-skip-forward" size={22} color={canNext ? theme.text : theme.textMuted} />
          </Pressable>
        </View>

        <Pressable
          onPress={() => {
            hapticSelection();
            stopRecitation();
          }}
          hitSlop={10}
          accessibilityLabel="Stop recitation"
          style={({ pressed }) => [styles.iconButton, pressed && styles.pressed]}>
          <Ionicons name="stop" size={20} color={theme.textMuted} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingBottom: Spacing.two,
  },
  progressTrack: {
    height: 3,
    width: '100%',
    overflow: 'hidden',
  },
  progressFill: {
    height: 3,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.three,
    paddingTop: Spacing.two,
    gap: Spacing.two,
  },
  copy: {
    flex: 1,
    minWidth: 0,
    gap: 1,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.one,
  },
  iconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 40,
    height: 40,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
