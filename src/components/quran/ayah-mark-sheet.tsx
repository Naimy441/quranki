import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  View,
} from 'react-native';

import { ColorSwatches } from '@/components/quran/color-swatches';
import { ThemedText } from '@/components/themed-text';
import { Radius, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticSelection, hapticSuccess } from '@/lib/haptics';
import { DEFAULT_MARK_COLOR, defaultPinName, formatAyahLocation, MARK_NAME_MAX } from '@/lib/quran-marks';
import { useQuranMarksStore } from '@/store/quran-marks-store';

interface AyahMarkSheetProps {
  surah: number;
  ayah: number | null;
  onDismiss: () => void;
}

function confirmMovePin(pinName: string, fromLocation: string, onConfirm: () => void) {
  const title = 'Move pin?';
  const message = `“${pinName}” is already on ${fromLocation}. Move it here?`;
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Move', onPress: onConfirm },
  ]);
}

export function AyahMarkSheet({ surah, ayah, onDismiss }: AyahMarkSheetProps) {
  return (
    <Modal visible={ayah !== null} transparent animationType="fade" onRequestClose={onDismiss}>
      {ayah !== null ? <AyahMarkSheetBody key={`${surah}:${ayah}`} surah={surah} ayah={ayah} onDismiss={onDismiss} /> : null}
    </Modal>
  );
}

function AyahMarkSheetBody({ surah, ayah, onDismiss }: { surah: number; ayah: number; onDismiss: () => void }) {
  const theme = useTheme();
  const [addingPin, setAddingPin] = useState(false);
  const [pinName, setPinName] = useState('');
  const [pinColor, setPinColor] = useState<string>(DEFAULT_MARK_COLOR);
  const [addingCollection, setAddingCollection] = useState(false);
  const [collectionName, setCollectionName] = useState('');
  const [collectionColor, setCollectionColor] = useState<string>(DEFAULT_MARK_COLOR);

  const pins = useQuranMarksStore((s) => s.pins);
  const pinPlacements = useQuranMarksStore((s) => s.pinPlacements);
  const collections = useQuranMarksStore((s) => s.collections);
  const bookmarks = useQuranMarksStore((s) => s.bookmarks);
  const addPin = useQuranMarksStore((s) => s.addPin);
  const applyPin = useQuranMarksStore((s) => s.applyPin);
  const removePinFromAyah = useQuranMarksStore((s) => s.removePinFromAyah);
  const addCollection = useQuranMarksStore((s) => s.addCollection);
  const toggleBookmark = useQuranMarksStore((s) => s.toggleBookmark);

  const selectPin = (pinId: string, name: string) => {
    const onThisAyah = pinPlacements.find(
      (placement) => placement.pinId === pinId && placement.surah === surah && placement.ayah === ayah,
    );
    if (onThisAyah) {
      removePinFromAyah(pinId, surah, ayah);
      hapticSelection();
      return;
    }
    const elsewhere = pinPlacements.find((placement) => placement.pinId === pinId);
    const apply = () => {
      applyPin(pinId, surah, ayah);
      hapticSuccess();
    };
    if (elsewhere) {
      confirmMovePin(name, formatAyahLocation(elsewhere.surah, elsewhere.ayah), apply);
      return;
    }
    apply();
  };

  const handleCreatePin = () => {
    const pin = addPin(pinName.trim() || defaultPinName(), pinColor);
    applyPin(pin.id, surah, ayah);
    hapticSuccess();
    setPinName('');
    setAddingPin(false);
  };

  const handleCreateCollection = () => {
    const collection = addCollection(collectionName || 'Collection', collectionColor);
    toggleBookmark(collection.id, surah, ayah);
    hapticSuccess();
    setCollectionName('');
    setAddingCollection(false);
  };

  return (
    <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <Pressable style={styles.backdrop} onPress={onDismiss}>
        <Pressable style={[styles.sheet, { backgroundColor: theme.card }]} onPress={(e) => e.stopPropagation()}>
          <View style={styles.headerRow}>
            <ThemedText type="smallBold">{formatAyahLocation(surah, ayah)}</ThemedText>
            <Pressable
              onPress={() => {
                hapticSelection();
                onDismiss();
              }}
              hitSlop={10}>
              <Ionicons name="close" size={18} color={theme.textMuted} />
            </Pressable>
          </View>

          <ScrollView bounces={false} keyboardShouldPersistTaps="handled" style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <ThemedText type="smallBold" themeColor="textSecondary" style={styles.sectionLabel}>
              PINS
            </ThemedText>
            {pins.length === 0 && !addingPin ? (
              <ThemedText type="small" themeColor="textMuted">
                Create a pin to mark this ayah.
              </ThemedText>
            ) : (
              pins.map((pin) => {
                const checked = pinPlacements.some(
                  (placement) => placement.pinId === pin.id && placement.surah === surah && placement.ayah === ayah,
                );
                return (
                  <Pressable
                    key={pin.id}
                    onPress={() => selectPin(pin.id, pin.name)}
                    style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
                    <View style={[styles.dot, { backgroundColor: pin.color }]} />
                    <ThemedText type="smallBold" style={styles.itemName} numberOfLines={1}>
                      {pin.name}
                    </ThemedText>
                    <Ionicons
                      name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={checked ? pin.color : theme.textMuted}
                    />
                  </Pressable>
                );
              })
            )}
            {addingPin ? (
              <CompactComposer
                name={pinName}
                color={pinColor}
                placeholder="Pin name"
                onNameChange={setPinName}
                onColorChange={setPinColor}
                actionLabel="Add"
                onAction={handleCreatePin}
              />
            ) : (
              <Pressable
                onPress={() => {
                  hapticSelection();
                  setAddingPin(true);
                }}
                style={styles.addLink}>
                <Ionicons name="add" size={16} color={theme.primary} />
                <ThemedText type="smallBold" themeColor="primary">
                  New pin
                </ThemedText>
              </Pressable>
            )}

            <ThemedText type="smallBold" themeColor="textSecondary" style={[styles.sectionLabel, styles.sectionSpacer]}>
              BOOKMARKS
            </ThemedText>
            {collections.length === 0 && !addingCollection ? (
              <ThemedText type="small" themeColor="textMuted">
                Create a collection to bookmark this ayah.
              </ThemedText>
            ) : (
              collections.map((collection) => {
                const checked = bookmarks.some(
                  (bookmark) =>
                    bookmark.collectionId === collection.id && bookmark.surah === surah && bookmark.ayah === ayah,
                );
                return (
                  <Pressable
                    key={collection.id}
                    onPress={() => {
                      hapticSelection();
                      toggleBookmark(collection.id, surah, ayah);
                    }}
                    style={({ pressed }) => [styles.item, pressed && styles.pressed]}>
                    <View style={[styles.dot, { backgroundColor: collection.color }]} />
                    <ThemedText type="smallBold" style={styles.itemName} numberOfLines={1}>
                      {collection.name}
                    </ThemedText>
                    <Ionicons
                      name={checked ? 'checkmark-circle' : 'ellipse-outline'}
                      size={18}
                      color={checked ? theme.primary : theme.textMuted}
                    />
                  </Pressable>
                );
              })
            )}
            {addingCollection ? (
              <CompactComposer
                name={collectionName}
                color={collectionColor}
                placeholder="Collection name"
                onNameChange={setCollectionName}
                onColorChange={setCollectionColor}
                actionLabel="Add"
                onAction={handleCreateCollection}
              />
            ) : (
              <Pressable
                onPress={() => {
                  hapticSelection();
                  setAddingCollection(true);
                }}
                style={styles.addLink}>
                <Ionicons name="add" size={16} color={theme.primary} />
                <ThemedText type="smallBold" themeColor="primary">
                  New collection
                </ThemedText>
              </Pressable>
            )}
          </ScrollView>
        </Pressable>
      </Pressable>
    </KeyboardAvoidingView>
  );
}

function CompactComposer({
  name,
  color,
  placeholder,
  onNameChange,
  onColorChange,
  actionLabel,
  onAction,
}: {
  name: string;
  color: string;
  placeholder: string;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  actionLabel: string;
  onAction: () => void;
}) {
  const theme = useTheme();
  return (
    <View style={styles.composer}>
      <View style={styles.composerRow}>
        <TextInput
          value={name}
          onChangeText={onNameChange}
          placeholder={placeholder}
          placeholderTextColor={theme.textMuted}
          maxLength={MARK_NAME_MAX}
          autoCorrect={false}
          style={[styles.input, { backgroundColor: theme.backgroundElement, color: theme.text }]}
        />
        <Pressable onPress={onAction} hitSlop={6} style={styles.composerAction}>
          <ThemedText type="smallBold" themeColor="primary">
            {actionLabel}
          </ThemedText>
        </Pressable>
      </View>
      <ColorSwatches value={color} onChange={onColorChange} compact />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: Radius.large,
    borderTopRightRadius: Radius.large,
    paddingHorizontal: Spacing.four,
    paddingTop: Spacing.three,
    paddingBottom: Spacing.five,
    gap: Spacing.two,
    maxHeight: '74%',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingTop: Spacing.one,
    paddingBottom: Spacing.two,
  },
  sectionLabel: {
    letterSpacing: 0.6,
    marginBottom: Spacing.one,
  },
  sectionSpacer: {
    marginTop: Spacing.three,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingVertical: 8,
  },
  itemName: {
    flex: 1,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  composer: {
    gap: Spacing.two,
    paddingTop: Spacing.two,
  },
  composerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
  },
  input: {
    flex: 1,
    borderRadius: Radius.small,
    paddingHorizontal: Spacing.two,
    paddingVertical: 8,
    fontSize: 15,
    fontWeight: '500',
  },
  composerAction: {
    paddingVertical: 8,
    paddingHorizontal: Spacing.one,
  },
  addLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: Spacing.two,
  },
  pressed: {
    opacity: 0.7,
  },
});
