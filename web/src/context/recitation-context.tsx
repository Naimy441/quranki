'use client';

import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import {
  fetchReciterAudioDataset,
  getCachedAyahAudio,
  getActiveWordIndex,
  getWordAudioUrl,
  DEFAULT_RECITER_KEY,
  type AyahAudioData,
} from '@/lib/reciters';
import { getSurahMeta } from '@/lib/quran-data';
import { useProgress } from '@/context/progress-context';

interface RecitationContextValue {
  currentSurah: number;
  currentAyah: number;
  isPlaying: boolean;
  isLoading: boolean;
  currentWordIndex: number;
  currentTime: number;
  duration: number;
  autoAdvance: boolean;
  reciterKey: string;
  hasActiveRecitation: boolean;
  playAyah: (surah: number, ayah: number) => void;
  togglePlay: () => void;
  pause: () => void;
  closeRecitation: () => void;
  nextAyah: () => void;
  prevAyah: () => void;
  seek: (seconds: number) => void;
  toggleAutoAdvance: () => void;
  playWordAudio: (surah: number, ayah: number, word: number) => void;
  isWordAudioPlaying: boolean;
}

const RecitationContext = createContext<RecitationContextValue | null>(null);

export function RecitationProvider({ children }: { children: React.ReactNode }) {
  const { settings } = useProgress();
  const reciterKey = settings.selectedReciterKey || DEFAULT_RECITER_KEY;

  const [currentSurah, setCurrentSurah] = useState<number>(1);
  const [currentAyah, setCurrentAyah] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [hasActiveRecitation, setHasActiveRecitation] = useState<boolean>(false);
  const [currentWordIndex, setCurrentWordIndex] = useState<number>(0);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [autoAdvance, setAutoAdvance] = useState<boolean>(true);
  const [isWordAudioPlaying, setIsWordAudioPlaying] = useState<boolean>(false);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const wordAudioRef = useRef<HTMLAudioElement | null>(null);
  const segmentsRef = useRef<[number, number, number][]>([]);
  const advanceAyahRef = useRef<(delta: number) => void>(() => {});

  // Preload reciter dataset in background
  useEffect(() => {
    fetchReciterAudioDataset(reciterKey).catch(console.warn);
  }, [reciterKey]);

  // Initialize HTML5 Audio elements
  useEffect(() => {
    audioRef.current = new Audio();
    wordAudioRef.current = new Audio();

    const audio = audioRef.current;
    const wordAudio = wordAudioRef.current;

    const onTimeUpdate = () => {
      if (!audio) return;
      const cur = audio.currentTime;
      setCurrentTime(cur);
      const timeMs = Math.round(cur * 1000);
      const activeIdx = getActiveWordIndex(segmentsRef.current, timeMs);
      setCurrentWordIndex(activeIdx);
    };

    const onLoadedMetadata = () => {
      if (audio) {
        setDuration(audio.duration || 0);
        setIsLoading(false);
      }
    };

    const onPlay = () => setIsPlaying(true);
    const onPause = () => {
      setIsPlaying(false);
      setCurrentWordIndex(0);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentWordIndex(0);
      if (autoAdvance) {
        advanceAyahRef.current(1);
      }
    };

    const onWordAudioEnded = () => setIsWordAudioPlaying(false);

    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('play', onPlay);
    audio.addEventListener('pause', onPause);
    audio.addEventListener('ended', onEnded);
    wordAudio.addEventListener('ended', onWordAudioEnded);

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('play', onPlay);
      audio.removeEventListener('pause', onPause);
      audio.removeEventListener('ended', onEnded);
      wordAudio.removeEventListener('ended', onWordAudioEnded);
      audio.pause();
      wordAudio.pause();
    };
  }, [autoAdvance]);

  const loadAndPlayAyah = async (surah: number, ayah: number) => {
    if (!audioRef.current) return;
    setIsLoading(true);
    setHasActiveRecitation(true);

    let audioData = getCachedAyahAudio(reciterKey, surah, ayah);
    if (!audioData) {
      const dataset = await fetchReciterAudioDataset(reciterKey);
      audioData = dataset[`${surah}:${ayah}`];
    }

    if (!audioData) {
      setIsLoading(false);
      return;
    }

    segmentsRef.current = audioData.segments || [];
    setCurrentSurah(surah);
    setCurrentAyah(ayah);
    setCurrentWordIndex(0);

    audioRef.current.src = audioData.audio_url;
    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        setIsLoading(false);
      })
      .catch((err) => {
        console.warn('Playback prevented or failed:', err);
        setIsLoading(false);
        setIsPlaying(false);
      });
  };

  const advanceAyah = (delta: number) => {
    const surahMeta = getSurahMeta(currentSurah);
    if (!surahMeta) return;

    let nextA = currentAyah + delta;
    let nextS = currentSurah;

    if (nextA > surahMeta.ac) {
      if (nextS < 114) {
        nextS++;
        nextA = 1;
      } else {
        return;
      }
    } else if (nextA < 1) {
      if (nextS > 1) {
        nextS--;
        const prevMeta = getSurahMeta(nextS);
        nextA = prevMeta ? prevMeta.ac : 1;
      } else {
        return;
      }
    }

    loadAndPlayAyah(nextS, nextA);
  };
  advanceAyahRef.current = advanceAyah;

  const playAyah = (surah: number, ayah: number) => {
    setHasActiveRecitation(true);
    if (currentSurah === surah && currentAyah === ayah && audioRef.current?.src) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play().catch(console.warn);
      }
    } else {
      loadAndPlayAyah(surah, ayah);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    setHasActiveRecitation(true);
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      if (!audioRef.current.src) {
        loadAndPlayAyah(currentSurah, currentAyah);
      } else {
        audioRef.current.play().catch(console.warn);
      }
    }
  };

  const pause = () => {
    audioRef.current?.pause();
  };

  const closeRecitation = () => {
    pause();
    setHasActiveRecitation(false);
  };

  const nextAyah = () => advanceAyah(1);
  const prevAyah = () => advanceAyah(-1);

  const seek = (seconds: number) => {
    if (!audioRef.current) return;
    audioRef.current.currentTime = seconds;
    setCurrentTime(seconds);
  };

  const toggleAutoAdvance = () => {
    setAutoAdvance((prev) => !prev);
  };

  const playWordAudio = (surah: number, ayah: number, word: number) => {
    if (!wordAudioRef.current) return;
    if (isPlaying) {
      audioRef.current?.pause();
    }

    const url = getWordAudioUrl(surah, ayah, word);
    wordAudioRef.current.src = url;
    setIsWordAudioPlaying(true);
    wordAudioRef.current.play().catch(() => {
      setIsWordAudioPlaying(false);
    });
  };

  return (
    <RecitationContext.Provider
      value={{
        currentSurah,
        currentAyah,
        isPlaying,
        isLoading,
        currentWordIndex,
        currentTime,
        duration,
        autoAdvance,
        reciterKey,
        hasActiveRecitation,
        playAyah,
        togglePlay,
        pause,
        closeRecitation,
        nextAyah,
        prevAyah,
        seek,
        toggleAutoAdvance,
        playWordAudio,
        isWordAudioPlaying,
      }}
    >
      {children}
    </RecitationContext.Provider>
  );
}

export function useRecitation() {
  const ctx = useContext(RecitationContext);
  if (!ctx) throw new Error('useRecitation must be used within a RecitationProvider');
  return ctx;
}
