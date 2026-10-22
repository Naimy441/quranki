'use client';

import React, { useState } from 'react';
import { Bookmark, CheckCircle2, Circle, MapPin, Plus } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { NameColorComposer } from '@/components/quran/color-swatches';
import { DEFAULT_MARK_COLOR, defaultPinName, formatAyahLocation } from '@/lib/quran-marks';
import { hapticSelection, hapticSuccess } from '@/lib/haptics';
import { useQuranMarksStore } from '@/store/quran-marks-store';

/** Pins and bookmark collections for one ayah, as in the mobile mark sheet. */
export function AyahMarkDialog({ surah, ayah, onDismiss }: { surah: number; ayah: number | null; onDismiss: () => void }) {
  return (
    <Modal open={ayah !== null} onClose={onDismiss} title={ayah !== null ? formatAyahLocation(surah, ayah) : ''}>
      {ayah !== null && <Body key={`${surah}:${ayah}`} surah={surah} ayah={ayah} />}
    </Modal>
  );
}

function Body({ surah, ayah }: { surah: number; ayah: number }) {
  const pins = useQuranMarksStore((s) => s.pins);
  const pinPlacements = useQuranMarksStore((s) => s.pinPlacements);
  const collections = useQuranMarksStore((s) => s.collections);
  const bookmarks = useQuranMarksStore((s) => s.bookmarks);
  const addPin = useQuranMarksStore((s) => s.addPin);
  const applyPin = useQuranMarksStore((s) => s.applyPin);
  const removePinFromAyah = useQuranMarksStore((s) => s.removePinFromAyah);
  const addCollection = useQuranMarksStore((s) => s.addCollection);
  const toggleBookmark = useQuranMarksStore((s) => s.toggleBookmark);
  const [addingPin, setAddingPin] = useState(false);
  const [pinName, setPinName] = useState('');
  const [pinColor, setPinColor] = useState<string>(DEFAULT_MARK_COLOR);
  const [addingCollection, setAddingCollection] = useState(false);
  const [collectionName, setCollectionName] = useState('');
  const [collectionColor, setCollectionColor] = useState<string>(DEFAULT_MARK_COLOR);

  const selectPin = (pinId: string, name: string) => {
    const here = pinPlacements.find((p) => p.pinId === pinId && p.surah === surah && p.ayah === ayah);
    if (here) {
      removePinFromAyah(pinId, surah, ayah);
      hapticSelection();
      return;
    }
    const elsewhere = pinPlacements.find((p) => p.pinId === pinId);
    if (elsewhere && !window.confirm(`Move pin?\n"${name}" is already on ${formatAyahLocation(elsewhere.surah, elsewhere.ayah)}. Move it here?`)) {
      return;
    }
    applyPin(pinId, surah, ayah);
    hapticSuccess();
  };

  return (
    <div className="space-y-6">
      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-textMuted">Pins</h3>
        {pins.length === 0 && !addingPin ? (
          <p className="text-sm text-textMuted">Create a pin to mark this ayah.</p>
        ) : (
          <div className="space-y-1">
            {pins.map((pin) => {
              const checked = pinPlacements.some((p) => p.pinId === pin.id && p.surah === surah && p.ayah === ayah);
              const elsewhere = pinPlacements.find((p) => p.pinId === pin.id && !(p.surah === surah && p.ayah === ayah));
              return (
                <button
                  key={pin.id}
                  onClick={() => selectPin(pin.id, pin.name)}
                  className="flex w-full items-center gap-3 rounded-medium px-3 py-2.5 hover:bg-backgroundElement transition-colors"
                >
                  <MapPin className="w-4 h-4" style={{ color: pin.color }} />
                  <span className="flex-1 min-w-0 text-left">
                    <span className="block truncate text-sm font-semibold">{pin.name}</span>
                    {elsewhere && (
                      <span className="block text-xs text-textMuted">On {formatAyahLocation(elsewhere.surah, elsewhere.ayah)}</span>
                    )}
                  </span>
                  {checked ? <CheckCircle2 className="w-5 h-5" style={{ color: pin.color }} /> : <Circle className="w-5 h-5 text-textMuted" />}
                </button>
              );
            })}
          </div>
        )}
        {addingPin ? (
          <NameColorComposer
            name={pinName}
            color={pinColor}
            placeholder="Pin name"
            actionLabel="Add"
            onNameChange={setPinName}
            onColorChange={setPinColor}
            onCancel={() => setAddingPin(false)}
            onAction={() => {
              const pin = addPin(pinName.trim() || defaultPinName(), pinColor);
              applyPin(pin.id, surah, ayah);
              hapticSuccess();
              setPinName('');
              setAddingPin(false);
            }}
          />
        ) : (
          <button onClick={() => setAddingPin(true)} className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-primary">
            <Plus className="w-4 h-4" /> New pin
          </button>
        )}
      </section>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-textMuted">Bookmarks</h3>
        {collections.length === 0 && !addingCollection ? (
          <p className="text-sm text-textMuted">Create a collection to bookmark this ayah.</p>
        ) : (
          <div className="space-y-1">
            {collections.map((c) => {
              const checked = bookmarks.some((b) => b.collectionId === c.id && b.surah === surah && b.ayah === ayah);
              return (
                <button
                  key={c.id}
                  onClick={() => {
                    hapticSelection();
                    toggleBookmark(c.id, surah, ayah);
                  }}
                  className="flex w-full items-center gap-3 rounded-medium px-3 py-2.5 hover:bg-backgroundElement transition-colors"
                >
                  <Bookmark className="w-4 h-4" style={{ color: c.color, fill: c.color }} />
                  <span className="flex-1 truncate text-left text-sm font-semibold">{c.name}</span>
                  {checked ? <CheckCircle2 className="w-5 h-5 text-primary" /> : <Circle className="w-5 h-5 text-textMuted" />}
                </button>
              );
            })}
          </div>
        )}
        {addingCollection ? (
          <NameColorComposer
            name={collectionName}
            color={collectionColor}
            placeholder="Collection name"
            actionLabel="Add"
            onNameChange={setCollectionName}
            onColorChange={setCollectionColor}
            onCancel={() => setAddingCollection(false)}
            onAction={() => {
              const c = addCollection(collectionName || 'Collection', collectionColor);
              toggleBookmark(c.id, surah, ayah);
              hapticSuccess();
              setCollectionName('');
              setAddingCollection(false);
            }}
          />
        ) : (
          <button
            onClick={() => setAddingCollection(true)}
            className="mt-1 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-primary"
          >
            <Plus className="w-4 h-4" /> New collection
          </button>
        )}
      </section>
    </div>
  );
}
