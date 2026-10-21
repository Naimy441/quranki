'use client';

import React from 'react';
import { X, Sliders, Type } from 'lucide-react';
import { useProgress } from '@/context/progress-context';

interface ReaderSettingsModalProps {
  isOpen?: boolean;
  onClose: () => void;
}

export function ReaderSettingsModal({ isOpen = true, onClose }: ReaderSettingsModalProps) {
  const { settings, updateSettings } = useProgress();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-fadeIn">
      <div className="bg-card border border-border rounded-large max-w-md w-full p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <h3 className="font-bold text-base text-text flex items-center gap-2">
            <Sliders className="w-4 h-4 text-primary" /> Reader Settings
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-small text-textSecondary hover:text-text hover:bg-backgroundElement transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Font Sizes */}
        <div className="space-y-3">
          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-textSecondary">
              <span className="flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-primary" /> Arabic Font Size
              </span>
              <span className="font-bold text-text">{settings.readerArabicFontSize}px</span>
            </div>
            <input
              type="range"
              min={24}
              max={44}
              value={settings.readerArabicFontSize}
              onChange={(e) => updateSettings({ readerArabicFontSize: parseInt(e.target.value, 10) })}
              className="w-full h-1.5 bg-backgroundElement border border-border rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between text-xs font-semibold text-textSecondary">
              <span className="flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-primary" /> Translation Font Size
              </span>
              <span className="font-bold text-text">{settings.readerTranslationFontSize}px</span>
            </div>
            <input
              type="range"
              min={13}
              max={20}
              value={settings.readerTranslationFontSize}
              onChange={(e) =>
                updateSettings({ readerTranslationFontSize: parseInt(e.target.value, 10) })
              }
              className="w-full h-1.5 bg-backgroundElement border border-border rounded-lg appearance-none cursor-pointer accent-primary"
            />
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-2 pt-2 border-t border-border">
          <h4 className="text-[10px] font-bold uppercase tracking-wider text-textMuted">Display Options</h4>

          <label className="flex items-center justify-between p-2 rounded-medium hover:bg-backgroundElement cursor-pointer">
            <span className="text-xs font-bold text-text">
              Tajweed Rule Coloring
            </span>
            <input
              type="checkbox"
              checked={settings.readerShowTajweed}
              onChange={(e) => updateSettings({ readerShowTajweed: e.target.checked })}
              className="w-4 h-4 rounded accent-primary"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded-medium hover:bg-backgroundElement cursor-pointer">
            <span className="text-xs font-bold text-text">
              Word-by-Word Translation Gloss
            </span>
            <input
              type="checkbox"
              checked={settings.readerShowWbwGloss}
              onChange={(e) => updateSettings({ readerShowWbwGloss: e.target.checked })}
              className="w-4 h-4 rounded accent-primary"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded-medium hover:bg-backgroundElement cursor-pointer">
            <span className="text-xs font-bold text-text">
              Word-by-Word Transliteration
            </span>
            <input
              type="checkbox"
              checked={settings.readerShowWbwTransliteration}
              onChange={(e) => updateSettings({ readerShowWbwTransliteration: e.target.checked })}
              className="w-4 h-4 rounded accent-primary"
            />
          </label>

          <label className="flex items-center justify-between p-2 rounded-medium hover:bg-backgroundElement cursor-pointer">
            <span className="text-xs font-bold text-text">
              Full Ayah Translation
            </span>
            <input
              type="checkbox"
              checked={settings.readerShowTranslation}
              onChange={(e) => updateSettings({ readerShowTranslation: e.target.checked })}
              className="w-4 h-4 rounded accent-primary"
            />
          </label>

          <label className="flex items-center justify-between p-2.5 rounded-medium bg-backgroundSelected border border-primary/20 cursor-pointer">
            <div>
              <span className="text-xs font-bold text-primary block">
                Hide Learned Words (Comprehension Check)
              </span>
              <span className="text-[11px] text-textSecondary">
                Masks word translation until clicked for words you mastered in trainer.
              </span>
            </div>
            <input
              type="checkbox"
              checked={settings.readerHideLearnedWords}
              onChange={(e) => updateSettings({ readerHideLearnedWords: e.target.checked })}
              className="w-4 h-4 rounded accent-primary"
            />
          </label>
        </div>

        <button
          onClick={onClose}
          className="w-full py-2.5 bg-primary hover:opacity-90 text-onPrimary font-bold text-xs rounded-medium transition-opacity shadow-xs"
        >
          Done
        </button>
      </div>
    </div>
  );
}
