'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ChevronRight } from 'lucide-react';
import { SURAH_INDEX, getSurahNameGlyph } from '@/lib/quran-data';
import { useProgress } from '@/context/progress-context';
import { getAllSurahsUnderstanding } from '@/lib/quran-coverage';

export function SurahList() {
  const { progress, hydrated } = useProgress();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'meccan' | 'medinan'>('all');

  const understandingList = hydrated ? getAllSurahsUnderstanding(progress) : [];
  const understandingMap = new Map(understandingList.map((u) => [u.surahNumber, u.percentage]));

  const filteredSurahs = SURAH_INDEX.filter((surah) => {
    if (filter !== 'all' && surah.rp !== filter) return false;
    if (!search.trim()) return true;
    const q = search.toLowerCase().trim();
    return (
      surah.n.toString() === q ||
      surah.en.toLowerCase().includes(q) ||
      surah.ar.includes(q) ||
      surah.nt.toLowerCase().includes(q)
    );
  });

  return (
    <div className="flex flex-col gap-4">
      {/* Search & Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-2.5 items-stretch sm:items-center justify-between">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search surah..."
            className="w-full pl-10 pr-4 py-2 rounded-medium bg-card border border-border text-sm text-text placeholder-textMuted focus:outline-none focus:border-primary transition-colors"
          />
        </div>

        <div className="flex items-center gap-1 bg-card border border-border rounded-medium p-1 self-start sm:self-auto">
          {(['all', 'meccan', 'medinan'] as const).map((mode) => (
            <button
              key={mode}
              onClick={() => setFilter(mode)}
              className={`px-3 py-1 rounded-small text-xs font-bold capitalize transition-colors ${
                filter === mode
                  ? 'bg-backgroundSelected text-primary'
                  : 'text-textSecondary hover:text-text'
              }`}
            >
              {mode}
            </button>
          ))}
        </div>
      </div>

      {/* Surah List matching mobile SurahListRow, optimized for responsive desktop */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {filteredSurahs.map((surah) => {
          const glyph = getSurahNameGlyph(surah.n);
          const comp = understandingMap.get(surah.n) ?? 0;

          return (
            <Link
              key={surah.n}
              href={`/quran/${surah.n}`}
              className="group flex items-center gap-3.5 p-3.5 rounded-large bg-card border border-border hover:border-textMuted/40 transition-all select-none"
            >
              {/* Lead Column with Number badge and Ayah count */}
              <div className="flex flex-col items-center justify-center min-w-[42px] gap-0.5 shrink-0">
                <div className="w-9 h-9 rounded-medium bg-backgroundSelected flex items-center justify-center font-bold text-sm text-primary">
                  {surah.n}
                </div>
                <div className="text-[10px] text-textMuted font-medium leading-none">
                  {surah.ac} ayahs
                </div>
              </div>

              {/* Info Column */}
              <div className="flex-1 min-w-0 flex flex-col gap-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-text truncate group-hover:text-primary transition-colors">
                    {surah.en}
                  </span>
                  {comp > 0 && (
                    <span className="text-[11px] font-bold text-primary bg-backgroundSelected px-1.5 py-0.2 rounded-small">
                      {comp}%
                    </span>
                  )}
                </div>
                <p className="text-xs text-textSecondary truncate">
                  {surah.nt} - {surah.rp === 'meccan' ? 'Meccan' : 'Medinan'}
                </p>
              </div>

              {/* Trailing Calligraphic Name & Chevron */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="surah-name-glyph text-3xl text-text leading-none select-none">
                  {glyph}
                </span>
                <ChevronRight className="w-4 h-4 text-textMuted group-hover:translate-x-0.5 transition-transform" />
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
