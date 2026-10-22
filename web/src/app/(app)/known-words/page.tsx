'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Search, Trash2, XCircle } from 'lucide-react';
import { getMasteredLemmaIds } from '@/lib/levels';
import { getQuranLemma, lemmaIdFromStorageKey, lemmaStorageKey, type LemmaId } from '@/lib/quran-lemmas';
import { formatCount } from '@/lib/stats';
import { useStoresHydrated } from '@/components/providers/app-state';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';

const HARAKAT = /[ـً-ٰٟۖ-ۭ]/g;
const fold = (t: string) => t.replace(HARAKAT, '').toLowerCase();

/** Every recognized lemma: mastered in reviews or marked known in the reader. */
export default function KnownWordsPage() {
  const hydrated = useStoresHydrated();
  const [query, setQuery] = useState('');
  const knownWords = useKnownWordsStore((s) => s.knownWords);
  const unmarkKnown = useKnownWordsStore((s) => s.unmarkKnown);
  const clearAllKnown = useKnownWordsStore((s) => s.clearAllKnown);
  const progress = useProgressStore((s) => s.progress);
  const mastered = useMemo(() => getMasteredLemmaIds(progress), [progress]);

  const all = useMemo(() => {
    const manual = Object.keys(knownWords).map(lemmaIdFromStorageKey).filter((id): id is LemmaId => id !== undefined);
    const ids = new Set([...mastered, ...manual]);
    return [...ids]
      .map((id) => {
        const entry = knownWords[lemmaStorageKey(id)];
        const lemma = getQuranLemma(id);
        return {
          id,
          arabic: lemma?.arabic ?? entry?.sampleArabic ?? String(id),
          english: `${formatCount(lemma?.frequency ?? 0)} occurrences`,
          frequency: lemma?.frequency ?? 0,
          manual: entry !== undefined,
        };
      })
      .sort((a, b) => b.frequency - a.frequency || a.arabic.localeCompare(b.arabic));
  }, [knownWords, mastered]);
  const needle = fold(query.trim());
  const entries = needle ? all.filter((r) => fold(r.arabic).includes(needle) || fold(r.english).includes(needle)) : all;

  return (
    <div className="mx-auto max-w-3xl px-4 lg:px-8 py-6 lg:py-10">
      <Link href="/settings" className="btn-ghost -ml-3 h-9 px-3 text-xs">
        <ArrowLeft className="w-4 h-4" /> Settings
      </Link>
      <div className="mt-2 flex items-center justify-between gap-3">
        <h1 className="font-display text-4xl tracking-tight">Known words</h1>
        {Object.keys(knownWords).length > 0 && (
          <button
            onClick={() => {
              if (window.confirm("Clear all known words?\nThis un-hides every word you've manually marked as known in the Quran reader. This cannot be undone.")) clearAllKnown();
            }}
            className="btn-ghost h-9 px-3 text-danger hover:bg-danger/10 hover:text-danger"
          >
            <Trash2 className="w-4 h-4" /> Clear marked
          </button>
        )}
      </div>
      <p className="mt-2 text-sm text-textSecondary">
        {!hydrated
          ? ''
          : all.length === 0
            ? 'No recognized words yet'
            : query.trim()
              ? `${formatCount(entries.length)} of ${formatCount(all.length)} recognized ${all.length === 1 ? 'word' : 'words'}`
              : `${formatCount(all.length)} recognized ${all.length === 1 ? 'word' : 'words'}`}
      </p>
      <div className="relative mt-4">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-textMuted" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search recognized words" className="input pl-10" />
      </div>
      <div className="mt-4 card divide-y divide-border">
        {entries.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-textMuted">
            {query.trim() ? 'No known words match that search.' : 'Right-click a word in the Quran and choose "I already know this word" to hide its translation.'}
          </p>
        ) : (
          entries.slice(0, 600).map((row) => (
            <div key={row.id} className="flex items-center gap-3 px-4 py-2.5">
              <span className="flex-1 min-w-0">
                <span className="uthmanic-text block text-2xl leading-[1.8]">{row.arabic}</span>
                <span className="block text-xs text-textSecondary">{row.english}</span>
              </span>
              {row.manual ? (
                <button
                  onClick={() => {
                    if (window.confirm('Forget this word?\nIts translation will show again in the Quran reader.')) unmarkKnown([row.id]);
                  }}
                  className="icon-btn h-8 w-8"
                  title="Forget this word"
                >
                  <XCircle className="w-5 h-5" />
                </button>
              ) : (
                <span className="text-xs text-textMuted">Mastered</span>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
