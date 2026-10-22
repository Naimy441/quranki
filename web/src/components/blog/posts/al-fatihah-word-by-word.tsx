import Link from 'next/link';
import { Ar, AppCta, Callout } from '@/components/blog/blog-ui';
import { AyahWords, Figure, StatRow, TopWordsBars } from '@/components/blog/charts';
import { FATIHA, FATIHA_REACH } from '@/lib/blog/surah-words';

export const toc = [
  { id: 'why', label: 'Why start with Al-Fatihah' },
  { id: 'word-by-word', label: 'Al-Fatihah word by word' },
  { id: 'reach', label: 'Words you will meet again' },
  { id: 'grammar', label: 'Four grammar lessons inside' },
  { id: 'practice', label: 'How to practice it in salah' },
];

/** Dictionary meanings by lemma id, where the in-ayah gloss carries extra words like "and" or "them". */
const DICTIONARY_GLOSS: Record<number, string> = {
  2: 'Allah',
  4: 'no, not',
  8: 'who, which',
  9: 'on, upon',
  11: 'Lord',
  25: 'day',
  78: 'other than',
  82: 'to guide',
  99: 'to worship',
  103: 'merciful',
  120: 'judgment, religion',
  163: 'worlds',
};

export default function Post() {
  const reach = FATIHA_REACH;
  // Each distinct word once, ranked by how often it appears across the Quran.
  const seen = new Set<string>();
  const recurring = FATIHA.flatMap((a) => a.words)
    .filter((w) => w.lemma && !seen.has(w.lemma) && seen.add(w.lemma))
    .sort((a, b) => b.quranCount - a.quranCount)
    .slice(0, 12)
    .map((w) => ({
      ar: w.lemma,
      gloss: DICTIONARY_GLOSS[w.lemmaId ?? -1] ?? w.en.replace(/\([^)]*\)\s*/g, '').trim(),
      freq: w.quranCount,
    }));

  return (
    <>
      <p>
        Al-Fatihah is the first surah of the Quran and the one every Muslim knows by heart. It is recited in every
        rakah of every prayer, at least seventeen times a day. Yet many people recite it for years without knowing
        what each word means.
      </p>
      <p>
        This guide goes through Al-Fatihah word by word: the Arabic, a transliteration, and the meaning of every
        word. It also shows something most guides leave out: how often each word appears in the rest of the Quran.
        The answer is a great reason to start your Arabic journey here.
      </p>

      <StatRow
        stats={[
          { value: '7', label: 'ayahs, counting the Bismillah' },
          { value: String(reach.words), label: 'words in the surah' },
          { value: String(reach.unique), label: 'distinct dictionary words' },
          { value: `${reach.pct.toFixed(1)}%`, label: 'of all Quran words use them' },
        ]}
      />

      <h2 id="why">Why start with Al-Fatihah</h2>
      <p>
        Most Arabic courses start with greetings and classroom objects. Al-Fatihah is a better first lesson for anyone
        learning Quranic Arabic, for three reasons:
      </p>
      <ul>
        <li>
          <strong>You already know the sounds.</strong> There is nothing to memorize except the meaning.
        </li>
        <li>
          <strong>You review it every day.</strong> Every prayer becomes practice, which is spaced repetition built
          into your day.
        </li>
        <li>
          <strong>Its words are everywhere.</strong> The {reach.unique} distinct words in Al-Fatihah account for{' '}
          {reach.pct.toFixed(1)}% of all words in the Quran, about one in every eight.
        </li>
      </ul>

      <h2 id="word-by-word">Surah Al-Fatihah word by word</h2>
      <p>
        Each card shows one ayah, read from right to left. Under every word you will find its transliteration, its
        meaning, and how many times that word appears anywhere in the Quran. Words in solid color appear 100 times or
        more.
      </p>
      {FATIHA.map((a) => (
        <AyahWords key={a.n} n={a.n} words={a.words} translation={a.translation} />
      ))}
      <p className="text-sm text-textMuted">
        Translation: Sahih International. Word glosses and counts: Quranic Arabic Corpus.
      </p>

      <h2 id="reach">The words you will meet again and again</h2>
      <p>
        Some of Al-Fatihah&rsquo;s words are among the most frequent in the entire Quran. Learn these twelve well
        and you will recognize them on almost every page you read.
      </p>
      <Figure
        title="Al-Fatihah's most repeated words"
        subtitle="Times each word appears across the whole Quran, in any form"
        caption="Counted by dictionary form, so رَبّ includes رَبِّ, رَبُّكُمْ, and every other form."
      >
        <TopWordsBars rows={recurring} />
      </Figure>
      <p>
        For the full ranking of the Quran&rsquo;s vocabulary, see{' '}
        <Link href="/blog/most-common-words-in-the-quran">the 50 most common words in the Quran</Link>.
      </p>

      <h2 id="grammar">Four grammar lessons hidden in Al-Fatihah</h2>
      <h3>1. The definite article al-</h3>
      <p>
        <Ar>ٱلْحَمْدُ</Ar> is <Ar>حَمْد</Ar> (praise) with <Ar>ٱلْ</Ar> (the) in front. In{' '}
        <Ar>ٱلرَّحْمَٰنِ</Ar> the lam is not pronounced and the next letter is doubled instead. This happens with
        about half of the alphabet, the so-called sun letters.
      </p>
      <h3>2. Possession by placing nouns side by side</h3>
      <p>
        <Ar>رَبِّ ٱلْعَٰلَمِينَ</Ar> is literally Lord the-worlds, and it means Lord of the worlds. Arabic shows
        possession by putting two nouns next to each other, a construction called idafa. You will see it constantly:{' '}
        <Ar>يَوْمِ ٱلدِّينِ</Ar> is Day of Judgment, and <Ar>بِسْمِ ٱللَّهِ</Ar> is in the name of Allah.
      </p>
      <h3>3. Word order for emphasis</h3>
      <p>
        <Ar>إِيَّاكَ نَعْبُدُ</Ar> puts You before we worship. The normal order would be the verb first. Moving{' '}
        <Ar>إِيَّاكَ</Ar> to the front adds the meaning of exclusivity: You alone we worship, and no one else.
      </p>
      <h3>4. Attached pronouns</h3>
      <p>
        <Ar>ٱهْدِنَا</Ar> is guide (<Ar>ٱهْدِ</Ar>) plus us (<Ar>نَا</Ar>). In <Ar>عَلَيْهِمْ</Ar>, on (
        <Ar>عَلَىٰ</Ar>) joins with them (<Ar>هِمْ</Ar>). These small endings attach to verbs, nouns, and
        prepositions everywhere in the Quran.
      </p>
      <Callout title="The same roots, again and again">
        <Ar>ٱلرَّحْمَٰنِ</Ar> and <Ar>ٱلرَّحِيمِ</Ar> share the root ر ح م (mercy).{' '}
        <Ar>ٱلْعَٰلَمِينَ</Ar> shares its root ع ل م with <Ar>عَلِيم</Ar> (all-knowing) and <Ar>عِلْم</Ar>{' '}
        (knowledge). Noticing roots is one of the fastest ways to grow your vocabulary.
      </Callout>

      <h2 id="practice">How to practice it in salah</h2>
      <ol>
        <li>
          <strong>Learn one ayah a day</strong> for a week, until you can say the meaning of each word without looking.
        </li>
        <li>
          <strong>Pause briefly between ayahs</strong> in your next prayer and let the meaning register.
        </li>
        <li>
          <strong>Read it in the word-by-word reader.</strong> Open <Link href="/quran/1">Al-Fatihah in Quranki</Link>{' '}
          and tap any word for its meaning, root, and recitation.
        </li>
        <li>
          <strong>Move on to the short surahs</strong> you recite most, like Al-Ikhlas and the last juz.
        </li>
      </ol>
      <p>
        Once these words are yours, the next step is the most common words in the rest of the Quran. Our{' '}
        <Link href="/blog/how-to-learn-quranic-arabic-fast">6-step plan to learn Quranic Arabic fast</Link> shows the
        whole path.
      </p>

      <AppCta
        title="Every word of the Quran, tap by tap"
        body="Read all 114 surahs word by word with Tajweed colors, translations, and synchronized recitation. Learn the vocabulary with spaced repetition."
      />
    </>
  );
}
