import Link from 'next/link';
import { Ar, AppCta, Callout } from '@/components/blog/blog-ui';
import { Figure, ForgettingChart, IntervalLadder } from '@/components/blog/charts';

export const toc = [
  { id: 'forgetting', label: 'The forgetting curve' },
  { id: 'how-it-works', label: 'How spaced repetition works' },
  { id: 'fsrs', label: 'FSRS: a smarter scheduler' },
  { id: 'grading', label: 'How to grade yourself honestly' },
  { id: 'anki', label: 'Anki decks vs. a Quran app' },
  { id: 'habit', label: 'Building the daily habit' },
];

export default function Post() {
  return (
    <>
      <p>
        Almost everyone who has tried to learn Quranic vocabulary knows this feeling. You learn twenty words on
        Monday, and by Friday you remember four. The problem is not your memory. It is the way the words were
        reviewed, or rather, not reviewed.
      </p>
      <p>
        Spaced repetition is a simple idea with a very large effect: review each word right before you would forget
        it, and wait a little longer every time. Here is how it works and how to use it for the Quran.
      </p>

      <h2 id="forgetting">The forgetting curve</h2>
      <p>
        In the 1880s the psychologist Hermann Ebbinghaus measured how quickly he forgot lists he had memorized. The
        result, now called the forgetting curve, is steep: most new information fades within days. Just as important,
        he found that every well-timed review flattens the curve, so the memory lasts longer each time.
      </p>
      <Figure
        title="Why spaced reviews work"
        subtitle="Illustrative chance of remembering a new word over 30 days"
        caption="Illustration based on the shape of the forgetting curve. Exact rates differ for every person and every word, which is why modern schedulers measure them instead of guessing."
      >
        <ForgettingChart />
      </Figure>
      <p>
        The dashed line is a word you studied once. The green line is the same word reviewed on day 1, 3, 7, and 15.
        Each review resets your memory to full strength, and each time the curve falls more slowly. After four short
        reviews the word is still there a month later.
      </p>

      <h2 id="how-it-works">How spaced repetition works</h2>
      <p>
        A spaced repetition system shows you a card, you try to recall the answer, and then you tell it how it went.
        If you remembered easily, the next review is pushed far into the future. If you forgot, the card comes back
        soon. Over time each word settles at its own rhythm.
      </p>
      <Figure title="A typical review schedule for one word" subtitle="Intervals grow each time you remember">
        <IntervalLadder />
      </Figure>
      <p>
        The result is that your daily reviews stay manageable even as your vocabulary grows into the thousands. Words
        you know well cost you a few seconds every few months.
      </p>

      <h2 id="fsrs">FSRS: a smarter scheduler</h2>
      <p>
        Older schedulers, like the SM-2 algorithm behind classic Anki, use fixed rules: multiply the interval by a
        number and adjust it a little each time. FSRS (Free Spaced Repetition Scheduler) is a newer, open-source
        algorithm that models two things for each card: how stable the memory is, and how difficult the card is for
        you. It then predicts the day your chance of remembering drops to a target, usually 90%, and schedules the
        review for then.
      </p>
      <p>
        In practice, FSRS usually gets the same retention with fewer reviews. Anki adopted it as an option in 2023,
        and it is the scheduler Quranki uses for both vocabulary and memorization.
      </p>

      <h2 id="grading">How to grade yourself honestly</h2>
      <p>Most apps give you four buttons. Using them honestly is what makes the schedule accurate:</p>
      <ul>
        <li>
          <strong>Again:</strong> you did not remember, or you got it wrong. The card comes back soon.
        </li>
        <li>
          <strong>Hard:</strong> you remembered, but it took real effort.
        </li>
        <li>
          <strong>Good:</strong> you remembered after a normal moment of thought. This should be your most common
          answer.
        </li>
        <li>
          <strong>Easy:</strong> instant and effortless. Use it sparingly.
        </li>
      </ul>
      <Callout title="Recall before you reveal">
        Always try to say the meaning out loud before you flip the card. Recognizing an answer after seeing it feels
        like knowing it, but it is not the same. The effort of recalling is what builds the memory.
      </Callout>

      <h2 id="anki">Anki decks vs. a dedicated Quran app</h2>
      <p>
        Anki is a superb tool and many students of the Quran have used it for years. If you go that route, look for a
        deck that is ordered by Quranic frequency, includes the Arabic with full harakat, and shows each word in an
        ayah. Shared decks vary a lot in quality.
      </p>
      <p>A dedicated Quran app can do a few things a general flashcard tool cannot:</p>
      <ul>
        <li>
          <strong>Connect every word to the text.</strong> When you learn <Ar>رَحْمَة</Ar> (mercy), you see the
          ayahs it appears in, with audio.
        </li>
        <li>
          <strong>Track coverage.</strong> You can see what share of each surah you now understand.
        </li>
        <li>
          <strong>Change the reader as you learn.</strong> In Quranki, once you master a word, its translation is
          hidden in the word-by-word reader, so reading becomes a live test.
        </li>
      </ul>

      <h2 id="habit">Building the daily habit</h2>
      <ol>
        <li>
          <strong>Reviews first, new words second.</strong> Clearing due reviews keeps the schedule healthy.
        </li>
        <li>
          <strong>Five to ten new words a day.</strong> See{' '}
          <Link href="/blog/how-long-does-it-take-to-learn-quranic-arabic">how pace affects your timeline</Link>.
        </li>
        <li>
          <strong>Same time every day.</strong> After a prayer is an easy anchor.
        </li>
        <li>
          <strong>Never skip reviews for a week.</strong> If life gets busy, pause new words instead.
        </li>
      </ol>
      <p>
        The same principle works for memorizing the Quran itself. We explain how in{' '}
        <Link href="/blog/how-to-memorize-the-quran-without-forgetting">how to memorize the Quran without forgetting</Link>.
      </p>

      <AppCta
        title="FSRS, built for the Quran"
        body="Quranki schedules every Quranic word with FSRS and shows it in real ayahs with word-by-word recitation. Free on web, iPhone, and Android."
      />
    </>
  );
}
