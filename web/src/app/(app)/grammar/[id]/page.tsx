'use client';

import React, { use } from 'react';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getWord } from '@/lib/levels';
import { GrammarCard } from '@/components/session/grammar-card';

export default function GrammarIntroPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const word = getWord(decodeURIComponent(id));
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 lg:py-10">
      <Link href="/learn" className="btn-ghost -ml-3 h-9 px-3 text-xs">
        <ArrowLeft className="w-4 h-4" /> Levels
      </Link>
      <div className="card mt-4 p-6 sm:p-10">
        {word && word.kind === 'grammar' ? <GrammarCard word={word} /> : <p className="text-textMuted">Lesson not found.</p>}
      </div>
    </div>
  );
}
