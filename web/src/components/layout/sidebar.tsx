'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { Flame, LogIn, Play, Search } from 'lucide-react';
import { Wordmark } from '@/components/brand/logo';
import { useProgressStore } from '@/store/progress-store';
import { useAccountStore } from '@/store/account-store';
import { useStudyQueue } from '@/hooks/use-study-queue';
import { useHifzAvailable, useQuranCoverage } from '@/hooks/use-lemma-sets';
import { computeStreak } from '@/lib/stats';
import { countDueHifzCards } from '@/lib/hifz';
import { useHifzStore } from '@/store/hifz-store';
import { useCommandPalette } from '@/components/layout/command-palette';
import { NAV_ITEMS, isNavActive } from '@/components/layout/nav-items';
import { cn } from '@/lib/cn';

export function Sidebar() {
  const pathname = usePathname();
  const hydrated = useProgressStore((st) => st.hydrated);
  const reviewDates = useProgressStore((st) => st.reviewDates);
  const streakGraceDates = useProgressStore((st) => st.streakGraceDates);
  const email = useAccountStore((st) => st.email);
  const queue = useStudyQueue();
  const coverage = useQuranCoverage();
  const hifzAvailable = useHifzAvailable();
  const enrolledRukuIds = useHifzStore((st) => st.enrolledRukuIds);
  const hifzCards = useHifzStore((st) => st.cards);
  const hifzCounts = countDueHifzCards({ enrolledRukuIds, cards: hifzCards, introSeen: true }, queue.now);
  const palette = useCommandPalette();
  const streak = computeStreak(reviewDates, streakGraceDates, queue.now);
  const badge = queue.studyToday.length;
  const coveragePct = coverage ? Math.round(coverage.percentage * 10) / 10 : 0;

  return (
    <aside className="hidden lg:flex w-64 h-screen sticky top-0 flex-col shrink-0 border-r border-border bg-card/60 backdrop-blur-xl z-30">
      <div className="h-16 px-5 flex items-center">
        <Link href="/" aria-label="Quranki home">
          <Wordmark size={30} />
        </Link>
      </div>

      <div className="px-3">
        <button
          onClick={palette.open}
          className="w-full flex items-center gap-2.5 h-10 px-3 rounded-medium border border-border bg-backgroundElement/60 text-sm text-textMuted hover:text-textSecondary hover:border-primary/30 transition-colors"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">Search</span>
          <kbd className="kbd">⌘K</kbd>
        </button>
      </div>

      <nav className="p-3 space-y-0.5">
        {NAV_ITEMS.filter((item) => item.href !== '/memorize' || hifzAvailable).map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex items-center gap-3 h-10 px-3 rounded-medium text-sm transition-colors',
                active ? 'text-text font-semibold' : 'text-textSecondary hover:text-text hover:bg-backgroundElement',
              )}
            >
              {active && (
                <motion.span
                  layoutId="sidebar-active"
                  className="absolute inset-0 rounded-medium bg-backgroundSelected"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <Icon className={cn('relative w-[18px] h-[18px]', active && 'text-primary')} />
              <span className="relative">{item.label}</span>
              {item.href === '/memorize' && hifzCounts.due + hifzCounts.next > 0 && (
                <span className="relative ml-auto min-w-[22px] h-[22px] px-1.5 rounded-pill bg-primary/15 text-primary text-[11px] font-bold flex items-center justify-center">
                  {hifzCounts.due + hifzCounts.next}
                </span>
              )}
              {item.href === '/learn' && badge > 0 && (
                <span className="relative ml-auto min-w-[22px] h-[22px] px-1.5 rounded-pill bg-primary text-onPrimary text-[11px] font-bold flex items-center justify-center">
                  {badge}
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      <div className="mt-auto p-3 space-y-3">
        {hydrated && (
          <div className="rounded-large border border-border bg-backgroundElement/50 p-4 space-y-3.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-semibold text-textSecondary">Today</span>
              <span className={cn('flex items-center gap-1 font-bold', streak > 0 ? 'text-gold' : 'text-textMuted')}>
                <Flame className={cn('w-3.5 h-3.5', streak > 0 && 'fill-current')} />
                {streak} day{streak === 1 ? '' : 's'}
              </span>
            </div>
            <div>
              <div className="flex justify-between text-xs mb-1.5">
                <span className="text-textMuted">Quran understood</span>
                <span className="font-bold text-text">{coveragePct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-border overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, coveragePct)}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut' }}
                />
              </div>
            </div>
            {badge > 0 ? (
              <Link href="/session/review" className="btn-primary w-full h-9 text-xs">
                <Play className="w-3.5 h-3.5 fill-current" />
                Study {badge} {badge === 1 ? 'word' : 'words'}
              </Link>
            ) : (
              <p className="text-center text-xs text-textMuted">All caught up for today</p>
            )}
          </div>
        )}

        {hydrated && !email && (
          <Link
            href="/sign-in"
            className="flex items-center gap-2.5 h-10 px-3 rounded-medium text-sm text-textSecondary hover:text-text hover:bg-backgroundElement transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Sign in to sync
          </Link>
        )}
        {email && (
          <Link
            href="/settings#account"
            className="flex items-center gap-2.5 h-11 px-2 rounded-medium hover:bg-backgroundElement transition-colors"
          >
            <span className="w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-bold flex items-center justify-center">
              {email[0]?.toUpperCase()}
            </span>
            <span className="min-w-0 truncate text-sm text-textSecondary">{email}</span>
          </Link>
        )}
      </div>
    </aside>
  );
}
