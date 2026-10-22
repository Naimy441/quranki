import Link from 'next/link';
import { AppCta, Callout } from '@/components/blog/blog-ui';
import { Figure, RevisionRings } from '@/components/blog/charts';

export const toc = [
  { id: 'why-forget', label: 'Why hifz fades' },
  { id: 'portion', label: '1. Choose a portion you can keep' },
  { id: 'memorize', label: '2. Memorize it properly' },
  { id: 'tracks', label: '3. Split revision into three tracks' },
  { id: 'recall', label: '4. Test, do not reread' },
  { id: 'spaced', label: '5. Space your old revision' },
  { id: 'meaning', label: '6. Learn what you memorize' },
  { id: 'week', label: 'A sample week' },
];

export default function Post() {
  return (
    <>
      <p>
        Memorizing a new surah is one of the most rewarding things a Muslim can do. Keeping it is the hard part. Many
        people who memorized a juz as children can barely recite half of it today. That is not a failure of memory.
        It is a failure of revision.
      </p>
      <p>
        This guide brings together traditional hifz practice and what memory research tells us about long-term
        retention. The goal is a system you can keep for years.
      </p>

      <h2 id="why-forget">Why hifz fades</h2>
      <p>
        Almost all forgetting in hifz has one cause: new memorization takes all the time, and old memorization gets
        none. It feels productive to keep adding pages. Meanwhile the surahs from three months ago quietly slip,
        until one day you stand in salah and lose your place.
      </p>
      <p>The fix is to treat revision as the main work, and new memorization as the reward.</p>

      <h2 id="portion">Step 1: Choose a portion you can keep</h2>
      <p>
        Start smaller than you think. A few lines a day, or one ruku a week, is a strong pace for a working adult. Only
        increase it once your revision feels comfortable for two or three weeks in a row. A portion you keep for life
        is worth more than a page you lose by next month.
      </p>
      <p>
        Use the same printed Mushaf every time. Your visual memory of where an ayah sits on the page is a powerful
        anchor, and switching layouts weakens it.
      </p>

      <h2 id="memorize">Step 2: Memorize it properly the first time</h2>
      <ol>
        <li>
          <strong>Listen first.</strong> Play the portion several times from one reciter until the rhythm is familiar.
        </li>
        <li>
          <strong>Read it with the Mushaf open</strong>, slowly, with correct Tajweed, about ten times.
        </li>
        <li>
          <strong>Recite it from memory</strong>, one ayah at a time, checking after each one.
        </li>
        <li>
          <strong>Link the ayahs.</strong> Recite ayah 1 and 2 together, then 1 to 3, and so on. Most mistakes happen
          at the joins.
        </li>
        <li>
          <strong>Recite it to someone</strong>, or record yourself, before you call it done.
        </li>
      </ol>

      <h2 id="tracks">Step 3: Split revision into three tracks</h2>
      <p>
        Traditional hifz schools split every day into three parts, often called <strong>sabaq</strong> (the new
        lesson), <strong>sabqi</strong> (recent lessons), and <strong>manzil</strong> (older memorization). The names
        vary between teachers, but the structure is the key idea. Each track gets its own protected time.
      </p>
      <Figure title="A 30-minute daily hifz session" subtitle="Most of the time goes to revision, not new memorization">
        <RevisionRings />
      </Figure>
      <p>
        Notice that new memorization gets the smallest share. As your hifz grows, the old track grows with it. If your
        revision starts taking too long, slow down your new portion instead of skipping old revision.
      </p>

      <h2 id="recall">Step 4: Test yourself, do not just reread</h2>
      <p>
        Reading a page you memorized feels like revision, but it is mostly recognition. Real revision means reciting
        from memory and then checking. This is called active recall, and it is one of the most reliable findings in
        learning research: the effort of pulling something out of memory is what strengthens it.
      </p>
      <Callout title="A simple recall test">
        Look at only the first few words of a passage, close the Mushaf, and recite the rest. Then open it and check
        every word. Mark the spots where you hesitated so they get extra attention next time.
      </Callout>

      <h2 id="spaced">Step 5: Space your old revision</h2>
      <p>
        Not every surah needs the same attention. A surah you recite in salah every week is strong. One you have not
        touched in a month is fragile. Spaced repetition fixes this automatically: passages you recite smoothly come
        back less often, and passages you stumble on come back sooner.
      </p>
      <p>
        You can do this on paper with a simple log, or let software do it. The principle is the same one that makes
        vocabulary stick. We explain the science in{' '}
        <Link href="/blog/spaced-repetition-for-quranic-arabic">spaced repetition for Quranic Arabic</Link>.
      </p>

      <h2 id="meaning">Step 6: Learn what you memorize</h2>
      <p>
        Hifz is far easier to keep when the words mean something to you. An ayah you understand is a sentence with a
        clear idea. An ayah you do not understand is a string of sounds, and strings of sounds are easy to mix up,
        especially between similar passages.
      </p>
      <p>
        You do not need years of Arabic for this. Knowing the most common few hundred words already covers most of
        the text. Start with{' '}
        <Link href="/blog/most-common-words-in-the-quran">the 50 most common words in the Quran</Link> and read your
        memorization portion word by word in the <Link href="/quran">Quran reader</Link>.
      </p>

      <h2 id="week">A sample week</h2>
      <ul>
        <li>
          <strong>Every day:</strong> 5 to 10 minutes of new lines, 10 minutes of the last two weeks, 15 minutes of
          older surahs.
        </li>
        <li>
          <strong>In salah:</strong> recite from your recent and old tracks, not only short surahs you know perfectly.
        </li>
        <li>
          <strong>Once a week:</strong> recite to a teacher, family member, or friend.
        </li>
        <li>
          <strong>Once a week:</strong> take a day off new memorization and do only revision.
        </li>
      </ul>

      <AppCta
        title="Spaced revision for every ruku"
        body="Quranki's memorization mode turns each ruku into a review card. It shows the opening words, you recite the rest, and FSRS schedules it again."
      />
    </>
  );
}
