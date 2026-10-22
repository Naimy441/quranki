/**
 * Web version of the mobile recitation store (`src/store/recitation-store.ts`), with the same
 * state shape and actions: surah sessions over an ayah range (with the opening Bismillah),
 * single-ayah playback, gapless chaining through a pre-buffered standby <audio>, word timing,
 * and lock-screen controls through the Media Session API.
 */
import { create } from 'zustand';

import { requireOnline } from '@/lib/offline';
import { wordAtTimeMs, type WordTiming } from '@/lib/recitation';
import { DEFAULT_RECITER_KEY, getAyahAudio, isReciterKey, reciterLabel } from '@/lib/reciters';
import { getSurahMeta } from '@/lib/quran-reader';
import { stopWordAudio } from '@/lib/word-audio';
import { useProgressStore } from '@/store/progress-store';

export type RecitationMode = 'surah' | 'ayah';

const BISMILLAH_SURAH = 1;
const BISMILLAH_AYAH = 1;

export interface RecitationState {
  visible: boolean;
  mode: RecitationMode;
  surahNumber: number | null;
  ayahNumber: number;
  ayahCount: number;
  playingBismillah: boolean;
  playing: boolean;
  awaitingAudio: boolean;
  positionSeconds: number;
  durationSeconds: number;
  wordTimings: WordTiming[];
  wordNumber: number;
  error: string | null;
  progressEpoch: number;
  autoScrollSuspended: boolean;
  rangeStartAyah: number;
  rangeEndAyah: number;
  rangeFinished: boolean;
}

const INITIAL_STATE: RecitationState = {
  visible: false,
  mode: 'surah',
  surahNumber: null,
  ayahNumber: 1,
  ayahCount: 0,
  playingBismillah: false,
  playing: false,
  awaitingAudio: false,
  positionSeconds: 0,
  durationSeconds: 0,
  wordTimings: [],
  wordNumber: 0,
  error: null,
  progressEpoch: 0,
  autoScrollSuspended: false,
  rangeStartAyah: 1,
  rangeEndAyah: 0,
  rangeFinished: false,
};

export const useRecitationStore = create<RecitationState>(() => INITIAL_STATE);

let active: HTMLAudioElement | null = null;
let standby: HTMLAudioElement | null = null;
let standbyAyah: number | null = null;
let standbyTimings: WordTiming[] = [];
let requestSeq = 0;
let wantPlaying = false;
let frame = 0;

function reciterKey(): string {
  const key = useProgressStore.getState().settings.selectedReciterKey;
  return isReciterKey(key) ? key : DEFAULT_RECITER_KEY;
}

function surahHasOpeningBismillah(surah: number | null): boolean {
  return Boolean(surah && getSurahMeta(surah)?.b);
}

function tick(): void {
  frame = 0;
  if (!active) return;
  const position = active.currentTime;
  const { wordTimings, positionSeconds } = useRecitationStore.getState();
  const word = wordAtTimeMs(wordTimings, position * 1000) || wordTimings[0]?.[0] || 0;
  if (Math.abs(position - positionSeconds) > 0.05 || word !== useRecitationStore.getState().wordNumber) {
    useRecitationStore.setState({ positionSeconds: position, wordNumber: word });
  }
  if (!active.paused) frame = requestAnimationFrame(tick);
}

function attach(audio: HTMLAudioElement): void {
  audio.onplay = () => {
    if (audio !== active) return;
    useRecitationStore.setState({ playing: true, awaitingAudio: false, error: null });
    if (!frame) frame = requestAnimationFrame(tick);
    updateMediaSession();
  };
  audio.onpause = () => {
    if (audio !== active) return;
    useRecitationStore.setState({ playing: false });
  };
  audio.onwaiting = () => {
    if (audio === active) useRecitationStore.setState({ awaitingAudio: true });
  };
  audio.onplaying = () => {
    if (audio === active) useRecitationStore.setState({ awaitingAudio: false });
  };
  audio.onloadedmetadata = () => {
    if (audio === active) useRecitationStore.setState({ durationSeconds: audio.duration || 0 });
  };
  audio.onended = () => {
    if (audio === active) onFinished();
  };
  audio.onerror = () => {
    if (audio === active && audio.src) playbackFailed();
  };
}

function players(): { a: HTMLAudioElement; b: HTMLAudioElement } {
  if (!active) {
    active = new Audio();
    active.preload = 'auto';
    attach(active);
  }
  if (!standby) {
    standby = new Audio();
    standby.preload = 'auto';
    attach(standby);
  }
  return { a: active, b: standby };
}

function playbackFailed(): void {
  wantPlaying = false;
  active?.pause();
  useRecitationStore.setState({ awaitingAudio: false, playing: false, error: 'Error: check connection' });
}

async function startActive(src: string, timings: WordTiming[], seq: number): Promise<void> {
  const { a } = players();
  if (seq !== requestSeq) return;
  a.src = src;
  a.currentTime = 0;
  useRecitationStore.setState({
    wordTimings: timings,
    wordNumber: 0,
    positionSeconds: 0,
    durationSeconds: 0,
    progressEpoch: useRecitationStore.getState().progressEpoch + 1,
  });
  if (!wantPlaying) return;
  try {
    await a.play();
  } catch (error) {
    if (seq !== requestSeq) return;
    if (error instanceof DOMException && error.name === 'NotAllowedError') {
      useRecitationStore.setState({ awaitingAudio: false, playing: false });
      return;
    }
    if (!(error instanceof DOMException && error.name === 'AbortError')) playbackFailed();
  }
}

async function preloadNext(seq: number, ayah: number): Promise<void> {
  const { surahNumber, rangeEndAyah, mode } = useRecitationStore.getState();
  standbyAyah = null;
  if (mode !== 'surah' || !surahNumber || ayah > rangeEndAyah) return;
  const data = await getAyahAudio(reciterKey(), surahNumber, ayah).catch(() => undefined);
  if (!data || seq !== requestSeq) return;
  const { b } = players();
  b.src = data.audio_url;
  b.load();
  standbyAyah = ayah;
  standbyTimings = data.segments;
}

function trySwapToStandby(target: number): boolean {
  if (standbyAyah !== target || !standby || !active) return false;
  const promoted = standby;
  const demoted = active;
  active = promoted;
  standby = demoted;
  demoted.pause();
  standbyAyah = null;
  useRecitationStore.setState({
    ayahNumber: target,
    playingBismillah: false,
    wordTimings: standbyTimings,
    wordNumber: 0,
    positionSeconds: 0,
    durationSeconds: promoted.duration || 0,
    progressEpoch: useRecitationStore.getState().progressEpoch + 1,
  });
  wantPlaying = true;
  void promoted.play().catch(() => playbackFailed());
  void preloadNext(requestSeq, target + 1);
  return true;
}

async function loadAyahSource(seq: number): Promise<void> {
  const { surahNumber, ayahNumber } = useRecitationStore.getState();
  if (!surahNumber) return;
  useRecitationStore.setState({ awaitingAudio: true, error: null, wordTimings: [], wordNumber: 0 });
  const data = await getAyahAudio(reciterKey(), surahNumber, ayahNumber).catch(() => undefined);
  if (seq !== requestSeq) return;
  if (!data) {
    playbackFailed();
    return;
  }
  await startActive(data.audio_url, data.segments, seq);
  if (ayahNumber < useRecitationStore.getState().rangeEndAyah) void preloadNext(seq, ayahNumber + 1);
}

async function loadBismillah(seq: number): Promise<void> {
  useRecitationStore.setState({
    playingBismillah: true,
    ayahNumber: 0,
    awaitingAudio: true,
    error: null,
    wordTimings: [],
    wordNumber: 0,
  });
  const data = await getAyahAudio(reciterKey(), BISMILLAH_SURAH, BISMILLAH_AYAH).catch(() => undefined);
  if (seq !== requestSeq) return;
  if (!data) {
    useRecitationStore.setState({ playingBismillah: false, ayahNumber: 1 });
    await loadAyahSource(seq);
    return;
  }
  await startActive(data.audio_url, data.segments, seq);
  void preloadNext(seq, Math.max(1, useRecitationStore.getState().rangeStartAyah));
}

async function afterBismillah(seq: number): Promise<void> {
  if (seq !== requestSeq) return;
  const start = Math.max(1, useRecitationStore.getState().rangeStartAyah);
  if (trySwapToStandby(start)) return;
  useRecitationStore.setState({ playingBismillah: false, ayahNumber: start });
  await loadAyahSource(seq);
}

function onFinished(): void {
  const s = useRecitationStore.getState();
  if (s.mode === 'surah' && s.playingBismillah) {
    void afterBismillah(requestSeq);
    return;
  }
  if (s.mode === 'surah' && s.ayahNumber < s.rangeEndAyah) {
    if (trySwapToStandby(s.ayahNumber + 1)) return;
    useRecitationStore.setState({ ayahNumber: s.ayahNumber + 1 });
    void loadAyahSource(requestSeq);
    return;
  }
  wantPlaying = false;
  useRecitationStore.setState({
    playing: false,
    awaitingAudio: false,
    positionSeconds: s.durationSeconds,
    rangeFinished: true,
    wordNumber: 0,
  });
}

function beginSession(partial: Partial<RecitationState>): number {
  stopWordAudio();
  requestSeq += 1;
  wantPlaying = true;
  standbyAyah = null;
  active?.pause();
  useRecitationStore.setState({ ...INITIAL_STATE, visible: true, awaitingAudio: true, ...partial });
  return requestSeq;
}

async function seekToAyah(ayah: number): Promise<void> {
  const { surahNumber, ayahCount } = useRecitationStore.getState();
  if (!surahNumber || ayah < 1 || ayah > ayahCount) return;
  requestSeq += 1;
  const seq = requestSeq;
  wantPlaying = true;
  useRecitationStore.setState({ ayahNumber: ayah, playingBismillah: false, rangeFinished: false });
  if (trySwapToStandby(ayah)) return;
  await loadAyahSource(seq);
}

/** @param toAyah Inclusive end of the range to play (default: the whole surah). */
export async function playSurah(surahNumber: number, fromAyah = 1, toAyah?: number): Promise<void> {
  const meta = getSurahMeta(surahNumber);
  if (!meta || !(await requireOnline())) return;
  const ayah = Math.min(Math.max(fromAyah, 1), meta.ac);
  const rangeEndAyah = Math.min(Math.max(toAyah ?? meta.ac, ayah), meta.ac);
  const openingBismillah = meta.b && ayah === 1;
  const seq = beginSession({
    mode: 'surah',
    surahNumber,
    ayahNumber: openingBismillah ? 0 : ayah,
    ayahCount: meta.ac,
    playingBismillah: openingBismillah,
    rangeStartAyah: ayah,
    rangeEndAyah,
  });
  if (openingBismillah) await loadBismillah(seq);
  else await loadAyahSource(seq);
}

/** Plays one ayah. `bounds` limits prev/next (the Hifz reader passes its ruku). */
export async function playAyah(
  surahNumber: number,
  ayahNumber: number,
  bounds?: { fromAyah?: number; toAyah?: number },
): Promise<void> {
  const meta = getSurahMeta(surahNumber);
  if (!meta) return;
  const current = useRecitationStore.getState();
  if (current.visible && current.surahNumber === surahNumber && current.ayahNumber === ayahNumber && !current.error) {
    togglePlayPause();
    return;
  }
  if (!(await requireOnline())) return;
  const rangeStartAyah = Math.min(Math.max(bounds?.fromAyah ?? 1, 1), meta.ac);
  const rangeEndAyah = Math.min(Math.max(bounds?.toAyah ?? meta.ac, rangeStartAyah), meta.ac);
  const seq = beginSession({ mode: 'ayah', surahNumber, ayahNumber, ayahCount: meta.ac, rangeStartAyah, rangeEndAyah });
  await loadAyahSource(seq);
}

export function setAutoScrollSuspended(suspended: boolean): void {
  useRecitationStore.setState({ autoScrollSuspended: suspended });
}

/** Pause without tearing down the session so a word clip can play over it. */
export function pauseRecitation(): void {
  wantPlaying = false;
  active?.pause();
}

export function togglePlayPause(): void {
  const s = useRecitationStore.getState();
  if (!s.visible || !active) {
    if (s.surahNumber) void playSurah(s.surahNumber, s.ayahNumber, s.rangeEndAyah);
    return;
  }
  if (s.error) {
    wantPlaying = true;
    if (s.playingBismillah) void loadBismillah(requestSeq);
    else void loadAyahSource(requestSeq);
    return;
  }
  if (!active.paused) {
    pauseRecitation();
    return;
  }
  wantPlaying = true;
  stopWordAudio();
  const nearEnd = s.rangeFinished || (s.durationSeconds > 0 && s.positionSeconds >= s.durationSeconds - 0.15);
  if (nearEnd) {
    if (s.mode === 'surah' && s.ayahNumber < s.rangeEndAyah) {
      void seekToAyah(s.ayahNumber + 1);
      return;
    }
    if (s.mode === 'surah' && s.surahNumber) {
      void playSurah(s.surahNumber, s.rangeStartAyah, s.rangeEndAyah);
      return;
    }
    active.currentTime = 0;
    useRecitationStore.setState({ rangeFinished: false });
  }
  void active.play().catch(() => playbackFailed());
}

export function skipNextAyah(): void {
  const s = useRecitationStore.getState();
  if (s.playingBismillah) {
    void afterBismillah(requestSeq);
    return;
  }
  if (s.ayahNumber >= s.rangeEndAyah) return;
  void seekToAyah(s.ayahNumber + 1);
}

export function skipPreviousAyah(): void {
  const s = useRecitationStore.getState();
  if (active && active.currentTime > 2) {
    active.currentTime = 0;
    wantPlaying = true;
    void active.play().catch(() => {});
    useRecitationStore.setState({ progressEpoch: s.progressEpoch + 1 });
    return;
  }
  if (s.playingBismillah) return;
  if (s.ayahNumber <= s.rangeStartAyah) {
    if (s.mode === 'surah' && s.rangeStartAyah <= 1 && surahHasOpeningBismillah(s.surahNumber)) {
      wantPlaying = true;
      requestSeq += 1;
      void loadBismillah(requestSeq);
    }
    return;
  }
  void seekToAyah(s.ayahNumber - 1);
}

/** Web addition: scrub within the current clip. */
export function seekRecitation(seconds: number): void {
  if (!active) return;
  active.currentTime = Math.max(0, seconds);
  useRecitationStore.setState({ positionSeconds: active.currentTime });
}

export function stopRecitation(): void {
  requestSeq += 1;
  wantPlaying = false;
  standbyAyah = null;
  active?.pause();
  standby?.pause();
  if (frame) cancelAnimationFrame(frame);
  frame = 0;
  useRecitationStore.setState({ ...INITIAL_STATE });
  if (typeof navigator !== 'undefined' && 'mediaSession' in navigator) navigator.mediaSession.metadata = null;
}

/** Header play on the open surah: start it, or toggle if this surah is already loaded. */
export function toggleSurahPlayback(surahNumber: number): void {
  const s = useRecitationStore.getState();
  if (s.visible && s.surahNumber === surahNumber && !s.error) {
    if (s.mode === 'ayah') {
      void playSurah(surahNumber, s.ayahNumber);
      return;
    }
    togglePlayPause();
    return;
  }
  void playSurah(surahNumber, 1);
}

function updateMediaSession(): void {
  if (typeof navigator === 'undefined' || !('mediaSession' in navigator)) return;
  const s = useRecitationStore.getState();
  if (!s.surahNumber) return;
  const meta = getSurahMeta(s.surahNumber);
  navigator.mediaSession.metadata = new MediaMetadata({
    title: s.playingBismillah ? `${meta?.en} - Bismillah` : `${meta?.en ?? 'Surah'} ${s.surahNumber}:${s.ayahNumber}`,
    artist: reciterLabel(reciterKey()),
    album: 'Quranki',
    artwork: [{ src: '/images/icon-512.png', sizes: '512x512', type: 'image/png' }],
  });
  navigator.mediaSession.setActionHandler('play', () => togglePlayPause());
  navigator.mediaSession.setActionHandler('pause', () => pauseRecitation());
  navigator.mediaSession.setActionHandler('nexttrack', () => skipNextAyah());
  navigator.mediaSession.setActionHandler('previoustrack', () => skipPreviousAyah());
}

// Switching reciters mid-session restarts the current ayah in the new voice.
if (typeof window !== 'undefined') {
  let lastKey = useProgressStore.getState().settings.selectedReciterKey;
  useProgressStore.subscribe((state) => {
    const key = state.settings.selectedReciterKey;
    if (key === lastKey) return;
    lastKey = key;
    const s = useRecitationStore.getState();
    if (!s.visible || !s.surahNumber) return;
    standbyAyah = null;
    if (s.playing) {
      requestSeq += 1;
      wantPlaying = true;
      if (s.playingBismillah) void loadBismillah(requestSeq);
      else void loadAyahSource(requestSeq);
    }
  });
}
