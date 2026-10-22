import { FACTS } from '@/lib/site';

export const FAQS: { q: string; a: string }[] = [
  {
    q: 'How can learning a few hundred words help me understand the Quran?',
    a: `Quranic vocabulary is extremely repetitive. The Quran has about ${FACTS.quranWords.toLocaleString()} words, but a small set of root words makes up most of them. Quranki orders its curriculum by frequency, so the first ${FACTS.stage1Levels} levels alone cover about ${FACTS.stage1Coverage}% of every word you will read in the Mushaf.`,
  },
  {
    q: 'What is FSRS, and why not a simple flashcard app?',
    a: 'FSRS (Free Spaced Repetition Scheduler) is the modern algorithm behind recent versions of Anki. It models how stable each memory is and schedules a review right before you would forget it. You spend less time on words you know and more on the ones that slip.',
  },
  {
    q: 'I cannot read Arabic yet. Can I still use Quranki?',
    a: 'Yes. Choose the learn-to-read track during setup and Quranki starts with a full Qaida course: letters, joining forms, harakat, sukoon, shaddah, and madd. Vocabulary unlocks once you finish.',
  },
  {
    q: 'What happens to translations in the reader as I learn?',
    a: 'Once you master a word in your reviews, its English gloss is hidden in the Quran reader everywhere it appears. You read the Arabic directly and can tap any word for a hint. The reader becomes a live test of what you actually understand.',
  },
  {
    q: 'Which reciters are included?',
    a: `${FACTS.recitations} recitations from ${FACTS.reciters} reciters with word-by-word timing, including Mahmoud Khalil Al-Husary, Abdul Basit Abdul Samad, Mishari Rashid Al-Afasy, Muhammad Siddiq Al-Minshawi, Yasser Al-Dosari, Maher Al-Mu'aiqly, and Abdul Rahman Al-Sudais.`,
  },
  {
    q: 'Is Quranki free? Do I need an account?',
    a: 'Quranki is free. You can study without an account and everything is saved in your browser. Create a free account to sync your progress between the web, iPhone, and Android apps.',
  },
];
