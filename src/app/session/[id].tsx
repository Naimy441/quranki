import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';

import { SessionRunner } from '@/components/quranki/session-runner';
import { ThemedView } from '@/components/themed-view';
import { buildSessionQueue, getLevel } from '@/lib/levels';
import { useProgressStore } from '@/store/progress-store';

export default function LevelSessionScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const levelNumber = Number(id);
  const level = getLevel(levelNumber);

  const progress = useProgressStore((state) => state.progress);
  const wordsPerSession = useProgressStore((state) => state.settings.wordsPerSession);

  const [queue] = useState(() => (level ? buildSessionQueue(level, progress, new Date(), wordsPerSession) : []));

  if (!level) {
    return <ThemedView style={{ flex: 1 }} />;
  }

  return <SessionRunner queue={queue} emptyMessage="There is nothing due in this level right now." />;
}
