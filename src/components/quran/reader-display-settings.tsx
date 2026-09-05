import SliderControl from '@expo/ui/community/slider';
import { StyleSheet, View } from 'react-native';
import { Switch } from 'react-native-paper';

import { ThemedText } from '@/components/themed-text';
import { Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection, hapticToggle } from '@/lib/haptics';

export const ARABIC_SIZE_RANGE = { min: 18, max: 38, step: 4 };
export const GLOSS_SIZE_RANGE = { min: 11, max: 19, step: 2 };
export const TRANSLITERATION_SIZE_RANGE = { min: 10, max: 18, step: 2 };

export interface ReaderDisplaySettingsProps {
  arabicSize: number;
  onArabicSizeChange: (size: number) => void;
  glossSize: number;
  onGlossSizeChange: (size: number) => void;
  showTranslation: boolean;
  onShowTranslationChange: (value: boolean) => void;
  showAyahCoverage: boolean;
  onShowAyahCoverageChange: (value: boolean) => void;
  showTransliteration: boolean;
  onShowTransliterationChange: (value: boolean) => void;
  transliterationSize: number;
  onTransliterationSizeChange: (size: number) => void;
}

export function ReaderDisplaySettings({ arabicSize, onArabicSizeChange, glossSize, onGlossSizeChange, showTranslation, onShowTranslationChange, showAyahCoverage, onShowAyahCoverageChange, showTransliteration, onShowTransliterationChange, transliterationSize, onTransliterationSizeChange }: ReaderDisplaySettingsProps) {
  const theme = useTheme();
  return <View style={styles.content}>
    <FontSizeSlider label="Arabic text" value={arabicSize} range={ARABIC_SIZE_RANGE} onChange={onArabicSizeChange} />
    <FontSizeSlider label="Word-by-word translation" value={glossSize} range={GLOSS_SIZE_RANGE} onChange={onGlossSizeChange} />
    {showTransliteration ? <FontSizeSlider label="Transliteration" value={transliterationSize} range={TRANSLITERATION_SIZE_RANGE} onChange={onTransliterationSizeChange} /> : null}
    <View style={styles.toggleRow}>
      <ThemedText type="small">Show word-by-word translation</ThemedText>
      <Switch value={showTranslation} onValueChange={(value) => { const next = value === true; hapticToggle(next); onShowTranslationChange(next); }} color={theme.primary} />
    </View>
    <View style={styles.toggleRow}>
      <ThemedText type="small">Show transliteration</ThemedText>
      <Switch value={showTransliteration} onValueChange={(value) => { const next = value === true; hapticToggle(next); onShowTransliterationChange(next); }} color={theme.primary} />
    </View>
    <View style={styles.toggleRow}>
      <ThemedText type="small">Show ayah coverage %</ThemedText>
      <Switch value={showAyahCoverage} onValueChange={(value) => { const next = value === true; hapticToggle(next); onShowAyahCoverageChange(next); }} color={theme.primary} />
    </View>
  </View>;
}

function FontSizeSlider({ label, value, range, onChange }: { label: string; value: number; range: { min: number; max: number; step: number }; onChange: (size: number) => void }) {
  const theme = useTheme();
  return <View style={styles.sliderSection}>
    <View style={styles.sliderValueBlock}>
      <ThemedText type="title" style={styles.sliderValue}>{value}</ThemedText>
      <ThemedText type="smallBold" themeColor="primary">{label}</ThemedText>
    </View>
    <SliderControl minimumValue={range.min} maximumValue={range.max} step={range.step} value={value} minimumTrackTintColor={theme.primary} maximumTrackTintColor={theme.border} thumbTintColor={theme.primary} onValueChange={(next) => { if (next === value) return; hapticSelection(); onChange(next); }} style={styles.slider} />
    <View style={styles.sliderEnds}>
      <ThemedText type="small" themeColor="textMuted">{range.min}</ThemedText>
      <ThemedText type="small" themeColor="textMuted">{range.max}</ThemedText>
    </View>
  </View>;
}

const styles = StyleSheet.create({
  content: { gap: Spacing.three },
  sliderSection: { gap: Spacing.three },
  sliderValueBlock: { alignItems: 'center', gap: 2 },
  sliderValue: { fontSize: 40, lineHeight: 44 },
  slider: { width: '100%', height: 40 },
  sliderEnds: { flexDirection: 'row', justifyContent: 'space-between', marginTop: -Spacing.two },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
});
