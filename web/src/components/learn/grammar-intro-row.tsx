'use client';

import Link from 'next/link';
import { ChevronRight, Sparkles } from 'lucide-react';
import { displayArabic } from '@/lib/arabic-display';
import type { Word } from '@/lib/levels';

/** A level's one-time grammar lesson, shown above it in the curriculum. */
export function GrammarIntroRow({ word }: { word: Word }) {
  return (
    <Link href={`/grammar/${word.id}`} className="card flex items-center gap-3 px-4 py-3 hover:border-primary/40 transition-colors">
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-backgroundSelected text-primary">
        <Sparkles className="w-4 h-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-semibold">{word.english}</span>
        <span className="flex items-center gap-2 text-xs text-textMuted">
          <span className="uthmanic-text text-base text-text">{displayArabic(word)}</span> Pattern
        </span>
      </span>
      <ChevronRight className="w-4 h-4 text-textMuted" />
    </Link>
  );
}
