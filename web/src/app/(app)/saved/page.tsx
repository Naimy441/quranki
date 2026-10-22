'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Bookmark, ChevronDown, MapPin, MoreHorizontal, Pencil, Play, Plus, Trash2, X } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { MenuItem, Popover } from '@/components/ui/popover';
import { ColorSwatches } from '@/components/quran/color-swatches';
import { useStoresHydrated } from '@/components/providers/app-state';
import { DEFAULT_MARK_COLOR, formatAyahLocation, getAyahArabicPreview, type Bookmark as BookmarkMark, type BookmarkCollection, type Pin, type PinPlacement } from '@/lib/quran-marks';
import { getSurahAyahs, loadSurahAyahs, useQuranDataVersion } from '@/lib/quran-reader';
import { hapticSuccess, hapticWarning } from '@/lib/haptics';
import { useQuranMarksStore } from '@/store/quran-marks-store';
import { cn } from '@/lib/cn';

type Editor = { kind: 'pin'; pin: Pin } | { kind: 'new-pin' } | { kind: 'collection'; collection: BookmarkCollection } | { kind: 'new-collection' } | null;

const byLocation = <T extends { surah: number; ayah: number }>(a: T, b: T) => a.surah - b.surah || a.ayah - b.ayah;
const ayahCountLabel = (n: number) => (n === 0 ? 'Empty' : n === 1 ? '1 ayah' : `${n} ayahs`);

function readerHref(surah: number, ayah: number, play = false) {
  return `/quran/${surah}?ayah=${ayah}${play ? '&play=1' : ''}`;
}

export default function SavedPage() {
  const hydrated = useStoresHydrated();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [editor, setEditor] = useState<Editor>(null);
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
    for (const p of pinPlacements) if (!map.has(p.pinId)) map.set(p.pinId, p);
    return map;
  }, [pinPlacements]);
  const bookmarksByCollection = useMemo(() => {
    const map = new Map<string, BookmarkMark[]>();
    for (const b of bookmarks) {
      const list = map.get(b.collectionId) ?? [];
      list.push(b);
      map.set(b.collectionId, list);
    }
    for (const list of map.values()) list.sort(byLocation);
    return map;
  }, [bookmarks]);

  const deletePin = (pin: Pin) => {
    if (!window.confirm(`Delete pin?\nRemove "${pin.name}" from every ayah.`)) return false;
    hapticWarning();
    removePin(pin.id);
    return true;
  };
  const deleteCollection = (c: BookmarkCollection) => {
    if (!window.confirm(`Delete collection?\nRemove "${c.name}" and its bookmarks.`)) return false;
    hapticWarning();
    removeCollection(c.id);
    if (expandedId === c.id) setExpandedId(null);
    return true;
  };

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-4">
        <div className="skeleton h-10 w-40" />
        <div className="skeleton h-28" />
        <div className="skeleton h-40" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 lg:px-8 py-6 lg:py-10 space-y-8">
      <div>
        <h1 className="font-display text-4xl lg:text-5xl tracking-tight">Saved</h1>
        <p className="mt-2 text-sm text-textSecondary">Pins and bookmark collections, synced with the Quranki app.</p>
      </div>

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-textMuted">Pins</h2>
        <div className="card divide-y divide-border">
          {pins.length === 0 ? (
            <p className="px-4 py-4 text-sm text-textMuted">Create a pin, then check it onto an ayah.</p>
          ) : (
            pins.map((pin) => {
              const placement = placementByPin.get(pin.id);
              return (
                <MarkRow
                  key={pin.id}
                  icon="pin"
                  color={pin.color}
                  title={pin.name}
                  subtitle={placement ? formatAyahLocation(placement.surah, placement.ayah) : 'Empty'}
                  href={placement ? readerHref(placement.surah, placement.ayah) : undefined}
                  onClick={placement ? undefined : () => setEditor({ kind: 'pin', pin })}
                  playHref={placement ? readerHref(placement.surah, placement.ayah, true) : undefined}
                  onEdit={() => setEditor({ kind: 'pin', pin })}
                  onDelete={() => deletePin(pin)}
                />
              );
            })
          )}
        </div>
        <button onClick={() => setEditor({ kind: 'new-pin' })} className="mt-1 inline-flex items-center gap-1.5 px-2 py-2 text-sm font-semibold text-primary">
          <Plus className="w-4 h-4" /> New pin
        </button>
      </section>

      <section>
        <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wider text-textMuted">Bookmarks</h2>
        <div className="card divide-y divide-border">
          {collections.length === 0 ? (
            <p className="px-4 py-4 text-sm text-textMuted">Create a collection, then bookmark ayahs into it.</p>
          ) : (
            collections.map((c) => {
              const items = bookmarksByCollection.get(c.id) ?? [];
              const expanded = expandedId === c.id;
              return (
                <div key={c.id}>
                  <MarkRow
                    icon="bookmark"
                    color={c.color}
                    title={c.name}
                    subtitle={ayahCountLabel(items.length)}
                    expanded={expanded}
                    onClick={() => setExpandedId(expanded ? null : c.id)}
                    onEdit={() => setEditor({ kind: 'collection', collection: c })}
                    onDelete={() => deleteCollection(c)}
                  />
                  {expanded &&
                    (items.length === 0 ? (
                      <p className="border-t border-border px-12 py-3 text-sm text-textMuted">Bookmark an ayah while reading to add it here.</p>
                    ) : (
                      items.map((b) => <AyahRow key={b.id} bookmark={b} onRemove={() => { hapticWarning(); removeBookmark(b.id); }} />)
                    ))}
                </div>
              );
            })
          )}
        </div>
        <button onClick={() => setEditor({ kind: 'new-collection' })} className="mt-1 inline-flex items-center gap-1.5 px-2 py-2 text-sm font-semibold text-primary">
          <Plus className="w-4 h-4" /> New collection
        </button>
      </section>

      <NameColorDialog
        editor={editor}
        onClose={() => setEditor(null)}
        onSubmit={(name, color) => {
          if (editor?.kind === 'pin') updatePin(editor.pin.id, { name, color });
          else if (editor?.kind === 'new-pin') addPin(name || 'Pin', color);
          else if (editor?.kind === 'collection') updateCollection(editor.collection.id, { name, color });
          else addCollection(name || 'Collection', color);
          hapticSuccess();
          setEditor(null);
        }}
        onDelete={() => {
          if (editor?.kind === 'pin' && deletePin(editor.pin)) setEditor(null);
          if (editor?.kind === 'collection' && deleteCollection(editor.collection)) setEditor(null);
        }}
      />
    </div>
  );
}

function MarkRow({
  icon,
  color,
  title,
  subtitle,
  href,
  playHref,
  expanded,
  onClick,
  onEdit,
  onDelete,
}: {
  icon: 'pin' | 'bookmark';
  color: string;
  title: string;
  subtitle: string;
  href?: string;
  playHref?: string;
  expanded?: boolean;
  onClick?: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const Icon = icon === 'pin' ? MapPin : Bookmark;
  const body = (
    <>
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full" style={{ background: `${color}22` }}>
        <Icon className="w-4 h-4" style={{ color, fill: color }} />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{title}</span>
        <span className="block truncate text-xs text-textMuted">{subtitle}</span>
      </span>
      {expanded !== undefined && <ChevronDown className={cn('w-4 h-4 text-textMuted transition-transform', expanded && 'rotate-180')} />}
    </>
  );
  return (
    <div className="flex items-center gap-2 px-3 py-2.5">
      {href ? (
        <Link href={href} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          {body}
        </Link>
      ) : (
        <button onClick={onClick} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          {body}
        </button>
      )}
      <Popover
        trigger={({ toggle }) => (
          <button onClick={toggle} className="icon-btn w-8 h-8" aria-label={`${title} options`}>
            <MoreHorizontal className="w-4 h-4" />
          </button>
        )}
      >
        {(close) => (
          <>
            {playHref && (
              <Link href={playHref} onClick={close} className="flex w-full items-center gap-2.5 rounded-small px-2.5 py-2 text-sm hover:bg-backgroundElement">
                <Play className="w-4 h-4 text-textSecondary" /> Play from here
              </Link>
            )}
            <MenuItem icon={Pencil} onClick={() => { close(); onEdit(); }}>
              Edit
            </MenuItem>
            <MenuItem icon={Trash2} danger onClick={() => { close(); onDelete(); }}>
              Delete
            </MenuItem>
          </>
        )}
      </Popover>
    </div>
  );
}

function AyahRow({ bookmark, onRemove }: { bookmark: BookmarkMark; onRemove: () => void }) {
  useQuranDataVersion((s) => s.version);
  useEffect(() => {
    void loadSurahAyahs(bookmark.surah).catch(() => {});
  }, [bookmark.surah]);
  const loaded = getSurahAyahs(bookmark.surah).length > 0;
  const preview = loaded ? getAyahArabicPreview(bookmark.surah, bookmark.ayah, 7) : '';
  return (
    <div className="flex items-center gap-2 border-t border-border py-2.5 pl-12 pr-3">
      <Link href={readerHref(bookmark.surah, bookmark.ayah)} className="min-w-0 flex-1">
        <span className="block text-xs font-semibold text-textSecondary">{formatAyahLocation(bookmark.surah, bookmark.ayah)}</span>
        {loaded ? (
          <span dir="rtl" className="uthmanic-text block truncate text-right text-xl leading-[2]">
            {preview}
          </span>
        ) : (
          <span className="skeleton mt-1 block h-6" />
        )}
      </Link>
      <Link href={readerHref(bookmark.surah, bookmark.ayah, true)} className="icon-btn w-8 h-8" title="Play from here">
        <Play className="w-4 h-4" />
      </Link>
      <button onClick={onRemove} className="icon-btn w-8 h-8 hover:text-danger" title="Remove bookmark">
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}

function NameColorDialog({
  editor,
  onClose,
  onSubmit,
  onDelete,
}: {
  editor: Editor;
  onClose: () => void;
  onSubmit: (name: string, color: string) => void;
  onDelete: () => void;
}) {
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(DEFAULT_MARK_COLOR);
  useEffect(() => {
    if (!editor) return;
    if (editor.kind === 'pin') {
      setName(editor.pin.name);
      setColor(editor.pin.color);
    } else if (editor.kind === 'collection') {
      setName(editor.collection.name);
      setColor(editor.collection.color);
    } else {
      setName('');
      setColor(DEFAULT_MARK_COLOR);
    }
  }, [editor]);
  const isNew = editor?.kind === 'new-pin' || editor?.kind === 'new-collection';
  const isPin = editor?.kind === 'pin' || editor?.kind === 'new-pin';
  return (
    <Modal open={editor !== null} onClose={onClose} title={`${isNew ? 'New' : 'Edit'} ${isPin ? 'pin' : 'collection'}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit(name.trim(), color);
        }}
        className="space-y-5"
      >
        <input autoFocus value={name} onChange={(e) => setName(e.target.value)} placeholder={isPin ? 'Pin name' : 'Collection name'} className="input" maxLength={40} />
        <ColorSwatches value={color} onChange={setColor} />
        <div className="flex gap-2">
          {!isNew && (
            <button type="button" onClick={onDelete} className="btn-ghost h-10 px-4 text-danger hover:bg-danger/10 hover:text-danger">
              <Trash2 className="w-4 h-4" /> Delete {isPin ? 'pin' : 'collection'}
            </button>
          )}
          <button type="submit" className="btn-primary ml-auto h-10 px-5">
            {isNew ? 'Create' : 'Save'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
