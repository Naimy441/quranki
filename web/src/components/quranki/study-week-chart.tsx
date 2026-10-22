'use client';

import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useProgressStore } from '@/store/progress-store';
import { formatStudyDuration, studyTimeWeek } from '@/lib/stats';
import { cn } from '@/lib/cn';

export function StudyWeekChart({ days = 7, className }: { days?: number; className?: string }) {
  const studyMsByDate = useProgressStore((s) => s.studyMsByDate);
  const week = useMemo(() => studyTimeWeek(studyMsByDate, new Date(), days), [studyMsByDate, days]);
  const [hover, setHover] = useState<number | null>(null);
  const max = Math.max(...week.map((d) => d.ms), 10 * 60_000);
  const total = week.reduce((a, d) => a + d.ms, 0);
  const shown = hover !== null ? week[hover] : null;

  return (
    <div className={cn('card p-5', className)}>
      <div className="flex items-baseline justify-between">
        <h3 className="text-sm font-semibold">Study time</h3>
        <span className="text-xs text-textMuted">
          {shown ? (
            <>
              <span className="font-semibold text-text">{formatStudyDuration(shown.ms)}</span> {shown.caption}
            </>
          ) : (
            <>
              <span className="font-semibold text-text">{formatStudyDuration(total)}</span> last {days} days
            </>
          )}
        </span>
      </div>
      <div className="mt-4 flex h-28 items-end gap-2" onPointerLeave={() => setHover(null)}>
        {week.map((d, i) => {
          const h = d.ms > 0 ? Math.max(6, (d.ms / max) * 100) : 3;
          return (
            <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5 h-full justify-end" onPointerEnter={() => setHover(i)}>
              <motion.div
                initial={{ height: 0 }}
                animate={{ height: `${h}%` }}
                transition={{ type: 'spring', stiffness: 140, damping: 20, delay: i * 0.03 }}
                className={cn(
                  'w-full max-w-[34px] rounded-[7px] transition-colors',
                  d.ms === 0 ? 'bg-border' : d.isToday ? 'bg-primary' : 'bg-primary/45',
                  hover === i && 'bg-primary',
                )}
              />
              <span className={cn('text-[11px]', d.isToday ? 'font-bold text-text' : 'text-textMuted')}>{d.weekday}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
