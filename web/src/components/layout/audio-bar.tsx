'use client';

import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Repeat, User, X } from 'lucide-react';
import { useRecitation } from '@/context/recitation-context';
import { useProgress } from '@/context/progress-context';
import { getSurahMeta } from '@/lib/quran-data';
import { RECITERS } from '@/lib/reciters';

function formatSeconds(sec: number): string {
  if (isNaN(sec) || sec < 0) return '0:00';
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}

export function AudioBar() {
  const {
    currentSurah,
    currentAyah,
    isPlaying,
    isLoading,
    currentTime,
    duration,
    autoAdvance,
    hasActiveRecitation,
    closeRecitation,
    togglePlay,
    nextAyah,
    prevAyah,
    seek,
    toggleAutoAdvance,
  } = useRecitation();

  const { settings, updateSettings } = useProgress();
  const surahMeta = getSurahMeta(currentSurah);

  if (!hasActiveRecitation) {
    return null;
  }

  return (
    <div className="fixed bottom-0 left-60 right-0 h-16 bg-card/95 backdrop-blur-md border-t border-border px-6 flex items-center justify-between z-40 select-none shadow-md transition-colors">
      {/* Current Surah / Ayah info */}
      <div className="flex items-center gap-3 min-w-[220px]">
        <div className="w-8 h-8 rounded-medium bg-backgroundSelected border border-border flex items-center justify-center font-bold text-primary text-xs shrink-0">
          {currentSurah}:{currentAyah}
        </div>
        <div className="flex flex-col truncate">
          <div className="text-xs font-bold text-text flex items-center gap-1.5 truncate">
            <span>{surahMeta?.en || `Surah ${currentSurah}`}</span>
            <span className="text-[11px] font-normal text-textMuted">
              ayah {currentAyah} of {surahMeta?.ac || 0}
            </span>
          </div>
          <div className="text-[11px] text-textSecondary truncate">
            <span>{surahMeta?.nt || ''}</span>
          </div>
        </div>
      </div>

      {/* Playback Controls & Progress Bar */}
      <div className="flex flex-col items-center gap-1 max-w-md w-full px-4">
        <div className="flex items-center gap-3">
          <button
            onClick={prevAyah}
            title="Previous Ayah"
            className="p-1.5 text-textSecondary hover:text-text hover:bg-backgroundElement rounded-full transition-colors"
          >
            <SkipBack className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={togglePlay}
            disabled={isLoading}
            title={isPlaying ? 'Pause' : 'Play'}
            className="w-8 h-8 rounded-full bg-primary hover:opacity-90 text-onPrimary flex items-center justify-center shadow-xs transition-opacity disabled:opacity-50"
          >
            {isPlaying ? (
              <Pause className="w-4 h-4 fill-onPrimary" />
            ) : (
              <Play className="w-4 h-4 fill-onPrimary ml-0.5" />
            )}
          </button>

          <button
            onClick={nextAyah}
            title="Next Ayah"
            className="p-1.5 text-textSecondary hover:text-text hover:bg-backgroundElement rounded-full transition-colors"
          >
            <SkipForward className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Progress Bar */}
        <div className="w-full flex items-center gap-2 text-[10px] text-textMuted font-mono">
          <span>{formatSeconds(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 100}
            step={0.1}
            value={currentTime}
            onChange={(e) => seek(parseFloat(e.target.value))}
            className="flex-1 h-1 bg-backgroundElement border border-border rounded-lg appearance-none cursor-pointer accent-primary"
          />
          <span>{formatSeconds(duration)}</span>
        </div>
      </div>

      {/* Reciter & Auto-advance controls */}
      <div className="flex items-center gap-3 min-w-[220px] justify-end">
        {/* Reciter Selector */}
        <div className="flex items-center gap-1.5 text-xs text-textSecondary">
          <User className="w-3 h-3 text-textMuted" />
          <select
            value={settings.selectedReciterKey}
            onChange={(e) => updateSettings({ selectedReciterKey: e.target.value })}
            className="bg-backgroundElement border border-border rounded-small px-2 py-0.5 text-xs text-text font-medium focus:outline-none"
          >
            {RECITERS.map((r) => (
              <option key={r.key} value={r.key}>
                {r.name} - {r.style}
              </option>
            ))}
          </select>
        </div>

        {/* Auto-advance toggle */}
        <button
          onClick={toggleAutoAdvance}
          title={autoAdvance ? 'Auto-advance enabled' : 'Auto-advance disabled'}
          className={`flex items-center gap-1 px-2 py-0.5 rounded-small text-xs font-bold transition-colors ${
            autoAdvance
              ? 'bg-backgroundSelected text-primary border border-primary/20'
              : 'text-textMuted hover:text-text'
          }`}
        >
          <Repeat className="w-3 h-3" />
          <span>Auto</span>
        </button>

        {/* Dismiss Audio Bar */}
        <button
          onClick={closeRecitation}
          title="Close audio player"
          className="p-1 text-textMuted hover:text-text hover:bg-backgroundElement rounded-full transition-colors ml-0.5"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
