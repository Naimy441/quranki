'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Bookmark, ChevronLeft, ChevronRight, Loader2, Navigation, Pause, Play, Settings2 } from 'lucide-react';
import {
  BISMILLAH_WORDS,
  getSurahAyahs,
  getSurahMeta,
  getSurahNameGlyph,
  loadSurahAyahs,
  useQuranDataVersion,
} from '@/lib/quran-reader';
import type { ReaderAyah, ReaderWordRef } from '@/lib/quran-reader-types';
import { getMasteredStudyWordForLemmas } from '@/lib/levels';
import { getWordLemmaIds, hasEveryLemma } from '@/lib/quran-lemmas';
import { tajweedColor } from '@/lib/quran-colors';
import { useHiddenLemmaIds, useKnownLemmaIds, useQuranCoverage, useRecognizedLemmaIds } from '@/hooks/use-lemma-sets';
import { useIsDark } from '@/hooks/use-is-dark';
import { useMasteredArabicDigits } from '@/hooks/use-mastered-arabic-digits';
import { formatAppDigits } from '@/lib/arabic-digits';
import { AyahBlock } from '@/components/quran/ayah-block';
import { WordCell } from '@/components/quran/word-cell';
import { WordDetailSheet } from '@/components/quran/word-detail-sheet';
import { AyahMarkDialog } from '@/components/quran/ayah-mark-dialog';
import { ReaderSettingsModal } from '@/components/quran/reader-settings-modal';
import { PlayOptionsDialog, QuranJumpDialog } from '@/components/quran/play-dialogs';
import { useKnownWordsStore } from '@/store/known-words-store';
import { useProgressStore } from '@/store/progress-store';
import { useQuranMarksStore } from '@/store/quran-marks-store';
import { ensureTranslationSurahLoaded } from '@/store/translation-store';
import { playAyah, playSurah, setAutoScrollSuspended, toggleSurahPlayback, useRecitationStore } from '@/store/recitation-store';
import { cn } from '@/lib/cn';

export interface SeoAyah {
  a: number;
  ar: string;
  tr: string;
}

const ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩';
const toArabicDigits = (n: number) => String(n).replace(/\d/g, (d) => ARABIC_DIGITS[Number(d)]);

/** Scrolls an ayah to the middle of the screen, re-aiming while rows above finish rendering. */
export function jumpToAyah(n: number, onDone?: () => void): () => void {
  let cancelled = false;
  let tries = 0;
  const timers: ReturnType<typeof setTimeout>[] = [];
  const aim = () => {
    if (cancelled) return;
    const el = document.getElementById(`ayah-${n}`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const offset = rect.top + Math.min(rect.height, window.innerHeight * 0.6) / 2 - window.innerHeight / 2;
    if (Math.abs(offset) > 24 && tries++ < 10) {
      window.scrollTo({ top: window.scrollY + offset, behavior: 'instant' });
      timers.push(setTimeout(aim, 90));
    } else onDone?.();
  };
  timers.push(setTimeout(aim, 60));
  return () => {
    cancelled = true;
    timers.forEach(clearTimeout);
  };
}

export function SurahView({ surahNumber, seo }: { surahNumber: number; seo: SeoAyah[] }) {
  const router = useRouter();
  const meta = getSurahMeta(surahNumber)!;
  const isDark = useIsDark();
  const mastered = useMasteredArabicDigits();
  useQuranDataVersion((s) => s.version);
  const ayahs = getSurahAyahs(surahNumber);
  const loaded = ayahs.length > 0;

  const settings = useProgressStore((s) => s.settings);
  const progress = useProgressStore((s) => s.progress);
  const hiddenLemmaIds = useHiddenLemmaIds();
  const knownLemmaIds = useKnownLemmaIds();
  const recognizedLemmaIds = useRecognizedLemmaIds();
  const coverage = useQuranCoverage();
  const markKnown = useKnownWordsStore((s) => s.markKnown);
  const unmarkKnown = useKnownWordsStore((s) => s.unmarkKnown);
  const noteOpenedSurah = useQuranMarksStore((s) => s.noteOpenedSurah);
  const setLastRead = useQuranMarksStore((s) => s.setLastRead);
  const hasSaved = useQuranMarksStore((s) => s.pinPlacements.length > 0 || s.bookmarks.length > 0);
  const marksHydrated = useQuranMarksStore((s) => s.hydrated);

  const playerVisible = useRecitationStore((s) => s.visible);
  const recitationSurah = useRecitationStore((s) => s.surahNumber);
  const recitationAyah = useRecitationStore((s) => s.ayahNumber);
  const recitationPlaying = useRecitationStore((s) => s.playing);
  const recitationAwaiting = useRecitationStore((s) => s.awaitingAudio);
  const recitationFinished = useRecitationStore((s) => s.rangeFinished);
  const autoScrollSuspended = useRecitationStore((s) => s.autoScrollSuspended);
  const playingBismillah = useRecitationStore((s) => s.visible && s.surahNumber === surahNumber && s.playingBismillah);
  const bismillahWord = useRecitationStore((s) => (s.visible && s.surahNumber === surahNumber && s.playingBismillah ? s.wordNumber : 0));

  const hasSession = playerVisible && recitationSurah === surahNumber;
  const thisPlaying = hasSession && recitationPlaying;
  const thisLoading = hasSession && recitationAwaiting && !recitationPlaying;

  const [selectedWord, setSelectedWord] = useState<ReaderWordRef | null>(null);
  const [markAyah, setMarkAyah] = useState<number | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [jumpOpen, setJumpOpen] = useState(false);
  const [playOptionsOpen, setPlayOptionsOpen] = useState(false);
  const [highlighted, setHighlighted] = useState<number | null>(null);
  const visibleAyah = useRef(1);
  const focusAyah = useRef<number | null>(null);

  useEffect(() => {
    void loadSurahAyahs(surahNumber).catch(() => {});
  }, [surahNumber]);

  useEffect(() => {
    ensureTranslationSurahLoaded(settings.selectedTranslationKey, surahNumber);
  }, [settings.selectedTranslationKey, surahNumber]);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const n = Number(params.get('ayah'));
    focusAyah.current = n >= 1 && n <= meta.ac ? Math.round(n) : null;
    // ?play=1 (from Saved) starts recitation from the focused ayah, like the mobile app.
    if (params.get('play') === '1') {
      setAutoScrollSuspended(false);
      void playSurah(surahNumber, focusAyah.current ?? 1);
      params.delete('play');
      window.history.replaceState(null, '', `${window.location.pathname}${params.size ? `?${params}` : ''}`);
    }
  }, [surahNumber, meta.ac]);

  useEffect(() => {
    if (!marksHydrated) return;
    noteOpenedSurah(surahNumber);
    if (focusAyah.current) setLastRead(surahNumber, focusAyah.current);
  }, [marksHydrated, surahNumber, noteOpenedSurah, setLastRead]);

  useEffect(() => {
    const n = focusAyah.current;
    if (!n || !loaded) return;
    setHighlighted(n);
    const cancel = jumpToAyah(n);
    const t = setTimeout(() => setHighlighted(null), 1900);
    return () => {
      cancel();
      clearTimeout(t);
    };
  }, [loaded]);

  // Remember the ayah at the top of the reading area.
  useEffect(() => {
    if (!marksHydrated) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const visible = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const n = Number((e.target as HTMLElement).dataset.ayah);
          if (e.isIntersecting) visible.add(n);
          else visible.delete(n);
        }
        if (visible.size === 0) return;
        const top = Math.min(...visible);
        visibleAyah.current = top;
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => setLastRead(surahNumber, top), 900);
      },
      { rootMargin: '-15% 0px -60% 0px' },
    );
    document.querySelectorAll<HTMLElement>('[data-ayah]').forEach((el) => observer.observe(el));
    return () => {
      observer.disconnect();
      if (timer) clearTimeout(timer);
    };
  }, [loaded, marksHydrated, surahNumber, setLastRead, settings.readerMode]);

  // Follow the recitation unless the reader scrolled away on purpose.
  useEffect(() => {
    if (!hasSession || !recitationPlaying || autoScrollSuspended || recitationAyah < 1) return;
    const el = document.getElementById(`ayah-${recitationAyah}`);
    if (!el) return;
    const rect = el.getBoundingClientRect();
    if (rect.top < 140 || rect.top > window.innerHeight * 0.6) {
      el.scrollIntoView({ behavior: 'smooth', block: rect.height > window.innerHeight * 0.6 ? 'start' : 'center' });
    }
  }, [hasSession, recitationPlaying, recitationAyah, autoScrollSuspended]);

  useEffect(() => {
    if (!hasSession || !recitationPlaying) return;
    const suspend = () => setAutoScrollSuspended(true);
    window.addEventListener('wheel', suspend, { passive: true });
    window.addEventListener('touchmove', suspend, { passive: true });
    return () => {
      window.removeEventListener('wheel', suspend);
      window.removeEventListener('touchmove', suspend);
    };
  }, [hasSession, recitationPlaying]);

  const openWord = useCallback((ref: ReaderWordRef) => setSelectedWord(ref), []);
  const openMarks = useCallback((ayah: number) => setMarkAyah(ayah), []);

  const surahCoverage = coverage?.summary.surahAverages[surahNumber - 1];
  const mode = settings.readerMode ?? 'wbw';

  const onHeaderPlay = () => {
    if (hasSession && !recitationFinished) {
      toggleSurahPlayback(surahNumber);
      return;
    }
    setPlayOptionsOpen(true);
  };

  return (
    <div className="mx-auto max-w-4xl px-3 sm:px-6 pb-8">
      <div className="sticky top-14 lg:top-16 z-20 -mx-3 sm:-mx-6 mb-4 border-b border-border bg-background/85 px-3 sm:px-6 py-2 backdrop-blur-xl">
        <div className="flex items-center gap-1">
          <Link href={surahNumber > 1 ? `/quran/${surahNumber - 1}` : '/quran'} className="icon-btn" title="Previous surah">
            <ChevronLeft className="w-5 h-5" />
          </Link>
          <button onClick={() => setJumpOpen(true)} className="min-w-0 flex-1 sm:flex-none truncate rounded-medium px-2 py-1.5 text-left hover:bg-backgroundElement">
            <span className="text-sm font-semibold">{meta.tr}</span>
            <span className="ml-2 hidden sm:inline text-xs text-textMuted">{meta.nt}</span>
          </button>
          <Link href={surahNumber < 114 ? `/quran/${surahNumber + 1}` : '/quran'} className="icon-btn" title="Next surah">
            <ChevronRight className="w-5 h-5" />
          </Link>
          <div className="ml-auto flex items-center gap-0.5">
            <button
              onClick={onHeaderPlay}
              className={cn('icon-btn', thisPlaying && 'text-primary bg-primary/10')}
              title={thisPlaying ? 'Pause recitation' : 'Play surah recitation'}
            >
              {thisLoading ? (
                <Loader2 className="w-[18px] h-[18px] animate-spin" />
              ) : thisPlaying ? (
                <Pause className="w-[18px] h-[18px] fill-current" />
              ) : (
                <Play className="w-[18px] h-[18px]" />
              )}
            </button>
            <Link href="/saved" className="icon-btn" title="Saved pins and bookmarks">
              <Bookmark className={cn('w-[18px] h-[18px]', hasSaved && 'fill-current text-primary')} />
            </Link>
            <button onClick={() => setJumpOpen(true)} className="icon-btn" title="Jump to surah and ayah">
              <Navigation className="w-[18px] h-[18px]" />
            </button>
            <button onClick={() => setSettingsOpen(true)} className="icon-btn" title="Reader settings">
              <Settings2 className="w-[18px] h-[18px]" />
            </button>
          </div>
        </div>
      </div>

      <header className="relative overflow-hidden card mb-4 px-4 py-8 text-center">
        <div aria-hidden className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,rgb(var(--primary-rgb)/0.12),transparent_65%)]" />
        <div className="relative">
          <div className="surah-name-glyph text-[4.5rem] sm:text-[6rem] !leading-[1.25] pt-1 text-text">{getSurahNameGlyph(surahNumber)}</div>
          <h1 className="mt-2 font-display text-3xl sm:text-4xl tracking-tight">
            {meta.en} <span className="italic text-textMuted">- {meta.nt}</span>
          </h1>
          <p className="mt-1.5 text-sm text-textSecondary">
            {formatAppDigits(`Surah ${surahNumber}`, mastered)} - {meta.rp === 'meccan' ? 'Meccan' : 'Medinan'} -{' '}
            {formatAppDigits(String(meta.ac), mastered)} ayahs
            {surahCoverage !== undefined && surahCoverage > 0 && (
              <span className="font-semibold text-primary">
                {' '}- {formatAppDigits(String(Math.round(surahCoverage * 100)), mastered)}% understood per ayah
              </span>
            )}
          </p>
        </div>
        {meta.b && (
          <div dir="rtl" className={cn('relative mt-6 flex flex-wrap justify-center rounded-medium', playingBismillah && 'bg-backgroundSelected/60')}>
            {BISMILLAH_WORDS.map((word) => (
              <WordCell
                key={word.p}
                word={word}
                showTranslation={settings.readerShowTranslation}
                showTransliteration={settings.readerTransliteration}
                showTajweed={settings.readerShowTajweed !== false}
                isDark={isDark}
                arabicSize={settings.readerArabicSize}
                glossSize={settings.readerGlossSize}
                transliterationSize={settings.readerTransliterationSize}
                hiddenLemmaIds={hiddenLemmaIds}
                knownLemmaIds={knownLemmaIds}
                speaking={bismillahWord === word.p}
                onOpenDetails={(w, translationRevealed) => openWord({ surah: 1, ayah: 1, word: w, translationRevealed })}
              />
            ))}
          </div>
        )}
      </header>

      {!loaded ? (
        <div className="card overflow-hidden">
          {seo.map((a) => (
            <div
              key={a.a}
              id={`ayah-${a.a}`}
              data-ayah={a.a}
              className="border-b border-border px-5 sm:px-8 py-6 [content-visibility:auto] [contain-intrinsic-size:auto_220px]"
            >
              <p dir="rtl" className="uthmanic-text text-right" style={{ fontSize: settings.readerArabicSize, lineHeight: 2.1 }}>
                {a.ar} <span className="text-primary">{toArabicDigits(a.a)}</span>
              </p>
              <p className="mt-3 text-textSecondary leading-relaxed" style={{ fontSize: settings.readerGlossSize }}>
                <span className="mr-1.5 font-mono text-xs text-textMuted">
                  {surahNumber}:{a.a}
                </span>
                {a.tr}
              </p>
            </div>
          ))}
        </div>
      ) : mode === 'reading' ? (
        <ReadingView ayahs={ayahs} surah={surahNumber} isDark={isDark} highlighted={highlighted} onOpenWord={openWord} />
      ) : (
        <div className="card overflow-hidden">
          {ayahs.map((ayah) => (
            <AyahBlock
              key={ayah.a}
              ayah={ayah}
              surahNumber={surahNumber}
              surahName={meta.en}
              isDark={isDark}
              hiddenLemmaIds={hiddenLemmaIds}
              knownLemmaIds={knownLemmaIds}
              recognizedLemmaIds={recognizedLemmaIds}
              highlighted={highlighted === ayah.a}
              onOpenWord={openWord}
              onOpenMarks={openMarks}
            />
          ))}
        </div>
      )}

      <nav className="mt-8 grid grid-cols-2 gap-3">
        {surahNumber > 1 ? (
          <Link href={`/quran/${surahNumber - 1}`} className="card p-4 hover:border-primary/40 transition-colors">
            <span className="flex items-center gap-1 text-xs text-textMuted">
              <ArrowLeft className="w-3.5 h-3.5" /> Previous
            </span>
            <span className="mt-1 block font-semibold">{getSurahMeta(surahNumber - 1)?.en}</span>
          </Link>
        ) : (
          <span />
        )}
        {surahNumber < 114 && (
          <Link href={`/quran/${surahNumber + 1}`} className="card p-4 text-right hover:border-primary/40 transition-colors">
            <span className="flex items-center justify-end gap-1 text-xs text-textMuted">
              Next <ArrowRight className="w-3.5 h-3.5" />
            </span>
            <span className="mt-1 block font-semibold">{getSurahMeta(surahNumber + 1)?.en}</span>
          </Link>
        )}
      </nav>

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
      <AyahMarkDialog surah={surahNumber} ayah={markAyah} onDismiss={() => setMarkAyah(null)} />
      <ReaderSettingsModal open={settingsOpen} onClose={() => setSettingsOpen(false)} />
      <PlayOptionsDialog
        open={playOptionsOpen}
        surahNumber={surahNumber}
        initialFromAyah={visibleAyah.current}
        onClose={() => setPlayOptionsOpen(false)}
        onPlay={(from, to) => {
          setPlayOptionsOpen(false);
          setAutoScrollSuspended(false);
          void playSurah(surahNumber, from, to);
        }}
      />
      <QuranJumpDialog
        open={jumpOpen}
        initialSurah={surahNumber}
        initialAyah={visibleAyah.current}
        onClose={() => setJumpOpen(false)}
        onJump={(s, a) => {
          setJumpOpen(false);
          if (s === surahNumber) {
            setLastRead(s, a);
            setHighlighted(a);
            jumpToAyah(a);
            setTimeout(() => setHighlighted(null), 1900);
          } else router.push(`/quran/${s}?ayah=${a}`);
        }}
      />
    </div>
  );
}

function ReadingView({
  ayahs,
  surah,
  isDark,
  highlighted,
  onOpenWord,
}: {
  ayahs: ReaderAyah[];
  surah: number;
  isDark: boolean;
  highlighted: number | null;
  onOpenWord: (ref: ReaderWordRef) => void;
}) {
  const settings = useProgressStore((s) => s.settings);
  const speakingAyah = useRecitationStore((s) => (s.visible && s.surahNumber === surah && !s.playingBismillah ? s.ayahNumber : 0));
  const speakingWord = useRecitationStore((s) => (s.visible && s.surahNumber === surah && !s.playingBismillah ? s.wordNumber : 0));
  const size = settings.readerArabicSize + 2;
  return (
    <div className="card px-5 sm:px-10 py-8">
      <p dir="rtl" className="uthmanic-text text-justify" style={{ fontSize: size, lineHeight: 2.3 }}>
        {ayahs.map((ayah) => (
          <span
            key={ayah.a}
            id={`ayah-${ayah.a}`}
            data-ayah={ayah.a}
            className={cn('scroll-mt-32 rounded-[6px] transition-colors', highlighted === ayah.a && 'bg-backgroundSelected')}
          >
            {ayah.w.map((word) => (
              <span
                key={word.p}
                onClick={() => onOpenWord({ surah, ayah: ayah.a, word, translationRevealed: true })}
                className={cn(
                  'cursor-pointer rounded-[6px] px-[2px] hover:bg-backgroundElement transition-colors',
                  speakingAyah === ayah.a && speakingWord === word.p && 'bg-primary/20',
                )}
              >
                {word.ar.map((s, i) => (
                  <span key={i} style={{ color: settings.readerShowTajweed !== false ? tajweedColor(s.c, isDark, 'var(--text)') : undefined }}>
                    {s.t}
                  </span>
                ))}{' '}
              </span>
            ))}
            <button onClick={() => void playAyah(surah, ayah.a)} className="mx-1 text-primary hover:opacity-70" title={`Play ayah ${ayah.a}`}>
              {toArabicDigits(ayah.a)}
            </button>{' '}
          </span>
        ))}
      </p>
    </div>
  );
}
