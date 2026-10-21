'use client';

import React from 'react';
import { previewGrades, type Card, type GradeName } from '@/lib/fsrs';

interface GradeButtonsProps {
  card: Card;
  onGrade: (grade: GradeName) => void;
  disabled?: boolean;
}

const LABELS: Record<GradeName, string> = {
  again: 'Again',
  hard: 'Hard',
  good: 'Good',
  easy: 'Easy',
};

const GRADE_BG: Record<GradeName, string> = {
  again: 'bg-gradeAgain',
  hard: 'bg-gradeHard',
  good: 'bg-gradeGood',
  easy: 'bg-gradeEasy',
};

export function GradeButtons({ card, onGrade, disabled = false }: GradeButtonsProps) {
  const previews = previewGrades(card);

  return (
    <div className="w-full max-w-xl flex items-center gap-2 animate-fadeIn select-none">
      {previews.map((p) => {
        const bg = GRADE_BG[p.grade];
        return (
          <button
            key={p.grade}
            type="button"
            onClick={() => onGrade(p.grade)}
            disabled={disabled}
            className={`flex-1 py-4 px-2 rounded-medium ${bg} text-white flex flex-col items-center justify-center gap-0.5 shadow-xs transition-all duration-100 hover:opacity-90 active:scale-95 active:opacity-80`}
          >
            <span className="text-[15px] font-bold text-white leading-tight">
              {LABELS[p.grade]}
            </span>
            <span className="text-xs font-semibold text-white/90 leading-tight">
              {p.label}
            </span>
          </button>
        );
      })}
    </div>
  );
}
