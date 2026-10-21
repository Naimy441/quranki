'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Flame,
  Clock,
  Search,
  CheckCircle2,
  Volume2,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { useProgress } from '@/context/progress-context';
import { useRecitation } from '@/context/recitation-context';
import { calculateMemorizedWords, getAllSurahsUnderstanding, TOTAL_QURAN_WORDS } from '@/lib/quran-coverage';
import { deserializeCard, isWordMastered } from '@/lib/fsrs';
import { getWord } from '@/lib/levels';
import { getVocabExampleRefs } from '@/lib/vocab-examples';

export default function ProgressPage() {
  const { progress, streak, studySeconds, hydrated } = useProgress();
  const { playWordAudio } = useRecitation();
  const [wordSearch, setWordSearch] = useState('');

  const { count: memorizedCount, percentage } = calculateMemorizedWords(progress);
  const surahsUnderstanding = getAllSurahsUnderstanding(progress);

  let masteredCount = 0;
  let learningCount = 0;
  const learnedWordsList: { wordId: string; mastered: boolean }[] = [];

  for (const [id, wp] of Object.entries(progress)) {
    const card = deserializeCard(wp.card);
    const isM = Boolean(isWordMastered(card) || wp.autoMastered);
    if (isM) {
      masteredCount++;
    } else {
      learningCount++;
    }
    learnedWordsList.push({ wordId: id, mastered: isM });
  }

  const studyHours = Math.floor(studySeconds / 3600);
  const studyMinutes = Math.floor((studySeconds % 3600) / 60);

  const filteredLearned = learnedWordsList
    .map((item) => ({ ...item, word: getWord(item.wordId) }))
    .filter((item) => {
      if (!item.word) return false;
      if (!wordSearch.trim()) return true;
      const q = wordSearch.toLowerCase().trim();
      return (
        item.word.arabic.includes(q) ||
        item.word.english.toLowerCase().includes(q) ||
        item.word.transliteration?.toLowerCase().includes(q)
      );
    });

  if (!hydrated) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8 animate-pulse space-y-4">
        <div className="h-40 rounded-large bg-card border border-border" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-6 flex flex-col gap-6 select-none animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Progress & Coverage</h1>
        <p className="text-xs text-textSecondary mt-0.5">
          Vocabulary retention and Quran comprehension tracking
        </p>
      </div>

      {/* Hero Coverage Card */}
      <div className="p-6 rounded-large bg-card border border-border shadow-xs flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="space-y-3 flex-1">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">
            Quran Vocabulary Coverage
          </span>
          <h2 className="text-3xl font-extrabold text-text">
            {percentage}% of the Quran
          </h2>
          <p className="text-xs text-textSecondary leading-relaxed">
            You know <strong className="text-text">{memorizedCount.toLocaleString()}</strong> of the{' '}
            {TOTAL_QURAN_WORDS.toLocaleString()} total word occurrences in the Quran.
          </p>

          <div className="w-full bg-backgroundElement border border-border h-2 rounded-full overflow-hidden">
            <div
              className="bg-primary h-full rounded-full transition-all duration-700"
              style={{ width: `${Math.min(100, percentage)}%` }}
            />
          </div>
        </div>

        {/* Circular Percentage Stat */}
        <div className="w-28 h-28 rounded-full border-4 border-backgroundElement flex items-center justify-center p-2 bg-backgroundSelected shrink-0">
          <div className="text-center">
            <div className="text-2xl font-black text-primary">{percentage}%</div>
            <div className="text-[10px] text-textMuted uppercase font-bold">Coverage</div>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-4 rounded-medium bg-card border border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between text-textMuted">
            <span className="text-[11px] font-bold uppercase">Streak</span>
            <Flame className="w-4 h-4 fill-primary text-primary" />
          </div>
          <div className="text-xl font-bold text-text">
            {streak} {streak === 1 ? 'day' : 'days'}
          </div>
        </div>

        <div className="p-4 rounded-medium bg-card border border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between text-textMuted">
            <span className="text-[11px] font-bold uppercase">Mastered</span>
            <CheckCircle2 className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl font-bold text-text">{masteredCount}</div>
        </div>

        <div className="p-4 rounded-medium bg-card border border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between text-textMuted">
            <span className="text-[11px] font-bold uppercase">Learning</span>
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl font-bold text-text">{learningCount}</div>
        </div>

        <div className="p-4 rounded-medium bg-card border border-border shadow-xs space-y-1">
          <div className="flex items-center justify-between text-textMuted">
            <span className="text-[11px] font-bold uppercase">Time</span>
            <Clock className="w-4 h-4 text-primary" />
          </div>
          <div className="text-xl font-bold text-text">
            {studyHours}h {studyMinutes}m
          </div>
        </div>
      </div>

      {/* Surah Understanding Matrix */}
      <div className="p-5 rounded-large bg-card border border-border shadow-xs space-y-3">
        <h3 className="text-sm font-bold text-text">
          Surah Comprehension Matrix
        </h3>

        <div className="max-h-80 overflow-y-auto rounded-medium border border-border">
          <table className="w-full text-left text-xs">
            <thead className="bg-backgroundElement text-textMuted font-bold uppercase sticky top-0 border-b border-border">
              <tr>
                <th className="p-3">#</th>
                <th className="p-3">Surah</th>
                <th className="p-3">Words</th>
                <th className="p-3">Comprehension</th>
                <th className="p-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {surahsUnderstanding.map((s) => (
                <tr key={s.surahNumber} className="hover:bg-backgroundElement/50 transition-colors">
                  <td className="p-3 font-mono text-textMuted">{s.surahNumber}</td>
                  <td className="p-3 font-bold text-text">
                    {s.nameEn}{' '}
                    <span className="uthmanic-text font-normal text-sm text-textMuted ml-1.5">
                      {s.nameAr}
                    </span>
                  </td>
                  <td className="p-3 text-textSecondary">{s.totalWords} words</td>
                  <td className="p-3">
                    <div className="flex items-center gap-2">
                      <div className="w-16 bg-backgroundElement border border-border h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-primary h-full rounded-full"
                          style={{ width: `${s.percentage}%` }}
                        />
                      </div>
                      <span className="font-bold text-text">{s.percentage}%</span>
                    </div>
                  </td>
                  <td className="p-3 text-right">
                    <Link
                      href={`/quran/${s.surahNumber}`}
                      className="font-bold text-primary hover:underline inline-flex items-center gap-0.5"
                    >
                      <span>Read</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Studied Words Explorer */}
      <div className="p-5 rounded-large bg-card border border-border shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <h3 className="text-sm font-bold text-text">
            Studied Vocabulary ({learnedWordsList.length} words)
          </h3>

          <div className="relative w-full sm:w-56">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-textMuted" />
            <input
              type="text"
              value={wordSearch}
              onChange={(e) => setWordSearch(e.target.value)}
              placeholder="Search words..."
              className="w-full pl-8 pr-3 py-1.5 rounded-medium bg-backgroundElement border border-border text-xs text-text placeholder-textMuted focus:outline-none"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-80 overflow-y-auto">
          {filteredLearned.map((item) => {
            if (!item.word) return null;
            const w = item.word;
            const refs = getVocabExampleRefs(w);

            return (
              <div
                key={item.wordId}
                className="p-3 rounded-medium border border-border bg-backgroundElement/40 flex items-center justify-between gap-2"
              >
                <div>
                  <div className="uthmanic-text text-lg font-bold text-text">
                    {w.arabic}
                  </div>
                  <div className="text-xs font-medium text-textSecondary">
                    {w.english}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {refs.length > 0 && (
                    <button
                      onClick={() => playWordAudio(refs[0].s, refs[0].a, refs[0].p)}
                      title="Play pronunciation"
                      className="p-1.5 rounded-small text-textSecondary hover:text-primary hover:bg-backgroundSelected transition-colors"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                  {item.mastered ? (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-backgroundSelected text-primary">
                      Mastered
                    </span>
                  ) : (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-backgroundElement text-textSecondary border border-border">
                      Learning
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
