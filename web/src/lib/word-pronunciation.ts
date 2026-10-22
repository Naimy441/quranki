import { playQaidaAudio, prefetchQaidaAudio } from '@/lib/qaida-audio';
import { getWord } from '@/lib/levels';
import { exampleAudioPositions, getVocabExample } from '@/lib/vocab-examples';
import { playWordAudio, prefetchWordAudio, stopWordAudio } from '@/lib/word-audio';

function exampleForWord(id: string) {
  const word = getWord(id);
  if (!word || word.kind === 'digit' || word.kind === 'qaida') return undefined;
  return getVocabExample(word);
}

/** Download this card's clip so the speaker tap does not wait on the network. */
export function prefetchWordPronunciation(id: string): void {
  const word = getWord(id);
  if (word?.kind === 'qaida') {
    prefetchQaidaAudio(id);
    return;
  }
  const example = exampleForWord(id);
  if (!example) return;
  for (const position of exampleAudioPositions(example)) {
    prefetchWordAudio(example.s, example.a, position);
  }
}

/** Plays Qaida TTS from Firebase, or the tagged Quran example for a vocab card. */
export async function playWordPronunciation(id: string, finished?: () => void): Promise<boolean> {
  const word = getWord(id);
  if (word?.kind === 'qaida') {
    return playQaidaAudio(id, { onFinished: finished, onFailed: finished });
  }

  const example = exampleForWord(id);
  if (!example) {
    finished?.();
    return false;
  }
  const positions = exampleAudioPositions(example);
  let index = 0;
  const playNext = async (): Promise<boolean> => {
    const last = index >= positions.length - 1;
    return playWordAudio(example.s, example.a, positions[index] ?? example.p, {
      onFinished: last
        ? finished
        : () => {
            index += 1;
            void playNext();
          },
      onFailed: finished,
    });
  };
  return playNext();
}

export function stopWordPronunciation(): void {
  stopWordAudio();
}
