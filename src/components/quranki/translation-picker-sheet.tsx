import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal, BottomSheetScrollView, type BottomSheetMethods } from '@expo/ui/community/bottom-sheet';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection, hapticSuccess, hapticWarning } from '@/lib/haptics';
import { notifyIfOffline, requireOnline } from '@/lib/offline';
import { useProgressStore } from '@/store/progress-store';
import { ensureTranslationDatasetLoaded } from '@/store/translation-store';
import { deleteTranslationDataset, downloadTranslationDataset, isTranslationDatasetDownloaded } from '@/lib/translation-dataset';
import { DEFAULT_TRANSLATION_KEY, TRANSLATION_OPTIONS, translationLabel, type TranslationOption } from '@/lib/translations';

/** Tappable row that navigates to the translation picker screen (`/translation-picker`) - shared
 *  by the main Settings tab and the in-reader settings sheet. Mirrors `ReciterSettingsRow`. */
export function TranslationSettingsRow({ selectedKey, onPress }: { selectedKey: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Translation, currently ${translationLabel(selectedKey)}`}
      accessibilityHint="Choose which English translation the reader shows"
      style={({ pressed }) => [
        styles.settingsRow,
        { backgroundColor: theme.card, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.settingsRowIcon, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="language-outline" size={18} color={theme.text} />
      </View>
      <View style={styles.settingsRowCopy}>
        <ThemedText type="smallBold">Translation</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {translationLabel(selectedKey)}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
    </Pressable>
  );
}

/** Which non-bundled translations already have a dataset on disk, checked once up front. Kept
 *  as an explicit `Set` in state (rather than re-deriving it from a live `isTranslationDatasetDownloaded`
 *  filesystem check on every render, gated by an unrelated "tick" counter just to convince
 *  something to recompute) so a delete or a finished download only ever needs to update this one
 *  piece of state directly - no separate signal that has to be remembered to fire, and no room
 *  for the checkmark/delete button to only catch up once the screen happens to remount. */
function initialDownloadedKeys(): Set<string> {
  const keys = new Set<string>();
  for (const option of TRANSLATION_OPTIONS) {
    if (!option.bundled && isTranslationDatasetDownloaded(option.key)) keys.add(option.key);
  }
  return keys;
}

function useTranslationPicker(selectedKey: string, onSelect: (key: string) => void) {
  const [downloadedKeys, setDownloadedKeys] = useState<Set<string>>(initialDownloadedKeys);
  const [downloadingKeys, setDownloadingKeys] = useState<Set<string>>(new Set());
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const isDownloaded = (option: TranslationOption) => option.bundled || downloadedKeys.has(option.key);

  const handleSelectOption = (option: TranslationOption) => {
    hapticSelection();
    setErrorKey(null);
    if (isDownloaded(option) || downloadingKeys.has(option.key)) {
      onSelect(option.key);
      return;
    }

    void requireOnline().then((online) => {
      if (!online) {
        setErrorKey(option.key);
        return;
      }
      onSelect(option.key);
      setDownloadingKeys((prev) => new Set(prev).add(option.key));
      void downloadTranslationDataset(option.key)
        .then(() => {
          setDownloadedKeys((prev) => new Set(prev).add(option.key));
          hapticSuccess();
        })
        .catch((error) => {
          void notifyIfOffline(error);
          hapticWarning();
          setErrorKey(option.key);
        })
        .finally(() => {
          setDownloadingKeys((prev) => {
            const next = new Set(prev);
            next.delete(option.key);
            return next;
          });
        });
    });
  };

  const deleteDownload = (option: TranslationOption) => {
    // The bundled default (Sahih International) can never be deleted (see `onDelete` below,
    // which never even offers it a delete button) — guarded again here so there's no path, now
    // or added later, that can leave the app without a safe fallback translation.
    if (option.bundled) return;
    deleteTranslationDataset(option.key);
    setDownloadedKeys((prev) => {
      const next = new Set(prev);
      next.delete(option.key);
      return next;
    });
    // Deleting the currently-selected translation would otherwise leave the reader pointed at
    // one with nothing on disk — fall back to the bundled default instead of leaving that dangling.
    if (option.key === selectedKey) onSelect(DEFAULT_TRANSLATION_KEY);
  };

  return { isDownloaded, downloadingKeys, errorKey, handleSelectOption, deleteDownload };
}

function deleteMessage(option: TranslationOption): string {
  return `This removes ${option.name} from this device. You can download it again anytime.`;
}

type OptionState = 'error' | 'downloading' | 'selected' | 'downloaded' | 'idle';

/** Fades and scales its child in on mount - used for the delete button below, which otherwise
 *  pops into existence the instant a download finishes with no visual transition at all. */
function AppearIn({ children }: { children: ReactNode }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withTiming(1, { duration: 180 });
  }, [progress]);
  const style = useAnimatedStyle(() => ({
    opacity: progress.value,
    transform: [{ scale: 0.5 + progress.value * 0.5 }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function captionFor(state: OptionState, hasFootnotes: boolean): string {
  switch (state) {
    case 'error':
      return 'Couldn’t download. Try again';
    case 'selected':
      return hasFootnotes ? 'Selected - Has footnotes' : 'Selected';
    case 'downloading':
      return 'Downloading…';
    case 'downloaded':
      return hasFootnotes ? 'Downloaded - Has footnotes' : 'Downloaded';
    case 'idle':
      return hasFootnotes ? 'Not downloaded - Has footnotes' : 'Not downloaded';
  }
}

/** One translation option. Mirrors `ReciterOptionRow` - same state-driven background/border/badge
 *  so which translations are already on-device and which will download on tap reads at a glance,
 *  and holds up in dark mode. The bundled default never shows a delete button since it has
 *  nothing on disk to remove. */
function TranslationOptionRow({
  title,
  state,
  hasFootnotes,
  onPress,
  onDelete,
}: {
  title: string;
  state: OptionState;
  hasFootnotes: boolean;
  onPress: () => void;
  onDelete?: () => void;
}) {
  const theme = useTheme();
  const selected = state === 'selected';
  const error = state === 'error';

  const rowBackground = selected ? theme.backgroundSelected : state === 'downloaded' ? theme.backgroundElement : theme.card;
  const rowBorder = selected ? theme.primary : error ? theme.danger : theme.border;
  const badgeBackground = selected ? theme.primary : state === 'downloaded' ? theme.backgroundElement : 'transparent';
  const badgeBorder = selected ? theme.primary : error ? theme.danger : theme.border;
  const badgeIconColor = selected ? theme.onPrimary : error ? theme.danger : state === 'downloaded' ? theme.text : theme.textMuted;
  const badgeIcon = error ? 'alert-circle-outline' : selected || state === 'downloaded' ? 'checkmark' : 'cloud-download-outline';
  const captionColor = error ? 'danger' : selected ? 'primary' : state === 'downloading' ? 'textSecondary' : 'textMuted';

  return (
    <View
      style={[
        styles.optionRow,
        { backgroundColor: rowBackground, borderColor: rowBorder, borderWidth: selected ? 1.5 : 1 },
      ]}>
      <Pressable
        onPress={onPress}
        accessibilityRole="button"
        accessibilityState={{ selected }}
        accessibilityLabel={`${title}, ${captionFor(state, hasFootnotes)}`}
        style={({ pressed }) => [styles.optionMain, pressed && styles.pressed]}>
        <View style={[styles.badge, { backgroundColor: badgeBackground, borderColor: badgeBorder }]}>
          {state === 'downloading' ? (
            <ActivityIndicator size="small" color={theme.primary} />
          ) : (
            <Ionicons name={badgeIcon} size={16} color={badgeIconColor} />
          )}
        </View>
        <View style={styles.optionCopy}>
          <ThemedText type="smallBold" themeColor={selected ? 'primary' : 'text'}>
            {title}
          </ThemedText>
          <ThemedText type="small" themeColor={captionColor}>
            {captionFor(state, hasFootnotes)}
          </ThemedText>
        </View>
      </Pressable>
      {onDelete ? (
        <AppearIn>
          <Pressable
            onPress={onDelete}
            hitSlop={10}
            accessibilityRole="button"
            accessibilityLabel={`Delete downloaded ${title}`}
            style={({ pressed }) => [
              styles.deleteButton,
              { backgroundColor: theme.card, borderColor: theme.border },
              pressed && styles.pressed,
            ]}>
            <Ionicons name="trash-outline" size={16} color={theme.danger} />
          </Pressable>
        </AppearIn>
      ) : null}
    </View>
  );
}

/** The translation list itself - one row per available translation, downloading its dataset on
 *  first pick. Used on the `/translation-picker` screen; deletion confirms via the native `Alert`
 *  so this also works safely when that screen is reached from inside another sheet. Mirrors
 *  `ReciterPickerInline`. */
export function TranslationPickerInline({ selectedKey, onSelect }: { selectedKey: string; onSelect: (key: string) => void }) {
  const { isDownloaded, downloadingKeys, errorKey, handleSelectOption, deleteDownload } = useTranslationPicker(
    selectedKey,
    onSelect,
  );

  const requestDelete = (option: TranslationOption) => {
    hapticSelection();
    Alert.alert('Delete downloaded translation?', deleteMessage(option), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDownload(option) },
    ]);
  };

  return (
    <View style={styles.optionsList}>
      {TRANSLATION_OPTIONS.map((option) => {
        const selected = option.key === selectedKey;
        const downloading = downloadingKeys.has(option.key);
        const downloaded = isDownloaded(option);
        const errored = errorKey === option.key;
        // `downloading` must outrank `selected` - tapping an undownloaded option selects it
        // immediately (see `handleSelectOption`) so its dataset can start fetching in the
        // background, but the row still needs to show the in-flight spinner for that whole
        // stretch instead of jumping straight to a "done" checkmark with nothing to show for it.
        const state: OptionState = errored
          ? 'error'
          : downloading
            ? 'downloading'
            : selected
              ? 'selected'
              : downloaded
                ? 'downloaded'
                : 'idle';
        return (
          <TranslationOptionRow
            key={option.key}
            title={option.name}
            state={state}
            hasFootnotes={option.hasFootnotes}
            onPress={() => handleSelectOption(option)}
            onDelete={!option.bundled && downloaded && !downloading ? () => requestDelete(option) : undefined}
          />
        );
      })}
    </View>
  );
}

/** Native sheet over reader Settings so Translation can expand to full screen the same way Reciter does. */
export function TranslationPickerSheet({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const theme = useTheme();
  const sheetRef = useRef<BottomSheetMethods>(null);
  const opened = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const selectedTranslationKey = useProgressStore((state) => state.settings.selectedTranslationKey);
  const updateSettings = useProgressStore((state) => state.updateSettings);

  useEffect(() => {
    if (visible) {
      opened.current = true;
      setExpanded(false);
      sheetRef.current?.present();
      return;
    }
    if (opened.current) sheetRef.current?.dismiss();
  }, [visible]);

  const finishClose = () => {
    if (!opened.current) return;
    opened.current = false;
    setExpanded(false);
    onDismiss();
  };

  return (
    <BottomSheetModal
      ref={sheetRef}
      enablePanDownToClose
      enableDynamicSizing={false}
      snapPoints={['65%', '100%']}
      backgroundStyle={{ backgroundColor: theme.card }}
      onChange={(index) => {
        if (index >= 0) setExpanded(index > 0);
      }}
      onClose={finishClose}>
      <BottomSheetScrollView
        style={styles.sheetScroll}
        scrollEnabled={expanded}
        bounces={false}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.sheet}>
        <ThemedText type="smallBold" style={styles.sheetTitle}>Translation</ThemedText>
        <TranslationPickerInline
          selectedKey={selectedTranslationKey}
          onSelect={(key) => {
            updateSettings({ selectedTranslationKey: key });
            ensureTranslationDatasetLoaded(key);
          }}
        />
      </BottomSheetScrollView>
    </BottomSheetModal>
  );
}

const styles = StyleSheet.create({
  sheet: {
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.four,
    paddingBottom: Spacing.six,
    gap: Spacing.three,
  },
  sheetTitle: {
    textAlign: 'center',
  },
  sheetScroll: {
    flex: 1,
  },
  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    padding: Spacing.three,
    borderRadius: Radius.medium,
    borderWidth: 1,
  },
  settingsRowIcon: {
    width: 36,
    height: 36,
    borderRadius: Radius.pill,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsRowCopy: {
    flex: 1,
    gap: 1,
  },
  optionsList: {
    gap: Spacing.two,
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: Radius.medium,
    paddingVertical: Spacing.two,
    paddingHorizontal: Spacing.two,
    gap: Spacing.two,
  },
  optionMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  badge: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionCopy: {
    flex: 1,
    gap: 1,
  },
  deleteButton: {
    width: 32,
    height: 32,
    borderRadius: Radius.pill,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pressed: {
    opacity: 0.7,
  },
});
