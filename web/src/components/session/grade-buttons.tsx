'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { previewGrades, type Card, type GradeName, type GradePreview } from '@/lib/fsrs';
import { cn } from '@/lib/cn';

const META: Record<GradeName, { label: string; key: string; className: string }> = {
  again: { label: 'Again', key: '1', className: 'bg-gradeAgain' },
  hard: { label: 'Hard', key: '2', className: 'bg-gradeHard' },
  good: { label: 'Good', key: '3', className: 'bg-gradeGood' },
  easy: { label: 'Easy', key: '4', className: 'bg-gradeEasy' },
};

export function GradeButtons({
  card,
  previews: given,
  onGrade,
}: {
  card?: Card;
  previews?: GradePreview[];
  onGrade: (grade: GradeName) => void;
}) {
  const previews = given ?? (card ? previewGrades(card) : []);
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 26 }}
      className="grid grid-cols-4 gap-2"
    >
      {previews.map((p) => {
        const m = META[p.grade];
        return (
          <button
            key={p.grade}
            type="button"
            onClick={() => onGrade(p.grade)}
            className={cn(
              'relative h-16 rounded-large text-white flex flex-col items-center justify-center transition-all hover:brightness-110 active:scale-[0.97]',
              m.className,
            )}
          >
            <span className="text-[15px] font-semibold leading-tight">{m.label}</span>
            <span className="text-xs text-white/80">{p.label}</span>
            <span className="hidden md:block absolute top-1.5 right-2 text-[10px] font-mono text-white/60">{m.key}</span>
          </button>
        );
      })}
    </motion.div>
  );
}
