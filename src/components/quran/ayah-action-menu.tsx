import { Ionicons } from '@expo/vector-icons';
import { useLayoutEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, type ViewStyle } from 'react-native';
import Animated, { Easing, Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection } from '@/lib/haptics';

const BUTTON = 26;
const GAP = 8;
const SLOT = BUTTON + GAP;
const MAX_ACTIONS = 4;
const STACK = MAX_ACTIONS * SLOT;
const SNAP = Easing.bezier(0.2, 0.85, 0.25, 1);
export type AyahPlayback = 'idle' | 'loading' | 'playing' | 'paused';
export type AyahActionDirection = 'horizontal' | 'up';
interface Props { open: boolean; onToggle: () => void; bookmarked: boolean; copied: boolean; playback: AyahPlayback; showTranslation: boolean; showTranslationAction?: boolean; onSave: () => void; onCopy: () => void; onPlay: () => void; onTranslate: () => void; style?: ViewStyle; direction?: AyahActionDirection; presence?: number; }

function animateProgress(progress: SharedValue<number>, open: boolean) {
  progress.value = withTiming(open ? 1 : 0, { duration: open ? 220 : 160, easing: SNAP });
}

/** Slide-out ayah actions. Top-right opens sideways; the sticky copy opens upward from the bottom-left. */
export function AyahActionMenu({ open, onToggle, bookmarked, copied, playback, showTranslation, showTranslationAction = true, onSave, onCopy, onPlay, onTranslate, style, direction = 'horizontal', presence = 1 }: Props) {
  const theme = useTheme();
  const progress = useSharedValue(open ? 1 : 0);
  const appear = useSharedValue(direction === 'up' ? 0 : 1);
  const [expanded, setExpanded] = useState(open);
  const fromTrigger = useRef(false);
  useLayoutEffect(() => {
    if (direction !== 'up') return;
    appear.value = withTiming(presence, { duration: 90, easing: Easing.linear });
  }, [appear, direction, presence]);
  const appearStyle = useAnimatedStyle(() => ({ opacity: appear.value }));
  useLayoutEffect(() => {
    if (fromTrigger.current) {
      fromTrigger.current = false;
      setExpanded(open);
      return;
    }
    setExpanded(open);
    animateProgress(progress, open);
  }, [open, progress]);
  const actions: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; active: boolean; loading?: boolean; onPress: () => void }[] = [
    { key: 'save', label: bookmarked ? 'Edit saved marks' : 'Save this ayah', icon: bookmarked ? 'bookmark' : 'bookmark-outline', color: bookmarked ? theme.primary : theme.textMuted, active: bookmarked, onPress: onSave },
    { key: 'copy', label: 'Copy ayah', icon: copied ? 'checkmark' : 'copy-outline', color: copied ? theme.primary : theme.textMuted, active: copied, onPress: onCopy },
    { key: 'play', label: playback === 'playing' ? 'Pause ayah recitation' : 'Play this ayah', icon: playback === 'playing' ? 'volume-high' : 'volume-medium-outline', color: playback !== 'idle' ? theme.primary : theme.textMuted, active: playback !== 'idle', loading: playback === 'loading', onPress: onPlay },
    ...(showTranslationAction ? [{ key: 'translate', label: 'Toggle translation', icon: (showTranslation ? 'language' : 'language-outline') as keyof typeof Ionicons.glyphMap, color: showTranslation ? theme.primary : theme.textMuted, active: showTranslation, onPress: onTranslate }] : []),
  ];
  const accented = bookmarked || copied || playback !== 'idle' || showTranslation;
  const upward = direction === 'up';
  return <Animated.View style={[styles.cluster, upward ? styles.clusterUp : styles.clusterRow, style, appearStyle]} pointerEvents={presence > 0.35 ? 'box-none' : 'none'}>
    {actions.map((action, index) => <SlidingAction key={action.key} index={index} progress={progress} open={expanded} direction={direction}><Pressable onPress={action.onPress} accessibilityLabel={action.label} style={({ pressed }) => [styles.actionButton, { backgroundColor: action.active ? theme.backgroundSelected : theme.backgroundElement }, pressed && styles.pressed]}>{action.loading ? <ActivityIndicator size="small" color={theme.primary} /> : <Ionicons name={action.icon} size={14} color={action.color} />}</Pressable></SlidingAction>)}
    <Pressable onPress={() => { fromTrigger.current = true; const next = !expanded; setExpanded(next); animateProgress(progress, next); hapticSelection(); onToggle(); }} hitSlop={10} accessibilityLabel={expanded ? 'Hide ayah actions' : 'Show ayah actions'} accessibilityState={{ expanded }} style={({ pressed }) => [styles.actionButton, upward ? styles.triggerUp : styles.triggerRow, { backgroundColor: expanded || accented ? theme.backgroundSelected : theme.backgroundElement }, pressed && styles.pressed]}><Ionicons name={expanded ? 'close' : 'ellipsis-horizontal'} size={16} color={expanded || accented ? theme.primary : theme.textMuted} /></Pressable>
  </Animated.View>;
}

function SlidingAction({ index, progress, open, direction, children }: { index: number; progress: SharedValue<number>; open: boolean; direction: AyahActionDirection; children: ReactNode }) {
  const upward = direction === 'up';
  const style = useAnimatedStyle(() => {
    const start = index * 0.045;
    const t = interpolate(progress.value, [start, start + 0.72], [0, 1], Extrapolation.CLAMP);
    const offset = (1 - t) * (index + 1) * SLOT;
    return { opacity: t, transform: [upward ? { translateY: offset } : { translateX: offset }, { scale: 0.72 + 0.28 * t }] };
  });
  return <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[styles.slide, upward ? { bottom: BUTTON + GAP + index * SLOT, left: 0 } : { top: 0, right: BUTTON + GAP + index * SLOT }, style]}>{children}</Animated.View>;
}
const styles = StyleSheet.create({
  cluster: { position: 'absolute', overflow: 'visible', zIndex: 2 },
  clusterRow: { top: Spacing.two, right: Spacing.two, width: BUTTON + MAX_ACTIONS * SLOT, height: BUTTON },
  clusterUp: { width: BUTTON, height: BUTTON + STACK, marginTop: -STACK, zIndex: 4 },
  slide: { position: 'absolute' },
  triggerRow: { position: 'absolute', top: 0, right: 0 },
  triggerUp: { position: 'absolute', bottom: 0, left: 0 },
  actionButton: { width: BUTTON, height: BUTTON, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' },
  pressed: { opacity: 0.7 },
});
