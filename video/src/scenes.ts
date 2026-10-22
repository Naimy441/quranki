/**
 * The video's timeline and voiceover script. Durations are in seconds; the composition and
 * SCRIPT.md / captions are generated from this list so picture and script never drift apart.
 */
export interface Scene {
  id: string;
  title: string;
  seconds: number;
  vo: string;
  /** What's on screen, for the script document. */
  visual: string;
  /**
   * Earliest frame (within the scene) each sentence of `vo` may start, tied to the moment its
   * visual appears. null lets the line follow straight after the previous one.
   */
  cues: (number | null)[];
}

export const FPS = 30;

export const SCENES: Scene[] = [
  {
    id: 'open',
    title: 'Cold open',
    seconds: 19,
    visual: 'Surah Yusuf 12:2 builds word by word, each word lifting its English gloss.',
    vo: 'Every day, millions of people recite the Quran. They know its sound by heart. But for most of them, the meaning stays behind a translation. What if you could understand it directly, word by word, in the language it was revealed in?',
    cues: [15, null, null, 335],
  },
  {
    id: 'title',
    title: 'Title',
    seconds: 7,
    visual: 'Quranki mark and wordmark. "Understand the Quran, word by word."',
    vo: 'This is Quranki.',
    cues: [20],
  },
  {
    id: 'insight',
    title: 'The insight',
    seconds: 34,
    visual: 'Counters for 77,399 words and 4,875 lemmas. Top 10 words bar chart. Coverage curve hitting 57% at 100 words and 80% at about 500.',
    vo: "Here's the surprising part. The Quran has seventy-seven thousand words, but they come from fewer than five thousand dictionary forms. And they're not spread evenly. Just ten words make up a quarter of the whole text. The top one hundred cover more than half. Learn about five hundred, and you'll recognize eighty percent of every page.",
    cues: [10, 85, 310, 380, 625, 715],
  },
  {
    id: 'method',
    title: 'The method',
    seconds: 19,
    visual: 'Three cards: Learn by frequency, Review with FSRS, Read real ayahs.',
    vo: 'So Quranki teaches words in the order the Quran actually uses them. It schedules every review with FSRS, the algorithm behind modern Anki. And it brings each word straight back to the ayahs where it appears.',
    cues: [12, 170, 370],
  },
  {
    id: 'landing',
    title: 'Web, iPhone, Android',
    seconds: 14,
    visual: 'quranki.org landing page scrolls in a browser window.',
    vo: "It runs on the web, on iPhone, and on Android, and your progress syncs between them. Let's look at a real account, about eleven weeks in.",
    cues: [12, null],
  },
  {
    id: 'learn',
    title: 'Learn dashboard',
    seconds: 27,
    visual: 'Desktop Learn page with callouts: 44 words to review, 848 mastered, 52 day streak, study time, stages.',
    vo: 'This is the Learn page. Today there are forty-four words waiting: thirty reviews and fourteen new words. Eight hundred forty-eight words mastered, a fifty-two day streak, and about fifteen minutes of study a day. The curriculum moves in stages, from the most frequent words to the ninety-nine names of Allah.',
    cues: [12, 85, 280, 600],
  },
  {
    id: 'session',
    title: 'Study session',
    seconds: 36,
    visual: 'Flashcards: Arabic first, reveal, ayah context with word-by-word glosses, grade buttons with next-review intervals, rapid cards.',
    vo: "Start a session and you see the Arabic first. Try to recall the meaning, then reveal it. Every word comes with an ayah where it really appears, glossed word by word, so you learn it in context. Then rate yourself: again, hard, good, or easy. Each button tells you exactly when you'll see the word next. On desktop, it's all keyboard driven.",
    cues: [15, null, 220, 450, null, 740],
  },
  {
    id: 'reader',
    title: 'Quran reader',
    seconds: 42,
    visual: 'Surah list with understanding per surah, Al-Kahf reader, known words without glosses, ayah coverage, hint, translation, word details.',
    vo: "Now the best part. Open any surah in the reader. Words you've learned appear without a translation, because you already know them. Only new words keep their gloss, and every ayah shows how much of it you understand. Forget a word? Click it for a quick hint. Want the full meaning? Open the translation. Right-click any word for its grammar, lemma, and root, and how often it appears in the Quran.",
    cues: [12, 170, 395, null, 735, 775, 870, null, 1040],
  },
  {
    id: 'memorize',
    title: 'Memorize',
    seconds: 24,
    visual: 'Memorize page listing enrolled rukus, then a hifz card: cue words, reveal the full ruku.',
    vo: "Understanding leads naturally to memorizing. Once you know seventy percent of a ruku's words, it unlocks in Memorize. You see the opening words, recite the rest from memory, then check yourself. The same scheduler decides when it's time to revise.",
    cues: [12, 120, 350, null],
  },
  {
    id: 'progress',
    title: 'Progress',
    seconds: 22,
    visual: 'Progress page: 81% overall, ayah understanding histogram, one bar per surah, review calendar, word list.',
    vo: 'Progress shows the big picture. This learner now recognizes eighty-one percent of the words in the Quran. You can see how well they follow a typical ayah, and every surah gets its own bar.',
    cues: [12, 85, 245],
  },
  {
    id: 'power',
    title: 'Built for desktop',
    seconds: 18,
    visual: 'Command palette jumping to 2:255, Saved pins and bookmark collections, light mode.',
    vo: 'On desktop there is a command palette, so you can jump to any ayah, like two two fifty-five, in a keystroke. Pin your place, collect ayahs into bookmarks, and read in dark or light.',
    cues: [20, 250],
  },
  {
    id: 'mobile',
    title: 'On iPhone',
    seconds: 34,
    visual: 'iPhone app: home, flashcard front and back, reader with a hint, word details, ruku revision, progress.',
    vo: 'And it all comes with you. On iPhone, the same account picks up right where you left off. The same reviews, each word inside its ayah. The same reader, with a hint on tap and full details on a long press. Your ruku revision for the day, and every statistic in your pocket.',
    cues: [12, null, 205, 445, 695],
  },
  {
    id: 'blog',
    title: 'Free guides',
    seconds: 17,
    visual: 'quranki.org/blog: guide covers, then a data-driven post scrolls.',
    vo: 'Quranki also publishes free guides built on real corpus data: the most common words, how many you need, how long it takes, and why spaced repetition makes them stick.',
    cues: [12],
  },
  {
    id: 'outro',
    title: 'Outro',
    seconds: 14,
    visual: 'Mark, tagline, quranki.org, App Store and Google Play.',
    vo: 'Quranki. Learn the words, read the Quran, and understand it. Start free at quranki dot org, or download it on iPhone and Android.',
    cues: [6, 55, 190],
  },
];

/** Splits narration into the sentences that `cues` line up with. */
export function sentences(vo: string): string[] {
  return vo.match(/[^.!?]+[.!?]+/g)?.map((x) => x.trim()) ?? [vo];
}

export const TOTAL_SECONDS = SCENES.reduce((s, x) => s + x.seconds, 0);

export function sceneStart(id: string): number {
  let t = 0;
  for (const s of SCENES) {
    if (s.id === id) return t;
    t += s.seconds;
  }
  throw new Error(`No scene ${id}`);
}
