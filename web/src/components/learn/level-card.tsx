'use client';

import React from 'react';
import Link from 'next/link';
import { ChevronRight } from 'lucide-react';
import { ProgressRing } from '@/components/quranki/progress-ring';
import {
  isQaidaLevel,
  levelDisplayNumber,
  type LevelStatus,
} from '@/lib/levels';

interface LevelCardProps {
  status: LevelStatus;
  isCurrent: boolean;
  learnToRead: boolean;
}

export function LevelCard({ status, isCurrent, learnToRead }: LevelCardProps) {
  const { level, masteredCount, totalCount, dueCount, newCount } = status;
  const progress = totalCount === 0 ? 0 : masteredCount / totalCount;
  const introduced = totalCount - newCount;

  return (
    <Link
      href={`/level/${level.number}`}
      className={`group flex items-center gap-4 p-4 rounded-large border transition-all duration-150 bg-card select-none ${
        isCurrent ? 'border-primary' : 'border-border hover:border-textMuted/40'
      }`}
    >
      {/* Progress Ring with Level Number */}
      <ProgressRing
        progress={progress}
        size={52}
        strokeWidth={4}
        color="rgb(var(--primary-rgb))"
        trackColor="var(--background-element)"
      >
        <span className="text-sm font-bold text-text">
          {levelDisplayNumber(level.number, learnToRead)}
        </span>
      </ProgressRing>

      {/* Info column */}
      <div className="flex-1 min-w-0 flex flex-col gap-0.5">
        <h3 className="text-sm font-bold text-text truncate group-hover:text-primary transition-colors">
          {level.title}
        </h3>
        <p className="text-xs text-textSecondary">
          {introduced === 0
            ? `${totalCount} ${isQaidaLevel(level.number) ? 'cards' : 'words'} - not started`
            : `${masteredCount} of ${totalCount} mastered`}
        </p>
      </div>

      {/* Trailing Due Badge or Chevron */}
      {dueCount > 0 ? (
        <span className="min-w-[26px] h-[26px] px-2 rounded-full bg-primary text-onPrimary text-xs font-bold flex items-center justify-center shrink-0">
          {dueCount}
        </span>
      ) : (
        <ChevronRight className="w-5 h-5 text-textMuted group-hover:translate-x-0.5 transition-transform shrink-0" />
      )}
    </Link>
  );
}
