'use client';

import React, { useMemo } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Image from 'next/image';
import { BookOpen, BookCheck, BarChart3, Settings, Flame, Target, User, LogOut, Info } from 'lucide-react';
import { useProgress } from '@/context/progress-context';
import { buildGlobalSessionQueue, getDueReviewWords, getTrackContext } from '@/lib/levels';
import { calculateMemorizedWords } from '@/lib/quran-coverage';

const navItems = [
  { href: '/learn', label: 'Learn', icon: BookOpen },
  { href: '/quran', label: 'Quran', icon: BookCheck },
  { href: '/progress', label: 'Progress', icon: BarChart3 },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();
  const { progress, settings, streak, account, signOut, hydrated } = useProgress();

  const dueWords = hydrated ? getDueReviewWords(progress) : [];
  const { percentage } = hydrated ? calculateMemorizedWords(progress) : { percentage: 0 };

  const sessionWords = useMemo(() => {
    if (!hydrated) return [];
    const now = new Date();
    const track = getTrackContext(progress, settings.canReadQuran ?? true);
    const today = buildGlobalSessionQueue(progress, now, settings.wordsPerSession ?? 10, 0, 0, false, track);
    if (today.length > 0) return today;
    return buildGlobalSessionQueue(progress, now, settings.wordsPerSession ?? 10, 0, 0, true, track);
  }, [hydrated, progress, settings.canReadQuran, settings.wordsPerSession]);

  return (
    <aside className="w-60 h-screen sticky top-0 border-r border-border bg-card flex flex-col shrink-0 select-none transition-colors overflow-hidden z-30">
      {/* Brand Header */}
      <Link
        href="/"
        className="p-5 border-b border-border flex items-center gap-3 hover:bg-backgroundElement/40 transition-colors shrink-0"
      >
        <div className="relative w-9 h-9 rounded-full overflow-hidden bg-backgroundSelected flex items-center justify-center border border-border shadow-xs">
          <Image
            src="/images/Quranki.png"
            alt="Quranki Logo"
            width={36}
            height={36}
            className="w-full h-full object-cover rounded-full"
          />
        </div>
        <div className="flex flex-col">
          <h1 className="font-bold text-lg text-text tracking-tight flex items-center gap-1.5 leading-snug">
            Quranki
          </h1>
          <p className="text-[11px] text-textSecondary font-medium">Quran Spaced Repetition</p>
        </div>
      </Link>

      {/* Middle scrollable body: Navigation & Stats */}
      <div className="flex-1 overflow-y-auto flex flex-col justify-between py-2">
        <nav className="p-3 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/learn'
                ? pathname === '/learn' || pathname.startsWith('/level') || pathname.startsWith('/session')
                : pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-medium text-sm transition-all ${
                  isActive
                    ? 'bg-backgroundSelected text-primary font-bold shadow-xs'
                    : 'text-textSecondary hover:bg-backgroundElement hover:text-text font-medium'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-primary' : ''}`} />
                <span>{item.label}</span>
                {item.href === '/learn' && (dueWords.length > 0 || sessionWords.length > 0) && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full font-bold bg-primary text-onPrimary">
                    {dueWords.length > 0 ? dueWords.length : sessionWords.length}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Stats Card */}
        <div className="p-4 mx-3 mb-2 rounded-medium bg-backgroundElement border border-border space-y-3">
          <div className="flex items-center justify-between text-xs text-textSecondary font-semibold">
            <span>Overview</span>
            <span className="flex items-center gap-1 text-primary font-bold">
              <Flame className="w-3.5 h-3.5 fill-primary" />
              {streak} {streak === 1 ? 'day' : 'days'}
            </span>
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center text-xs">
              <span className="text-textSecondary flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-primary" /> Quran Coverage
              </span>
              <span className="font-bold text-text">{percentage}%</span>
            </div>
            <div className="w-full bg-border h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-primary h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, percentage)}%` }}
              />
            </div>
          </div>

          {dueWords.length > 0 ? (
            <Link
              href="/session/review"
              className="w-full py-2 px-3 bg-primary hover:opacity-90 text-onPrimary rounded-small text-xs font-bold flex items-center justify-center gap-1.5 transition-opacity"
            >
              <span>Review {dueWords.length} Due</span>
            </Link>
          ) : sessionWords.length > 0 ? (
            <Link
              href="/session/review"
              className="w-full py-2 px-3 bg-primary hover:opacity-90 text-onPrimary rounded-small text-xs font-bold flex items-center justify-center gap-1.5 transition-opacity"
            >
              <span>Start Session ({sessionWords.length} New)</span>
            </Link>
          ) : (
            <div className="text-center py-1 text-xs text-textMuted font-medium">
              All reviews completed
            </div>
          )}
        </div>
      </div>

      {/* User Account / Sign In section */}
      <div className="p-3 border-t border-border flex flex-col gap-1.5 shrink-0">
        {account ? (
          <div className="flex items-center justify-between px-2 py-1.5 rounded-medium bg-backgroundElement text-xs">
            <div className="flex items-center gap-2 truncate">
              <div className="w-6 h-6 rounded-full bg-backgroundSelected text-primary font-bold flex items-center justify-center shrink-0 text-[10px]">
                {account.email[0].toUpperCase()}
              </div>
              <span className="text-text truncate font-medium">{account.email}</span>
            </div>
            <button
              type="button"
              onClick={signOut}
              title="Sign Out"
              className="text-textSecondary hover:text-danger p-1 rounded-small transition-colors shrink-0"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : (
          <Link
            href="/sign-in"
            className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-medium bg-backgroundElement hover:bg-backgroundSelected text-text hover:text-primary text-xs font-bold transition-all border border-border"
          >
            <User className="w-3.5 h-3.5" />
            <span>Sign In to Sync</span>
          </Link>
        )}

        <Link
          href="/"
          className="flex items-center justify-center gap-1 py-1 text-[11px] text-textMuted hover:text-text transition-colors"
        >
          <Info className="w-3 h-3" />
          <span>About Quranki</span>
        </Link>
      </div>
    </aside>
  );
}
