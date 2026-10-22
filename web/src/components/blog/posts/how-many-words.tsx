import Link from 'next/link';
import { Ar, AppCta, Callout } from '@/components/blog/blog-ui';
import { CoverageChart, Figure, HorizontalBars, StatRow } from '@/components/blog/charts';
import { coverageAt, coverageCurve, QURAN_WORD_COUNT, UNIQUE_LEMMAS, wordsForCoverage } from '@/lib/blog/quran-stats';

export const toc = [
  { id: 'short-answer', label: 'The short answer' },
  { id: 'curve', label: 'The full coverage curve' },
  { id: '80-percent', label: 'Is the 80% claim true?' },
  { id: 'coverage-vs-understanding', label: 'Coverage is not understanding' },
  { id: 'targets', label: 'Targets for your goals' },
];

function monthsAtFivePerDay(words: number): string {
  const days = words / 5;
  if (days < 45) return `about ${Math.round(days / 7)} weeks`;
  return `about ${Math.round(days / 30)} months`;
}

export default function Post() {
  const targets = [50, 70, 80, 90, 95].map((p) => ({ pct: p, words: wordsForCoverage(p) }));
  return (
    <>
      <p>
        You have probably seen the claim: learn around 300 words and you will understand 80% of the Quran. It is a
        wonderful motivator, and the idea behind it is true. The exact numbers are a little different, though, and
        knowing the real curve helps you set honest goals.
      </p>
      <p>
        We counted every one of the Quran&rsquo;s {QURAN_WORD_COUNT.toLocaleString()} words using the Quranic Arabic
        Corpus, grouped them by dictionary form, and measured how much of the text the most frequent words cover.
      </p>

      <h2 id="short-answer">The short answer</h2>
      <StatRow
        stats={targets.slice(0, 4).map((t) => ({ value: t.words.toLocaleString(), label: `words to reach ${t.pct}% coverage` }))}
      />
      <p>
        Around <strong>{wordsForCoverage(50)} words</strong> cover half of the Quran. You reach{' '}
        <strong>80% at about {wordsForCoverage(80)} words</strong>, and{' '}
        <strong>90% at about {wordsForCoverage(90).toLocaleString()}</strong>. To recognize every single word you need
        all {UNIQUE_LEMMAS.toLocaleString()}, because the last few percent are words that appear only once or twice.
      </p>

      <h2 id="curve">The full coverage curve</h2>
      <Figure
        title="Quran word coverage by vocabulary size"
        subtitle="Share of all words in the Quran covered by the most frequent words"
        caption="Source: Quranic Arabic Corpus morphology, counted by lemma (dictionary form). Each point means: if you know the N most common words, this share of all words you read will be familiar."
      >
        <CoverageChart
          id="curve-full"
          points={coverageCurve(2000)}
          maxWords={2000}
          milestones={[100, 500, 1000, 2000].map((w) => ({ words: w, pct: coverageAt(w) }))}
        />
      </Figure>
      <p>
        The shape is the important part. The curve shoots up at the start, then flattens. Your first 100 words cover{' '}
        {coverageAt(100).toFixed(0)}% of the text. The next 400 add about {(coverageAt(500) - coverageAt(100)).toFixed(0)}{' '}
        more points. The 1,500 words after that add only about {(coverageAt(2000) - coverageAt(500)).toFixed(0)}.
      </p>
      <p>
        That means the beginning of your journey is the most rewarding part. Every word you learn in the first few
        months shows up again and again.
      </p>

      <h2 id="80-percent">Is the &ldquo;300 words, 80%&rdquo; claim true?</h2>
      <p>
        Close, but slightly optimistic. Counted strictly by dictionary form, the top 300 words cover{' '}
        <strong>{coverageAt(300).toFixed(1)}%</strong> of the Quran. The 80% mark arrives at about{' '}
        {wordsForCoverage(80)} words.
      </p>
      <Figure title="How the popular claims compare" subtitle="Coverage reached by each vocabulary size">
        <HorizontalBars
          unit="%"
          highlight={2}
          rows={[100, 300, 500, 1000].map((n) => ({
            label: `${n.toLocaleString()} words`,
            value: Math.round(coverageAt(n) * 10) / 10,
          }))}
        />
      </Figure>
      <p>Why do other sources give higher numbers? Usually because of how they count:</p>
      <ul>
        <li>
          <strong>Counting by root</strong> groups many words together. <Ar>عَلِمَ</Ar> (he knew),{' '}
          <Ar>عِلْم</Ar> (knowledge), and <Ar>عَلِيم</Ar> (all-knowing) share one root. Counting roots makes the
          numbers look better, but you still have to learn each word.
        </li>
        <li>
          <strong>Leaving out names and rare forms</strong> shrinks the total and pushes the percentage up.
        </li>
        <li>
          <strong>Rounding up</strong> to a memorable number.
        </li>
      </ul>
      <p>
        None of this changes the core message. A few hundred words really do cover most of the Quran. It just takes
        closer to 500 than 300.
      </p>

      <h2 id="coverage-vs-understanding">Coverage is not the same as understanding</h2>
      <p>
        Recognizing 80% of the words does not mean understanding 80% of the meaning. In a typical ayah, the frequent
        words are the frame: <Ar>إِنَّ</Ar>, <Ar>ٱلَّذِينَ</Ar>, <Ar>ءَامَنُوا</Ar>. The rare word is often the
        one carrying the specific image or command. Language researchers generally find that readers need to know
        around 95% or more of the words in a text to follow it comfortably without help.
      </p>
      <Callout title="What this means in practice">
        At 80% coverage, you follow the flow of most ayahs and catch the key ideas. Use a word-by-word reader for the
        gaps. As you pass 90%, you start reading whole passages with only an occasional lookup.
      </Callout>

      <h2 id="targets">Targets for your goals</h2>
      <p>Here are practical milestones, with how long each takes at five new words a day:</p>
      <ul>
        {targets.map((t) => (
          <li key={t.pct}>
            <strong>
              {t.pct}% coverage: about {t.words.toLocaleString()} words
            </strong>{' '}
            ({monthsAtFivePerDay(t.words)} at five words a day)
          </li>
        ))}
      </ul>
      <p>
        For a full study plan built around these milestones, see{' '}
        <Link href="/blog/how-long-does-it-take-to-learn-quranic-arabic">
          how long it takes to learn Quranic Arabic
        </Link>
        , or start with <Link href="/blog/most-common-words-in-the-quran">the 50 most common words</Link>.
      </p>

      <AppCta
        title="Watch your coverage grow"
        body="Quranki orders all 4,872 vocabulary cards by frequency and shows how much of every surah you understand as you learn."
      />
    </>
  );
}
