'use client';

import React from 'react';
import { X, Volume2, Layers } from 'lucide-react';
import type { ReaderWord } from '@/lib/quran-data';
import { useRecitation } from '@/context/recitation-context';

interface WordModalProps {
  word: ReaderWord | null;
  surahNumber: number;
  ayahNumber: number;
  isDark?: boolean;
  onClose: () => void;
}

export function WordModal({ word, surahNumber, ayahNumber, onClose }: WordModalProps) {
  const { playWordAudio } = useRecitation();

  if (!word) return null;

  const handlePlay = () => {
    playWordAudio(surahNumber, ayahNumber, word.p);
  };

  const arabicText = word.ar.map((s) => s.t).join('');
  const englishGloss = word.en.map((s) => s.t).join('');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-fadeIn">
      <div className="bg-card border border-border rounded-large max-w-md w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-textSecondary">
            <span>Word Inspector</span>
            <span>-</span>
            <span>
              Surah {surahNumber}:{ayahNumber} (Word {word.p})
            </span>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-small text-textSecondary hover:text-text hover:bg-backgroundElement transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Word Display */}
        <div className="text-center space-y-2 py-1">
          <div className="flex items-center justify-center gap-3">
            <span className="uthmanic-text text-5xl font-bold text-text">
              {arabicText}
            </span>
            <button
              onClick={handlePlay}
              title="Play Word Audio"
              className="p-2.5 rounded-medium bg-backgroundElement hover:bg-backgroundSelected text-primary transition-colors shadow-xs"
            >
              <Volume2 className="w-5 h-5" />
            </button>
          </div>

          {word.tl && (
            <div className="text-sm font-mono font-bold text-primary">
              {word.tl}
            </div>
          )}

          <div className="text-lg font-bold text-text">{englishGloss}</div>
        </div>

        {/* Linguistic Details: Root, Lemma, POS */}
        <div className="grid grid-cols-3 gap-2 p-3.5 rounded-medium bg-backgroundElement border border-border text-center">
          <div>
            <div className="text-[10px] font-bold text-textMuted uppercase">Lemma</div>
            <div className="uthmanic-text text-base font-bold text-text mt-0.5">
              {word.lm || ' - '}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-textMuted uppercase">Root</div>
            <div className="uthmanic-text text-base font-bold text-text mt-0.5">
              {word.rt || ' - '}
            </div>
          </div>
          <div>
            <div className="text-[10px] font-bold text-textMuted uppercase">Part of Speech</div>
            <div className="text-xs font-bold text-text mt-0.5">
              {word.ps || 'Word'}
            </div>
          </div>
        </div>

        {/* Morphology breakdown */}
        {word.m && word.m.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-semibold text-textSecondary flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5" /> Morphology Segmentation
            </div>
            <div className="flex flex-wrap gap-1.5">
              {word.m.map((seg, idx) => (
                <div
                  key={idx}
                  className="px-2.5 py-1 rounded-small bg-backgroundElement border border-border text-xs flex items-center gap-1.5"
                >
                  <span className="uthmanic-text font-bold text-sm text-primary">
                    {seg.t}
                  </span>
                  <span className="text-textMuted text-[10px] uppercase font-bold">
                    {seg.k} ({seg.p})
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-primary hover:opacity-90 text-onPrimary rounded-medium font-bold text-xs transition-opacity shadow-xs"
        >
          Close
        </button>
      </div>
    </div>
  );
}
