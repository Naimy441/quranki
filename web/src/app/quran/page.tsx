'use client';

import React from 'react';
import { SurahList } from '@/components/quran/surah-list';

export default function QuranDirectoryPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col gap-5 select-none animate-fadeIn">
      <div>
        <h1 className="text-2xl font-bold text-text">The Quran</h1>
        <p className="text-xs text-textSecondary mt-0.5">
          Read with Tajweed and spaced repetition vocabulary tracking
        </p>
      </div>

      <SurahList />
    </div>
  );
}
