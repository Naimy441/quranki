'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Moon, Sun, Keyboard, X } from 'lucide-react';
import { useProgress } from '@/context/progress-context';
import { getDueReviewWords } from '@/lib/levels';
import { RECITERS } from '@/lib/reciters';

export function Header() {
  const { settings, updateSettings, progress, hydrated } = useProgress();
  const [showKeyboardModal, setShowKeyboardModal] = useState(false);

  const dueWords = hydrated ? getDueReviewWords(progress) : [];
  const currentReciter = RECITERS.find((r) => r.key === settings.selectedReciterKey) || RECITERS[0];

  const toggleTheme = () => {
    const next = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: next });
  };

  return (
    <>
      <header className="h-14 border-b border-border bg-card/90 backdrop-blur-md px-6 flex items-center justify-between shrink-0 z-10 select-none transition-colors">
        <div className="flex items-center gap-3">
          <div className="text-xs font-medium px-3 py-1 rounded-full bg-backgroundElement text-textSecondary border border-border">
            Reciter: <span className="font-bold text-text">{currentReciter.name}</span>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {dueWords.length > 0 && (
            <Link
              href="/session/review"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-medium bg-backgroundSelected text-primary border border-primary/20 text-xs font-bold transition-colors"
            >
              <span>{dueWords.length} due</span>
            </Link>
          )}

          {/* Keyboard Shortcuts Button */}
          <button
            onClick={() => setShowKeyboardModal(true)}
            title="Keyboard Shortcuts"
            className="p-2 rounded-medium text-textSecondary hover:text-text hover:bg-backgroundElement transition-colors"
          >
            <Keyboard className="w-4 h-4" />
          </button>

          {/* Theme Toggle */}
          <button
            onClick={toggleTheme}
            title={settings.theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            className="p-2 rounded-medium text-textSecondary hover:text-text hover:bg-backgroundElement transition-colors"
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-4 h-4 text-amber-400" />
            ) : (
              <Moon className="w-4 h-4 text-textSecondary" />
            )}
          </button>
        </div>
      </header>

      {/* Keyboard Shortcuts Modal */}
      {showKeyboardModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-card border border-border rounded-large max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <h3 className="font-bold text-base text-text flex items-center gap-2">
                <Keyboard className="w-5 h-5 text-primary" />
                Keyboard Shortcuts
              </h3>
              <button
                onClick={() => setShowKeyboardModal(false)}
                className="text-textSecondary hover:text-text p-1 rounded-small hover:bg-backgroundElement transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2.5 text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-textSecondary">Flip Flashcard / Show Answer</span>
                <kbd className="px-2 py-1 bg-backgroundElement border border-border rounded-small text-xs font-mono font-bold text-text">
                  Space
                </kbd>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-textSecondary">Grade Card (Again / Hard / Good / Easy)</span>
                <span className="flex gap-1 font-mono text-xs">
                  <kbd className="px-2 py-1 bg-backgroundElement border border-border rounded-small font-bold text-text">1</kbd>
                  <kbd className="px-2 py-1 bg-backgroundElement border border-border rounded-small font-bold text-text">2</kbd>
                  <kbd className="px-2 py-1 bg-backgroundElement border border-border rounded-small font-bold text-text">3</kbd>
                  <kbd className="px-2 py-1 bg-backgroundElement border border-border rounded-small font-bold text-text">4</kbd>
                </span>
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-textSecondary">Play / Pause Reciter Audio</span>
                <kbd className="px-2 py-1 bg-backgroundElement border border-border rounded-small text-xs font-mono font-bold text-text">
                  K
                </kbd>
              </div>
            </div>

            <div className="pt-2">
              <button
                onClick={() => setShowKeyboardModal(false)}
                className="w-full py-2 bg-backgroundElement hover:bg-backgroundSelected text-text text-sm font-bold rounded-medium transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
