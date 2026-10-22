'use client';

import React, { Fragment } from 'react';
import { Volume2 } from 'lucide-react';
import { shapeQpcArabic } from '@/lib/arabic-display';
import { attachLeadingCombiningMarks } from '@/lib/arabic-segments';
import { tajweedColor } from '@/lib/quran-colors';
import { getSurahAyahs, getSurahMeta, getSurahNameGlyph, useQuranDataVersion } from '@/lib/quran-reader';
import type { ReaderWord } from '@/lib/quran-reader-types';
import { formatRukuAyahRange, getRukuCue, type Ruku } from '@/lib/ruku';
import { useHifzCuePlayback } from '@/lib/hifz-cue-audio';
import { useIsDark } from '@/hooks/use-is-dark';
import { cn } from '@/lib/cn';

const ARABIC_INDIC = '٠١٢٣٤٥٦٧٨٩';
const toArabicIndic = (n: number) => String(n).replace(/\d/g, (d) => ARABIC_INDIC[Number(d)] ?? d);

/** The prompt: surah and ruku, plus the opening words to recite from. */
export function HifzCardFront({ ruku, onSpeak, isSpeaking }: { ruku: Ruku; onSpeak: () => void; isSpeaking: boolean }) {
  useQuranDataVersion((s) => s.version);
  const meta = getSurahMeta(ruku.surah);
  const ayahs = getSurahAyahs(ruku.surah);
  const cue = getRukuCue(ruku);
  const lastCue = cue.words[cue.words.length - 1];
  const lastAyahWordCount = lastCue ? (ayahs[lastCue.ayah - 1]?.w.length ?? 0) : 0;
  const cueCutsMidAyah = lastCue != null && lastCue.position < lastAyahWordCount;
  const speakingAyah = useHifzCuePlayback((s) => s.ayah);
  const speakingPosition = useHifzCuePlayback((s) => s.position);
  const cuePlaying = useHifzCuePlayback((s) => s.playing);

  return (
    <div className="flex flex-col items-center text-center">
      <div className="surah-name-glyph text-[4.5rem] !leading-[1.25]">{getSurahNameGlyph(ruku.surah)}</div>
      <div className="mt-1 font-display text-3xl">{meta?.en ?? `Surah ${ruku.surah}`}</div>
      <div className="mt-1 text-sm text-textSecondary">
        Ruku {ruku.surahRukuNumber} - {formatRukuAyahRange(ruku)}
      </div>

      <div className="mt-10 flex w-full flex-col items-center gap-6">
        {ayahs.length === 0 ? (
          <div className="skeleton h-16 w-3/4" />
        ) : (
          <div dir="rtl" className="flex flex-wrap justify-center gap-x-3 gap-y-2">
            {cue.words.map((word, index) => {
              const next = cue.words[index + 1];
              const ayahWordCount = ayahs[word.ayah - 1]?.w.length ?? 0;
              const speaking = cuePlaying && speakingAyah === word.ayah && speakingPosition === word.position;
              return (
                <Fragment key={`${word.ayah}:${word.position}`}>
                  <span className="flex flex-col items-center">
                    <CueWordText word={word.word} />
                    <span className={cn('mt-1 h-0.5 w-4/5 rounded-full', speaking ? 'bg-primary' : 'bg-transparent')} />
                  </span>
                  {word.position >= ayahWordCount && (
                    <span className="uthmanic-text text-[2rem] leading-[1.9] text-primary">{toArabicIndic(word.ayah)}</span>
                  )}
                  {cueCutsMidAyah && next == null && <span className="text-[2rem] leading-[1.9]">...</span>}
                </Fragment>
              );
            })}
          </div>
        )}
        <button onClick={onSpeak} className="icon-btn h-12 w-12 rounded-full bg-backgroundElement text-primary" aria-label="Play the opening of this ruku">
          <Volume2 className={cn('w-5 h-5', isSpeaking && 'animate-pulse')} />
        </button>
      </div>
    </div>
  );
}

function CueWordText({ word }: { word: ReaderWord }) {
  const isDark = useIsDark();
  const joined = shapeQpcArabic(word.ar.map((s) => s.t).join(''));
  const keepJoined = /[۪۬]/.test(joined);
  const segments = keepJoined ? [{ t: joined }] : attachLeadingCombiningMarks(word.ar);
  return (
    <span className="uthmanic-text text-[2.4rem] leading-[1.9]">
      {segments.map((seg, i) => (
        <span key={i} style={{ color: tajweedColor(seg.c, isDark, 'var(--text)') }}>
          {seg.t}
        </span>
      ))}
    </span>
  );
}
