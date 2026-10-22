/**
 * Narration and sound for the two Shorts and the Al-Fatiha video, as ordered segments. Each
 * segment plays its audio file (a recitation or a single recited word), then Jon's line.
 * scripts/clips-voiceover.ts turns a track into a timeline the compositions read, so changing a
 * line here moves every visual that hangs off it.
 */
import fatiha from '../data/clips/fatiha.json';

export interface Seg {
  id: string;
  /** Jon's line. Also the caption. */
  say?: string;
  /** How ElevenLabs should read `say`, when the written form trips it up. */
  spoken?: string;
  /** Audio in public/, played before the line. */
  play?: string;
  /** Seconds of `play` to use. */
  clip?: [number, number];
  /** Silence after the segment, in seconds. */
  gap?: number;
  /** Minimum length of the segment, in seconds. */
  hold?: number;
}

export type TrackId = 'topten' | 'rahma' | 'fatiha';

// ---------- Short 1: ten words are a quarter of the Quran ----------

export const TOP_TEN = [
  { rank: 10, ar: 'كَانَ', tl: 'kāna', gloss: 'he was', freq: 1358, audio: 'wbw/002_075_006.mp3' },
  { rank: 9, ar: 'عَلَىٰ', tl: 'ʿalā', gloss: 'on, upon', freq: 1445, audio: 'wbw/002_005_002.mp3' },
  { rank: 8, ar: 'ٱلَّذِى', tl: 'alladhī', gloss: 'who, which', freq: 1464, audio: 'wbw/002_017_003.mp3' },
  { rank: 7, ar: 'قَالَ', tl: 'qāla', gloss: 'he said', freq: 1618, audio: 'wbw/002_030_002.mp3' },
  { rank: 6, ar: 'إِنَّ', tl: 'inna', gloss: 'indeed', freq: 1682, audio: 'wbw/002_006_001.mp3' },
  { rank: 5, ar: 'فِى', tl: 'fī', gloss: 'in', freq: 1701, audio: 'wbw/002_010_001.mp3' },
  { rank: 4, ar: 'لَا', tl: 'lā', gloss: 'no, not', freq: 1738, audio: 'wbw/002_002_003.mp3' },
  { rank: 3, ar: 'مَا', tl: 'mā', gloss: 'what', freq: 2565, audio: 'wbw/002_017_008.mp3' },
  { rank: 2, ar: 'ٱللَّه', tl: 'Allah', gloss: 'Allah', freq: 2699, audio: 'wbw/002_007_002.mp3' },
  { rank: 1, ar: 'مِن', tl: 'min', gloss: 'from', freq: 3226, audio: 'wbw/002_004_008.mp3' },
];

const TOPTEN: Seg[] = [
  { id: 'hook', say: 'A quarter of the entire Quran is made of just ten words.', gap: 0.2 },
  { id: 'hook2', say: "And number one isn't the word you'd guess.", gap: 0.3 },
  ...TOP_TEN.map((w): Seg => {
    const lines: Record<number, string> = {
      10: 'Ten. He was.',
      9: 'On.',
      8: 'Who, or which.',
      7: 'He said.',
      6: 'Indeed.',
      5: 'In.',
      4: 'No, or not.',
      3: 'What.',
      2: 'Allah. Almost twenty-seven hundred times.',
      1: 'And number one: from. Over thirty-two hundred times.',
    };
    return { id: `w${w.rank}`, play: w.audio, say: lines[w.rank], gap: w.rank <= 2 ? 0.45 : 0.2, hold: 1.6 };
  }),
  { id: 'sum', say: 'Learn these ten, and you already know one in every four words of the Quran.', gap: 0.35 },
  { id: 'cta', say: 'Quranki teaches the Quran’s words in exactly this order.', hold: 3.2, gap: 0.6 },
];

// ---------- Short 2: womb and mercy share one root ----------

export const RAHMA_WORDS = [
  { id: 'rahma', ar: 'رَحْمَة', tl: 'raḥmah', gloss: 'mercy', freq: 114, audio: 'wbw/003_008_012.mp3' },
  { id: 'rahman', ar: 'ٱلرَّحْمَٰن', tl: 'ar-Raḥmān', gloss: 'the Entirely Merciful', freq: 57, audio: 'wbw/001_001_003.mp3' },
  { id: 'rahim', ar: 'ٱلرَّحِيم', tl: 'ar-Raḥīm', gloss: 'the Especially Merciful', freq: 116, audio: 'wbw/001_001_004.mp3' },
  { id: 'arham', ar: 'ٱلْأَرْحَام', tl: 'al-arḥām', gloss: 'the wombs', freq: 12, audio: 'wbw/003_006_005.mp3' },
];

const RAHMA: Seg[] = [
  { id: 'hook', say: 'In Arabic, the word for womb and the word for mercy are built from the same three letters.', gap: 0.3 },
  { id: 'letters', say: 'Ra. Ha. Meem.', spoken: 'Raa... Haa... Meem.', gap: 0.3, hold: 2.4 },
  { id: 'count', say: 'Words from this one root appear three hundred thirty-nine times in the Quran.', gap: 0.3 },
  { id: 'rahma', play: RAHMA_WORDS[0].audio, say: 'Rahmah. Mercy.', spoken: 'Rahmah. Mercy.', gap: 0.25, hold: 2 },
  { id: 'rahman', play: RAHMA_WORDS[1].audio, say: 'Ar-Rahman. The Entirely Merciful.', spoken: 'Ar-Rahmaan. The Entirely Merciful.', gap: 0.25, hold: 2 },
  { id: 'rahim', play: RAHMA_WORDS[2].audio, say: 'Ar-Raheem. The Especially Merciful.', spoken: 'Ar-Raheem. The Especially Merciful.', gap: 0.25, hold: 2 },
  { id: 'arham', play: RAHMA_WORDS[3].audio, say: 'And al-arham. The wombs.', spoken: 'And al-ar-haam. The wombs.', gap: 0.35, hold: 2 },
  { id: 'ayah', play: 'rec/003-006.mp3', clip: [0, 7.3], gap: 0.2 },
  { id: 'ayahtr', say: 'It is He who forms you in the wombs.', gap: 0.4 },
  { id: 'bismillah', say: "So every time you say Bismillah ir-Rahman ir-Raheem, you're using this root twice.", spoken: "So every time you say Bismillaah ir-Rahmaan ir-Raheem, you're using this root twice.", gap: 0.3 },
  { id: 'cta', say: 'Learn one root, and you start recognizing words all over the Quran.', hold: 3.2, gap: 0.6 },
];

// ---------- Long form: Al-Fatiha word by word ----------

/** Jon's line for each word, keyed by location. Facts come from the corpus and Sahih International's notes. */
const WORD_LINES: Record<string, { say: string; spoken?: string }> = {
  '1:1:1': { say: "Bismi. In the name. The bi at the front means in, or with. And ism means name.", spoken: 'Bismi. In the name. The bi at the front means in, or with. And ism means name.' },
  '1:1:2': { say: 'Allah. The most frequent name in the entire Quran. Two thousand, six hundred ninety-nine times.' },
  '1:1:3': { say: 'Ar-Rahman. The Entirely Merciful. It comes from the root ra, ha, meem, the root of mercy.', spoken: 'Ar-Rahmaan. The Entirely Merciful. It comes from the root raa, haa, meem, the root of mercy.' },
  '1:1:4': { say: 'Ar-Raheem. The Especially Merciful. Same root, different form. Ar-Rahman is used only for Allah, while raheem can describe a person too.', spoken: 'Ar-Raheem. The Especially Merciful. Same root, different form. Ar-Rahmaan is used only for Allah, while raheem can describe a person too.' },
  '1:2:1': { say: "Al-hamdu. The praise. Al simply means the, and you'll see it on almost every line of the Quran.", spoken: "Al-hamdu. The praise. Al simply means the, and you'll see it on almost every line of the Quran." },
  '1:2:2': { say: 'Lillahi. Li means to, or for. So this is: to Allah.', spoken: 'Lillaahi. Li means to, or for. So this is: to Allah.' },
  '1:2:3': { say: 'Rabbi. Lord. But rabb holds much more than one English word: owner, master, sustainer, provider, caretaker. It appears nine hundred seventy-five times.', spoken: 'Rabbi. Lord. But rabb holds much more than one English word: owner, master, sustainer, provider, caretaker. It appears nine hundred seventy-five times.' },
  '1:2:4': { say: "Al-'alameen. The worlds. Its root, ayn, lam, meem, is the same root as 'ilm, knowledge.", spoken: "Al-aalameen. The worlds. Its root, ayn, laam, meem, is the same root as ilm, knowledge." },
  '1:4:1': { say: 'Maaliki. Master, or Sovereign. Its root, meem, lam, kaf, also gives us malik, king, and mulk, dominion.', spoken: 'Maaliki. Master, or Sovereign. Its root, meem, laam, kaaf, also gives us malik, king, and mulk, dominion.' },
  '1:4:2': { say: 'Yawmi. Day. Yawm appears four hundred seventy-five times, so it is one of the most useful words you can learn.', spoken: 'Yawmi. Day. Yawm appears four hundred seventy-five times, so it is one of the most useful words you can learn.' },
  '1:4:3': { say: 'Ad-deen. Recompense. Yawm ad-deen is the Day when everything we earned, good or bad, is repaid.', spoken: 'Ad-deen. Recompense. Yawm ad-deen is the Day when everything we earned, good or bad, is repaid.' },
  '1:5:1': { say: "Iyyaka. You. And notice that it comes first. Arabic could have said, we worship You. Putting You first gives the meaning: You alone.", spoken: 'Iyyaaka. You. And notice that it comes first. Arabic could have said, we worship You. Putting You first gives the meaning: You alone.' },
  '1:5:2': { say: "Na'budu. We worship. The na at the start means we. And its root, ayn, ba, dal, also gives us 'abd, a servant.", spoken: "Naabudu. We worship. The na at the start means we. And its root, ayn, baa, daal, also gives us abd, a servant." },
  '1:5:3': { say: 'Wa-iyyaka. Wa means and. And You alone.', spoken: 'Wa-iyyaaka. Wa means and. And You alone.' },
  '1:5:4': { say: "Nasta'een. We ask for help. There's that na again: we.", spoken: 'Nastaeen. We ask for help. There’s that na again: we.' },
  '1:6:1': { say: 'Ihdina. Guide us. This time the na is on the end, and it means us. Words from the root of guidance appear over three hundred times.', spoken: 'Ihdinaa. Guide us. This time the na is on the end, and it means us. Words from the root of guidance appear over three hundred times.' },
  '1:6:2': { say: 'As-sirata. The path.', spoken: 'As-siraata. The path.' },
  '1:6:3': { say: 'Al-mustaqeem. The straight. It comes from the root of qama, to stand upright.', spoken: 'Al-mustaqeem. The straight. It comes from the root of qaama, to stand upright.' },
  '1:7:1': { say: 'Sirata. Path. The same word again, so you already know it.', spoken: 'Siraata. Path. The same word again, so you already know it.' },
  '1:7:2': { say: 'Alladheena. Those who. This word appears almost fifteen hundred times.', spoken: 'Alladheena. Those who. This word appears almost fifteen hundred times.' },
  '1:7:3': { say: "An'amta. You have bestowed favor. The ta on the end means you.", spoken: 'Anamta. You have bestowed favor. The ta on the end means you.' },
  '1:7:4': { say: "'Alayhim. Upon them. 'Ala means on, and him means them.", spoken: 'Alayhim. Upon them. Ala means on, and him means them.' },
  '1:7:5': { say: 'Ghayri. Not.', spoken: 'Ghayri. Not.' },
  '1:7:6': { say: 'Al-maghdoobi. Those who have earned anger.', spoken: 'Al-maghdoobi. Those who have earned anger.' },
  '1:7:7': { say: "'Alayhim, again. You know this one.", spoken: 'Alayhim, again. You know this one.' },
  '1:7:8': { say: "Wa-la. And not. La on its own appears over seventeen hundred times.", spoken: 'Wa-laa. And not. Laa on its own appears over seventeen hundred times.' },
  '1:7:9': { say: "Ad-dalleen. Those who are astray. And that's the whole surah.", spoken: "Ad-daalleen. Those who are astray. And that's the whole surah." },
};

const AYAH_INTROS: Record<number, string> = {
  1: 'Ayah one.',
  2: 'Ayah two.',
  4: 'Ayah four.',
  5: 'Ayah five.',
  6: 'Ayah six.',
  7: 'And ayah seven, the longest.',
};

const FATIHA: Seg[] = [
  { id: 'h1', say: "If you've prayed for fifteen years, you've recited Al-Fatiha more than ninety thousand times.", spoken: "If you've prayed for fifteen years, you've recited Al-Faatiha more than ninety thousand times.", gap: 0.4 },
  { id: 'h2', say: 'Seventeen times a day, every single day. But if someone stopped you and asked what one of its words means, could you tell them?', gap: 0.5 },
  { id: 'h3', say: "By the end of this video, you'll know every word. All twenty-nine of them.", gap: 0.4 },
  { id: 'h4', say: "And here's why it's worth it. The words in these seven verses appear almost ten thousand times across the Quran. That's one in every eight words you'll ever read in it.", gap: 0.5 },
  { id: 'h5', say: "So let's go through it, one ayah at a time.", gap: 0.3 },
  { id: 'title', hold: 4, gap: 0.2 },
  ...fatiha.ayahs.flatMap((a): Seg[] => {
    if (a.ayah === 3) {
      return [
        { id: 'a3-intro', say: 'Ayah three.', gap: 0.2 },
        { id: 'a3-rec', play: a.recitation, gap: 0.4 },
        { id: 'a3-known', say: "Ar-Rahman, ar-Raheem. You already know both of these words. That's the power of learning the Quran's vocabulary: it keeps coming back.", spoken: "Ar-Rahmaan, ar-Raheem. You already know both of these words. That's the power of learning the Quran's vocabulary: it keeps coming back.", gap: 0.5 },
        { id: 'a3-tr', say: a.translation, gap: 0.8 },
      ];
    }
    return [
      { id: `a${a.ayah}-intro`, say: AYAH_INTROS[a.ayah], gap: 0.2 },
      { id: `a${a.ayah}-rec`, play: a.recitation, gap: 0.5 },
      ...a.words.map((w): Seg => ({ id: w.loc, play: w.audio, ...WORD_LINES[w.loc], gap: 0.45, hold: 3 })),
      { id: `a${a.ayah}-tr-intro`, say: 'Put together:', gap: 0.15 },
      { id: `a${a.ayah}-tr`, say: a.translation.replace(/ -$/, '.'), gap: 0.8 },
    ];
  }),
  { id: 'r1', say: "That's all twenty-nine words. Now listen to the whole surah one more time, and follow the meaning as you hear it.", gap: 0.6 },
  ...fatiha.ayahs.map((a): Seg => ({ id: `r-${a.ayah}`, play: a.recitation, gap: 0.35 })),
  { id: 'o1', say: "Next time you pray, you won't just hear these words. You'll understand them.", gap: 0.6 },
  { id: 'o2', say: "You just learned twenty-three different words, and together they make up one in eight words of the Quran. The five hundred most common words cover eighty percent of it.", gap: 0.4 },
  { id: 'o3', say: "That's what Quranki is for. It teaches the Quran's words in the order the Quran uses them, with spaced repetition so they stick. It's free at quranki dot org, on iPhone, and on Android.", gap: 0.4 },
  { id: 'o4', say: 'If this helped, subscribe, and we’ll go through the next surah, word by word.', hold: 5, gap: 1 },
];

export const TRACKS: Record<TrackId, Seg[]> = { topten: TOPTEN, rahma: RAHMA, fatiha: FATIHA };
