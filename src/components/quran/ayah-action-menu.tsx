import { Ionicons } from '@expo/vector-icons';
import { useEffect, type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, View } from 'react-native';
import Animated, { Easing, Extrapolation, interpolate, useAnimatedStyle, useSharedValue, withTiming, type SharedValue } from 'react-native-reanimated';

import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection } from '@/lib/haptics';

const BUTTON = 26;
const GAP = 8;
const SLOT = BUTTON + GAP;
const SNAP = Easing.bezier(0.2, 0.85, 0.25, 1);
export type AyahPlayback = 'idle' | 'loading' | 'playing' | 'paused';
interface Props { open: boolean; onToggle: () => void; bookmarked: boolean; copied: boolean; playback: AyahPlayback; showTranslation: boolean; showTranslationAction?: boolean; onSave: () => void; onCopy: () => void; onPlay: () => void; onTranslate: () => void; }

/** Original horizontal slide-out menu: the trigger becomes an X in the same anchored position. */
export function AyahActionMenu({ open, onToggle, bookmarked, copied, playback, showTranslation, showTranslationAction = true, onSave, onCopy, onPlay, onTranslate }: Props) {
  const theme = useTheme();
  const progress = useSharedValue(open ? 1 : 0);
  useEffect(() => { progress.value = withTiming(open ? 1 : 0, { duration: open ? 220 : 160, easing: SNAP }); }, [open, progress]);
  const actions: { key: string; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; active: boolean; loading?: boolean; onPress: () => void }[] = [
    { key: 'save', label: bookmarked ? 'Edit saved marks' : 'Save this ayah', icon: bookmarked ? 'bookmark' : 'bookmark-outline', color: bookmarked ? theme.primary : theme.textMuted, active: bookmarked, onPress: onSave },
    { key: 'copy', label: 'Copy ayah', icon: copied ? 'checkmark' : 'copy-outline', color: copied ? theme.primary : theme.textMuted, active: copied, onPress: onCopy },
    { key: 'play', label: playback === 'playing' ? 'Pause ayah recitation' : 'Play this ayah', icon: playback === 'playing' ? 'volume-high' : 'volume-medium-outline', color: playback !== 'idle' ? theme.primary : theme.textMuted, active: playback !== 'idle', loading: playback === 'loading', onPress: onPlay },
    ...(showTranslationAction ? [{ key: 'translate', label: 'Toggle translation', icon: (showTranslation ? 'language' : 'language-outline') as keyof typeof Ionicons.glyphMap, color: showTranslation ? theme.primary : theme.textMuted, active: showTranslation, onPress: onTranslate }] : []),
  ];
  const accented = bookmarked || copied || playback !== 'idle' || showTranslation;
  return <View style={styles.cluster} pointerEvents="box-none">
    {actions.map((action, index) => <SlidingAction key={action.key} index={index} progress={progress} open={open}><Pressable onPress={action.onPress} accessibilityLabel={action.label} style={({ pressed }) => [styles.actionButton, { backgroundColor: action.active ? theme.backgroundSelected : theme.backgroundElement }, pressed && styles.pressed]}>{action.loading ? <ActivityIndicator size="small" color={theme.primary} /> : <Ionicons name={action.icon} size={14} color={action.color} />}</Pressable></SlidingAction>)}
    <Pressable onPress={() => { hapticSelection(); onToggle(); }} hitSlop={10} accessibilityLabel={open ? 'Hide ayah actions' : 'Show ayah actions'} accessibilityState={{ expanded: open }} style={({ pressed }) => [styles.actionButton, styles.trigger, { backgroundColor: open || accented ? theme.backgroundSelected : theme.backgroundElement }, pressed && styles.pressed]}><Ionicons name={open ? 'close' : 'ellipsis-horizontal'} size={16} color={open || accented ? theme.primary : theme.textMuted} /></Pressable>
  </View>;
}

function SlidingAction({ index, progress, open, children }: { index: number; progress: SharedValue<number>; open: boolean; children: ReactNode }) {
  const style = useAnimatedStyle(() => { const start = index * 0.07; const t = interpolate(progress.value, [start, start + 0.55], [0, 1], Extrapolation.CLAMP); return { opacity: t, transform: [{ translateX: (1 - t) * (index + 1) * SLOT }, { scale: 0.45 + 0.55 * t }] }; });
  return <Animated.View pointerEvents={open ? 'auto' : 'none'} style={[styles.slide, { right: BUTTON + GAP + index * SLOT }, style]}>{children}</Animated.View>;
}
const styles = StyleSheet.create({ cluster: { position: 'absolute', top: Spacing.two, right: Spacing.two, width: BUTTON + 4 * SLOT, height: BUTTON, overflow: 'visible', zIndex: 2 }, slide: { position: 'absolute', top: 0 }, trigger: { position: 'absolute', top: 0, right: 0 }, actionButton: { width: BUTTON, height: BUTTON, borderRadius: Radius.pill, alignItems: 'center', justifyContent: 'center' }, pressed: { opacity: 0.7 } });
