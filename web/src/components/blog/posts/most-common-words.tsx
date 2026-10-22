import Link from 'next/link';
import { Ar, AppCta, Callout, WordTable } from '@/components/blog/blog-ui';
import { ColumnChart, Figure, StatRow, TopWordsBars } from '@/components/blog/charts';
import { coverageAt, frequencyBands, frequencyOf, QURAN_WORD_COUNT, UNIQUE_LEMMAS } from '@/lib/blog/quran-stats';
import { TOP_WORDS } from '@/lib/blog/top-words';

export const toc = [
  { id: 'top-20', label: 'The top 20 at a glance' },
  { id: 'full-list', label: 'The full top 50 list' },
  { id: 'patterns', label: 'What the list tells you' },
  { id: 'long-tail', label: 'The long tail of rare words' },
  { id: 'how-to-learn', label: 'How to learn these words' },
  { id: 'method', label: 'How we counted' },
];

export default function Post() {
  const rows = TOP_WORDS.map((w) => ({ ...w, freq: frequencyOf(w.ar) }));
  const bands = frequencyBands();
  const once = bands[0].count;
  const top50Total = rows.reduce((s, r) => s + r.freq, 0);
  return (
    <>
      <p>
        If you want to understand the Quran in Arabic, the most useful list you can study is not a textbook chapter.
        It is a frequency list. A few dozen words do an enormous amount of work in the Quran, and the ten most common
        ones alone make up about {coverageAt(10).toFixed(0)}% of the entire text.
      </p>
      <p>
        Below are the 50 most common words in the Quran, counted across all {QURAN_WORD_COUNT.toLocaleString()} words
        using the Quranic Arabic Corpus. Each entry shows the Arabic, a transliteration, the meaning, and exactly how
        many times it appears.
      </p>

      <StatRow
        stats={[
          { value: `${coverageAt(10).toFixed(0)}%`, label: 'of the Quran is the top 10 words' },
          { value: top50Total.toLocaleString(), label: 'occurrences of the 50 words below' },
          { value: UNIQUE_LEMMAS.toLocaleString(), label: 'unique words in the Quran' },
          { value: once.toLocaleString(), label: 'words that appear only once' },
        ]}
      />

      <h2 id="top-20">The top 20 at a glance</h2>
      <Figure
        title="The 20 most frequent words in the Quran"
        subtitle="Number of times each word appears, counted by dictionary form"
        caption="Source: Quranic Arabic Corpus morphology. Every form of a word is counted together, so قَالَ includes يَقُولُ, قُلْ, and قَالُوا."
      >
        <TopWordsBars rows={rows.slice(0, 20)} />
      </Figure>
      <p>
        The very top of the list is dominated by small, structural words: prepositions like <Ar>مِن</Ar> (from) and{' '}
        <Ar>فِى</Ar> (in), and negations like <Ar>لَا</Ar> and <Ar>مَا</Ar>. The name <Ar>ٱللَّه</Ar> is the most
        frequent noun by far, appearing {frequencyOf('ٱللَّه').toLocaleString()} times, followed by{' '}
        <Ar>رَبّ</Ar> (Lord) at {frequencyOf('رَبّ').toLocaleString()}.
      </p>

      <h2 id="full-list">The 50 most common words in the Quran</h2>
      <p>
        Verbs are listed in their dictionary form, the past tense he form. So <Ar>قَالَ</Ar> (he said) also stands
        for every other form of the verb, like <Ar>يَقُولُ</Ar> (he says) and <Ar>قُلْ</Ar> (say!).
      </p>
      <WordTable rows={rows.map((r) => ({ ar: r.ar, tl: r.tl, gloss: r.gloss, count: r.freq }))} />

      <h2 id="patterns">What the list tells you</h2>
      <h3>Particles come first, but they need context</h3>
      <p>
        About a third of the top 50 are particles: prepositions, conjunctions, and negations. They are the glue of every
        ayah. They are also hard to learn in isolation, because their meaning depends on the phrase around them. The
        best way to learn <Ar>عَلَىٰ</Ar> (on, upon) is in a phrase you already know, like the one in Al-Fatihah.
      </p>
      <h3>The verbs tell the story</h3>
      <p>
        The most common verbs describe speech, belief, knowledge, and action: <Ar>قَالَ</Ar> (said),{' '}
        <Ar>كَانَ</Ar> (was), <Ar>ءَامَنَ</Ar> (believed), <Ar>عَلِمَ</Ar> (knew), <Ar>جَعَلَ</Ar> (made), and{' '}
        <Ar>عَمِلَ</Ar> (did). Learning the eleven verbs in this list, with their present tense forms, lets you follow a
        huge share of the narrative passages.
      </p>
      <h3>The nouns tell you what the Quran is about</h3>
      <p>
        Look at the nouns in the list: Allah, Lord, earth, day, people, sign, messenger, punishment, sky, soul, book,
        truth. Even before you know any grammar, this list is a summary of the Quran&rsquo;s central themes.
      </p>

      <h2 id="long-tail">The long tail of rare words</h2>
      <p>
        The other side of this picture is just as important. While a few words appear thousands of times, most words
        in the Quran are rare. {once.toLocaleString()} words, about{' '}
        {Math.round((once / UNIQUE_LEMMAS) * 100)}% of the vocabulary, appear exactly once.
      </p>
      <Figure title="Most Quranic words are rare" subtitle="Number of unique words, grouped by how often they appear">
        <ColumnChart bars={bands} highlight={0} />
      </Figure>
      <p>
        This is why order matters so much. If you learn words in a random order, most of what you learn will be words
        you rarely see. If you learn them by frequency, every word you add lights up many more ayahs. We measured
        exactly how fast that adds up in{' '}
        <Link href="/blog/how-many-words-to-understand-the-quran">how many words you need to understand the Quran</Link>.
      </p>

      <h2 id="how-to-learn">How to learn these words</h2>
      <ol>
        <li>
          <strong>Learn five to ten a day, in order.</strong> The list above is a good first week or two.
        </li>
        <li>
          <strong>Review them with spaced repetition</strong> so they stick. See{' '}
          <Link href="/blog/spaced-repetition-for-quranic-arabic">how spaced repetition works</Link>.
        </li>
        <li>
          <strong>Meet each word in an ayah.</strong> Seeing <Ar>رَبّ</Ar> in <Ar>رَبِّ ٱلْعَٰلَمِينَ</Ar> makes it
          stick far better than a bare flashcard.
        </li>
        <li>
          <strong>Read word by word.</strong> Open a short surah in the{' '}
          <Link href="/quran">word-by-word Quran reader</Link> and spot the words you just learned.
        </li>
      </ol>
      <Callout title="Watch for attached pronouns">
        Many common words show up with endings attached. <Ar>رَبّ</Ar> becomes <Ar>رَبُّكُمْ</Ar> (your Lord) and{' '}
        <Ar>رَبُّنَا</Ar> (our Lord). Learning the five or six most common endings multiplies the value of every noun
        you know.
      </Callout>

      <h2 id="method">How we counted</h2>
      <p>
        These counts come from the morphology data of the Quranic Arabic Corpus, which tags each of the Quran&rsquo;s
        words with its dictionary form (lemma). We counted how many times each lemma appears. Counts differ slightly
        from other lists because some sources count by root (which groups many related words together) or by exact
        spelling (which splits one word into many). Counting by lemma sits in the middle and matches how you actually
        learn words.
      </p>

      <AppCta
        title="Learn these words in order"
        body="Quranki's curriculum follows Quranic frequency, so these are the first words you learn, each one shown in a real ayah and reviewed with FSRS."
      />
    </>
  );
}
