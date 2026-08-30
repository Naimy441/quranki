import { createAudioPlayer, setAudioModeAsync, type AudioPlayer } from 'expo-audio';

import { WORD_PRONUNCIATION_ASSETS } from '@/data/word-pronunciation-assets';

const assets: Record<string, number> = WORD_PRONUNCIATION_ASSETS;

let player: AudioPlayer | null = null;
let audioModeReady = false;
let onFinished: (() => void) | null = null;

async function getPlayer(): Promise<AudioPlayer> {
  if (!audioModeReady) {
    await setAudioModeAsync({
      playsInSilentMode: true,
      shouldPlayInBackground: false,
      interruptionMode: 'doNotMix',
    });
    audioModeReady = true;
  }
  if (!player) {
    player = createAudioPlayer(null);
    player.addListener('playbackStatusUpdate', (status) => {
      if (!status.didJustFinish) return;
      const callback = onFinished;
      onFinished = null;
      callback?.();
    });
  }
  return player;
}

/** Plays the bundled human recording for a vocabulary word. */
export async function playWordPronunciation(id: string, finished?: () => void): Promise<boolean> {
  const asset = assets[id];
  if (!asset) return false;
  const instance = await getPlayer();
  onFinished = finished ?? null;
  instance.replace(asset);
  await instance.seekTo(0);
  instance.play();
  return true;
}

export function stopWordPronunciation(): void {
  onFinished = null;
  player?.pause();
}
