import Link from 'next/link';
import { Ar, AppCta, Callout } from '@/components/blog/blog-ui';
import { Figure, OverlapDiagram } from '@/components/blog/charts';
import { UNIQUE_LEMMAS } from '@/lib/blog/quran-stats';

export const toc = [
  { id: 'what', label: 'What each one is' },
  { id: 'shared', label: 'What they share' },
  { id: 'differences', label: 'The real differences' },
  { id: 'examples', label: 'Side-by-side examples' },
  { id: 'which-first', label: 'Which should you learn first?' },
  { id: 'both', label: 'Learning both' },
];

export default function Post() {
  return (
    <>
      <p>
        If you have looked into learning Arabic, you have probably run into this question early: should you learn
        Quranic Arabic or Modern Standard Arabic? Courses, apps, and teachers often push one or the other, and the
        difference is rarely explained clearly.
      </p>
      <p>
        Here is a plain explanation of how the two relate, where they differ, and how to choose based on what you
        actually want to do with Arabic.
      </p>

      <h2 id="what">What each one is</h2>
      <p>
        <strong>Quranic Arabic</strong> is the language of the Quran, revealed in the 7th century. It is part of what
        is often called Classical Arabic, the language of early Islamic scholarship, poetry, and hadith.
      </p>
      <p>
        <strong>Modern Standard Arabic (MSA)</strong>, or <Ar>ٱلْفُصْحَىٰ</Ar> in its modern form, is the formal
        Arabic used today in news, books, official documents, and speeches across the Arab world. It developed
        directly from Classical Arabic and kept most of its structure.
      </p>
      <p>
        Neither is what people speak at home. Everyday conversation happens in regional dialects such as Egyptian,
        Levantine, or Gulf Arabic, which differ from both.
      </p>

      <h2 id="shared">What they share</h2>
      <Figure title="How Quranic Arabic and MSA relate" subtitle="Two layers on the same foundation">
        <OverlapDiagram
          left={{
            title: 'Quranic',
            items: [
              'Fixed vocabulary of about 4,900 words',
              'Full vowel marks on every word',
              'Rhetorical style, rhyme, and rhythm',
              'Some rare forms and old word meanings',
            ],
          }}
          shared={{
            title: 'Shared core',
            items: [
              'The same alphabet and script',
              'The same three-letter root system',
              'Core grammar: verbs, cases, pronouns',
              'Thousands of common words',
            ],
          }}
          right={{
            title: 'MSA',
            items: [
              'Modern vocabulary: technology, politics, science',
              'Usually printed without vowel marks',
              'Simpler, more direct sentence style',
              'Many loanwords and new coinages',
            ],
          }}
        />
      </Figure>
      <p>
        The shared core is large. Both use the same letters and the same root system, so a word like{' '}
        <Ar>كِتَاب</Ar> (book) or <Ar>عِلْم</Ar> (knowledge) means the same thing in both. The verb system, pronouns,
        and the basic rules of sentence structure are also the same.
      </p>

      <h2 id="differences">The real differences</h2>
      <h3>Vocabulary</h3>
      <p>
        This is the biggest one. The Quran uses about {UNIQUE_LEMMAS.toLocaleString()} distinct words, and that set
        never changes. MSA has a far larger and growing vocabulary for modern life: cars, elections, the internet.
        Meanwhile, some Quranic words are rare in MSA or have shifted in meaning over the centuries.
      </p>
      <h3>Vowel marks</h3>
      <p>
        The Mushaf is printed with every vowel marked, so a beginner can sound out any word. MSA books and newspapers
        usually leave the short vowels out, and readers fill them in from knowledge of the language. This is one
        reason the Quran is actually easier to read aloud for a beginner.
      </p>
      <h3>Style</h3>
      <p>
        Quranic Arabic is dense and rhetorical. It moves words to the front for emphasis, shifts between speakers,
        uses rhyme at the ends of ayahs, and packs a lot of meaning into few words. MSA prose is more direct and
        closer to the sentence order you would learn in a textbook.
      </p>
      <h3>Pronunciation</h3>
      <p>
        Quranic recitation follows the precise rules of Tajweed, including the full case endings. MSA speakers
        often drop case endings when reading aloud, especially at the ends of sentences.
      </p>

      <h2 id="examples">Side-by-side examples</h2>
      <ul>
        <li>
          <strong>Shared:</strong> <Ar>قَالَ</Ar> (he said), <Ar>يَوْم</Ar> (day), <Ar>أَرْض</Ar> (earth),{' '}
          <Ar>كِتَاب</Ar> (book). Identical in both.
        </li>
        <li>
          <strong>Mostly Quranic:</strong> <Ar>يَٰٓأَيُّهَا</Ar> (O you), a form of address that sounds formal or
          old-fashioned in modern prose.
        </li>
        <li>
          <strong>Only MSA:</strong> <Ar>حَاسُوب</Ar> (computer), <Ar>جَامِعَة</Ar> (university),{' '}
          <Ar>اِنْتِخَابَات</Ar> (elections). None of these appear in the Quran.
        </li>
      </ul>

      <h2 id="which-first">Which should you learn first?</h2>
      <p>Choose by your main goal, not by which is supposedly easier:</p>
      <ul>
        <li>
          <strong>To understand the Quran, salah, and duas:</strong> start with Quranic Arabic. Every word you learn
          appears in a text you read and recite. Start with{' '}
          <Link href="/blog/most-common-words-in-the-quran">the most common words in the Quran</Link>.
        </li>
        <li>
          <strong>To read news, work, or study in the Arab world:</strong> start with MSA.
        </li>
        <li>
          <strong>To talk with family or friends:</strong> learn their dialect, with MSA or Quranic Arabic alongside
          for reading.
        </li>
        <li>
          <strong>To study Islamic sciences seriously:</strong> start with Quranic Arabic, then move into classical
          grammar (nahw and sarf).
        </li>
      </ul>
      <Callout title="The short version">
        If the Quran is why you want Arabic, start with the Quran. Its vocabulary is finite, the most frequent few
        hundred words cover most of the text, and you get to use what you learn in every prayer.
      </Callout>

      <h2 id="both">Learning both</h2>
      <p>
        Many people end up learning both, and the order matters less than you might think. Starting with Quranic
        Arabic gives you the roots and grammar that MSA is built on, so modern texts become much easier later. If you
        start with MSA, you will recognize a large share of Quranic vocabulary, but you will still need to learn its
        rarer words and its style.
      </p>
      <p>
        Either way, you can start understanding the Quran within months. Our{' '}
        <Link href="/blog/how-long-does-it-take-to-learn-quranic-arabic">realistic timeline</Link> shows how.
      </p>

      <AppCta
        title="Start with the Quran's own words"
        body="Quranki teaches Quranic vocabulary in order of frequency, with every word shown in a real ayah and recited by the world's best-known reciters."
      />
    </>
  );
}
