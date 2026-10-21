'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import {
  Play,
  Pause,
  Bookmark,
  Share2,
  Sliders,
  ChevronLeft,
  ChevronRight,
  Info,
  Languages,
} from 'lucide-react';
import {
  fetchSurahAyahs,
  getSurahMeta,
  getSurahNameGlyph,
  BISMILLAH_WORDS,
  type ReaderWord,
  type ReaderAyah,
} from '@/lib/quran-data';
import { useProgress } from '@/context/progress-context';
import { useRecitation } from '@/context/recitation-context';
import { getMasteredLemmaIds } from '@/lib/levels';
import { WordCell } from '@/components/quran/word-cell';
import { WordModal } from '@/components/quran/word-modal';
import { ReaderSettingsModal } from '@/components/quran/reader-settings-modal';

interface SurahViewProps {
  surahNumber: number;
}

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
function toArabicIndic(n: number): string {
  return String(n).replace(/\d/g, (d) => ARABIC_INDIC[Number(d)] ?? d);
}

export function SurahView({ surahNumber }: SurahViewProps) {
  const { settings, updateSettings, progress, toggleBookmark, isBookmarked } = useProgress();
  const {
    currentSurah,
    currentAyah,
    currentWordIndex,
    isPlaying,
    playAyah,
  } = useRecitation();

  const [ayahs, setAyahs] = useState<ReaderAyah[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [selectedWord, setSelectedWord] = useState<ReaderWord | null>(null);
  const [activeWordAyah, setActiveWordAyah] = useState<number>(1);
  const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
  const [activeFootnote, setActiveFootnote] = useState<{ n: string; fn: string } | null>(null);

  const surahMeta = getSurahMeta(surahNumber);
  const masteredLemmas = getMasteredLemmaIds(progress);
  const glyph = getSurahNameGlyph(surahNumber);

  useEffect(() => {
    let active = true;
    setLoading(true);
    fetchSurahAyahs(surahNumber).then((data) => {
      if (active) {
        setAyahs(data);
        setLoading(false);
      }
    });
    return () => {
      active = false;
    };
  }, [surahNumber]);

  // Smoothly scroll reciting ayah into view
  useEffect(() => {
    if (isPlaying && currentSurah === surahNumber && currentAyah) {
      const el = document.getElementById(`ayah-${currentAyah}`);
      if (el) {
        el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }
  }, [isPlaying, currentSurah, currentAyah, surahNumber]);

  const isDark = settings.theme !== 'light';

  const handleCopyAyah = (ayah: ReaderAyah) => {
    const arabic = ayah.w.map((w) => w.ar.map((s) => s.t).join('')).join(' ');
    const english = ayah.tr.map((part) => (part.t !== undefined ? part.t : '')).join('');
    const text = `${surahMeta?.en || 'Surah'} ${surahNumber}:${ayah.a}\n${arabic}\n${english}`;
    navigator.clipboard.writeText(text);
  };

  const handleWordClick = (word: ReaderWord, ayahNum: number) => {
    setSelectedWord(word);
    setActiveWordAyah(ayahNum);
  };

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-6 flex flex-col gap-5 animate-fadeIn">
      {/* Top Reader Navigation Bar */}
      <div className="flex items-center justify-between gap-3 p-3.5 rounded-large bg-card border border-border select-none shadow-2xs">
        <div className="flex items-center gap-2">
          {surahNumber > 1 ? (
            <Link
              href={`/quran/${surahNumber - 1}`}
              className="p-1.5 rounded-medium text-textSecondary hover:text-text hover:bg-backgroundElement transition-colors"
              title="Previous Surah"
            >
              <ChevronLeft className="w-5 h-5" />
            </Link>
          ) : (
            <div className="w-8" />
          )}

          <div className="font-bold text-sm text-text flex items-center gap-1.5">
            <span>{surahMeta?.en}</span>
            <span className="text-xs text-textMuted font-normal">
              ({surahMeta?.nt}) - {surahNumber}
            </span>
          </div>

          {surahNumber < 114 ? (
            <Link
              href={`/quran/${surahNumber + 1}`}
              className="p-1.5 rounded-medium text-textSecondary hover:text-text hover:bg-backgroundElement transition-colors"
              title="Next Surah"
            >
              <ChevronRight className="w-5 h-5" />
            </Link>
          ) : (
            <div className="w-8" />
          )}
        </div>

        <div className="flex items-center gap-1.5">
          <Link
            href="/quran"
            className="px-2.5 py-1 rounded-medium text-xs font-bold text-textSecondary hover:text-text hover:bg-backgroundElement transition-colors"
          >
            All Surahs
          </Link>

          {/* Translation Toggle Button */}
          <button
            onClick={() =>
              updateSettings({ readerShowTranslation: !settings.readerShowTranslation })
            }
            className={`flex items-center gap-1 px-2.5 py-1 rounded-medium text-xs font-bold transition-colors ${
              settings.readerShowTranslation
                ? 'bg-backgroundSelected text-primary border border-primary/20'
                : 'text-textSecondary hover:text-text hover:bg-backgroundElement'
            }`}
            title={settings.readerShowTranslation ? 'Hide Translation' : 'Show Translation'}
          >
            <Languages className="w-3.5 h-3.5" />
            <span>Translation</span>
          </button>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-medium text-textSecondary hover:text-text hover:bg-backgroundElement transition-colors"
            title="Display Settings"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Unified Reading Document (All Verses Clean & Together) */}
      <div className="bg-card border border-border rounded-large shadow-xs overflow-hidden">
        {/* Surah Document Header Frame */}
        <div className="p-8 text-center border-b border-border space-y-3 bg-backgroundElement/20">
          <div className="surah-name-glyph text-6xl text-text py-1 select-none">
            {glyph}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-text tracking-tight">
              {surahMeta?.en} - {surahMeta?.nt}
            </h1>
            <p className="text-xs text-textSecondary mt-1 capitalize font-medium">
              {surahMeta?.rp} - {surahMeta?.ac} Verses
            </p>
          </div>

          {/* Bismillah Header (Except Surah 9 and Surah 1 where it is Ayah 1) */}
          {surahMeta?.b && (
            <div className="pt-5 pb-1 border-t border-border/60">
              <div className="uthmanic-text text-2xl text-text select-none">
                {BISMILLAH_WORDS.map((w, i) => (
                  <span key={i} className="mx-1">
                    {w.ar.map((s) => s.t).join('')}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Loading state */}
        {loading ? (
          <div className="p-16 text-center text-textMuted text-sm animate-pulse">
            Loading Surah text and Tajweed rules...
          </div>
        ) : (
          /* Continuous Verses Flow: Unified divide-y list without disjointed cards */
          <div className="divide-y divide-border/60">
            {ayahs.map((ayah) => {
              const isAyahActive = currentSurah === surahNumber && currentAyah === ayah.a;
              const bookmarked = isBookmarked(surahNumber, ayah.a);

              return (
                <div
                  key={ayah.a}
                  id={`ayah-${ayah.a}`}
                  className={`px-6 md:px-8 py-5 transition-colors relative group ${
                    isAyahActive
                      ? 'bg-primary/5'
                      : 'hover:bg-backgroundElement/30'
                  }`}
                >
                  {/* Left accent bar for currently reciting ayah */}
                  {isAyahActive && (
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
                  )}

                  {/* Ayah Header Toolbar */}
                  <div className="flex items-center justify-between pb-3 mb-2">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-7 h-7 rounded-full text-xs font-mono font-bold flex items-center justify-center transition-colors ${
                          isAyahActive
                            ? 'bg-primary text-onPrimary shadow-xs'
                            : 'bg-backgroundElement text-textSecondary group-hover:bg-backgroundSelected group-hover:text-primary'
                        }`}
                      >
                        {ayah.a}
                      </span>
                      <span className="text-xs text-textMuted font-mono">
                        {surahNumber}:{ayah.a}
                      </span>
                    </div>

                    {/* Inline Verse Actions */}
                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => playAyah(surahNumber, ayah.a)}
                        className={`p-1.5 rounded-medium transition-colors ${
                          isAyahActive && isPlaying
                            ? 'bg-primary text-onPrimary shadow-xs'
                            : 'text-textSecondary hover:text-text hover:bg-backgroundElement'
                        }`}
                        title={isAyahActive && isPlaying ? 'Pause Audio' : 'Play Ayah Audio'}
                      >
                        {isAyahActive && isPlaying ? (
                          <Pause className="w-3.5 h-3.5 fill-current" />
                        ) : (
                          <Play className="w-3.5 h-3.5 fill-current" />
                        )}
                      </button>

                      <button
                        onClick={() => toggleBookmark(surahNumber, ayah.a)}
                        className={`p-1.5 rounded-medium transition-colors ${
                          bookmarked
                            ? 'text-primary'
                            : 'text-textSecondary hover:text-text hover:bg-backgroundElement'
                        }`}
                        title="Bookmark Ayah"
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${bookmarked ? 'fill-primary' : ''}`} />
                      </button>

                      <button
                        onClick={() => handleCopyAyah(ayah)}
                        className="p-1.5 rounded-medium text-textSecondary hover:text-text hover:bg-backgroundElement transition-colors"
                        title="Copy Ayah text"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Word-by-Word Row */}
                  <div
                    className="flex flex-wrap flex-row-reverse items-center justify-start gap-y-3 gap-x-1"
                    dir="rtl"
                  >
                    {ayah.w.map((word, wIdx) => {
                      const isWordSpeaking =
                        isAyahActive && isPlaying && currentWordIndex === wIdx;
                      const isMastered = word.l
                        ? Array.isArray(word.l)
                        ? word.l.some((lid) => masteredLemmas.has(lid))
                        : masteredLemmas.has(word.l)
                      : false;

                      return (
                        <WordCell
                          key={wIdx}
                          word={word}
                          isSpeaking={isWordSpeaking}
                          isDark={isDark}
                          arabicSize={settings.readerArabicFontSize || 32}
                          glossSize={
                            settings.readerTranslationFontSize
                              ? settings.readerTranslationFontSize - 3
                              : 13
                          }
                          transliterationSize={12}
                          showTranslation={settings.readerShowWbwGloss}
                          showTransliteration={settings.readerShowWbwTransliteration}
                          showTajweed={settings.readerShowTajweed}
                          hideLearnedWords={settings.readerHideLearnedWords}
                          isMastered={isMastered}
                          onClickWord={(w) => handleWordClick(w, ayah.a)}
                        />
                      );
                    })}

                    {/* End of Ayah Rosette Marker */}
                    <span
                      className="uthmanic-text text-primary select-none mx-1 text-center inline-block"
                      style={{
                        fontSize: `${settings.readerArabicFontSize || 32}px`,
                        lineHeight: `${(settings.readerArabicFontSize || 32) * 1.8}px`,
                      }}
                    >
                      {toArabicIndic(ayah.a)}
                    </span>
                  </div>

                  {/* Full Ayah Translation */}
                  {settings.readerShowTranslation && (
                    <div
                      className="mt-3.5 pt-2.5 text-textSecondary leading-relaxed"
                      style={{ fontSize: `${settings.readerTranslationFontSize || 14}px` }}
                    >
                      {ayah.tr.map((part, pIdx) => {
                        if (part.t !== undefined) {
                          return <span key={pIdx}>{part.t}</span>;
                        }
                        if (part.n !== undefined && part.fn !== undefined) {
                          return (
                            <button
                              key={pIdx}
                              onClick={() => setActiveFootnote({ n: part.n!, fn: part.fn! })}
                              className="inline-flex items-center text-[11px] text-primary hover:underline font-bold px-0.5"
                            >
                              [{part.n}]
                            </button>
                          );
                        }
                        return null;
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Word Detail Modal */}
      {selectedWord && (
        <WordModal
          word={selectedWord}
          ayahNumber={activeWordAyah}
          surahNumber={surahNumber}
          isDark={isDark}
          onClose={() => setSelectedWord(null)}
        />
      )}

      {/* Reader Settings Modal */}
      {isSettingsOpen && <ReaderSettingsModal onClose={() => setIsSettingsOpen(false)} />}

      {/* Footnote Modal */}
      {activeFootnote && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs select-none animate-fadeIn">
          <div className="bg-card border border-border rounded-large max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border">
              <h4 className="font-bold text-sm text-text flex items-center gap-2">
                <Info className="w-4 h-4 text-primary" /> Footnote [{activeFootnote.n}]
              </h4>
              <button
                onClick={() => setActiveFootnote(null)}
                className="text-textSecondary hover:text-text text-sm font-bold p-1"
              >
                ✕
              </button>
            </div>
            <p className="text-xs text-textSecondary leading-relaxed">{activeFootnote.fn}</p>
            <button
              onClick={() => setActiveFootnote(null)}
              className="w-full py-2 bg-backgroundElement hover:bg-backgroundSelected text-text text-xs font-bold rounded-medium transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
