'use client';

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { useRouter } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BarChart3,
  BookOpen,
  Bookmark,
  CornerDownLeft,
  GraduationCap,
  Moon,
  Play,
  Search,
  Settings,
  Sun,
} from 'lucide-react';
import { SURAH_INDEX, getSurahNameGlyph } from '@/lib/quran-data';
import { useProgressStore } from '@/store/progress-store';
import { cn } from '@/lib/cn';

interface PaletteContextValue {
  open: () => void;
}

const PaletteContext = createContext<PaletteContextValue>({ open: () => {} });
export const useCommandPalette = () => useContext(PaletteContext);

interface Item {
  id: string;
  group: string;
  label: string;
  hint?: string;
  glyph?: string;
  icon?: React.ComponentType<{ className?: string }>;
  run: () => void;
}

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^a-z0-9؀-ۿ: ]/g, '');
}

export function CommandPaletteProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setOpen] = useState(false);
  const open = useCallback(() => setOpen(true), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === '/' && !isTypingTarget(e.target)) {
        e.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <PaletteContext.Provider value={{ open }}>
      {children}
      {typeof document !== 'undefined' &&
        createPortal(<AnimatePresence>{isOpen && <Palette onClose={() => setOpen(false)} />}</AnimatePresence>, document.body)}
    </PaletteContext.Provider>
  );
}

export function isTypingTarget(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable;
}

function Palette({ onClose }: { onClose: () => void }) {
  const router = useRouter();
  const settings = useProgressStore((st) => st.settings);
  const updateSettings = useProgressStore((st) => st.updateSettings);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const go = useCallback(
    (href: string) => {
      onClose();
      router.push(href);
    },
    [onClose, router],
  );

  const items = useMemo<Item[]>(() => {
    const q = normalize(query.trim());
    const out: Item[] = [];

    // "2:255", "2 255", or "baqarah 255" jump straight to an ayah.
    const ref = q.match(/^(\d{1,3})\s*[: ]\s*(\d{1,3})$/);
    const named = q.match(/^([a-z' -]+?)\s+(\d{1,3})$/);
    let jumpSurah: number | null = null;
    let jumpAyah: number | null = null;
    if (ref) {
      jumpSurah = Number(ref[1]);
      jumpAyah = Number(ref[2]);
    } else if (named) {
      const hit = SURAH_INDEX.find((s) => normalize(s.en).replace(/^(ash|al|an|ar|as|at|ad|az) ?-?/, '').includes(named[1].replace(/^(ash|al|an|ar|as|at|ad|az) ?-?/, '').trim()));
      if (hit) {
        jumpSurah = hit.n;
        jumpAyah = Number(named[2]);
      }
    }
    if (jumpSurah && jumpAyah) {
      const meta = SURAH_INDEX[jumpSurah - 1];
      if (meta && jumpAyah >= 1 && jumpAyah <= meta.ac) {
        out.push({
          id: 'jump',
          group: 'Go to ayah',
          label: `${meta.en} ${jumpSurah}:${jumpAyah}`,
          hint: meta.nt,
          glyph: getSurahNameGlyph(jumpSurah),
          run: () => go(`/quran/${jumpSurah}?ayah=${jumpAyah}`),
        });
      }
    }

    const pages: Item[] = [
      { id: 'p-review', group: 'Pages', label: 'Start a study session', icon: Play, run: () => go('/session/review') },
      { id: 'p-learn', group: 'Pages', label: 'Learn', icon: GraduationCap, run: () => go('/learn') },
      { id: 'p-quran', group: 'Pages', label: 'Quran', icon: BookOpen, run: () => go('/quran') },
      { id: 'p-saved', group: 'Pages', label: 'Saved ayahs', icon: Bookmark, run: () => go('/saved') },
      { id: 'p-memorize', group: 'Pages', label: 'Memorize (Hifz)', icon: BookOpen, run: () => go('/memorize') },
      { id: 'p-timeline', group: 'Pages', label: 'Word timeline', icon: GraduationCap, run: () => go('/word-timeline') },
      { id: 'p-known', group: 'Pages', label: 'Known words', icon: GraduationCap, run: () => go('/known-words') },
      { id: 'p-progress', group: 'Pages', label: 'Progress', icon: BarChart3, run: () => go('/progress') },
      { id: 'p-settings', group: 'Pages', label: 'Settings', icon: Settings, run: () => go('/settings') },
    ];
    const dark = document.documentElement.classList.contains('dark');
    const actions: Item[] = [
      {
        id: 'a-theme',
        group: 'Actions',
        label: dark ? 'Switch to light theme' : 'Switch to dark theme',
        icon: dark ? Sun : Moon,
        run: () => {
          updateSettings({ themePreference: dark ? 'light' : 'dark' });
          onClose();
        },
      },
      {
        id: 'a-translation',
        group: 'Actions',
        label: settings.readerAlwaysShowTranslation ? 'Stop always showing translations' : 'Always show ayah translations',
        icon: BookOpen,
        run: () => {
          updateSettings({ readerAlwaysShowTranslation: !settings.readerAlwaysShowTranslation });
          onClose();
        },
      },
    ];

    const surahs = SURAH_INDEX.filter((s) => {
      if (!q) return true;
      if (String(s.n) === q) return true;
      const hay = `${s.n} ${normalize(s.en)} ${normalize(s.tr)} ${normalize(s.nt)} ${s.ar}`;
      return q.split(' ').every((part) => hay.includes(part));
    })
      .slice(0, q ? 12 : 8)
      .map<Item>((s) => ({
        id: `s-${s.n}`,
        group: 'Surahs',
        label: `${s.n}. ${s.en}`,
        hint: `${s.nt} - ${s.ac} ayahs`,
        glyph: getSurahNameGlyph(s.n),
        run: () => go(`/quran/${s.n}`),
      }));

    const match = (i: Item) => !q || normalize(i.label).includes(q);
    return [...out, ...pages.filter(match), ...surahs, ...actions.filter(match)];
  }, [query, go, onClose, settings.readerAlwaysShowTranslation, updateSettings]);

  useEffect(() => setActive(0), [query]);
  useEffect(() => {
    inputRef.current?.focus();
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((a) => Math.min(items.length - 1, a + 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((a) => Math.max(0, a - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      items[active]?.run();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  let lastGroup = '';

  return (
    <div className="fixed inset-0 z-[85] flex items-start justify-center px-3 pt-[12vh]" onKeyDown={onKeyDown}>
      <motion.div
        className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.97, y: -8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.97, y: -8 }}
        transition={{ type: 'spring', stiffness: 420, damping: 32 }}
        className="relative w-full max-w-xl overflow-hidden rounded-xlarge border border-border bg-card shadow-lift"
        role="dialog"
        aria-label="Search"
      >
        <div className="flex items-center gap-3 border-b border-border px-4">
          <Search className="w-4 h-4 text-textMuted shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search surahs, jump to 2:255, or run a command"
            className="h-14 w-full bg-transparent text-[15px] text-text placeholder:text-textMuted outline-none"
            aria-label="Search"
          />
          <kbd className="kbd hidden sm:inline-flex">Esc</kbd>
        </div>
        <div ref={listRef} className="max-h-[min(60vh,440px)] overflow-y-auto p-2">
          {items.length === 0 && <div className="px-3 py-10 text-center text-sm text-textMuted">No matches</div>}
          {items.map((item, index) => {
            const header = item.group !== lastGroup ? item.group : null;
            lastGroup = item.group;
            const Icon = item.icon;
            return (
              <React.Fragment key={item.id}>
                {header && (
                  <div className="px-3 pt-3 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-textMuted">
                    {header}
                  </div>
                )}
                <button
                  data-index={index}
                  onMouseMove={() => setActive(index)}
                  onClick={item.run}
                  className={cn(
                    'flex w-full items-center gap-3 rounded-medium px-3 py-2.5 text-left text-sm transition-colors',
                    index === active ? 'bg-backgroundSelected text-text' : 'text-textSecondary',
                  )}
                >
                  {Icon ? (
                    <Icon className={cn('w-4 h-4 shrink-0', index === active && 'text-primary')} />
                  ) : (
                    <span className="w-4 h-4 shrink-0" />
                  )}
                  <span className="flex-1 min-w-0">
                    <span className="block truncate font-medium text-text">{item.label}</span>
                    {item.hint && <span className="block truncate text-xs text-textMuted">{item.hint}</span>}
                  </span>
                  {item.glyph && <span className="surah-name-glyph text-3xl text-textSecondary">{item.glyph}</span>}
                  {index === active && <CornerDownLeft className="w-3.5 h-3.5 text-textMuted shrink-0" />}
                </button>
              </React.Fragment>
            );
          })}
        </div>
        <div className="hidden sm:flex items-center gap-4 border-t border-border px-4 py-2.5 text-[11px] text-textMuted">
          <span className="flex items-center gap-1.5"><kbd className="kbd">↑</kbd><kbd className="kbd">↓</kbd> navigate</span>
          <span className="flex items-center gap-1.5"><kbd className="kbd">↵</kbd> open</span>
          <span className="ml-auto">Tip: type a surah and ayah, like &quot;kahf 10&quot;</span>
        </div>
      </motion.div>
    </div>
  );
}
