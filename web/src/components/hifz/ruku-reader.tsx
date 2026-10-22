'use client';

import React, { useEffect, useState } from 'react';
import { AyahBlock } from '@/components/quran/ayah-block';
import { AyahMarkDialog } from '@/components/quran/ayah-mark-dialog';
import { WordDetailSheet } from '@/components/quran/word-detail-sheet';
import { getMasteredStudyWordForLemmas } from '@/lib/levels';
import { getWordLemmaIds, hasEveryLemma } from '@/lib/quran-lemmas';
import { getSurahAyahs, getSurahMeta, loadSurahAyahs, useQuranDataVersion } from '@/lib/quran-reader';
import type { ReaderWordRef } from '@/lib/quran-reader-types';
import { formatRukuAyahRange, type Ruku } from '@/lib/ruku';
import { useHiddenLemmaIds, useKnownLemmaIds, useRecognizedLemmaIds } from '@/hooks/use-lemma-sets';
import { useIsDark } from '@/hooks/use-is-dark';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';
import { ensureTranslationSurahLoaded } from '@/store/translation-store';

/** The ayahs of one ruku, with the full reader interactions (as the mobile hifz back side). */
export function RukuReader({ ruku, footer }: { ruku: Ruku; footer?: React.ReactNode }) {
  useQuranDataVersion((s) => s.version);
  const isDark = useIsDark();
  const progress = useProgressStore((s) => s.progress);
  const translationKey = useProgressStore((s) => s.settings.selectedTranslationKey);
  const hiddenLemmaIds = useHiddenLemmaIds();
  const knownLemmaIds = useKnownLemmaIds();
  const recognizedLemmaIds = useRecognizedLemmaIds();
  const markKnown = useKnownWordsStore((s) => s.markKnown);
  const unmarkKnown = useKnownWordsStore((s) => s.unmarkKnown);
  const [selectedWord, setSelectedWord] = useState<ReaderWordRef | null>(null);
  const [markAyah, setMarkAyah] = useState<number | null>(null);
  const meta = getSurahMeta(ruku.surah);
  const ayahs = getSurahAyahs(ruku.surah).filter((a) => a.a >= ruku.fromAyah && a.a <= ruku.toAyah);

  useEffect(() => {
    void loadSurahAyahs(ruku.surah).catch(() => {});
    ensureTranslationSurahLoaded(translationKey, ruku.surah);
  }, [ruku.surah, translationKey]);

  return (
    <div>
      <div className="mb-3 text-center text-sm text-textSecondary">
        {meta?.en} - Ruku {ruku.surahRukuNumber} - {formatRukuAyahRange(ruku)}
      </div>
      <div className="card overflow-hidden">
        {ayahs.length === 0 ? (
          <div className="p-6 space-y-3">
            <div className="skeleton h-16" />
            <div className="skeleton h-16" />
          </div>
        ) : (
          ayahs.map((ayah) => (
            <AyahBlock
              key={ayah.a}
              ayah={ayah}
              surahNumber={ruku.surah}
              surahName={meta?.en ?? ''}
              isDark={isDark}
              hiddenLemmaIds={hiddenLemmaIds}
              knownLemmaIds={knownLemmaIds}
              recognizedLemmaIds={recognizedLemmaIds}
              playbackFromAyah={ruku.fromAyah}
              playbackToAyah={ruku.toAyah}
              onOpenWord={setSelectedWord}
              onOpenMarks={setMarkAyah}
            />
          ))
        )}
      </div>
      {footer}
      <AyahMarkDialog surah={ruku.surah} ayah={markAyah} onDismiss={() => setMarkAyah(null)} />
      <WordDetailSheet
        selection={selectedWord}
        isKnown={selectedWord !== null && hasEveryLemma(selectedWord.word, knownLemmaIds)}
        masteredLevel={
          selectedWord && !hasEveryLemma(selectedWord.word, knownLemmaIds)
            ? getMasteredStudyWordForLemmas(getWordLemmaIds(selectedWord.word), progress)?.level
            : undefined
        }
        onDismiss={() => setSelectedWord(null)}
        onMarkKnown={(word) => {
          const ids = getWordLemmaIds(word);
          if (ids.length > 0) markKnown(ids, word.ar.map((s) => s.t).join(''));
        }}
        onForget={(word) => {
          const ids = getWordLemmaIds(word);
          if (ids.length > 0) unmarkKnown(ids);
        }}
      />
    </div>
  );
}
