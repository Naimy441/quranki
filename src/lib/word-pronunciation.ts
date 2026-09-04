import { getWord } from '@/lib/levels';
import { getVocabExample } from '@/lib/vocab-examples';
import { playWordAudio, stopWordAudio } from '@/lib/word-audio';

/** Plays the tagged Quran example for this vocab card. */
export async function playWordPronunciation(id: string, finished?: () => void): Promise<boolean> {
  stopWordAudio();
  const word = getWord(id);
  const example = word ? getVocabExample(word) : undefined;
  if (!example) {
    finished?.();
    return false;
  }
  return playWordAudio(example.s, example.a, example.p, {
    onFinished: finished,
    onFailed: finished,
  });
}

export function stopWordPronunciation(): void {
  stopWordAudio();
}
