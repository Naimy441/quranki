import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { Stack } from 'expo-router';
import { useMemo, useState, type ReactNode } from 'react';
import { Alert, Platform, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ArabicText } from '@/components/arabic-text';
import { NameColorSheet } from '@/components/quran/name-color-sheet';
import { SlideOutActions } from '@/components/quran/slide-out-actions';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { MaxContentWidth, Spacing } from '@/constants/theme';
import { useTheme } from '@/hooks/use-theme';
import { hapticLight, hapticSelection, hapticSuccess, hapticWarning } from '@/lib/haptics';
import {
    DEFAULT_MARK_COLOR,
    formatAyahLocation,
    getAyahArabicPreview,
    type Bookmark,
    type BookmarkCollection,
    type Pin,
    type PinPlacement,
} from '@/lib/quran-marks';
import { openQuranLocation } from '@/lib/quran-nav';
import { useQuranMarksStore } from '@/store/quran-marks-store';

type Editor =
  | { kind: 'pin'; pin: Pin }
  | { kind: 'new-pin' }
  | { kind: 'collection'; collection: BookmarkCollection }
  | { kind: 'new-collection' }
  | null;

function byLocation<T extends { surah: number; ayah: number }>(a: T, b: T) {
  return a.surah - b.surah || a.ayah - b.ayah;
}

function confirmDelete(title: string, message: string, onConfirm: () => void) {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && window.confirm(`${title}\n${message}`)) onConfirm();
    return;
  }
  Alert.alert(title, message, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Delete', style: 'destructive', onPress: onConfirm },
  ]);
}

function ayahCountLabel(count: number): string {
  if (count === 0) return 'Empty';
  return count === 1 ? '1 ayah' : `${count} ayahs`;
}

export default function SavedScreen() {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuId, setMenuId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(null);

  const toggleMenu = (id: string) => {
    setMenuId((current) => (current === id ? null : id));
  };

  const pins = useQuranMarksStore((s) => s.pins);
  const pinPlacements = useQuranMarksStore((s) => s.pinPlacements);
  const collections = useQuranMarksStore((s) => s.collections);
  const bookmarks = useQuranMarksStore((s) => s.bookmarks);
  const addPin = useQuranMarksStore((s) => s.addPin);
  const updatePin = useQuranMarksStore((s) => s.updatePin);
  const removePin = useQuranMarksStore((s) => s.removePin);
  const addCollection = useQuranMarksStore((s) => s.addCollection);
  const updateCollection = useQuranMarksStore((s) => s.updateCollection);
  const removeCollection = useQuranMarksStore((s) => s.removeCollection);
  const removeBookmark = useQuranMarksStore((s) => s.removeBookmark);

  const placementByPin = useMemo(() => {
    const map = new Map<string, PinPlacement>();
    for (const placement of pinPlacements) {
      if (!map.has(placement.pinId)) map.set(placement.pinId, placement);
    }
    return map;
  }, [pinPlacements]);

  const bookmarksByCollection = useMemo(() => {
    const map = new Map<string, Bookmark[]>();
    for (const bookmark of bookmarks) {
      const list = map.get(bookmark.collectionId) ?? [];
      list.push(bookmark);
      map.set(bookmark.collectionId, list);
    }
    for (const list of map.values()) list.sort(byLocation);
    return map;
  }, [bookmarks]);

  return (
    <ThemedView style={styles.flex}>
      <Stack.Screen options={{ title: 'Saved', headerBackTitle: "Quran", headerRight: () => null }} />
      <SafeAreaView style={styles.flex} edges={['bottom']}>
        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          onScrollBeginDrag={() => setMenuId(null)}>
          <SavedSection title="Pins">
            {pins.length === 0 ? (
              <ThemedText type="small" themeColor="textMuted" style={styles.sectionEmpty}>
                Create a pin, then check it onto an ayah.
              </ThemedText>
            ) : (
              pins.map((pin) => {
                const placement = placementByPin.get(pin.id);
                return (
                  <MarkRow
                    key={pin.id}
                    icon="pin"
                    color={pin.color}
                    title={pin.name}
                    subtitle={
                      placement ? formatAyahLocation(placement.surah, placement.ayah) : 'Empty'
                    }
                    menuOpen={menuId === pin.id}
                    onToggleMenu={() => toggleMenu(pin.id)}
                    onEdit={() => {
                      setMenuId(null);
                      setEditor({ kind: 'pin', pin });
                    }}
                    onDelete={() => {
                      setMenuId(null);
                      confirmDelete('Delete pin?', `Remove “${pin.name}” from every ayah.`, () => {
                        hapticWarning();
                        removePin(pin.id);
                      });
                    }}
                    onPress={() => {
                      if (menuId === pin.id) {
                        setMenuId(null);
                        return;
                      }
                      if (placement) {
                        openQuranLocation(placement.surah, placement.ayah);
                        return;
                      }
                      hapticSelection();
                      setEditor({ kind: 'pin', pin });
                    }}
                  />
                );
              })
            )}
            <AddLink
              label="New pin"
              onPress={() => {
                hapticLight();
                setEditor({ kind: 'new-pin' });
              }}
            />
          </SavedSection>

          <SavedSection title="Bookmarks">
            {collections.length === 0 ? (
              <ThemedText type="small" themeColor="textMuted" style={styles.sectionEmpty}>
                Create a collection, then bookmark ayahs into it.
              </ThemedText>
            ) : (
              collections.map((collection) => {
                const items = bookmarksByCollection.get(collection.id) ?? [];
                const expanded = expandedId === collection.id;
                return (
                  <View key={collection.id}>
                    <MarkRow
                      icon="bookmark"
                      color={collection.color}
                      title={collection.name}
                      subtitle={ayahCountLabel(items.length)}
                      menuOpen={menuId === collection.id}
                      onToggleMenu={() => toggleMenu(collection.id)}
                      onEdit={() => {
                        setMenuId(null);
                        setEditor({ kind: 'collection', collection });
                      }}
                      onDelete={() => {
                        setMenuId(null);
                        confirmDelete(
                          'Delete collection?',
                          `Remove “${collection.name}” and its bookmarks.`,
                          () => {
                            hapticWarning();
                            removeCollection(collection.id);
                            if (expandedId === collection.id) setExpandedId(null);
                          },
                        );
                      }}
                      onPress={() => {
                        hapticSelection();
                        if (menuId === collection.id) {
                          setMenuId(null);
                          return;
                        }
                        setExpandedId(expanded ? null : collection.id);
                      }}
                    />
                    {expanded ? (
                      items.length === 0 ? (
                        <ThemedText type="small" themeColor="textMuted" style={styles.emptyCollection}>
                          Bookmark an ayah while reading to add it here.
                        </ThemedText>
                      ) : (
                        items.map((bookmark) => (
                          <AyahRow
                            key={bookmark.id}
                            surah={bookmark.surah}
                            ayah={bookmark.ayah}
                            onRemove={() => {
                              hapticWarning();
                              removeBookmark(bookmark.id);
                            }}
                          />
                        ))
                      )
                    ) : null}
                  </View>
                );
              })
            )}
            <AddLink
              label="New collection"
              onPress={() => {
                hapticLight();
                setEditor({ kind: 'new-collection' });
              }}
            />
          </SavedSection>
        </ScrollView>
      </SafeAreaView>

      <NameColorSheet
        visible={editor !== null}
        title={
          editor?.kind === 'pin'
            ? 'Edit pin'
            : editor?.kind === 'new-pin'
              ? 'New pin'
              : editor?.kind === 'collection'
                ? 'Edit collection'
                : 'New collection'
        }
        initialName={editor?.kind === 'pin' ? editor.pin.name : editor?.kind === 'collection' ? editor.collection.name : ''}
        initialColor={
          editor?.kind === 'pin'
            ? editor.pin.color
            : editor?.kind === 'collection'
              ? editor.collection.color
              : DEFAULT_MARK_COLOR
        }
        submitLabel={editor?.kind === 'new-pin' || editor?.kind === 'new-collection' ? 'Create' : 'Save'}
        deleteLabel={editor?.kind === 'pin' ? 'Delete pin' : 'Delete collection'}
        onDismiss={() => setEditor(null)}
        onSubmit={(name, color) => {
          if (editor?.kind === 'pin') updatePin(editor.pin.id, { name, color });
          else if (editor?.kind === 'new-pin') addPin(name || 'Pin', color);
          else if (editor?.kind === 'collection') updateCollection(editor.collection.id, { name, color });
          else addCollection(name || 'Collection', color);
          hapticSuccess();
        }}
        onDelete={
          editor?.kind === 'pin' || editor?.kind === 'collection'
            ? () => {
                const isPin = editor.kind === 'pin';
                const id = isPin ? editor.pin.id : editor.collection.id;
                const name = isPin ? editor.pin.name : editor.collection.name;
                confirmDelete(
                  isPin ? 'Delete pin?' : 'Delete collection?',
                  isPin ? `Remove “${name}” from every ayah.` : `Remove “${name}” and its bookmarks.`,
                  () => {
                    hapticWarning();
                    if (isPin) removePin(id);
                    else {
                      removeCollection(id);
                      if (expandedId === id) setExpandedId(null);
                    }
                    setEditor(null);
                  },
                );
              }
            : undefined
        }
      />
    </ThemedView>
  );
}

function SavedSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.section}>
      <ThemedText type="smallBold" themeColor="textMuted" style={styles.sectionTitle}>
        {title.toUpperCase()}
      </ThemedText>
      {children}
    </View>
  );
}

function AddLink({ label, onPress }: { label: string; onPress: () => void }) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityLabel={label}
      style={({ pressed }) => [styles.addLink, pressed && styles.pressed]}>
      <Ionicons name="add" size={22} color={theme.primary} />
      <ThemedText type="smallBold" themeColor="primary">
        {label}
      </ThemedText>
    </Pressable>
  );
}

function MarkRow({
  icon,
  color,
  title,
  subtitle,
  menuOpen,
  onToggleMenu,
  onEdit,
  onDelete,
  onPress,
}: {
  icon: 'pin' | 'bookmark';
  color: string;
  title: string;
  subtitle: string;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onPress: () => void;
}) {
  const theme = useTheme();
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${title}, ${subtitle}`}
      style={({ pressed }) => [styles.row, menuOpen && styles.rowOpen, pressed && styles.pressed]}>
      <View style={styles.icon}>
        {icon === 'pin' ? (
          <MaterialCommunityIcons name="pin" size={26} color={color} />
        ) : (
          <Ionicons name="bookmark" size={26} color={color} />
        )}
      </View>
      <View style={styles.rowBody}>
        <ThemedText numberOfLines={1} style={styles.rowTitle}>
          {title}
        </ThemedText>
        <ThemedText type="small" themeColor="textMuted" numberOfLines={1}>
          {subtitle}
        </ThemedText>
      </View>
      <SlideOutActions
        open={menuOpen}
        onToggle={onToggleMenu}
        triggerLabel={`More actions for ${title}`}
        actions={[
          {
            key: 'delete',
            label: `Delete ${title}`,
            icon: 'trash-outline',
            color: theme.danger,
            onPress: onDelete,
          },
          {
            key: 'edit',
            label: `Edit ${title}`,
            icon: 'pencil-outline',
            color: theme.textMuted,
            onPress: onEdit,
          },
        ]}
      />
    </Pressable>
  );
}

function AyahRow({ surah, ayah, onRemove }: { surah: number; ayah: number; onRemove: () => void }) {
  const theme = useTheme();
  const preview = getAyahArabicPreview(surah, ayah);
  return (
    <Pressable
      onPress={() => openQuranLocation(surah, ayah)}
      accessibilityRole="button"
      accessibilityLabel={formatAyahLocation(surah, ayah)}
      style={({ pressed }) => [styles.ayahRow, pressed && styles.pressed]}>
      <View style={styles.rowBody}>
        <ThemedText type="smallBold">{formatAyahLocation(surah, ayah)}</ThemedText>
        {preview ? (
          <ArabicText numberOfLines={1} style={styles.preview}>
            {preview}
          </ArabicText>
        ) : null}
      </View>
      <Pressable onPress={onRemove} hitSlop={8} accessibilityLabel="Remove bookmark">
        <Ionicons name="close" size={18} color={theme.textMuted} />
      </Pressable>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flex: 1,
    alignSelf: 'center',
    width: '100%',
    maxWidth: MaxContentWidth,
  },
  content: {
    paddingTop: Spacing.two,
    paddingBottom: Spacing.six,
  },
  section: {
    paddingTop: Spacing.three,
  },
  sectionTitle: {
    letterSpacing: 0.8,
    paddingHorizontal: Spacing.four,
    paddingBottom: Spacing.one,
  },
  sectionEmpty: {
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.two,
  },
  addLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingHorizontal: Spacing.four,
    paddingVertical: Spacing.three,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.three,
    paddingHorizontal: Spacing.four,
    paddingVertical: 14,
    overflow: 'visible',
  },
  rowOpen: {
    zIndex: 2,
  },
  icon: {
    width: 28,
    alignItems: 'center',
  },
  rowBody: {
    flex: 1,
    gap: 2,
  },
  rowTitle: {
    fontSize: 17,
    lineHeight: 22,
    fontWeight: '600',
  },
  ayahRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.two,
    paddingLeft: Spacing.four + 28 + Spacing.three,
    paddingRight: Spacing.four,
    paddingVertical: Spacing.two,
  },
  emptyCollection: {
    paddingLeft: Spacing.four + 28 + Spacing.three,
    paddingRight: Spacing.four,
    paddingBottom: Spacing.two,
  },
  preview: {
    fontSize: 16,
    lineHeight: 26,
    textAlign: 'right',
  },
  pressed: {
    opacity: 0.7,
  },
});
