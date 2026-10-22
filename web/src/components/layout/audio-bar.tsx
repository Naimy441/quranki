'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Loader2, Pause, Play, SkipBack, SkipForward, X } from 'lucide-react';
import { getSurahMeta } from '@/lib/quran-reader';
import { reciterLabel } from '@/lib/reciters';
import { isTypingTarget } from '@/components/layout/command-palette';
import { useProgressStore } from '@/store/progress-store';
import {
  seekRecitation,
  setAutoScrollSuspended,
  skipNextAyah,
  skipPreviousAyah,
  stopRecitation,
  togglePlayPause,
  useRecitationStore,
} from '@/store/recitation-store';

function formatSeconds(sec: number): string {
  if (!Number.isFinite(sec) || sec < 0) return '0:00';
  return `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;
}

/** The recitation player, with the same controls and status text as the mobile player bar. */
export function AudioBar() {
  const router = useRouter();
  const s = useRecitationStore();
  const reciterKey = useProgressStore((st) => st.settings.selectedReciterKey);
  const meta = s.surahNumber ? getSurahMeta(s.surahNumber) : undefined;

  useEffect(() => {
    if (!s.visible) return;
    const onKey = (e: KeyboardEvent) => {
      if (isTypingTarget(e.target) || e.metaKey || e.ctrlKey || e.altKey) return;
      const k = e.key.toLowerCase();
      if (k === 'k') togglePlayPause();
      else if (k === 'j') skipPreviousAyah();
      else if (k === 'l') skipNextAyah();
      else return;
      e.preventDefault();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [s.visible]);

  const canPrev = s.playingBismillah || s.ayahNumber > s.rangeStartAyah || Boolean(s.mode === 'surah' && meta?.b && s.rangeStartAyah <= 1);
  const canNext = s.playingBismillah || s.ayahNumber < s.rangeEndAyah;
  const busy = s.awaitingAudio && !s.playing;
  let status = s.playingBismillah ? 'Bismillah' : `Ayah ${s.ayahNumber} of ${s.rangeEndAyah}`;
  if (s.error) status = s.error;
  else if (busy) status = 'Loading';
  const pct = s.durationSeconds > 0 ? Math.min(100, (s.positionSeconds / s.durationSeconds) * 100) : 0;

  const jumpToRecitation = () => {
    if (!s.surahNumber) return;
    setAutoScrollSuspended(false);
    const ayah = s.ayahNumber > 0 ? s.ayahNumber : 1;
    if (window.location.pathname === `/quran/${s.surahNumber}`) {
      document.getElementById(`ayah-${ayah}`)?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    } else router.push(`/quran/${s.surahNumber}?ayah=${ayah}`);
  };

  return (
    <AnimatePresence>
      {s.visible && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          className="fixed z-40 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] lg:bottom-4 left-3 right-3 lg:left-[calc(16rem+1.5rem)] lg:right-6"
        >
          <div className="mx-auto max-w-3xl overflow-hidden rounded-large border border-border bg-card/95 shadow-lift backdrop-blur-xl">
            <div
              className="relative h-1.5 cursor-pointer bg-border"
              onClick={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                if (s.durationSeconds > 0) seekRecitation(((e.clientX - rect.left) / rect.width) * s.durationSeconds);
              }}
            >
              {busy ? (
                <div className="absolute inset-y-0 w-1/3 animate-shimmer bg-gradient-to-r from-transparent via-primary to-transparent bg-[length:200%_100%]" />
              ) : (
                <div className="absolute inset-y-0 left-0 bg-primary" style={{ width: `${s.error ? 0 : pct}%` }} />
              )}
            </div>
            <div className="flex items-center gap-3 px-3 sm:px-4 py-2.5">
              <button onClick={jumpToRecitation} className="flex min-w-0 flex-1 items-center gap-3 text-left" title="Go to the ayah being recited">
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-medium bg-primary/10 font-mono text-[11px] font-bold text-primary">
                  {s.surahNumber}:{s.playingBismillah ? 'b' : s.ayahNumber}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold">{meta?.tr ?? 'Recitation'}</span>
                  <span className={s.error ? 'block truncate text-xs text-danger' : 'block truncate text-xs text-textMuted'}>
                    {status}
                    {!s.error && !busy && s.durationSeconds > 0 && ` - ${formatSeconds(s.positionSeconds)} / ${formatSeconds(s.durationSeconds)}`}
                  </span>
                </span>
              </button>
              <span className="hidden md:block max-w-[180px] truncate text-xs text-textMuted">{reciterLabel(reciterKey)}</span>
              <div className="flex items-center gap-1">
                <button onClick={skipPreviousAyah} disabled={!canPrev} className="icon-btn disabled:opacity-30" title="Previous ayah (J)">
                  <SkipBack className="w-4 h-4" />
                </button>
                <button
                  onClick={togglePlayPause}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-onPrimary transition hover:brightness-110"
                  title={s.playing ? 'Pause (K)' : 'Play (K)'}
                >
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : s.playing ? <Pause className="w-4 h-4 fill-current" /> : <Play className="ml-0.5 w-4 h-4 fill-current" />}
                </button>
                <button onClick={skipNextAyah} disabled={!canNext} className="icon-btn disabled:opacity-30" title="Next ayah (L)">
                  <SkipForward className="w-4 h-4" />
                </button>
              </div>
              <button onClick={stopRecitation} className="icon-btn w-8 h-8" title="Stop and close">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
