export type CoverVariant = 'roadmap' | 'bars' | 'curve' | 'clock' | 'forgetting' | 'cycle' | 'venn' | 'letters' | 'ayah' | 'names';

export interface PostMeta {
  slug: string;
  /** On-page H1. */
  title: string;
  /** Shorter title for the <title> tag and search results. */
  seoTitle: string;
  description: string;
  /** One-line hook on the blog index card. */
  excerpt: string;
  category: 'Vocabulary' | 'Study method' | 'Memorization' | 'Getting started' | 'Quran guides';
  published: string;
  updated: string;
  readMinutes: number;
  keywords: string[];
  cover: CoverVariant;
  /** Headline number drawn on the cover and the social image. */
  stat: { value: string; label: string };
  faqs: { q: string; a: string }[];
}

export const POSTS: PostMeta[] = [
  {
    slug: 'how-to-learn-quranic-arabic-fast',
    title: 'How to Learn Quranic Arabic Fast: A 6-Step Plan Built on Word Frequency',
    seoTitle: 'How to Learn Quranic Arabic Fast (6-Step Plan)',
    description:
      'A practical, data-backed plan to learn Quranic Arabic fast: read the script, learn the most frequent words first, review with spaced repetition, and read real ayahs every day.',
    excerpt: 'Skip the textbook order. Learn the words the Quran actually repeats, and review them right before you forget.',
    category: 'Getting started',
    published: '2026-10-21',
    updated: '2026-10-21',
    readMinutes: 9,
    keywords: [
      'how to learn Quranic Arabic fast',
      'learn Quranic Arabic',
      'learn Quran Arabic online',
      'Quranic Arabic for beginners',
      'understand the Quran in Arabic',
    ],
    cover: 'roadmap',
    stat: { value: '6 steps', label: 'from the alphabet to reading ayahs' },
    faqs: [
      {
        q: 'What is the fastest way to learn Quranic Arabic?',
        a: 'Learn to read the script first, then learn vocabulary in order of how often it appears in the Quran, and review it with a spaced repetition scheduler. The 100 most frequent words already cover more than half of the text, so frequency order gives you the most understanding per hour.',
      },
      {
        q: 'Can I learn Quranic Arabic without a teacher?',
        a: 'You can learn to recognize vocabulary and basic grammar on your own with good tools. A teacher is still valuable for pronunciation and Tajweed, so many learners combine self-study for vocabulary with a weekly class or recitation partner.',
      },
      {
        q: 'Do I need to learn Modern Standard Arabic first?',
        a: 'No. If your goal is understanding the Quran, start with Quranic vocabulary directly. The alphabet and core grammar are shared, and MSA is easier to pick up later once you know Quranic roots.',
      },
    ],
  },
  {
    slug: 'most-common-words-in-the-quran',
    title: 'The 50 Most Common Words in the Quran, Ranked by Frequency',
    seoTitle: 'The 50 Most Common Words in the Quran (With Counts)',
    description:
      'The most frequent words in the Quran with Arabic, transliteration, meaning, and exact occurrence counts from the Quranic Arabic Corpus. Learn these first.',
    excerpt: 'Ten words make up a quarter of the Quran. Here are the top 50, with exact counts from the corpus.',
    category: 'Vocabulary',
    published: '2026-10-21',
    updated: '2026-10-21',
    readMinutes: 8,
    keywords: [
      'most common words in the Quran',
      'most repeated words in Quran',
      'Quran word frequency',
      'Quranic vocabulary list',
      'top Quranic words',
    ],
    cover: 'bars',
    stat: { value: '25%', label: 'of the Quran is just 10 words' },
    faqs: [
      {
        q: 'What is the most common word in the Quran?',
        a: 'Counted by dictionary form (lemma), the most frequent word is the preposition min (from, of). The most frequent noun is Allah, which appears about 2,700 times.',
      },
      {
        q: 'How many unique words are in the Quran?',
        a: 'The Quranic Arabic Corpus lists about 4,875 distinct lemmas across roughly 77,400 words. Around 2,000 of those lemmas appear only once.',
      },
      {
        q: 'Should I learn particles or nouns first?',
        a: 'Learn them together. Particles like min, fi, and ala are the most frequent words of all, but they only make sense inside phrases, so pair them with common nouns and verbs from the same ayahs.',
      },
    ],
  },
  {
    slug: 'how-many-words-to-understand-the-quran',
    title: 'How Many Words Do You Need to Understand the Quran? We Counted',
    seoTitle: 'How Many Words to Understand the Quran? The Real Numbers',
    description:
      'Is it true that 300 words cover 80% of the Quran? We measured coverage across all 77,000 words with the Quranic Arabic Corpus. Here is the real curve.',
    excerpt: 'You have heard "300 words, 80% of the Quran". The real number is closer to 500. Here is the full curve.',
    category: 'Vocabulary',
    published: '2026-10-21',
    updated: '2026-10-21',
    readMinutes: 7,
    keywords: [
      'how many words to understand the Quran',
      '80 percent of Quranic words',
      'Quran vocabulary coverage',
      'how many unique words in the Quran',
      'Quran word count',
    ],
    cover: 'curve',
    stat: { value: '500', label: 'words cover 80% of the Quran' },
    faqs: [
      {
        q: 'Do 300 words really cover 80% of the Quran?',
        a: 'Not when you count dictionary forms strictly. The top 300 lemmas cover about 73% of all words. You reach 80% at roughly 470 to 500 lemmas, and 90% at around 1,100.',
      },
      {
        q: 'If I know 80% of the words, will I understand 80% of the Quran?',
        a: 'Not quite. Recognizing most words in an ayah gets you the gist, but the rarer words often carry the specific meaning. Coverage tells you how much of the text is familiar, not how much you fully understand.',
      },
      {
        q: 'How many words are in the Quran in total?',
        a: 'About 77,400 words, built from roughly 4,875 distinct lemmas according to the Quranic Arabic Corpus.',
      },
    ],
  },
  {
    slug: 'how-long-does-it-take-to-learn-quranic-arabic',
    title: 'How Long Does It Take to Learn Quranic Arabic? A Realistic Timeline',
    seoTitle: 'How Long to Learn Quranic Arabic? A Realistic Timeline',
    description:
      'A realistic timeline for learning Quranic Arabic, from reading the letters to recognizing 90% of the words, with daily time estimates you can plan around.',
    excerpt: 'Twenty minutes a day can get you to 80% word coverage in about three months. Here is how the math works.',
    category: 'Getting started',
    published: '2026-10-21',
    updated: '2026-10-21',
    readMinutes: 7,
    keywords: [
      'how long does it take to learn Quranic Arabic',
      'how long to learn Arabic to understand Quran',
      'Quranic Arabic timeline',
      'learn Quran Arabic in one year',
    ],
    cover: 'clock',
    stat: { value: '~3 months', label: 'to 80% coverage at 5 words a day' },
    faqs: [
      {
        q: 'Can I learn Quranic Arabic in a year?',
        a: 'Yes, for recognition. At five new words a day you can learn around 1,800 words in a year, which covers about 94% of the words in the Quran. Grammar and fluent reading take longer, but you will follow most ayahs.',
      },
      {
        q: 'How many minutes a day should I study?',
        a: 'Fifteen to thirty minutes, every day. Consistency matters more than session length, because spaced repetition depends on reviewing words on the day they are due.',
      },
      {
        q: 'How long does it take to learn to read Arabic letters?',
        a: 'Most adults can read slowly with harakat in two to six weeks of daily practice with a Qaida course.',
      },
    ],
  },
  {
    slug: 'spaced-repetition-for-quranic-arabic',
    title: 'Spaced Repetition for Quranic Arabic: Why Flashcards Finally Stick',
    seoTitle: 'Spaced Repetition for Quranic Arabic (Anki and FSRS)',
    description:
      'How spaced repetition and the FSRS algorithm help you remember Quranic vocabulary for good, how it compares to Anki decks, and how to build a daily review habit.',
    excerpt: 'You forget most new words within days. Spaced repetition schedules each review right before that happens.',
    category: 'Study method',
    published: '2026-10-21',
    updated: '2026-10-21',
    readMinutes: 8,
    keywords: [
      'spaced repetition Quran',
      'Anki Quranic Arabic',
      'Quran flashcards',
      'FSRS algorithm',
      'memorize Quranic vocabulary',
    ],
    cover: 'forgetting',
    stat: { value: 'FSRS', label: 'reviews right before you forget' },
    faqs: [
      {
        q: 'Is Anki good for learning Quranic Arabic?',
        a: 'Anki is excellent at scheduling, and its newer versions use FSRS. The weak point is usually the deck: many shared decks are not ordered by Quranic frequency and are not linked to the text you read. A dedicated app can connect each word to the ayahs it appears in.',
      },
      {
        q: 'What is FSRS?',
        a: 'FSRS (Free Spaced Repetition Scheduler) is a modern open-source algorithm that models how stable each memory is and predicts when you are about to forget it. It typically needs fewer reviews than the older SM-2 algorithm for the same retention.',
      },
      {
        q: 'How many new words per day should I add?',
        a: 'Five to ten. Every new word creates reviews for weeks, so a modest daily number keeps your review load steady and sustainable.',
      },
    ],
  },
  {
    slug: 'how-to-memorize-the-quran-without-forgetting',
    title: 'How to Memorize the Quran Without Forgetting: A Review System That Lasts',
    seoTitle: 'How to Memorize the Quran Without Forgetting',
    description:
      'Practical hifz tips to memorize the Quran and keep it: small daily portions, the new, recent, and old revision cycle, active recall, and spaced review.',
    excerpt: 'Memorizing is the easy part. Keeping it is a review problem. Here is a system for both.',
    category: 'Memorization',
    published: '2026-10-21',
    updated: '2026-10-21',
    readMinutes: 9,
    keywords: [
      'how to memorize Quran without forgetting',
      'hifz tips',
      'how to memorize Quran fast',
      'Quran revision schedule',
      'sabaq sabqi manzil',
    ],
    cover: 'cycle',
    stat: { value: '3 tracks', label: 'new, recent, and old revision' },
    faqs: [
      {
        q: 'How do I stop forgetting what I memorized?',
        a: 'Give old memorization its own daily slot. Most forgetting happens because all the time goes to new portions. Split every session into new, recent, and old revision, and test yourself from memory instead of rereading.',
      },
      {
        q: 'How much should I memorize per day?',
        a: 'Start with a few lines, or about one ruku a week, and only increase once your revision feels comfortable. A portion you can keep is worth more than a page you will lose.',
      },
      {
        q: 'Does understanding the meaning help memorization?',
        a: 'Yes. When you know what the words mean, ayahs become connected ideas instead of strings of sounds, which makes them easier to recall and to keep in order.',
      },
    ],
  },
  {
    slug: 'surah-al-fatihah-word-by-word',
    title: 'Surah Al-Fatihah Word by Word: Meaning, Transliteration, and Vocabulary',
    seoTitle: 'Surah Al-Fatihah Word by Word (Meaning and Translation)',
    description:
      'Understand Surah Al-Fatihah word by word: Arabic, transliteration, and meaning for every word, plus how often each word appears in the rest of the Quran.',
    excerpt: 'You recite it at least 17 times a day. Its 23 distinct words also make up 12.5% of the whole Quran.',
    category: 'Quran guides',
    published: '2026-10-21',
    updated: '2026-10-21',
    readMinutes: 8,
    keywords: [
      'Surah Fatiha word by word',
      'Al-Fatihah meaning',
      'Surah Fatiha translation',
      'Fatiha transliteration',
      'understand Surah Fatiha',
    ],
    cover: 'ayah',
    stat: { value: '12.5%', label: "of the Quran uses Al-Fatihah's 23 words" },
    faqs: [
      {
        q: 'How many words are in Surah Al-Fatihah?',
        a: 'Counting the Bismillah as the first ayah, Al-Fatihah has 7 ayahs and 29 words. Those 29 words come from 23 distinct dictionary forms.',
      },
      {
        q: 'Why is Al-Fatihah a good place to start learning Quranic Arabic?',
        a: 'You already know it by heart and recite it in every rakah, so every word you learn is reinforced daily. Its words are also very common: together they account for about one in eight words in the entire Quran.',
      },
      {
        q: 'What does Rabbil Alamin mean?',
        a: 'Rabb means Lord, master, and sustainer. Al-Alamin is the plural of alam, a world, so the phrase means Lord of the worlds: of everything that exists.',
      },
    ],
  },
  {
    slug: 'how-to-read-arabic-noorani-qaida',
    title: 'How to Read Arabic for the Quran: A Step-by-Step Qaida Guide',
    seoTitle: 'How to Read Quran Arabic: Step-by-Step Qaida Guide',
    description:
      'Learn to read Quranic Arabic from zero: the 28 letters, joining forms, harakat, tanween, madd, sukoon, and shaddah, with how much of the Quran each rule unlocks.',
    excerpt: 'Six reading rules take you from the alphabet to every word in the Mushaf. Sukoon alone unlocks a third of it.',
    category: 'Getting started',
    published: '2026-10-21',
    updated: '2026-10-21',
    readMinutes: 9,
    keywords: [
      'how to read Quran Arabic',
      'Noorani Qaida',
      'learn to read Arabic for beginners',
      'Arabic harakat',
      'learn Quran reading',
    ],
    cover: 'letters',
    stat: { value: '6 rules', label: 'to read every word of the Quran' },
    faqs: [
      {
        q: 'How long does it take to learn to read the Quran in Arabic?',
        a: 'Most adults can read slowly and correctly with harakat after two to six weeks of daily practice. Reading smoothly and applying Tajweed takes a few more months of regular recitation.',
      },
      {
        q: 'What is the Noorani Qaida?',
        a: 'The Noorani Qaida is a traditional beginner book that teaches Quran reading in a fixed order: letters, joined forms, short vowels, tanween, long vowels, sukoon, and shaddah. Most modern Qaida courses follow the same sequence.',
      },
      {
        q: 'Can I learn to read Arabic without a teacher?',
        a: 'You can learn the letters and rules on your own with audio for every sound. A teacher or recitation partner is still very helpful for correcting pronunciation, especially letters that do not exist in English.',
      },
    ],
  },
  {
    slug: 'quranic-arabic-vs-modern-standard-arabic',
    title: 'Quranic Arabic vs Modern Standard Arabic: Differences and Which to Learn First',
    seoTitle: 'Quranic Arabic vs Modern Standard Arabic: Which First?',
    description:
      'How Quranic (Classical) Arabic differs from Modern Standard Arabic in vocabulary, grammar, and script, what they share, and which one to learn first for your goals.',
    excerpt: 'Same alphabet, same roots, same core grammar. The real difference is vocabulary, and that decides where to start.',
    category: 'Getting started',
    published: '2026-10-21',
    updated: '2026-10-21',
    readMinutes: 7,
    keywords: [
      'Quranic Arabic vs Modern Standard Arabic',
      'Classical Arabic vs MSA',
      'should I learn MSA or Quranic Arabic',
      'difference between Quranic Arabic and Arabic',
    ],
    cover: 'venn',
    stat: { value: 'Goal first', label: 'decides which Arabic to start with' },
    faqs: [
      {
        q: 'Is Quranic Arabic the same as Modern Standard Arabic?',
        a: 'No, but they are very close relatives. MSA grew out of Classical Arabic, the language of the Quran. They share the alphabet, the root system, and most core grammar. The biggest differences are vocabulary and style.',
      },
      {
        q: 'Will learning Quranic Arabic help me speak Arabic?',
        a: 'It gives you a strong base of roots and grammar, which makes MSA much easier later. On its own it will not teach you modern vocabulary or a spoken dialect.',
      },
      {
        q: 'Is Quranic Arabic harder than Modern Standard Arabic?',
        a: 'The grammar is a little richer and the style is more elevated, but the vocabulary is finite and fixed. Every word you learn appears in a text you read and recite regularly, which makes it easier to stay motivated.',
      },
    ],
  },
  {
    slug: '99-names-of-allah-meanings',
    title: 'The 99 Names of Allah: Meanings, Transliteration, and Where They Appear in the Quran',
    seoTitle: '99 Names of Allah (Asma ul-Husna) With Meanings',
    description:
      'All 99 Names of Allah (Asma ul-Husna) in Arabic with transliteration and meaning, a Quran verse for each, and the names the Quran repeats most often.',
    excerpt: 'All 99 names with Arabic, meaning, and a verse for each, plus the ones the Quran repeats most.',
    category: 'Quran guides',
    published: '2026-10-21',
    updated: '2026-10-21',
    readMinutes: 10,
    keywords: [
      '99 names of Allah',
      'Asma ul Husna',
      '99 names of Allah with meaning',
      'names of Allah in the Quran',
      'Allah names list',
    ],
    cover: 'names',
    stat: { value: '99', label: 'names, each with a Quran verse' },
    faqs: [
      {
        q: 'Are all 99 names found in the Quran?',
        a: 'Most are. The traditional list comes from a hadith in Tirmidhi, and scholars note that a few names on it do not appear in the Quran as names, although the Quran describes Allah with the same meaning. For those, the list below links a verse with that meaning.',
      },
      {
        q: 'Which name of Allah appears most in the Quran?',
        a: 'Apart from Allah itself, which appears about 2,700 times, the most repeated attributes include Al-Alim (the All-Knowing), Ar-Rahim (the Especially Merciful), Al-Aziz (the Almighty), and Al-Hakim (the All-Wise).',
      },
      {
        q: 'What is the difference between Ar-Rahman and Ar-Rahim?',
        a: 'Both come from the root of mercy. Ar-Rahman is usually explained as mercy that is vast and covers all of creation, while Ar-Rahim emphasizes mercy that is continuous and especially directed to the believers.',
      },
    ],
  },
];

export function getPost(slug: string): PostMeta | undefined {
  return POSTS.find((p) => p.slug === slug);
}

export function formatPostDate(iso: string): string {
  return new Date(`${iso}T00:00:00Z`).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}
