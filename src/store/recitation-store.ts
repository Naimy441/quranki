import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import { create } from 'zustand';

import { getSurahMeta } from '@/lib/quran-reader';
import { ayahAtTimeMs, type AyahTiming } from '@/lib/recitation';
import {
  getAyahPlaybackUri,
  getCachedAyahUri,
  getCachedGaplessUri,
  getGaplessPlaybackUri,
  getGaplessSurahMeta,
  isAbortError,
} from '@/lib/recitation-cache';

export type RecitationMode = 'surah' | 'ayah';

/** Fatihah 1:1 — reused as the opening Bismillah for every surah that has a header (`meta.b`). */
const BISMILLAH_SURAH = 1;
const BISMILLAH_AYAH = 1;

export interface RecitationState {
  visible: boolean;
  mode: RecitationMode;
  surahNumber: number | null;
  ayahNumber: number;
  ayahCount: number;
  /** Opening Bismillah (Fatihah 1:1) before ayah 1; never used for Al-Fatihah or At-Tawbah. */
  playingBismillah: boolean;
  playing: boolean;
  awaitingAudio: boolean;
  downloadBytesWritten: number;
  downloadBytesTotal: number;
  positionSeconds: number;
  durationSeconds: number;
  timings: AyahTiming[];
  error: string | null;
  /** Bumps when playback seeks so the progress bar can resync. */
  progressEpoch: number;
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
  downloadBytesWritten: 0,
  downloadBytesTotal: 0,
  positionSeconds: 0,
  durationSeconds: 0,
  timings: [],
  error: null,
  progressEpoch: 0,
};

function surahHasOpeningBismillah(surahNumber: number | null): boolean {
  if (!surahNumber) return false;
  return getSurahMeta(surahNumber)?.b === true;
}

function bumpProgressEpoch(): void {
  const { progressEpoch } = useRecitationStore.getState();
  useRecitationStore.setState({ progressEpoch: progressEpoch + 1 });
}

function lockScreenMetadata(state: RecitationState): { title: string; artist: string; albumTitle: string } {
  const meta = state.surahNumber ? getSurahMeta(state.surahNumber) : undefined;
  const chapter = meta?.en ?? 'Quranki';
  const verse = state.playingBismillah ? 'Bismillah' : `Ayah ${state.ayahNumber}`;
  return {
    title: `${chapter} · ${verse}`,
    artist: 'Mahmoud Khalil Al-Husary',
    albumTitle: 'Quranki',
  };
}

let lockScreenActive = false;

function activateLockScreen(): void {
  if (!player) return;
  try {
    const meta = lockScreenMetadata(useRecitationStore.getState());
    if (!lockScreenActive) {
      player.setActiveForLockScreen(true, meta);
      lockScreenActive = true;
    } else {
      player.updateLockScreenMetadata(meta);
    }
  } catch {
    // Lock screen controls are unavailable on web.
  }
}

function deactivateLockScreen(): void {
  if (!player || !lockScreenActive) return;
  try {
    player.setActiveForLockScreen(false);
  } catch {
    // ignore
  }
  lockScreenActive = false;
}

export const useRecitationStore = create<RecitationState>(() => INITIAL_STATE);

let player: AudioPlayer | null = null;
let playerReady: Promise<AudioPlayer> | null = null;
let playerEpoch = 0;
let statusSub: { remove: () => void } | null = null;
let audioModeReady = false;
let requestSeq = 0;
let wantPlaying = false;
let ignoreFinishUntil = 0;
let finishHandled = false;
let downloadAbort: AbortController | null = null;
let suppressStatus = false;
let pendingSeekSeconds: number | null = null;
let seeking = false;
let loadedUri: string | null = null;
let loadedKind: RecitationMode | null = null;
let loadedSurah: number | null = null;

async function ensurePlayer(): Promise<AudioPlayer> {
  if (player) return player;
  if (!playerReady) {
    const epoch = playerEpoch;
    playerReady = (async () => {
      if (!audioModeReady) {
        await setAudioModeAsync({
          playsInSilentMode: true,
          shouldPlayInBackground: true,
          interruptionMode: 'doNotMix',
        });
        audioModeReady = true;
      }
      if (epoch !== playerEpoch) {
        const abortError = new Error('Aborted');
        abortError.name = 'AbortError';
        throw abortError;
      }
      if (!player) {
        player = createAudioPlayer(null, { updateInterval: 250, keepAudioSessionActive: true });
        statusSub = player.addListener('playbackStatusUpdate', onPlaybackStatus);
      }
      return player;
    })();
  }
  return playerReady;
}

function applyPendingSeek(instance: AudioPlayer): void {
  const seek = pendingSeekSeconds;
  pendingSeekSeconds = null;
  seeking = true;
  void instance.seekTo(seek ?? 0).then(() => {
    seeking = false;
    bumpProgressEpoch();
    if (wantPlaying) instance.play();
  });
}

function onPlaybackStatus(status: AudioStatus): void {
  if (suppressStatus || seeking) return;
  if (status.error) {
    useRecitationStore.setState({
      error: 'Playback failed. Try again.',
      playing: false,
      awaitingAudio: false,
    });
    return;
  }

  if (pendingSeekSeconds != null && status.isLoaded && player) {
    applyPendingSeek(player);
    return;
  }

  const justFinished = status.didJustFinish && status.duration > 0.25 && Date.now() >= ignoreFinishUntil;
  if (justFinished && !finishHandled) {
    finishHandled = true;
    const finished = useRecitationStore.getState();
    if (finished.mode === 'surah' && finished.playingBismillah) {
      void startGaplessAfterBismillah(requestSeq);
      return;
    }
    wantPlaying = false;
    useRecitationStore.setState({
      playing: false,
      awaitingAudio: false,
      positionSeconds: status.duration,
      durationSeconds: status.duration,
    });
    return;
  }

  const state = useRecitationStore.getState();
  const nextAyah =
    state.mode === 'surah' && !state.playingBismillah && state.timings.length
      ? ayahAtTimeMs(state.timings, status.currentTime * 1000)
      : state.ayahNumber;

  useRecitationStore.setState({
    playing: status.playing,
    awaitingAudio: !status.isLoaded || (status.isBuffering && !status.playing),
    positionSeconds: status.currentTime,
    durationSeconds: status.duration,
    ayahNumber: nextAyah,
    error: null,
  });
  if (nextAyah !== state.ayahNumber) activateLockScreen();
}

function beginSession(partial: Partial<RecitationState>): number {
  requestSeq += 1;
  wantPlaying = true;
  finishHandled = false;
  pendingSeekSeconds = null;
  seeking = false;
  downloadAbort?.abort();
  downloadAbort = new AbortController();
  useRecitationStore.setState({
    ...INITIAL_STATE,
    visible: true,
    awaitingAudio: true,
    ...partial,
  });
  return requestSeq;
}

async function loadAyahSource(seq: number): Promise<void> {
  const { surahNumber, ayahNumber } = useRecitationStore.getState();
  if (!surahNumber) return;

  suppressStatus = true;
  pendingSeekSeconds = null;
  useRecitationStore.setState({
    awaitingAudio: true,
    error: null,
    positionSeconds: 0,
    durationSeconds: 0,
  });

  try {
    const uri = await getAyahPlaybackUri(surahNumber, ayahNumber, downloadAbort?.signal);
    if (seq !== requestSeq) return;
    const instance = await ensurePlayer();
    if (seq !== requestSeq) return;
    ignoreFinishUntil = Date.now() + 500;
    finishHandled = false;
    instance.replace({ uri });
    loadedUri = uri;
    loadedKind = 'ayah';
    loadedSurah = surahNumber;
    suppressStatus = false;
    bumpProgressEpoch();
    if (wantPlaying) instance.play();
    activateLockScreen();
  } catch (error) {
    if (seq !== requestSeq || isAbortError(error)) return;
    playbackFailed();
  }
}

async function loadGaplessSource(seq: number): Promise<void> {
  const { surahNumber, ayahCount } = useRecitationStore.getState();
  if (!surahNumber) return;

  suppressStatus = true;
  useRecitationStore.setState({
    awaitingAudio: true,
    error: null,
  });

  try {
    let url: string | undefined;
    let size = 0;
    try {
      const meta = await getGaplessSurahMeta(surahNumber, ayahCount, downloadAbort?.signal);
      if (seq !== requestSeq) return;
      url = meta.url;
      size = meta.size;
      useRecitationStore.setState({ timings: meta.ayahs, downloadBytesTotal: meta.size });
    } catch (error) {
      if (seq !== requestSeq || isAbortError(error)) return;
    }

    const cached = getCachedGaplessUri(surahNumber);
    if (cached && size > 0) {
      useRecitationStore.setState({ downloadBytesWritten: size, downloadBytesTotal: size });
    }

    const uri = await getGaplessPlaybackUri(surahNumber, {
      url,
      signal: downloadAbort?.signal,
      onProgress: (bytesWritten, totalBytes) => {
        if (seq !== requestSeq) return;
        useRecitationStore.setState({
          downloadBytesWritten: bytesWritten,
          downloadBytesTotal: totalBytes > 0 ? totalBytes : size,
        });
      },
    });
    if (seq !== requestSeq) return;

    const instance = await ensurePlayer();
    if (seq !== requestSeq) return;

    const latest = useRecitationStore.getState();
    const fromMs = latest.timings[latest.ayahNumber - 1]?.[0] ?? 0;
    ignoreFinishUntil = Date.now() + 800;
    finishHandled = false;

    const alreadyLoaded =
      loadedKind === 'surah' && loadedSurah === surahNumber && loadedUri === uri && instance.isLoaded;

    if (alreadyLoaded) {
      pendingSeekSeconds = null;
      suppressStatus = false;
      seeking = true;
      await instance.seekTo(fromMs / 1000);
      seeking = false;
      if (seq !== requestSeq) return;
      bumpProgressEpoch();
      if (wantPlaying) instance.play();
      activateLockScreen();
      return;
    }

    pendingSeekSeconds = fromMs / 1000;
    instance.replace({ uri });
    loadedUri = uri;
    loadedKind = 'surah';
    loadedSurah = surahNumber;
    suppressStatus = false;
    bumpProgressEpoch();
    activateLockScreen();
  } catch (error) {
    if (seq !== requestSeq || isAbortError(error)) return;
    playbackFailed();
  }
}

function playbackFailed(): void {
  suppressStatus = true;
  try {
    player?.pause();
  } catch {
    // ignore
  }
  useRecitationStore.setState({
    awaitingAudio: false,
    playing: false,
    error: 'Couldn’t download this recitation. Check your connection and try again.',
  });
}

async function loadBismillah(seq: number): Promise<void> {
  suppressStatus = true;
  pendingSeekSeconds = null;
  useRecitationStore.setState({
    playingBismillah: true,
    ayahNumber: 0,
    awaitingAudio: true,
    error: null,
    positionSeconds: 0,
    durationSeconds: 0,
  });

  try {
    const uri = await getAyahPlaybackUri(BISMILLAH_SURAH, BISMILLAH_AYAH, downloadAbort?.signal);
    if (seq !== requestSeq) return;
    const instance = await ensurePlayer();
    if (seq !== requestSeq) return;
    ignoreFinishUntil = Date.now() + 500;
    finishHandled = false;
    instance.replace({ uri });
    loadedUri = uri;
    loadedKind = 'ayah';
    loadedSurah = BISMILLAH_SURAH;
    suppressStatus = false;
    bumpProgressEpoch();
    if (wantPlaying) instance.play();
    activateLockScreen();
  } catch (error) {
    if (seq !== requestSeq || isAbortError(error)) return;
    useRecitationStore.setState({ playingBismillah: false, ayahNumber: 1 });
    await loadGaplessSource(seq);
  }
}

function preloadGapless(seq: number, surahNumber: number, ayahCount: number): void {
  void (async () => {
    try {
      const meta = await getGaplessSurahMeta(surahNumber, ayahCount, downloadAbort?.signal);
      if (seq !== requestSeq) return;
      useRecitationStore.setState({ timings: meta.ayahs, downloadBytesTotal: meta.size });
      const cached = getCachedGaplessUri(surahNumber);
      if (cached && meta.size > 0) {
        useRecitationStore.setState({ downloadBytesWritten: meta.size, downloadBytesTotal: meta.size });
      }
      await getGaplessPlaybackUri(surahNumber, {
        url: meta.url,
        signal: downloadAbort?.signal,
        onProgress: (bytesWritten, totalBytes) => {
          if (seq !== requestSeq) return;
          useRecitationStore.setState({
            downloadBytesWritten: bytesWritten,
            downloadBytesTotal: totalBytes > 0 ? totalBytes : meta.size,
          });
        },
      });
    } catch (error) {
      if (seq !== requestSeq || isAbortError(error)) return;
    }
  })();
}

async function startGaplessAfterBismillah(seq: number): Promise<void> {
  if (seq !== requestSeq) return;
  useRecitationStore.setState({ playingBismillah: false, ayahNumber: 1, awaitingAudio: true });
  await loadGaplessSource(seq);
}

async function loadCurrent(seq: number): Promise<void> {
  const { mode, playingBismillah } = useRecitationStore.getState();
  if (mode === 'surah' && playingBismillah) {
    await loadBismillah(seq);
    return;
  }
  if (mode === 'surah') {
    await loadGaplessSource(seq);
    return;
  }
  await loadAyahSource(seq);
}

async function seekToAyah(ayahNumber: number): Promise<void> {
  const { surahNumber, ayahCount, timings, mode } = useRecitationStore.getState();
  if (!surahNumber || ayahNumber < 1 || ayahNumber > ayahCount) return;
  wantPlaying = true;
  finishHandled = false;
  useRecitationStore.setState({ ayahNumber, playingBismillah: false, playing: false, awaitingAudio: true });

  if (mode === 'surah') {
    const fromMs = timings[ayahNumber - 1]?.[0];
    if (fromMs == null) return;
    pendingSeekSeconds = fromMs / 1000;
    if (player?.isLoaded) {
      applyPendingSeek(player);
      useRecitationStore.setState({ awaitingAudio: false });
    }
    return;
  }

  await loadAyahSource(requestSeq);
}

export async function playSurah(surahNumber: number, fromAyah = 1): Promise<void> {
  const meta = getSurahMeta(surahNumber);
  if (!meta) return;
  const ayah = Math.min(Math.max(fromAyah, 1), meta.ac);
  const openingBismillah = meta.b && ayah === 1;
  const seq = beginSession({
    mode: 'surah',
    surahNumber,
    ayahNumber: openingBismillah ? 0 : ayah,
    ayahCount: meta.ac,
    playingBismillah: openingBismillah,
  });
  if (openingBismillah) {
    preloadGapless(seq, surahNumber, meta.ac);
  }
  await loadCurrent(seq);
}

export async function playAyah(surahNumber: number, ayahNumber: number): Promise<void> {
  const meta = getSurahMeta(surahNumber);
  if (!meta) return;
  const current = useRecitationStore.getState();
  if (
    current.visible &&
    current.surahNumber === surahNumber &&
    current.ayahNumber === ayahNumber &&
    !current.error
  ) {
    togglePlayPause();
    return;
  }

  const cached = getCachedAyahUri(surahNumber, ayahNumber) !== null;
  const seq = beginSession({
    mode: 'ayah',
    surahNumber,
    ayahNumber,
    ayahCount: meta.ac,
    downloadBytesWritten: cached ? 1 : 0,
    downloadBytesTotal: cached ? 1 : 0,
  });
  await loadCurrent(seq);
}

export function togglePlayPause(): void {
  const state = useRecitationStore.getState();
  if (!state.visible || !player) {
    if (state.surahNumber) void playSurah(state.surahNumber, state.ayahNumber);
    return;
  }
  if (state.error) {
    wantPlaying = true;
    void loadCurrent(requestSeq);
    return;
  }
  if (state.playing) {
    wantPlaying = false;
    player.pause();
    useRecitationStore.setState({ playing: false });
    return;
  }
  wantPlaying = true;
  const nearEnd = state.durationSeconds > 0 && state.positionSeconds >= state.durationSeconds - 0.15;
  if (nearEnd) {
    if (state.mode === 'surah' && state.surahNumber) {
      void playSurah(state.surahNumber, 1);
      return;
    }
    void player.seekTo(0).then(() => player?.play());
    return;
  }
  player.play();
}

export function skipNextAyah(): void {
  const state = useRecitationStore.getState();
  if (state.playingBismillah) {
    void startGaplessAfterBismillah(requestSeq);
    return;
  }
  if (state.ayahNumber >= state.ayahCount) return;
  void seekToAyah(state.ayahNumber + 1);
}

export function skipPreviousAyah(): void {
  const state = useRecitationStore.getState();
  const clock = player?.currentTime ?? state.positionSeconds;
  if (state.playingBismillah) {
    if (clock > 2 && player) {
      wantPlaying = true;
      void player.seekTo(0).then(() => {
        bumpProgressEpoch();
        if (wantPlaying) player?.play();
      });
    }
    return;
  }
  if (state.mode === 'surah') {
    const timing = state.timings[state.ayahNumber - 1];
    const elapsedMs = clock * 1000 - (timing?.[0] ?? 0);
    if (elapsedMs > 2000 && timing && player) {
      wantPlaying = true;
      void player.seekTo(timing[0] / 1000).then(() => {
        bumpProgressEpoch();
        if (wantPlaying) player?.play();
      });
      return;
    }
    if (state.ayahNumber <= 1) {
      if (surahHasOpeningBismillah(state.surahNumber)) {
        wantPlaying = true;
        void loadBismillah(requestSeq);
      }
      return;
    }
    void seekToAyah(state.ayahNumber - 1);
    return;
  }

  if (clock > 2 && player) {
    wantPlaying = true;
    void player.seekTo(0).then(() => {
      bumpProgressEpoch();
      if (wantPlaying) player?.play();
    });
    return;
  }
  if (state.ayahNumber <= 1) return;
  void seekToAyah(state.ayahNumber - 1);
}

export function stopRecitation(): void {
  requestSeq += 1;
  playerEpoch += 1;
  wantPlaying = false;
  pendingSeekSeconds = null;
  seeking = false;
  loadedUri = null;
  loadedKind = null;
  loadedSurah = null;
  downloadAbort?.abort();
  downloadAbort = null;
  try {
    player?.pause();
  } catch {
    // Player may already be torn down.
  }
  deactivateLockScreen();
  statusSub?.remove();
  statusSub = null;
  try {
    player?.remove();
  } catch {
    // ignore
  }
  try {
    player?.release();
  } catch {
    // ignore
  }
  player = null;
  playerReady = null;
  useRecitationStore.setState({ ...INITIAL_STATE });
}

/** Header play on the open surah: start it, or toggle if this surah is already loaded. */
export function toggleSurahPlayback(surahNumber: number): void {
  const state = useRecitationStore.getState();
  if (state.visible && state.surahNumber === surahNumber && !state.error) {
    if (state.mode === 'ayah') {
      void playSurah(surahNumber, state.ayahNumber);
      return;
    }
    togglePlayPause();
    return;
  }
  void playSurah(surahNumber, 1);
}
