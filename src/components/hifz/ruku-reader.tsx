import { type ReactNode, useMemo, useState } from 'react';
import { StyleSheet, View } from 'react-native';

import { AyahMarkSheet } from '@/components/quran/ayah-mark-sheet';
import { RecitationPlayer } from '@/components/quran/recitation-player';
import { SurahPage } from '@/components/quran/surah-page';
import { WordDetailSheet } from '@/components/quran/word-detail-sheet';
import { getKnownLemmaIds } from '@/lib/known-words';
import { getHiddenLemmaIds, getMasteredStudyWordForLemmas } from '@/lib/levels';
import { getWordLemmaIds, hasEveryLemma } from '@/lib/quran-lemmas';
import type { ReaderWordRef } from '@/lib/quran-reader-types';
import { formatRukuAyahRange, getRecognizedLemmaIds, type Ruku } from '@/lib/ruku';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';
import { useRecitationStore } from '@/store/recitation-store';

interface RukuReaderProps {
  ruku: Ruku;
  extraBottomPadding?: number;
  footer?: ReactNode;
}

/** Full Quran reader chrome, clipped to one ruku. */
export function RukuReader({ ruku, extraBottomPadding = 0, footer }: RukuReaderProps) {
  const progress = useProgressStore((s) => s.progress);
  const hiddenLemmaIds = useMemo(() => getHiddenLemmaIds(progress), [progress]);
  const knownWords = useKnownWordsStore((s) => s.knownWords);
  const markKnown = useKnownWordsStore((s) => s.markKnown);
  const unmarkKnown = useKnownWordsStore((s) => s.unmarkKnown);
  const knownLemmaIds = useMemo(() => getKnownLemmaIds(knownWords), [knownWords]);
  const recognizedLemmaIds = useMemo(
    () => getRecognizedLemmaIds(progress, knownWords),
    [knownWords, progress],
  );
  const arabicSize = useProgressStore((s) => s.settings.readerArabicSize);
  const glossSize = useProgressStore((s) => s.settings.readerGlossSize);
  const showTranslation = useProgressStore((s) => s.settings.readerShowTranslation);
  const showAyahCoverage = useProgressStore((s) => s.settings.readerShowAyahCoverage);
  const showTransliteration = useProgressStore((s) => s.settings.readerTransliteration);
  const transliterationSize = useProgressStore((s) => s.settings.readerTransliterationSize);
  const [selectedWord, setSelectedWord] = useState<ReaderWordRef | null>(null);
  const [markAyah, setMarkAyah] = useState<number | null>(null);
  const playerVisible = useRecitationStore((s) => s.visible);

  return (
    <View style={styles.flex}>
      <SurahPage
        surahNumber={ruku.surah}
        showTranslation={showTranslation}
        showTransliteration={showTransliteration}
        arabicSize={arabicSize}
        glossSize={glossSize}
        transliterationSize={transliterationSize}
        hiddenLemmaIds={hiddenLemmaIds}
        knownLemmaIds={knownLemmaIds}
        recognizedLemmaIds={recognizedLemmaIds}
        showAyahCoverage={showAyahCoverage}
        onLongPressWord={setSelectedWord}
        onOpenMarks={setMarkAyah}
        isActive
        fromAyah={ruku.fromAyah}
        toAyah={ruku.toAyah}
        headerMeta={`Ruku ${ruku.surahRukuNumber} - ${formatRukuAyahRange(ruku)}`}
        initialBatch={ruku.ayahCount}
        extraBottomPadding={extraBottomPadding}
        includeTabInset={false}
        footer={footer}
      />
      {playerVisible ? <RecitationPlayer /> : null}

      <AyahMarkSheet surah={ruku.surah} ayah={markAyah} onDismiss={() => setMarkAyah(null)} />
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
          if (ids.length === 0) return;
          markKnown(ids, word.ar.map((seg) => seg.t).join(''));
        }}
        onForget={(word) => {
          const ids = getWordLemmaIds(word);
          if (ids.length === 0) return;
          unmarkKnown(ids);
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
});
