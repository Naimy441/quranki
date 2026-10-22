'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Volume2, VolumeX } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { displayArabic, displayMorphologyArabic } from '@/lib/arabic-display';
import { hapticLight, hapticSuccess, hapticWarning } from '@/lib/haptics';
import { formatLevelLabel, getTaughtStudyWordsForLemmas, type Level } from '@/lib/levels';
import { getQuranLemma, getWordLemmaIds } from '@/lib/quran-lemmas';
import { getRootEntry, posLabel } from '@/lib/quran-morphology';
import type { ReaderMorphSegment, ReaderWord, ReaderWordRef } from '@/lib/quran-reader-types';
import { formatCount } from '@/lib/stats';
import { playWordAudio, stopWordAudio } from '@/lib/word-audio';
import { useProgressStore } from '@/store/progress-store';
import { cn } from '@/lib/cn';

const MORPH_COLORS = ['#3A7FC1', '#B95B9D', '#2C9A78', '#C7772F', '#7A67C7', '#B94E52', '#168F9C', '#8A7D38'];

const FEATURE_LABELS: Record<string, string> = {
  DET: 'definite article',
  FUT: 'future particle',
  IMPF: 'imperfect verb',
  PERF: 'perfect verb',
  ACT_PCPL: 'active participle',
  PASS_PCPL: 'passive participle',
  REL: 'relative pronoun',
  COND: 'conditional particle',
  INTG: 'question particle',
  SUB: 'subordinating particle',
  CAUS: 'causal particle',
  VOC: 'vocative particle',
  MS: 'masculine singular',
  FS: 'feminine singular',
  MP: 'masculine plural',
  FP: 'feminine plural',
  '1S': 'I',
  '1P': 'we / us',
  '2MS': 'you (masc. singular)',
  '2FS': 'you (fem. singular)',
  '2MP': 'you (masc. plural)',
  '2FP': 'you (fem. plural)',
  '3MS': 'he / it',
  '3FS': 'she / it',
  '3MP': 'they (masc.)',
  '3FP': 'they (fem.)',
  'MOOD:IND': 'indicative',
  'MOOD:SUBJ': 'subjunctive',
  'MOOD:JUS': 'jussive',
};

const VERB_FORM_ROMAN: Record<string, string> = {
  '1': 'I',
  '2': 'II',
  '3': 'III',
  '4': 'IV',
  '5': 'V',
  '6': 'VI',
  '7': 'VII',
  '8': 'VIII',
  '9': 'IX',
  '10': 'X',
};

function titleCase(value: string): string {
  return value.replace(/(^|\s)([a-z])/g, (_, b: string, l: string) => `${b}${l.toUpperCase()}`);
}

function verbFormLabel(tag: string): string {
  const n = tag.slice(3);
  return `form ${VERB_FORM_ROMAN[n] ?? n}`;
}

function morphologyParts(segment: ReaderMorphSegment): string {
  const tags = segment.f;
  const first =
    tags.includes('FUT')
      ? 'future particle'
      : segment.k === 'prefix' && tags.includes('EMPH')
        ? 'emphatic lām'
        : segment.k === 'prefix' && tags.includes('IMPV')
          ? 'command lām'
          : (tags.map((t) => FEATURE_LABELS[t] ?? (t.startsWith('VF:') ? verbFormLabel(t) : '')).find(Boolean) ??
            (segment.p === 'V' ? 'verb' : segment.p === 'N' ? 'noun' : 'particle'));
  const form = tags.find((t) => t.startsWith('VF:'));
  const parts = form && !first.startsWith('form ') ? [first, verbFormLabel(form)] : [first];
  return parts.map(titleCase).join(' - ');
}

type AudioStatus = 'idle' | 'loading' | 'playing' | 'error';

interface WordDetailSheetProps {
  selection: ReaderWordRef | null;
  isKnown: boolean;
  /** The level where this word was mastered through review, when that is why it is hidden. */
  masteredLevel?: Level;
  onDismiss: () => void;
  onMarkKnown: (word: ReaderWord) => void;
  onForget: (word: ReaderWord) => void;
}

/** Word details: morphology, lemma and root frequency, audio, and the known-word toggle. */
export function WordDetailSheet({ selection, isKnown, masteredLevel, onDismiss, onMarkKnown, onForget }: WordDetailSheetProps) {
  const progress = useProgressStore((s) => s.progress);
  const learnToRead = useProgressStore((s) => s.settings.canReadQuran === false);
  const [audio, setAudio] = useState<AudioStatus>('idle');
  const word = selection?.word ?? null;
  const key = selection ? `${selection.surah}:${selection.ayah}:${selection.word.p}` : '';

  useEffect(() => {
    stopWordAudio();
    setAudio('idle');
    return () => stopWordAudio();
  }, [key]);

  const lemmaIds = getWordLemmaIds(word);
  const taughtWords = word && selection?.translationRevealed ? getTaughtStudyWordsForLemmas(lemmaIds, progress) : [];
  const lemmaEntries = lemmaIds.map((id) => getQuranLemma(id)).filter((l) => l !== undefined);
  const rootEntry = getRootEntry(word?.rt);
  const pos = posLabel(word?.ps);
  const morphology = word?.m ?? [];
  const canMarkKnown = lemmaIds.length > 0;

  const replay = () => {
    if (!selection) return;
    hapticLight();
    let settled = false;
    setAudio('loading');
    void playWordAudio(selection.surah, selection.ayah, selection.word.p, {
      onFinished: () => {
        if (settled) return;
        settled = true;
        setAudio('idle');
      },
      onFailed: () => {
        if (settled) return;
        settled = true;
        setAudio('error');
      },
    }).then((started) => {
      if (settled) return;
      if (!started) {
        settled = true;
        setAudio('error');
      } else setAudio('playing');
    });
  };

  const toggleKnown = () => {
    if (!word || !canMarkKnown) return;
    if (isKnown) {
      hapticWarning();
      if (window.confirm('Forget this word?\nIts translation will show again in the Quran reader.')) {
        onDismiss();
        onForget(word);
      }
      return;
    }
    hapticSuccess();
    onDismiss();
    onMarkKnown(word);
  };

  return (
    <Modal
      open={Boolean(selection)}
      onClose={onDismiss}
      variant="sheet"
      title={selection ? `${selection.surah}:${selection.ayah} - word ${selection.word.p}` : ''}
    >
      {word && (
        <div className="space-y-5">
          {taughtWords.length > 0 && (
            <div className="rounded-large bg-backgroundElement p-4">
              <div className="text-xs text-textMuted">Taught as</div>
              <div className="mt-2 space-y-3">
                {taughtWords.map(({ word: taught, level }) => (
                  <div key={taught.id} className="text-center">
                    <div className="uthmanic-text text-3xl leading-[1.8]">{displayArabic(taught)}</div>
                    <div className="font-semibold">{taught.english}</div>
                    {taught.transliteration && <div className="text-xs text-textSecondary">{taught.transliteration}</div>}
                    {taught.contractionOf && (
                      <div className="mt-1 text-xs text-textSecondary">
                        <span className="uthmanic-text text-lg text-text">{taught.contractionOf}</span>{' '}
                        {taught.contractionEnglish}
                      </div>
                    )}
                    <div className="mt-1 text-xs text-textMuted">
                      {formatLevelLabel(level.number, learnToRead)} - {level.title}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {morphology.length > 0 ? (
            <div className="text-center">
              <div className="uthmanic-text text-6xl leading-[1.7]">
                {morphology.map((seg, i) => (
                  <span key={i} style={{ color: MORPH_COLORS[i % MORPH_COLORS.length] }}>
                    {displayMorphologyArabic(seg.t)}
                  </span>
                ))}
              </div>
              <div className="mt-3 inline-flex flex-col items-start gap-1.5" data-keep-digits>
                {morphology.map((seg, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: MORPH_COLORS[i % MORPH_COLORS.length] }} />
                    <span style={{ color: MORPH_COLORS[i % MORPH_COLORS.length] }} className="font-medium">
                      {morphologyParts(seg)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <div className="uthmanic-text text-center text-6xl leading-[1.7]">{word.ar.map((s) => s.t).join('')}</div>
          )}

          <div className="flex items-center justify-between rounded-medium border border-border px-4 py-3">
            <span className="font-semibold">{pos ?? 'Word'}</span>
            <button onClick={replay} className="icon-btn bg-backgroundElement" aria-label="Play this word">
              {audio === 'loading' ? (
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
              ) : audio === 'error' ? (
                <VolumeX className="w-5 h-5 text-textMuted" />
              ) : (
                <Volume2 className={cn('w-5 h-5 text-primary', audio === 'playing' && 'animate-pulse')} />
              )}
            </button>
          </div>
          {audio === 'error' && (
            <p className="text-sm text-textMuted">Couldn&apos;t play this word. Check your connection and try again.</p>
          )}

          {(lemmaEntries.length > 0 || rootEntry) && (
            <div className="divide-y divide-border rounded-medium border border-border">
              {lemmaEntries.map((lemma) => (
                <div key={lemma.id} className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-xs text-textMuted w-14">Lemma</span>
                  <span className="uthmanic-text text-2xl flex-1 text-center">{lemma.arabic}</span>
                  <span className="text-sm font-semibold">
                    {lemma.frequency === 1 ? 'once' : `${formatCount(lemma.frequency)} times`}
                  </span>
                </div>
              ))}
              {rootEntry && (
                <div className="flex items-center justify-between gap-3 px-4 py-2.5">
                  <span className="text-xs text-textMuted w-14">Root</span>
                  <span className="flex-1 flex justify-center gap-2" dir="rtl">
                    {Array.from(word.rt ?? '').map((l, i) => (
                      <span key={i} className="uthmanic-text text-2xl">
                        {l}
                      </span>
                    ))}
                  </span>
                  <span className="text-sm font-semibold">{formatCount(rootEntry.count)} times</span>
                </div>
              )}
            </div>
          )}

          {canMarkKnown && (
            <p className="text-sm text-textSecondary">
              {masteredLevel
                ? `You've already mastered this word in ${formatLevelLabel(masteredLevel.number, learnToRead)} (${masteredLevel.title}). That's why its translation is hidden.`
                : isKnown
                  ? 'Marked as known. Its translation is hidden everywhere this word appears in the Quran.'
                  : 'Marking it known hides its translation everywhere it appears.'}
            </p>
          )}
          {canMarkKnown && !masteredLevel && (
            <button onClick={toggleKnown} className={cn('w-full h-11', isKnown ? 'btn-secondary' : 'btn-primary')}>
              {isKnown ? 'Forget this word' : 'I already know this word'}
            </button>
          )}
        </div>
      )}
    </Modal>
  );
}
