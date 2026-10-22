'use client';

import React, { useEffect, useState } from 'react';
import { Play } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { ReciterSetting } from '@/components/quran/pickers';
import { SURAH_INDEX, getSurahMeta } from '@/lib/quran-reader';

/** Choose the ayah range (and reciter) before a fresh surah session, like the mobile play sheet. */
export function PlayOptionsDialog({
  open,
  surahNumber,
  initialFromAyah = 1,
  onClose,
  onPlay,
}: {
  open: boolean;
  surahNumber: number;
  initialFromAyah?: number;
  onClose: () => void;
  onPlay: (fromAyah: number, toAyah: number) => void;
}) {
  const meta = getSurahMeta(surahNumber);
  const count = meta?.ac ?? 1;
  const [from, setFrom] = useState(1);
  const [to, setTo] = useState(count);

  useEffect(() => {
    if (!open) return;
    setFrom(Math.max(1, Math.min(count, initialFromAyah)));
    setTo(count);
  }, [open, initialFromAyah, count]);

  if (!meta) return null;
  const ayahs = Array.from({ length: count }, (_, i) => i + 1);

  return (
    <Modal open={open} onClose={onClose} title={`Play ${meta.en}`}>
      <div className="divide-y divide-border">
        <ReciterSetting />
        <div className="py-4">
          <div className="text-xs font-semibold uppercase tracking-wider text-textMuted">Ayah range</div>
          <div className="mt-3 grid grid-cols-2 gap-3">
            <label className="text-xs text-textSecondary">
              From
              <select
                value={from}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setFrom(v);
                  if (v > to) setTo(v);
                }}
                className="input mt-1"
              >
                {ayahs.map((a) => (
                  <option key={a} value={a}>
                    Ayah {a}
                  </option>
                ))}
              </select>
            </label>
            <label className="text-xs text-textSecondary">
              To
              <select
                value={to}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  setTo(v);
                  if (v < from) setFrom(v);
                }}
                className="input mt-1"
              >
                {ayahs.map((a) => (
                  <option key={a} value={a}>
                    Ayah {a}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button onClick={() => { setFrom(1); setTo(count); }} className="chip h-8 px-3">
              Whole surah
            </button>
            <button onClick={() => { setTo(count); }} className="chip h-8 px-3">
              From here to the end
            </button>
          </div>
        </div>
      </div>
      <button onClick={() => onPlay(from, to)} className="btn-primary mt-2 h-11 w-full">
        <Play className="w-4 h-4 fill-current" />
        {from === 1 && to === count ? 'Play surah' : `Play ayahs ${from} to ${to}`}
      </button>
    </Modal>
  );
}

/** Jump to any surah and ayah. */
export function QuranJumpDialog({
  open,
  initialSurah = 1,
  initialAyah = 1,
  onClose,
  onJump,
}: {
  open: boolean;
  initialSurah?: number;
  initialAyah?: number;
  onClose: () => void;
  onJump: (surah: number, ayah: number) => void;
}) {
  const [surah, setSurah] = useState(initialSurah);
  const [ayah, setAyah] = useState(initialAyah);
  useEffect(() => {
    if (!open) return;
    setSurah(initialSurah);
    setAyah(initialAyah);
  }, [open, initialSurah, initialAyah]);
  const count = SURAH_INDEX[surah - 1]?.ac ?? 1;

  return (
    <Modal open={open} onClose={onClose} title="Jump to ayah">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onJump(surah, Math.min(ayah, count));
        }}
        className="space-y-4"
      >
        <div className="grid grid-cols-[1fr_7rem] gap-3">
          <label className="text-xs text-textSecondary">
            Surah
            <select
              value={surah}
              onChange={(e) => {
                setSurah(Number(e.target.value));
                setAyah(1);
              }}
              className="input mt-1"
            >
              {SURAH_INDEX.map((s) => (
                <option key={s.n} value={s.n}>
                  {s.n}. {s.en}
                </option>
              ))}
            </select>
          </label>
          <label className="text-xs text-textSecondary">
            Ayah
            <select value={ayah} onChange={(e) => setAyah(Number(e.target.value))} className="input mt-1">
              {Array.from({ length: count }, (_, i) => i + 1).map((a) => (
                <option key={a} value={a}>
                  {a}
                </option>
              ))}
            </select>
          </label>
        </div>
        <button type="submit" className="btn-primary h-11 w-full">
          Go
        </button>
      </form>
    </Modal>
  );
}
