'use client';

import React, { memo, useEffect, useState } from 'react';
import { Bookmark, Check, Copy, Languages, Loader2, MapPin, Pause, Play } from 'lucide-react';
import { WordCell } from '@/components/quran/word-cell';
import { Modal } from '@/components/ui/modal';
import { formatAppDigits } from '@/lib/arabic-digits';
import { hapticLight, hapticSelection, hapticSuccess } from '@/lib/haptics';
import { isHurufMuqattaatAyah } from '@/lib/huruf-muqattaat';
import type { LemmaId } from '@/lib/quran-lemmas';
import { buildAyahShareText } from '@/lib/quran-reader';
import type { ReaderAyah, ReaderWordRef, TranslationPart } from '@/lib/quran-reader-types';
import { getAyahUnderstanding } from '@/lib/quran-understanding';
import { getRukuStartingAt } from '@/lib/ruku';
import { getAyahTranslationParts } from '@/lib/translation-dataset';
import { findTranslationOption } from '@/lib/translations';
import { useMasteredArabicDigits } from '@/hooks/use-mastered-arabic-digits';
import { useProgressStore } from '@/store/progress-store';
import { useQuranMarksStore } from '@/store/quran-marks-store';
import { playAyah, useRecitationStore } from '@/store/recitation-store';
import { useTranslationDatasetStore } from '@/store/translation-store';
import { cn } from '@/lib/cn';

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const toArabicIndic = (n: number) => String(n).replace(/\d/g, (d) => ARABIC_INDIC[Number(d)] ?? d);

interface AyahBlockProps {
  ayah: ReaderAyah;
  surahNumber: number;
  surahName: string;
  isDark: boolean;
  hiddenLemmaIds: Set<LemmaId>;
  knownLemmaIds: Set<LemmaId>;
  recognizedLemmaIds: Set<LemmaId>;
  highlighted?: boolean;
  playbackFromAyah?: number;
  playbackToAyah?: number;
  onOpenWord?: (ref: ReaderWordRef) => void;
  onOpenMarks?: (ayah: number) => void;
}

export const AyahBlock = memo(function AyahBlock({
  ayah,
  surahNumber,
  surahName,
  isDark,
  hiddenLemmaIds,
  knownLemmaIds,
  recognizedLemmaIds,
  highlighted = false,
  playbackFromAyah,
  playbackToAyah,
  onOpenWord,
  onOpenMarks,
}: AyahBlockProps) {
  const settings = useProgressStore((s) => s.settings);
  const mastered = useMasteredArabicDigits();
  const isOpeningLetters = isHurufMuqattaatAyah(surahNumber, ayah.a);
  const understanding = getAyahUnderstanding(ayah, recognizedLemmaIds);
  const pinColors = useQuranMarksStore((s) =>
    s.pinPlacements
      .filter((p) => p.surah === surahNumber && p.ayah === ayah.a)
      .map((p) => s.pins.find((pin) => pin.id === p.pinId)?.color)
      .filter(Boolean)
      .join(','),
  );
  const bookmarkColors = useQuranMarksStore((s) =>
    s.bookmarks
      .filter((b) => b.surah === surahNumber && b.ayah === ayah.a)
      .map((b) => s.collections.find((c) => c.id === b.collectionId)?.color)
      .filter(Boolean)
      .join(','),
  );
  const bookmarked = bookmarkColors.length > 0;
  const [showFull, setShowFull] = useState(false);
  const [copied, setCopied] = useState(false);
  const rukuStart = settings.readerShowRukuMarkers ? getRukuStartingAt(surahNumber, ayah.a) : undefined;
  const selectedTranslationKey = settings.selectedTranslationKey;
  const dataset = useTranslationDatasetStore((s) => (s.key === selectedTranslationKey ? s.dataset : null));
  const parts =
    (!findTranslationOption(selectedTranslationKey)?.bundled && dataset && getAyahTranslationParts(dataset, surahNumber, ayah.a)) ||
    ayah.tr;
  const effectiveShowTranslation = settings.readerAlwaysShowTranslation || showFull;
  const playback = useRecitationStore((s) => {
    const active = s.visible && s.surahNumber === surahNumber && s.ayahNumber === ayah.a && !s.playingBismillah;
    if (!active) return 'idle' as const;
    return s.awaitingAudio && !s.playing ? ('loading' as const) : s.playing ? ('playing' as const) : ('paused' as const);
  });
  const speakingWord = useRecitationStore((s) =>
    s.visible && s.surahNumber === surahNumber && s.ayahNumber === ayah.a && !s.playingBismillah ? s.wordNumber : 0,
  );

  useEffect(() => {
    setShowFull(false);
    setCopied(false);
  }, [ayah.a]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(buildAyahShareText(surahName, ayah));
      hapticSuccess();
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Clipboard blocked.
    }
  };

  const showCoverage = settings.readerShowAyahCoverage && understanding.totalWords > 0;

  return (
    <article
      id={`ayah-${ayah.a}`}
      data-ayah={ayah.a}
      className="relative border-b border-border scroll-mt-32 [content-visibility:auto] [contain-intrinsic-size:auto_260px]"
    >
      {rukuStart && (
        <div className="border-y border-border bg-backgroundElement py-2 text-center text-[13px] font-semibold tracking-[0.12em] text-textSecondary">
          Ruku {formatAppDigits(String(rukuStart.surahRukuNumber), mastered)}
        </div>
      )}
      {playback !== 'idle' && <div className="pointer-events-none absolute inset-0 bg-backgroundSelected/40" />}
      <div className={cn('pointer-events-none absolute inset-0 bg-backgroundSelected transition-opacity duration-700', highlighted ? 'opacity-100' : 'opacity-0')} />

      <div className="relative group">
        <div className="flex items-start justify-between gap-3 px-4 sm:px-6 pt-3">
          <div className="flex flex-col items-start gap-0.5 min-w-[2.5rem]">
            <span className="text-sm font-semibold tabular-nums">{formatAppDigits(String(ayah.a), mastered)}</span>
            {showCoverage && (
              <span className="text-[11px] font-semibold text-primary tabular-nums" title="Share of this ayah's words you know">
                {formatAppDigits(String(Math.round(understanding.ratio * 100)), mastered)}%
              </span>
            )}
            {(pinColors || bookmarkColors) && (
              <span className="flex items-center gap-1">
                {pinColors.split(',').filter(Boolean).map((c, i) => (
                  <MapPin key={`p${i}`} className="w-3 h-3" style={{ color: c, fill: c }} />
                ))}
                {bookmarkColors.split(',').filter(Boolean).map((c, i) => (
                  <Bookmark key={`b${i}`} className="w-3 h-3" style={{ color: c, fill: c }} />
                ))}
              </span>
            )}
          </div>
          <div className="flex items-center gap-0.5 opacity-70 group-hover:opacity-100 transition-opacity">
            <button
              onClick={() => {
                hapticLight();
                void playAyah(surahNumber, ayah.a, { fromAyah: playbackFromAyah, toAyah: playbackToAyah });
              }}
              className={cn('icon-btn w-8 h-8', playback !== 'idle' && 'text-primary')}
              title={playback === 'playing' ? 'Pause' : 'Play ayah'}
            >
              {playback === 'loading' ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : playback === 'playing' ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : (
                <Play className="w-4 h-4" />
              )}
            </button>
            <button onClick={() => onOpenMarks?.(ayah.a)} className={cn('icon-btn w-8 h-8', bookmarked && 'text-primary')} title="Save">
              <Bookmark className={cn('w-4 h-4', bookmarked && 'fill-current')} />
            </button>
            <button onClick={() => void copy()} className="icon-btn w-8 h-8" title="Copy ayah">
              {copied ? <Check className="w-4 h-4 text-primary" /> : <Copy className="w-4 h-4" />}
            </button>
            {!isOpeningLetters && !settings.readerAlwaysShowTranslation && (
              <button
                onClick={() => {
                  hapticSelection();
                  setShowFull((v) => !v);
                }}
                className={cn('icon-btn w-8 h-8', showFull && 'text-primary bg-primary/10')}
                title={showFull ? 'Hide translation' : 'Translate'}
              >
                <Languages className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        <div dir="rtl" className="flex flex-wrap items-start gap-y-1 px-3 sm:px-6 pt-4 pb-2">
          {ayah.w.map((word) => (
            <WordCell
              key={word.p}
              word={word}
              showTranslation={settings.readerShowTranslation}
              hideMeaning={isOpeningLetters}
              showTransliteration={settings.readerTransliteration}
              showTajweed={settings.readerShowTajweed !== false}
              isDark={isDark}
              arabicSize={settings.readerArabicSize}
              glossSize={settings.readerGlossSize}
              transliterationSize={settings.readerTransliterationSize}
              hiddenLemmaIds={hiddenLemmaIds}
              knownLemmaIds={knownLemmaIds}
              speaking={speakingWord === word.p}
              onOpenDetails={
                onOpenWord
                  ? (w, translationRevealed) => onOpenWord({ surah: surahNumber, ayah: ayah.a, word: w, translationRevealed })
                  : undefined
              }
            />
          ))}
          <span
            className="uthmanic-text text-primary px-1"
            style={{ fontSize: settings.readerArabicSize, lineHeight: `${Math.round(settings.readerArabicSize * 1.9)}px` }}
          >
            {toArabicIndic(ayah.a)}
          </span>
        </div>
      </div>

      {effectiveShowTranslation && <AyahTranslation parts={parts} fontSize={settings.readerGlossSize} />}
    </article>
  );
});

export function AyahTranslation({ parts, fontSize }: { parts: TranslationPart[]; fontSize: number }) {
  const [note, setNote] = useState<{ n: string; fn: string } | null>(null);
  return (
    <>
      <p className="mx-4 sm:mx-6 mb-4 border-t border-border pt-3 leading-relaxed text-text" style={{ fontSize }}>
        {parts.map((part, i) =>
          part.t !== undefined ? (
            <span key={i}>{part.t}</span>
          ) : (
            <button
              key={i}
              onClick={() => setNote({ n: part.n ?? '', fn: part.fn ?? '' })}
              className="mx-0.5 font-semibold text-primary hover:underline"
              style={{ fontSize: fontSize * 0.85 }}
            >
              [{part.n}]
            </button>
          ),
        )}
      </p>
      <Modal open={note !== null} onClose={() => setNote(null)} title={`Note [${note?.n ?? ''}]`}>
        <p className="text-sm leading-relaxed text-text">{note?.fn?.replace(/^-\s*/, '')}</p>
      </Modal>
    </>
  );
}
