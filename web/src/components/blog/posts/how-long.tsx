import Link from 'next/link';
import { AppCta, Callout } from '@/components/blog/blog-ui';
import { Figure, HorizontalBars, Roadmap } from '@/components/blog/charts';
import { coverageAt, wordsForCoverage } from '@/lib/blog/quran-stats';

export const toc = [
  { id: 'depends', label: 'It depends on your goal' },
  { id: 'timeline', label: 'A realistic timeline' },
  { id: 'pace', label: 'How your daily pace changes it' },
  { id: 'year-one', label: 'What one year looks like' },
  { id: 'faster', label: 'How to get there faster' },
];

export default function Post() {
  const w80 = wordsForCoverage(80);
  const w90 = wordsForCoverage(90);
  const days = (words: number, perDay: number) => Math.round(words / perDay);
  return (
    <>
      <p>
        &ldquo;How long will it take?&rdquo; is the first question almost everyone asks before they start learning
        Quranic Arabic. The honest answer is that it depends on what you mean by learn, and on how many minutes a day
        you can give it. The good news is that you can plan it with real numbers.
      </p>

      <h2 id="depends">It depends on your goal</h2>
      <p>There are three very different goals hiding inside the question:</p>
      <ul>
        <li>
          <strong>Reading the script</strong> with correct vowels. This takes weeks, not years.
        </li>
        <li>
          <strong>Recognizing the words</strong> you read and recite, so you follow the meaning of most ayahs. This
          takes months.
        </li>
        <li>
          <strong>Reading with full grammatical understanding</strong>, the way a student of tafsir does. This is a
          multi-year project.
        </li>
      </ul>
      <p>
        Most people are really asking about the second goal. That is also where the Quran&rsquo;s word frequency
        works in your favor.
      </p>

      <h2 id="timeline">A realistic timeline</h2>
      <Figure title="Milestones at about 20 minutes a day" subtitle="Assumes five new words a day, plus daily reviews">
        <Roadmap
          steps={[
            { title: 'Read the letters with harakat', body: 'A Qaida course covering letters, joining, vowels, and madd.', time: 'Weeks 1 to 6' },
            { title: 'Your first 100 words', body: `Already ${coverageAt(100).toFixed(0)}% of the words you read are familiar.`, time: 'Month 1' },
            { title: '80% word coverage', body: `About ${w80} words. You follow the flow of most ayahs.`, time: 'Month 3' },
            { title: '90% word coverage', body: `About ${w90.toLocaleString()} words. Whole passages start to open up.`, time: 'Month 7' },
            { title: 'Core grammar is comfortable', body: 'Verb forms, pronouns, and sentence patterns feel natural.', time: 'Year 1 to 2' },
            { title: 'Reading with little help', body: 'Most lookups are for rare words and fine points of tafsir.', time: 'Year 2+' },
          ]}
        />
      </Figure>
      <p>
        These estimates assume you study every day. Language schools often quote one to two years for functional
        Quranic Arabic, and that matches this timeline once you include grammar. Vocabulary recognition, the part that
        changes how salah feels, comes much sooner.
      </p>

      <h2 id="pace">How your daily pace changes it</h2>
      <p>
        The biggest lever you control is how many new words you add each day. Here is how long it takes to reach 80%
        coverage ({w80} words) at different paces:
      </p>
      <Figure title={`Days to reach 80% coverage (${w80} words)`} subtitle="Depending on how many new words you add each day">
        <HorizontalBars
          unit="days"
          highlight={1}
          rows={[
            { label: '3 words a day', value: days(w80, 3), note: '- about 10 minutes a day' },
            { label: '5 words a day', value: days(w80, 5), note: '- about 20 minutes a day' },
            { label: '10 words a day', value: days(w80, 10), note: '- about 35 minutes a day' },
            { label: '20 words a day', value: days(w80, 20), note: '- hard to sustain' },
          ]}
        />
      </Figure>
      <p>
        Faster is not always better. Every new word adds reviews for the following weeks, so a pace of 20 a day
        becomes an hour of reviews within a month. Five to ten a day is the sweet spot for most adults with jobs,
        school, or family.
      </p>
      <Callout title="Minutes matter less than days">
        Ten minutes every day beats an hour on Saturdays. Spaced repetition depends on reviewing each word on the day
        it is due. Miss a week and the schedule falls apart.
      </Callout>

      <h2 id="year-one">What one year looks like</h2>
      <p>
        At five new words a day, one year of study is about 1,800 words. That covers about{' '}
        {coverageAt(1800).toFixed(0)}% of the words in the Quran. At ten a day you would know over 3,000 words and
        recognize about {coverageAt(3000).toFixed(0)}% of the text.
      </p>
      <p>
        Alongside vocabulary, a year of light grammar study (attached pronouns, verb tenses, common sentence patterns)
        is enough to understand the structure of most ayahs. You will still use a translation for rare words and
        deeper meaning, but the Quran will no longer sound like a foreign language.
      </p>

      <h2 id="faster">How to get there faster</h2>
      <ol>
        <li>
          <strong>Learn by frequency.</strong> See{' '}
          <Link href="/blog/most-common-words-in-the-quran">the most common words in the Quran</Link>.
        </li>
        <li>
          <strong>Use spaced repetition</strong> instead of rereading lists. See{' '}
          <Link href="/blog/spaced-repetition-for-quranic-arabic">why it works</Link>.
        </li>
        <li>
          <strong>Read word by word every day</strong>, starting with the surahs you pray with.
        </li>
        <li>
          <strong>Follow one plan.</strong> Our{' '}
          <Link href="/blog/how-to-learn-quranic-arabic-fast">6-step plan to learn Quranic Arabic fast</Link> puts it
          all together.
        </li>
      </ol>

      <AppCta
        title="Start your first 100 words today"
        body="Quranki plans your daily new words and reviews for you, and shows your coverage of the Quran growing as you go."
      />
    </>
  );
}
