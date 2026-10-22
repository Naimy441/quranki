import type { ComponentType } from 'react';
import LearnFast, { toc as learnFastToc } from './learn-quranic-arabic-fast';
import MostCommon, { toc as mostCommonToc } from './most-common-words';
import HowMany, { toc as howManyToc } from './how-many-words';
import HowLong, { toc as howLongToc } from './how-long';
import Spaced, { toc as spacedToc } from './spaced-repetition';
import Hifz, { toc as hifzToc } from './memorize-without-forgetting';
import Fatiha, { toc as fatihaToc } from './al-fatihah-word-by-word';
import Qaida, { toc as qaidaToc } from './read-arabic-qaida';
import VsMsa, { toc as vsMsaToc } from './quranic-vs-msa';
import Names, { toc as namesToc } from './names-of-allah';

export interface PostBody {
  Content: ComponentType;
  toc: { id: string; label: string }[];
}

export const POST_BODIES: Record<string, PostBody> = {
  'how-to-learn-quranic-arabic-fast': { Content: LearnFast, toc: learnFastToc },
  'most-common-words-in-the-quran': { Content: MostCommon, toc: mostCommonToc },
  'how-many-words-to-understand-the-quran': { Content: HowMany, toc: howManyToc },
  'how-long-does-it-take-to-learn-quranic-arabic': { Content: HowLong, toc: howLongToc },
  'spaced-repetition-for-quranic-arabic': { Content: Spaced, toc: spacedToc },
  'how-to-memorize-the-quran-without-forgetting': { Content: Hifz, toc: hifzToc },
  'surah-al-fatihah-word-by-word': { Content: Fatiha, toc: fatihaToc },
  'how-to-read-arabic-noorani-qaida': { Content: Qaida, toc: qaidaToc },
  'quranic-arabic-vs-modern-standard-arabic': { Content: VsMsa, toc: vsMsaToc },
  '99-names-of-allah-meanings': { Content: Names, toc: namesToc },
};
