import { createAudioPlayer, setAudioModeAsync, type AudioPlayer, type AudioStatus } from 'expo-audio';
import type { DownloadProgress } from 'expo-file-system';
import { create } from 'zustand';

import { getSurahMeta } from '@/lib/quran-reader';
import { wordAtTimeMs, type WordTiming } from '@/lib/recitation';
import { getReciterAyahPlaybackUri, isAbortError } from '@/lib/recitation-cache';
import { downloadReciterDataset, getAyahEntry } from '@/lib/reciter-dataset';
import { DEFAULT_RECITER_KEY, findReciterOption, type ReciterOption } from '@/lib/reciters';
import { stopWordAudio } from '@/lib/word-audio';
import { useProgressStore } from '@/store/progress-store';

export type RecitationMode = 'surah' | 'ayah';

/** Fatihah 1:1 - reused as the opening Bismillah for every surah that has a header (`meta.b`). */
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
  /** Position/duration of whatever's currently loaded (the Bismillah clip, or one ayah's clip -
   *  every clip is its own file, so these are always relative to that one file, not a surah). */
  positionSeconds: number;
  durationSeconds: number;
  wordTimings: WordTiming[];
  /** 1-based word currently being recited; 0 when none. */
  wordNumber: number;
  error: string | null;
  /** Bumps when playback seeks so the progress bar can resync. */
  progressEpoch: number;
  /** True once the reader has scrolled away from the ayah currently being recited (the user
   *  dragged the list manually) - while set, `SurahPage` stops yanking the view back on every
   *  ayah change. Cleared automatically at the start of a new playback session, when the reader
   *  scrolls back to the playing ayah on their own, or when the player bar's title is tapped. */
  autoScrollSuspended: boolean;
  /** Inclusive ayah range for the current `'surah'` session, chosen via `PlayOptionsSheet`
   *  (default: the whole surah, 1..ayahCount). Skip/replay controls are bounded by this instead
   *  of `ayahCount`. */
  rangeStartAyah: number;
  rangeEndAyah: number;
  /** Set once playback has played through to `rangeEndAyah` - lets `togglePlayPause` know
   *  pressing play again should restart the chosen range instead of resuming a finished clip. */
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
  downloadBytesWritten: 0,
  downloadBytesTotal: 0,
  positionSeconds: 0,
  durationSeconds: 0,
  wordTimings: [],
  wordNumber: 0,
  error: null,
  progressEpoch: 0,
  autoScrollSuspended: false,
  rangeStartAyah: 1,
  rangeEndAyah: Infinity,
  rangeFinished: false,
};

function surahHasOpeningBismillah(surahNumber: number | null): boolean {
  if (!surahNumber) return false;
  return getSurahMeta(surahNumber)?.b === true;
}

/** The reciter+style chosen in Settings (see `lib/reciters.ts`); read live so a change takes
 *  effect on the next ayah load without any extra wiring. */
function getActiveReciter(): ReciterOption {
  const key = useProgressStore.getState().settings.selectedReciterKey;
  return findReciterOption(key) ?? findReciterOption(DEFAULT_RECITER_KEY)!;
}

/** Resolves a playable URI + word timings for one ayah, downloading the reciter's dataset first
 *  (see `lib/reciter-dataset.ts`) if it isn't already cached. `onProgress` reports real bytes
 *  for whichever of the two downloads below is actually in flight - the reciter's whole-Quran
 *  metadata catalog (a few hundred KB, only ever fetched once per reciter) and/or this one
 *  ayah's audio clip (tens to low-hundreds of KB) - so a cold first play shows real download
 *  progress instead of just an indeterminate spinner. Left `undefined` for background preloads
 *  (see `preloadNextChainedAyah`) so they don't hijack the visible progress bar. */
async function resolveAyahSource(
  reciter: ReciterOption,
  surahNumber: number,
  ayahNumber: number,
  signal?: AbortSignal,
  onProgress?: (data: DownloadProgress) => void,
): Promise<{ uri: string; wordTimings: WordTiming[] }> {
  const dataset = await downloadReciterDataset(reciter.key, signal, onProgress);
  const entry = getAyahEntry(dataset, surahNumber, ayahNumber);
  if (!entry?.audio_url) throw new Error('No recitation available for this ayah');
  const uri = await getReciterAyahPlaybackUri(reciter.key, surahNumber, ayahNumber, entry.audio_url, signal, onProgress);
  return { uri, wordTimings: entry.segments ?? [] };
}

/** Feeds one download's live progress into the player bar (see `RecitationPlayer`), ignoring
 *  ticks from a now-superseded request (e.g. the user skipped again before this one finished). */
function reportDownloadProgress(seq: number, data: DownloadProgress): void {
  if (seq !== requestSeq) return;
  useRecitationStore.setState({
    downloadBytesWritten: data.bytesWritten,
    downloadBytesTotal: Math.max(0, data.totalBytes),
  });
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
    title: `${chapter}: ${verse}`,
    artist: getActiveReciter().reciterName,
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
/** After a replace, the next status tick can still report the previous file's clock. Hold the
 *  intended position (always 0 - every clip starts at its own beginning) until native time
 *  catches up, so the progress bar does not jump full for a frame. */
let holdPositionSeconds: number | null = null;
let holdPositionUntil = 0;
/** Second player used only for `'surah'` sessions: while `player` plays the current ayah, this
 *  one is silently pre-loaded with the next ayah's clip (`preloadNextChainedAyah`) so the
 *  natural-finish handler in `onPlaybackStatus` can promote it (`trySwapToStandby`) with just a
 *  `.play()` call - no replace round-trip, which is what caused the audible blip between ayahs. */
let standbyPlayer: AudioPlayer | null = null;
let standbyReady = false;
let standbyAyahNumber: number | null = null;
let standbyWordTimings: WordTiming[] = [];
/** Bumped on every `preloadNextChainedAyah` call so a slow, now-superseded resolution can't
 *  clobber a newer one that already finished (e.g. two skips in quick succession). */
let preloadToken = 0;

function holdClock(positionSeconds: number, ms = 700): void {
  holdPositionSeconds = positionSeconds;
  holdPositionUntil = Date.now() + ms;
}

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
        player = createAudioPlayer(null, { updateInterval: 80, keepAudioSessionActive: true });
        statusSub = player.addListener('playbackStatusUpdate', onPlaybackStatus);
      }
      return player;
    })();
  }
  return playerReady;
}

async function ensureStandbyPlayer(): Promise<AudioPlayer> {
  if (standbyPlayer) return standbyPlayer;
  await ensurePlayer();
  standbyPlayer = createAudioPlayer(null, { updateInterval: 80, keepAudioSessionActive: true });
  return standbyPlayer;
}

function onPlaybackStatus(status: AudioStatus): void {
  if (suppressStatus) return;
  if (status.error) {
    useRecitationStore.setState({
      error: 'Playback failed. Try again.',
      playing: false,
      awaitingAudio: false,
    });
    return;
  }

  const finished = useRecitationStore.getState();
  const justFinished = Date.now() >= ignoreFinishUntil && status.didJustFinish && status.duration > 0.25;
  if (justFinished && !finishHandled) {
    finishHandled = true;
    if (finished.mode === 'surah' && finished.playingBismillah) {
      void afterBismillah(requestSeq);
      return;
    }
    if (finished.mode === 'surah' && finished.ayahNumber < finished.rangeEndAyah) {
      if (trySwapToStandby(finished.ayahNumber + 1)) return;
      void advanceChainedAyah(requestSeq);
      return;
    }
    wantPlaying = false;
    try {
      player?.pause();
    } catch {
      // Player may already be at/past the stop point.
    }
    useRecitationStore.setState({
      playing: false,
      awaitingAudio: false,
      positionSeconds: status.duration,
      durationSeconds: status.duration,
      rangeFinished: true,
      wordNumber: 0,
    });
    return;
  }

  const duration = Number.isFinite(status.duration) && status.duration > 0 ? status.duration : 0;
  const rawPosition = Number.isFinite(status.currentTime) ? Math.max(0, status.currentTime) : 0;
  let position = rawPosition;
  if (holdPositionSeconds != null && Date.now() < holdPositionUntil) {
    if (Math.abs(position - holdPositionSeconds) > 0.75) {
      position = holdPositionSeconds;
    } else {
      holdPositionSeconds = null;
    }
  } else {
    holdPositionSeconds = null;
  }
  if (duration > 0) position = Math.min(position, duration);

  const words = useRecitationStore.getState().wordTimings;
  // QUL ayah starts often precede the first word (2:2 is ~650ms). Keep that
  // word underlined for the lead-in instead of clearing it and lighting it again.
  const nextWord = wordAtTimeMs(words, position * 1000) || words[0]?.[0] || 0;

  useRecitationStore.setState({
    playing: status.playing,
    awaitingAudio: !status.isLoaded || (status.isBuffering && !status.playing),
    positionSeconds: position,
    durationSeconds: duration,
    wordNumber: nextWord,
    error: null,
  });
}

function beginSession(partial: Partial<RecitationState>): number {
  stopWordAudio();
  standbyReady = false;
  standbyAyahNumber = null;
  standbyWordTimings = [];
  requestSeq += 1;
  wantPlaying = true;
  finishHandled = false;
  holdPositionSeconds = null;
  holdPositionUntil = 0;
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

/** Silently loads `ayahNumber`'s clip into the standby player while the active one is still
 *  playing the ayah before it, so the transition can be a plain `.play()` instead of a
 *  replace round-trip. A no-op past the chosen range. */
async function preloadNextChainedAyah(seq: number, ayahNumber: number): Promise<void> {
  const token = ++preloadToken;
  standbyReady = false;
  standbyAyahNumber = null;
  const { surahNumber, rangeEndAyah, mode } = useRecitationStore.getState();
  if (mode !== 'surah' || !surahNumber || ayahNumber > rangeEndAyah) return;
  try {
    const reciter = getActiveReciter();
    const { uri, wordTimings } = await resolveAyahSource(reciter, surahNumber, ayahNumber, downloadAbort?.signal);
    if (seq !== requestSeq || token !== preloadToken) return;
    const instance = await ensureStandbyPlayer();
    if (seq !== requestSeq || token !== preloadToken) return;
    instance.replace({ uri });
    standbyWordTimings = wordTimings;
    standbyAyahNumber = ayahNumber;
    standbyReady = true;
  } catch (error) {
    if (seq !== requestSeq || isAbortError(error)) return;
    // Leave standbyReady false - the caller falls back to a normal (small-gap) load instead.
  }
}

/** Promotes the pre-buffered standby player to active when it already holds `targetAyahNumber`.
 *  Used for both the natural end-of-clip advance and manual skip, so most ayah-to-ayah
 *  transitions in a surah session play back-to-back with no re-load gap. Returns false if
 *  standby isn't ready yet (e.g. a slow download), so the caller can fall back to loading it the
 *  normal way. */
function trySwapToStandby(targetAyahNumber: number): boolean {
  if (!standbyReady || !standbyPlayer || standbyAyahNumber !== targetAyahNumber) return false;
  const promoted = standbyPlayer;
  const demoted = player;
  statusSub?.remove();
  if (lockScreenActive && demoted) {
    try {
      demoted.setActiveForLockScreen(false);
    } catch {
      // ignore
    }
    lockScreenActive = false;
  }
  // On a natural end-of-clip swap, `demoted` already finished on its own - this is a no-op. On
  // a manual skip, though, it can still be mid-playback: without this, it silently keeps playing
  // its old ayah in the background as the new "standby" until the next `preloadNextChainedAyah`
  // call happens to reuse it and replaces its source - audibly overlapping with the
  // newly-promoted player. That's the "two ayahs at once" on a fast skip.
  try {
    demoted?.pause();
  } catch {
    // ignore
  }
  player = promoted;
  standbyPlayer = demoted;
  standbyReady = false;
  standbyAyahNumber = null;
  const words = standbyWordTimings;
  standbyWordTimings = [];
  statusSub = player.addListener('playbackStatusUpdate', onPlaybackStatus);
  ignoreFinishUntil = Date.now() + 500;
  finishHandled = false;
  suppressStatus = false;
  wantPlaying = true;
  useRecitationStore.setState({
    ayahNumber: targetAyahNumber,
    awaitingAudio: false,
    positionSeconds: 0,
    durationSeconds: 0,
    wordTimings: words,
    wordNumber: words[0]?.[0] ?? 0,
  });
  player.play();
  activateLockScreen();
  bumpProgressEpoch();
  void preloadNextChainedAyah(requestSeq, targetAyahNumber + 1);
  return true;
}

async function loadAyahSource(seq: number): Promise<void> {
  const { surahNumber, ayahNumber } = useRecitationStore.getState();
  if (!surahNumber) return;

  suppressStatus = true;
  holdClock(0);
  const reciter = getActiveReciter();
  useRecitationStore.setState({
    awaitingAudio: true,
    error: null,
    positionSeconds: 0,
    durationSeconds: 0,
    wordTimings: [],
    wordNumber: 0,
    downloadBytesWritten: 0,
    downloadBytesTotal: 0,
  });

  try {
    const { uri, wordTimings } = await resolveAyahSource(reciter, surahNumber, ayahNumber, downloadAbort?.signal, (data) =>
      reportDownloadProgress(seq, data),
    );
    if (seq !== requestSeq) return;
    useRecitationStore.setState({ wordTimings, wordNumber: 0 });
    const instance = await ensurePlayer();
    if (seq !== requestSeq) return;
    ignoreFinishUntil = Date.now() + 500;
    finishHandled = false;
    instance.replace({ uri });
    suppressStatus = false;
    bumpProgressEpoch();
    if (wantPlaying) instance.play();
    activateLockScreen();
    if (ayahNumber < useRecitationStore.getState().rangeEndAyah) {
      void preloadNextChainedAyah(seq, ayahNumber + 1);
    }
  } catch (error) {
    if (seq !== requestSeq || isAbortError(error)) return;
    playbackFailed();
  }
}

/** Auto-advance to the next ayah when one clip finishes naturally - the fallback path for when
 *  `trySwapToStandby` couldn't (standby wasn't ready in time). */
async function advanceChainedAyah(seq: number): Promise<void> {
  if (seq !== requestSeq) return;
  wantPlaying = true;
  finishHandled = false;
  useRecitationStore.setState((state) => ({
    ayahNumber: state.ayahNumber + 1,
    awaitingAudio: true,
    positionSeconds: 0,
    durationSeconds: 0,
  }));
  await loadAyahSource(seq);
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

/** Every reciter's downloaded catalog includes their own Fatihah 1:1 recording - literally
 *  "Bismillah ir-Rahman ir-Rahim" - reused as the inserted opening before every other surah with
 *  a header (see `meta.b`). */
async function loadBismillah(seq: number): Promise<void> {
  const reciter = getActiveReciter();

  suppressStatus = true;
  holdClock(0);
  useRecitationStore.setState({
    playingBismillah: true,
    ayahNumber: 0,
    awaitingAudio: true,
    error: null,
    positionSeconds: 0,
    durationSeconds: 0,
    wordTimings: [],
    wordNumber: 0,
    downloadBytesWritten: 0,
    downloadBytesTotal: 0,
  });

  try {
    const { uri, wordTimings } = await resolveAyahSource(reciter, BISMILLAH_SURAH, BISMILLAH_AYAH, downloadAbort?.signal, (data) =>
      reportDownloadProgress(seq, data),
    );
    if (seq !== requestSeq) return;
    useRecitationStore.setState({ wordTimings, wordNumber: 0 });
    const instance = await ensurePlayer();
    if (seq !== requestSeq) return;
    ignoreFinishUntil = Date.now() + 500;
    finishHandled = false;
    instance.replace({ uri });
    suppressStatus = false;
    bumpProgressEpoch();
    if (wantPlaying) instance.play();
    activateLockScreen();
  } catch (error) {
    if (seq !== requestSeq || isAbortError(error)) return;
    useRecitationStore.setState({ playingBismillah: false, ayahNumber: 1 });
    await loadCurrent(seq);
  }
}

/** Transitions from the opening Bismillah into ayah 1's clip. */
async function afterBismillah(seq: number): Promise<void> {
  if (seq !== requestSeq) return;
  suppressStatus = true;
  try {
    player?.pause();
  } catch {
    // Player may already be ending the Bismillah clip.
  }
  useRecitationStore.setState({
    playingBismillah: false,
    ayahNumber: 1,
    awaitingAudio: true,
    positionSeconds: 0,
    durationSeconds: 0,
    wordTimings: [],
    wordNumber: 0,
  });
  await loadAyahSource(seq);
}

async function loadCurrent(seq: number): Promise<void> {
  const { mode, playingBismillah } = useRecitationStore.getState();
  if (mode === 'surah' && playingBismillah) {
    await loadBismillah(seq);
    return;
  }
  await loadAyahSource(seq);
}

async function seekToAyah(ayahNumber: number): Promise<void> {
  const { surahNumber, ayahCount } = useRecitationStore.getState();
  if (!surahNumber || ayahNumber < 1 || ayahNumber > ayahCount) return;
  // Bump so a still-in-flight `loadAyahSource` from an earlier, rapid-fire skip (one that fell
  // through to here because `trySwapToStandby` wasn't ready in time) can't land its `replace()`
  // after this one - every staleness guard in `loadAyahSource`/`resolveAyahSource` keys off this.
  requestSeq += 1;
  const seq = requestSeq;
  wantPlaying = true;
  finishHandled = false;
  useRecitationStore.setState({
    ayahNumber,
    playingBismillah: false,
    playing: false,
    awaitingAudio: true,
    wordTimings: [],
    wordNumber: 0,
    rangeFinished: false,
  });

  if (trySwapToStandby(ayahNumber)) return;
  await loadAyahSource(seq);
}

/** @param toAyah Inclusive end of the range to play (default: the whole surah). Chosen via
 *  `PlayOptionsSheet`; see `RecitationState.rangeEndAyah`. */
export async function playSurah(surahNumber: number, fromAyah = 1, toAyah?: number): Promise<void> {
  const meta = getSurahMeta(surahNumber);
  if (!meta) return;
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

  const seq = beginSession({
    mode: 'ayah',
    surahNumber,
    ayahNumber,
    ayahCount: meta.ac,
    // Ayah mode has no custom range - bound skip/prev by the whole surah, same as before this
    // existed (see `rangeStartAyah`/`rangeEndAyah`, otherwise left at the `Infinity` sentinel).
    rangeStartAyah: 1,
    rangeEndAyah: meta.ac,
  });
  await loadCurrent(seq);
}

/** See `RecitationState.autoScrollSuspended`. */
export function setAutoScrollSuspended(suspended: boolean): void {
  useRecitationStore.setState({ autoScrollSuspended: suspended });
}

/** Pause without tearing down the session so a word clip can play over it. */
export function pauseRecitation(): void {
  if (!player) {
    wantPlaying = false;
    return;
  }
  wantPlaying = false;
  try {
    player.pause();
  } catch {
    // ignore
  }
  if (useRecitationStore.getState().playing) {
    useRecitationStore.setState({ playing: false });
  }
}

export function togglePlayPause(): void {
  const state = useRecitationStore.getState();
  if (!state.visible || !player) {
    if (state.surahNumber) void playSurah(state.surahNumber, state.ayahNumber, state.rangeEndAyah);
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
  const nearEnd = state.rangeFinished || (state.durationSeconds > 0 && state.positionSeconds >= state.durationSeconds - 0.15);
  if (nearEnd) {
    // `durationSeconds` is the *current ayah clip's* length, not the whole surah's - only treat
    // "near end" as "range finished" on its last ayah; otherwise it just means this ayah's clip
    // is ending, so advance like a natural finish would.
    if (state.mode === 'surah' && state.ayahNumber < state.rangeEndAyah) {
      void seekToAyah(state.ayahNumber + 1);
      return;
    }
    if (state.mode === 'surah' && state.surahNumber) {
      void playSurah(state.surahNumber, state.rangeStartAyah, state.rangeEndAyah);
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
    void afterBismillah(requestSeq);
    return;
  }
  if (state.ayahNumber >= state.rangeEndAyah) return;
  void seekToAyah(state.ayahNumber + 1);
}

export function skipPreviousAyah(): void {
  const state = useRecitationStore.getState();
  const clock = player?.currentTime ?? state.positionSeconds;

  // Restart the current clip (Bismillah, or an ayah in either mode) if we're more than 2s in;
  // otherwise jump back a step - to the previous ayah, or into the opening Bismillah if we're at
  // the first ayah of a range that starts the surah.
  if (clock > 2 && player) {
    wantPlaying = true;
    void player.seekTo(0).then(() => {
      bumpProgressEpoch();
      if (wantPlaying) player?.play();
    });
    return;
  }
  if (state.playingBismillah) return;
  if (state.ayahNumber <= state.rangeStartAyah) {
    if (state.mode === 'surah' && state.rangeStartAyah <= 1 && surahHasOpeningBismillah(state.surahNumber)) {
      wantPlaying = true;
      void loadBismillah(requestSeq);
    }
    return;
  }
  void seekToAyah(state.ayahNumber - 1);
}

export function stopRecitation(): void {
  const recitation = useRecitationStore.getState();
  if (
    !player &&
    !wantPlaying &&
    !downloadAbort &&
    !recitation.visible &&
    !recitation.playing &&
    !recitation.awaitingAudio
  ) {
    return;
  }
  requestSeq += 1;
  playerEpoch += 1;
  wantPlaying = false;
  holdPositionSeconds = null;
  holdPositionUntil = 0;
  standbyReady = false;
  standbyAyahNumber = null;
  standbyWordTimings = [];
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
  try {
    standbyPlayer?.pause();
  } catch {
    // ignore
  }
  try {
    standbyPlayer?.remove();
  } catch {
    // ignore
  }
  try {
    standbyPlayer?.release();
  } catch {
    // ignore
  }
  standbyPlayer = null;
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
