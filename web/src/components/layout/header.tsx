'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Cloud, CloudOff, Keyboard, Laptop, Loader2, Moon, Search, Sun } from 'lucide-react';
import { useProgressStore } from '@/store/progress-store';
import { useAccountStore } from '@/store/account-store';
import { useSyncStatus } from '@/lib/sync-status';
import { useCommandPalette } from '@/components/layout/command-palette';
import { LogoMark } from '@/components/brand/logo';
import { Modal } from '@/components/ui/modal';

const SHORTCUTS: [string, string[]][] = [
  ['Search and jump anywhere', ['⌘', 'K']],
  ['Search (when not typing)', ['/']],
  ['Show answer', ['Space']],
  ['Grade Again, Hard, Good, Easy', ['1', '2', '3', '4']],
  ['Replay word audio', ['R']],
  ['Undo last grade', ['Z']],
  ['Play or pause recitation', ['K']],
  ['Previous or next ayah', ['J', 'L']],
  ['Show this list', ['?']],
];

export function Header() {
  const theme = useProgressStore((st) => st.settings.themePreference);
  const updateSettings = useProgressStore((st) => st.updateSettings);
  const email = useAccountStore((st) => st.email);
  const { syncing: isSyncing, error: syncError } = useSyncStatus();
  const account = email;
  const palette = useCommandPalette();
  const [showKeys, setShowKeys] = useState(false);

  React.useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement;
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.isContentEditable)) return;
      if (e.key === '?') setShowKeys(true);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const nextTheme = theme === 'light' ? 'dark' : theme === 'dark' ? 'system' : 'light';
  const ThemeIcon = theme === 'light' ? Sun : theme === 'dark' ? Moon : Laptop;

  return (
    <>
      <header className="sticky top-0 z-30 h-14 lg:h-16 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="h-full px-4 lg:px-8 flex items-center gap-3">
          <Link href="/" className="lg:hidden" aria-label="Quranki home">
            <LogoMark size={30} tile />
          </Link>

          <button
            onClick={palette.open}
            className="lg:hidden flex-1 flex items-center gap-2 h-9 px-3 rounded-pill border border-border bg-backgroundElement/60 text-sm text-textMuted"
          >
            <Search className="w-4 h-4" />
            Search surahs and ayahs
          </button>

          <div className="ml-auto flex items-center gap-1">
            {account && (
              <span
                className="hidden sm:inline-flex items-center gap-1.5 px-2.5 h-8 rounded-pill text-xs text-textMuted"
                title={syncError ? `Sync failed: ${syncError}` : isSyncing ? 'Syncing' : 'Synced to your account'}
              >
                {isSyncing ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : syncError ? (
                  <CloudOff className="w-3.5 h-3.5 text-danger" />
                ) : (
                  <Cloud className="w-3.5 h-3.5 text-primary" />
                )}
                <span className="hidden md:inline">{isSyncing ? 'Syncing' : syncError ? 'Offline' : 'Synced'}</span>
              </span>
            )}
            <button onClick={() => setShowKeys(true)} className="icon-btn hidden md:inline-flex" title="Keyboard shortcuts">
              <Keyboard className="w-[18px] h-[18px]" />
            </button>
            <button
              onClick={() => updateSettings({ themePreference: nextTheme })}
              className="icon-btn"
              title={`Theme: ${theme}. Switch to ${nextTheme}`}
              aria-label="Change theme"
            >
              <ThemeIcon className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </header>

      <Modal open={showKeys} onClose={() => setShowKeys(false)} title="Keyboard shortcuts">
        <div className="divide-y divide-border">
          {SHORTCUTS.map(([label, keys]) => (
            <div key={label} className="flex items-center justify-between py-2.5 text-sm">
              <span className="text-textSecondary">{label}</span>
              <span className="flex gap-1">
                {keys.map((k) => (
                  <kbd key={k} className="kbd">
                    {k}
                  </kbd>
                ))}
              </span>
            </div>
          ))}
        </div>
      </Modal>
    </>
  );
}
