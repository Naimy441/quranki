import Link from 'next/link';
import { Ar, AppCta, Callout } from '@/components/blog/blog-ui';
import { CoverageChart, Figure, Roadmap, StatRow } from '@/components/blog/charts';
import { coverageAt, coverageCurve, QURAN_WORD_COUNT, UNIQUE_LEMMAS } from '@/lib/blog/quran-stats';

export const toc = [
  { id: 'why-slow', label: 'Why most learners stall' },
  { id: 'plan', label: 'The 6-step plan' },
  { id: 'step-1', label: '1. Learn to read the script' },
  { id: 'step-2', label: '2. Learn words by frequency' },
  { id: 'step-3', label: '3. Review with spaced repetition' },
  { id: 'step-4', label: '4. Learn the grammar that repeats' },
  { id: 'step-5', label: '5. Read real ayahs every day' },
  { id: 'step-6', label: '6. Protect the daily habit' },
  { id: 'mistakes', label: 'Mistakes that slow you down' },
];

export default function Post() {
  const pct = (n: number) => `${coverageAt(n).toFixed(0)}%`;
  return (
    <>
      <p>
        Most people who want to learn Quranic Arabic are not trying to become linguists. They want to stand in prayer
        and know what they are reciting. They want to hear an imam read and follow along. That goal is much closer than
        it looks, as long as you study in the right order.
      </p>
      <p>
        This guide is a practical plan for learning Quranic Arabic fast. It is built on one simple fact about the
        Quran: a small number of words make up most of the text. Learn those first, review them on a schedule that
        matches how memory works, and read real ayahs every day.
      </p>

      <StatRow
        stats={[
          { value: pct(10), label: 'of all words are the top 10' },
          { value: pct(100), label: 'covered by the top 100 words' },
          { value: pct(500), label: 'covered by the top 500 words' },
          { value: UNIQUE_LEMMAS.toLocaleString(), label: 'unique words in total' },
        ]}
      />

      <h2 id="why-slow">Why most learners stall</h2>
      <p>
        The usual path is a general Arabic textbook. You learn how to order coffee, name the furniture in a room, and
        conjugate verbs you will rarely meet in the Mushaf. Months later you open the Quran and still recognize very
        little. Three things cause this:
      </p>
      <ul>
        <li>
          <strong>The wrong vocabulary.</strong> Everyday Arabic and Quranic Arabic overlap, but the words a textbook
          teaches first are not the words the Quran repeats most.
        </li>
        <li>
          <strong>No review system.</strong> Without planned reviews you forget most new words within a week, so you
          keep relearning the same list.
        </li>
        <li>
          <strong>Too little real reading.</strong> Vocabulary only becomes understanding when you meet it in ayahs.
        </li>
      </ul>

      <h2 id="plan">The 6-step plan</h2>
      <p>Here is the whole plan at a glance. The time estimates assume about 20 minutes of study a day.</p>
      <Figure title="From the alphabet to reading ayahs" subtitle="Time estimates at roughly 20 minutes a day">
        <Roadmap
          steps={[
            { title: 'Learn to read the script', body: 'Letters, joining forms, harakat, sukoon, shaddah, and madd.', time: '2 to 6 weeks' },
            { title: 'Learn words by frequency', body: 'Start with the words that appear hundreds of times.', time: 'Ongoing' },
            { title: 'Review with spaced repetition', body: 'A scheduler shows each word right before you forget it.', time: '10 min a day' },
            { title: 'Learn the grammar that repeats', body: 'Pronouns, particles, verb patterns, and roots.', time: 'Alongside words' },
            { title: 'Read real ayahs every day', body: 'Start with the surahs you already recite in salah.', time: '5 min a day' },
            { title: 'Protect the habit', body: 'Same time, every day, even when it is short.', time: 'For good' },
          ]}
        />
      </Figure>

      <h2 id="step-1">Step 1: Learn to read the Arabic script</h2>
      <p>
        If you cannot read Arabic letters yet, start here. You do not need to read fluently before learning
        vocabulary, but you should be able to sound out a word with its vowel marks. A Qaida course (often called
        Noorani Qaida) teaches this in a fixed order: the letters, how they join, the short vowels, sukoon, shaddah,
        and long vowels.
      </p>
      <p>
        Most adults get there in two to six weeks of daily practice. Avoid relying on transliteration for long. It
        feels faster at first, but it hides the letters you need to recognize roots later.
      </p>

      <h2 id="step-2">Step 2: Learn words in order of frequency</h2>
      <p>
        This is the step that makes the biggest difference. The Quran has about {QURAN_WORD_COUNT.toLocaleString()}{' '}
        words, but they come from only {UNIQUE_LEMMAS.toLocaleString()} dictionary forms, and the distribution is
        extremely uneven. Words like <Ar>مِن</Ar> (from), <Ar>ٱللَّه</Ar> (Allah), and <Ar>قَالَ</Ar> (he said)
        appear thousands of times. Almost two thousand other words appear exactly once.
      </p>
      <Figure
        title="How much of the Quran you recognize as you learn words"
        subtitle="Share of all word occurrences covered by the most frequent words"
        caption="Source: Quranic Arabic Corpus morphology, counted by lemma. Attached pronouns are counted as separate words."
      >
        <CoverageChart
          id="fast-cov"
          points={coverageCurve(1000)}
          maxWords={1000}
          milestones={[100, 300, 500, 1000].map((w) => ({ words: w, pct: coverageAt(w) }))}
        />
      </Figure>
      <p>
        Learning the top 100 words means more than half of every page is already familiar. By 500 words you recognize
        about four out of five words you read. No other order gets you there faster. For the full list and the real
        numbers behind this curve, see{' '}
        <Link href="/blog/most-common-words-in-the-quran">the 50 most common words in the Quran</Link> and{' '}
        <Link href="/blog/how-many-words-to-understand-the-quran">how many words you need to understand the Quran</Link>.
      </p>

      <h2 id="step-3">Step 3: Review with spaced repetition</h2>
      <p>
        Learning a word once is not enough. Memory research has shown for over a century that we forget new
        information quickly unless we review it, and that reviews spaced out over growing intervals work far better
        than cramming. Spaced repetition software does this scheduling for you: a word you just learned comes back
        tomorrow, then in a few days, then in a week, then in a month.
      </p>
      <p>
        Modern schedulers like FSRS go further and adapt to each word. Easy words drift out to long intervals, while
        words you keep missing come back often. You spend your time where it matters. We cover this in depth in{' '}
        <Link href="/blog/spaced-repetition-for-quranic-arabic">spaced repetition for Quranic Arabic</Link>.
      </p>
      <Callout title="A good daily number">
        Add five to ten new words a day. It sounds small, but every new word creates reviews for weeks. Ten new words a
        day is over 3,000 words a year, which is more than 97% coverage.
      </Callout>

      <h2 id="step-4">Step 4: Learn the grammar that repeats</h2>
      <p>
        You do not need a full grammar course before you start understanding ayahs. A handful of patterns appear on
        nearly every page, and learning them alongside your vocabulary pays off immediately:
      </p>
      <ul>
        <li>
          <strong>Attached pronouns</strong> like <Ar>ـهُمْ</Ar> (their, them), <Ar>ـكُمْ</Ar> (your, you), and{' '}
          <Ar>ـنَا</Ar> (our, us). They attach to the end of nouns, verbs, and particles.
        </li>
        <li>
          <strong>Common particles</strong> like <Ar>إِنَّ</Ar> (indeed), <Ar>لَا</Ar> (no, not), and{' '}
          <Ar>إِلَّا</Ar> (except). They are the most frequent words of all.
        </li>
        <li>
          <strong>Past and present verbs.</strong> Learning that <Ar>قَالَ</Ar> means he said and{' '}
          <Ar>يَقُولُ</Ar> means he says unlocks hundreds of verb forms.
        </li>
        <li>
          <strong>Three-letter roots.</strong> Most Arabic words grow from a root. Once you know{' '}
          <Ar>ع ل م</Ar> is about knowledge, words like <Ar>عَلِيم</Ar> (all-knowing) and <Ar>عِلْم</Ar> (knowledge)
          become easy to guess.
        </li>
      </ul>

      <h2 id="step-5">Step 5: Read real ayahs every day</h2>
      <p>
        Flashcards build recognition. Reading turns recognition into understanding. Spend five minutes a day reading
        the Quran word by word, starting with the surahs you already recite in salah: Al-Fatihah, the last juz, and
        favorites like <Link href="/quran/67">Al-Mulk</Link> or <Link href="/quran/36">Ya-Sin</Link>. Read the Arabic
        first, guess the meaning, and only then check the translation.
      </p>
      <p>
        You will notice something motivating very quickly. Words you learned last week start appearing everywhere.
      </p>

      <h2 id="step-6">Step 6: Protect the daily habit</h2>
      <p>
        Spaced repetition only works if you show up on the days reviews are due. A short session every day beats a
        long session once a week. A simple routine that fits almost any schedule:
      </p>
      <ol>
        <li>
          <strong>10 minutes:</strong> clear your due reviews.
        </li>
        <li>
          <strong>5 minutes:</strong> learn five to ten new words.
        </li>
        <li>
          <strong>5 minutes:</strong> read a few ayahs word by word.
        </li>
      </ol>
      <p>
        Tie it to something you already do, such as after Fajr or before bed. If you miss a day, do your reviews the
        next day and skip new words until you catch up.
      </p>
      <blockquote>
        And We have certainly made the Qur&rsquo;an easy for remembrance, so is there any who will remember? (Al-Qamar
        54:17)
      </blockquote>

      <h2 id="mistakes">Mistakes that slow you down</h2>
      <ul>
        <li>
          <strong>Starting with rare words.</strong> Learning the names of every animal in the Quran is interesting,
          but each one appears a handful of times.
        </li>
        <li>
          <strong>Adding too many new words.</strong> Thirty new words a day feels productive for a week, then the
          reviews pile up and most people quit.
        </li>
        <li>
          <strong>Only reading translations.</strong> Translations are essential, but reading English alone never
          teaches you Arabic. Read the Arabic first.
        </li>
        <li>
          <strong>Waiting until you are ready.</strong> You can start understanding ayahs with your first hundred
          words. Do not wait to finish a grammar course.
        </li>
      </ul>

      <AppCta
        title="Follow this plan in one app"
        body="Quranki teaches the Qaida, orders every word by Quranic frequency, schedules reviews with FSRS, and hides translations in the reader as you master each word."
      />
    </>
  );
}
