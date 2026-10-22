'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
import { NAV_ITEMS, isNavActive } from '@/components/layout/nav-items';
import { useStudyQueue } from '@/hooks/use-study-queue';
import { useHifzAvailable } from '@/hooks/use-lemma-sets';
import { cn } from '@/lib/cn';

export function MobileNav() {
  const pathname = usePathname();
  const todayCount = useStudyQueue().studyToday.length;
  const hifzAvailable = useHifzAvailable();
  // The phone bar keeps five slots: Saved lives under Quran there, like the mobile app.
  const items = NAV_ITEMS.filter((i) => i.href !== '/saved' && (i.href !== '/memorize' || hifzAvailable));

  return (
    <nav className="lg:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-card/85 backdrop-blur-xl pb-safe">
      <div className="grid h-16" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = item.icon;
          const active = isNavActive(pathname, item.match);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'relative flex flex-col items-center justify-center gap-1 text-[11px] font-medium transition-colors',
                active ? 'text-primary' : 'text-textMuted',
              )}
            >
              {active && (
                <motion.span
                  layoutId="mobile-active"
                  className="absolute top-0 h-0.5 w-8 rounded-full bg-primary"
                  transition={{ type: 'spring', stiffness: 500, damping: 40 }}
                />
              )}
              <span className="relative">
                <Icon className="w-5 h-5" />
                {item.href === '/learn' && todayCount > 0 && (
                  <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-pill bg-primary text-onPrimary text-[9px] font-bold flex items-center justify-center">
                    {todayCount > 99 ? '99+' : todayCount}
                  </span>
                )}
              </span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
