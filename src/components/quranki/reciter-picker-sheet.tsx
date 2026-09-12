import { Ionicons } from '@expo/vector-icons';
import { BottomSheetModal, BottomSheetScrollView, type BottomSheetMethods } from '@expo/ui/community/bottom-sheet';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import { ActivityIndicator, Alert, Pressable, StyleSheet, View } from 'react-native';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { useProgressStore } from '@/store/progress-store';
import { hapticSelection, hapticSuccess, hapticWarning } from '@/lib/haptics';
import { notifyIfOffline, requireOnline } from '@/lib/offline';
import { clearReciterAyahCache } from '@/lib/recitation-cache';
import { deleteReciterDataset, downloadReciterDataset, isReciterDatasetDownloaded } from '@/lib/reciter-dataset';
import { DEFAULT_RECITER_KEY, RECITER_GROUPS, reciterLabel, styleLabel, type ReciterOption } from '@/lib/reciters';

/** Tappable row that navigates to the reciter picker screen (`/reciter-picker`) - shared by the
 *  main Settings tab and the in-reader settings sheet. Shows the reciter's full name and style on
 *  their own line (instead of squeezing it into a single truncated trailing value) so it's never
 *  cut off, and uses a "person" glyph rather than a microphone - this picks whose *voice* plays,
 *  it doesn't record. */
export function ReciterSettingsRow({ selectedKey, onPress }: { selectedKey: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={() => {
        hapticSelection();
        onPress();
      }}
      accessibilityRole="button"
      accessibilityLabel={`Reciter, currently ${reciterLabel(selectedKey)}`}
      accessibilityHint="Choose which reciter's voice plays Quran audio"
      style={({ pressed }) => [
        styles.settingsRow,
        { backgroundColor: theme.card, borderColor: theme.border },
        pressed && styles.pressed,
      ]}>
      <View style={[styles.settingsRowIcon, { backgroundColor: theme.backgroundElement }]}>
        <Ionicons name="person-outline" size={18} color={theme.text} />
      </View>
      <View style={styles.settingsRowCopy}>
        <ThemedText type="smallBold">Reciter</ThemedText>
        <ThemedText type="small" themeColor="textSecondary" numberOfLines={2}>
          {reciterLabel(selectedKey)}
        </ThemedText>
      </View>
      <Ionicons name="chevron-forward" size={16} color={theme.textMuted} />
    </Pressable>
  );
}

/** Which reciter+style combinations already have a dataset on disk, checked once up front. Kept
 *  as an explicit `Set` in state (rather than re-deriving it from a live `isReciterDatasetDownloaded`
 *  filesystem check on every render, gated by an unrelated "tick" counter just to convince
 *  something to recompute) so a delete or a finished download only ever needs to update this one
 *  piece of state directly - no separate signal that has to be remembered to fire, and no room
 *  for the checkmark/delete button to only catch up once the screen happens to remount. */
function initialDownloadedKeys(): Set<string> {
  const keys = new Set<string>();
  for (const option of RECITER_GROUPS.flatMap((group) => group.options)) {
    if (isReciterDatasetDownloaded(option.key)) keys.add(option.key);
  }
  return keys;
}

function useReciterPicker(selectedKey: string, onSelect: (key: string) => void) {
  const [downloadedKeys, setDownloadedKeys] = useState<Set<string>>(initialDownloadedKeys);
  const [downloadingKeys, setDownloadingKeys] = useState<Set<string>>(new Set());
  const [errorKey, setErrorKey] = useState<string | null>(null);

  const isDownloaded = (option: ReciterOption) => downloadedKeys.has(option.key);

  const handleSelectTag = (option: ReciterOption) => {
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
      void downloadReciterDataset(option.key)
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

  const deleteDownload = (option: ReciterOption) => {
    // Yasser Al-Dosari is the app's default reciter and can never be deleted (see `onDelete`
    // below, which never even offers this option a delete button) — guarded again here so
    // there's no path, now or added later, that can leave the app without a safe fallback.
    if (option.key === DEFAULT_RECITER_KEY) return;
    deleteReciterDataset(option.key);
    clearReciterAyahCache(option.key);
    setDownloadedKeys((prev) => {
      const next = new Set(prev);
      next.delete(option.key);
      return next;
    });
    // Deleting the currently-selected reciter would otherwise leave the reader pointed at a
    // reciter with nothing on disk — fall back to the default instead of leaving that dangling.
    if (option.key === selectedKey) onSelect(DEFAULT_RECITER_KEY);
  };

  return { isDownloaded, downloadingKeys, errorKey, handleSelectTag, deleteDownload };
}

function deleteMessage(option: ReciterOption): string {
  return `This removes ${option.reciterName} (${styleLabel(option.style)}) from this device. You can download it again anytime.`;
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

function captionFor(state: OptionState): string {
  switch (state) {
    case 'error':
      return 'Couldn’t download. Try again';
    case 'selected':
      return 'Selected';
    case 'downloading':
      return 'Downloading…';
    case 'downloaded':
      return 'Downloaded';
    case 'idle':
      return 'Not downloaded';
  }
}

/** One reciter+style combination. The row's background/border and its leading status badge are
 *  both driven by the same `state`, so which reciters are already on-device and which will
 *  download on tap reads at a glance from color+shape alone - not just a small icon - and holds
 *  up in dark mode where subtle border-color differences alone are hard to see. Deleting is a
 *  clearly separate, consistently-placed trailing button rather than a floating icon, and only
 *  ever appears for rows that already have something on disk to remove. */
function ReciterOptionRow({
  title,
  state,
  onPress,
  onDelete,
}: {
  title: string;
  state: OptionState;
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
        accessibilityLabel={`${title}, ${captionFor(state)}`}
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
            {captionFor(state)}
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

/** The reciter list itself - one section per reciter, with a row per available style (Murattal/
 *  Mujawwad) the user taps to select, downloading that reciter's dataset on first pick. Used on
 *  the `/reciter-picker` screen; deletion confirms via the native `Alert` so this also works
 *  safely when that screen is reached from inside another sheet. */
export function ReciterPickerInline({ selectedKey, onSelect }: { selectedKey: string; onSelect: (key: string) => void }) {
  const theme = useTheme();
  const { isDownloaded, downloadingKeys, errorKey, handleSelectTag, deleteDownload } = useReciterPicker(
    selectedKey,
    onSelect,
  );

  const requestDelete = (option: ReciterOption) => {
    hapticSelection();
    Alert.alert('Delete downloaded recitation?', deleteMessage(option), [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => deleteDownload(option) },
    ]);
  };

  return (
    <View style={styles.list}>
      {RECITER_GROUPS.map((group) => {
        // Most reciters only have one style on file - title the row with their name directly
        // instead of a redundant group header sitting above a single, oddly-generic-looking row.
        const singleStyle = group.options.length === 1;
        const rows = group.options.map((option) => {
          const selected = option.key === selectedKey;
          const downloading = downloadingKeys.has(option.key);
          const downloaded = isDownloaded(option);
          const errored = errorKey === option.key;
          // `downloading` must outrank `selected` - tapping an undownloaded option selects it
          // immediately (see `handleSelectTag`) so its dataset can start fetching in the
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
            <ReciterOptionRow
              key={option.key}
              title={singleStyle ? group.name : styleLabel(option.style)}
              state={state}
              onPress={() => handleSelectTag(option)}
              onDelete={
                option.key !== DEFAULT_RECITER_KEY && downloaded && !downloading
                  ? () => requestDelete(option)
                  : undefined
              }
            />
          );
        });

        if (singleStyle) {
          return (
            <View key={group.id} style={styles.group}>
              {rows}
            </View>
          );
        }

        // A plain header above the rows reads ambiguously once it's sitting in a flat list next
        // to single-style reciters that have no header at all - nothing marks where "this
        // reciter's styles" ends and the next reciter begins. A bordered card with a divider
        // under the title makes that boundary explicit instead of implied by spacing alone.
        return (
          <View key={group.id} style={[styles.multiStyleGroup, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <ThemedText type="smallBold" style={styles.multiStyleGroupTitle}>
              {group.name}
            </ThemedText>
            <View style={[styles.multiStyleDivider, { backgroundColor: theme.border }]} />
            <View style={styles.optionsList}>{rows}</View>
          </View>
        );
      })}
    </View>
  );
}

/** Native sheet over the reader so Play audio can switch reciter without a stack push. */
export function ReciterPickerSheet({ visible, onDismiss }: { visible: boolean; onDismiss: () => void }) {
  const theme = useTheme();
  const sheetRef = useRef<BottomSheetMethods>(null);
  const opened = useRef(false);
  const [expanded, setExpanded] = useState(false);
  const selectedReciterKey = useProgressStore((state) => state.settings.selectedReciterKey);
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
        <ThemedText type="smallBold" style={styles.sheetTitle}>Reciter</ThemedText>
        <ReciterPickerInline
          selectedKey={selectedReciterKey}
          onSelect={(key) => updateSettings({ selectedReciterKey: key })}
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
  // Same gap as `TranslationPickerInline`'s `optionsList` below — every top-level selectable
  // block (a single-style reciter's row, or a whole multi-style reciter's card) uses this one
  // spacing, so the two pickers read as the same list rhythm instead of the reciter list (which
  // used to fall back on the hosting screen's much larger section-to-section gap) looking sparser.
  list: {
    gap: Spacing.two,
  },
  group: {
    gap: Spacing.two,
  },
  multiStyleGroup: {
    gap: Spacing.two,
    borderWidth: 1,
    borderRadius: Radius.medium,
    padding: Spacing.two,
  },
  multiStyleGroupTitle: {
    paddingHorizontal: Spacing.one,
  },
  multiStyleDivider: {
    height: StyleSheet.hairlineWidth,
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
