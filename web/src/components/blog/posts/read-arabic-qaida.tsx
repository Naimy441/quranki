import Link from 'next/link';
import { Ar, AppCta, Callout } from '@/components/blog/blog-ui';
import { Figure, LetterGrid, ReadableSteps, Roadmap } from '@/components/blog/charts';
import readable from '@/data/quran/qaida-readable-coverage.json';

export const toc = [
  { id: 'path', label: 'The path at a glance' },
  { id: 'letters', label: '1. The 28 letters' },
  { id: 'joining', label: '2. Joining forms' },
  { id: 'harakat', label: '3. Short vowels (harakat)' },
  { id: 'tanween', label: '4. Tanween' },
  { id: 'madd', label: '5. Long vowels (madd)' },
  { id: 'sukoon', label: '6. Sukoon' },
  { id: 'shaddah', label: '7. Shaddah' },
  { id: 'unlock', label: 'How much each rule unlocks' },
  { id: 'tips', label: 'Tips for adult learners' },
];

const LETTERS: { ar: string; name: string; connects: boolean }[] = [
  { ar: 'ا', name: 'Alif', connects: false },
  { ar: 'ب', name: 'Bā', connects: true },
  { ar: 'ت', name: 'Tā', connects: true },
  { ar: 'ث', name: 'Thā', connects: true },
  { ar: 'ج', name: 'Jīm', connects: true },
  { ar: 'ح', name: 'Ḥā', connects: true },
  { ar: 'خ', name: 'Khā', connects: true },
  { ar: 'د', name: 'Dāl', connects: false },
  { ar: 'ذ', name: 'Dhāl', connects: false },
  { ar: 'ر', name: 'Rā', connects: false },
  { ar: 'ز', name: 'Zāy', connects: false },
  { ar: 'س', name: 'Sīn', connects: true },
  { ar: 'ش', name: 'Shīn', connects: true },
  { ar: 'ص', name: 'Ṣād', connects: true },
  { ar: 'ض', name: 'Ḍād', connects: true },
  { ar: 'ط', name: 'Ṭā', connects: true },
  { ar: 'ظ', name: 'Ẓā', connects: true },
  { ar: 'ع', name: 'ʿAyn', connects: true },
  { ar: 'غ', name: 'Ghayn', connects: true },
  { ar: 'ف', name: 'Fā', connects: true },
  { ar: 'ق', name: 'Qāf', connects: true },
  { ar: 'ك', name: 'Kāf', connects: true },
  { ar: 'ل', name: 'Lām', connects: true },
  { ar: 'م', name: 'Mīm', connects: true },
  { ar: 'ن', name: 'Nūn', connects: true },
  { ar: 'ه', name: 'Hā', connects: true },
  { ar: 'و', name: 'Wāw', connects: false },
  { ar: 'ي', name: 'Yā', connects: true },
];

export default function Post() {
  const { total, cumulative } = readable as { total: number; cumulative: Record<string, number> };
  const pct = (key: string) => (cumulative[key] / total) * 100;
  const steps = [
    { label: 'Harakat', pct: pct('haraka') },
    { label: 'Tanween', pct: pct('tanween') },
    { label: 'Madd', pct: pct('madd') },
    { label: 'Leen', pct: pct('leen') },
    { label: 'Sukoon', pct: pct('sukoon') },
    { label: 'Shaddah', pct: pct('shaddah') },
  ];
  const sukoonGain = pct('sukoon') - pct('leen');

  return (
    <>
      <p>
        Reading the Quran in Arabic is one of the most achievable goals in language learning. The script has 28
        letters, the Quran is printed with every vowel marked, and the reading rules come in a small, fixed set. Most
        adults who practice daily can read slowly and correctly within a few weeks.
      </p>
      <p>
        This guide follows the order of the traditional Qaida, the beginner book used in mosques around the world, and
        shows something new: exactly how much of the Quran each rule lets you read, measured across all{' '}
        {total.toLocaleString()} words.
      </p>

      <h2 id="path">The path at a glance</h2>
      <Figure title="From zero to reading the Mushaf" subtitle="Typical time with 15 to 20 minutes of daily practice">
        <Roadmap
          steps={[
            { title: 'Letters and their sounds', body: '28 letters, including several sounds English does not have.', time: 'Week 1' },
            { title: 'Joining forms', body: 'How each letter changes at the start, middle, and end of a word.', time: 'Week 2' },
            { title: 'Harakat and tanween', body: 'The short vowel marks: fatha, kasra, damma, and their doubled forms.', time: 'Week 2 to 3' },
            { title: 'Madd and leen', body: 'Long vowels and the soft ay and aw sounds.', time: 'Week 3 to 4' },
            { title: 'Sukoon', body: 'Letters with no vowel, closing a syllable.', time: 'Week 4' },
            { title: 'Shaddah', body: 'Doubled letters. After this you can read every word.', time: 'Week 5 to 6' },
          ]}
        />
      </Figure>

      <h2 id="letters">Step 1: The 28 letters</h2>
      <p>
        Arabic is written right to left. Start by learning each letter&rsquo;s shape and sound in isolation. Many
        letters share a base shape and differ only in their dots: <Ar>ب</Ar>, <Ar>ت</Ar>, and <Ar>ث</Ar> are the same
        shape with one dot below, two above, and three above.
      </p>
      <Figure title="The Arabic alphabet" subtitle="Six letters never connect to the letter after them">
        <LetterGrid letters={LETTERS} />
      </Figure>
      <p>
        Give extra time to the sounds that do not exist in English: the throat letters <Ar>ع</Ar> and <Ar>ح</Ar>, the
        heavy letters <Ar>ص</Ar>, <Ar>ض</Ar>, <Ar>ط</Ar>, and <Ar>ظ</Ar>, and <Ar>ق</Ar>, which is pronounced
        further back than <Ar>ك</Ar>. Listening to a teacher or audio for every letter matters more here than anywhere
        else.
      </p>

      <h2 id="joining">Step 2: Joining forms</h2>
      <p>
        Arabic letters connect to each other, and most change shape depending on where they sit in a word. For
        example, <Ar>ه</Ar> looks quite different at the start of <Ar>هُوَ</Ar> and at the end of{' '}
        <Ar>ٱللَّهِ</Ar>. The good news is that the core of each letter stays recognizable. The six
        highlighted letters above (<Ar>ا د ذ ر ز و</Ar>) never join to the letter after them, which is why you see
        small gaps inside words.
      </p>

      <h2 id="harakat">Step 3: Short vowels (harakat)</h2>
      <p>Three small marks give each letter its vowel:</p>
      <ul>
        <li>
          <strong>Fatha</strong> is a stroke above the letter and sounds like a: <Ar>بَ</Ar> is ba.
        </li>
        <li>
          <strong>Kasra</strong> is a stroke below and sounds like i: <Ar>بِ</Ar> is bi.
        </li>
        <li>
          <strong>Damma</strong> is a small wāw above and sounds like u: <Ar>بُ</Ar> is bu.
        </li>
      </ul>
      <p>
        Practice each letter with all three: <Ar>بَ بِ بُ</Ar>, <Ar>تَ تِ تُ</Ar>, and so on. This drill is the heart
        of the Qaida.
      </p>

      <h2 id="tanween">Step 4: Tanween</h2>
      <p>
        Doubling a vowel mark adds an n sound at the end of a word: <Ar>بً</Ar> is ban, <Ar>بٍ</Ar> is bin, and{' '}
        <Ar>بٌ</Ar> is bun. You will see it on indefinite nouns, like <Ar>كِتَٰبٌ</Ar> (a book).
      </p>

      <h2 id="madd">Step 5: Long vowels (madd) and leen</h2>
      <p>
        Three letters stretch a vowel to twice its length: alif after a fatha (<Ar>بَا</Ar>, bā), yā after a kasra (
        <Ar>بِي</Ar>, bī), and wāw after a damma (<Ar>بُو</Ar>, bū). The Quran also uses a small standing alif, as in{' '}
        <Ar>ٱلرَّحْمَٰنِ</Ar>. When wāw or yā carry a sukoon after a fatha, they make the soft leen sounds aw and ay,
        as in <Ar>يَوْم</Ar> (day).
      </p>

      <h2 id="sukoon">Step 6: Sukoon</h2>
      <p>
        A small circle above a letter means it has no vowel. It closes the syllable before it: <Ar>مِنْ</Ar> is min,
        not mi-na. It looks like a small rule, but it unlocks more of the Quran than any other step, as the chart
        below shows.
      </p>

      <h2 id="shaddah">Step 7: Shaddah</h2>
      <p>
        A shaddah (a small w shape) means the letter is doubled: the first copy closes a syllable and the second
        starts the next. <Ar>رَبِّ</Ar> is rab-bi. Shaddah is everywhere, including in <Ar>ٱللَّه</Ar>, and it is the
        last rule you need to read every word in the Mushaf.
      </p>

      <h2 id="unlock">How much of the Quran each rule unlocks</h2>
      <p>
        We checked every word in the Quran and asked: which is the last Qaida rule you need to read it? The result
        shows why it pays to finish the whole course.
      </p>
      <Figure
        title="Share of Quran words you can read after each rule"
        subtitle="Cumulative, in the order the Qaida teaches them"
        caption="A word counts as readable once you have learned every rule it uses. Opening letters like Alif Lam Mim are read by their letter names, so they count from the first bar."
      >
        <ReadableSteps steps={steps} />
      </Figure>
      <p>
        With only short vowels and tanween you can read about {Math.round(pct('tanween'))}% of the words, because
        almost every Quranic word has a long vowel, a sukoon, or a shaddah. Madd lifts that to about{' '}
        {Math.round(pct('madd'))}%. Sukoon alone adds another {Math.round(sukoonGain)} points, and shaddah completes
        the picture.
      </p>
      <Callout title="Do not stop halfway">
        Many learners stop after the vowels and feel stuck because so few real words are readable. Push through
        sukoon and shaddah: that is where the Quran opens up.
      </Callout>

      <h2 id="tips">Tips for adult learners</h2>
      <ul>
        <li>
          <strong>Practice daily, in short sessions.</strong> Fifteen minutes every day beats two hours on weekends.
        </li>
        <li>
          <strong>Always use audio.</strong> Say every sound out loud along with a recording.
        </li>
        <li>
          <strong>Avoid transliteration as a crutch.</strong> Use it to check yourself, then cover it.
        </li>
        <li>
          <strong>Start reading real ayahs early.</strong> Short surahs like <Link href="/quran/112">Al-Ikhlas</Link>{' '}
          are perfect first practice.
        </li>
        <li>
          <strong>Learn meanings as soon as you can read.</strong> Begin with{' '}
          <Link href="/blog/surah-al-fatihah-word-by-word">Al-Fatihah word by word</Link>, then follow our{' '}
          <Link href="/blog/how-to-learn-quranic-arabic-fast">plan to learn Quranic Arabic fast</Link>.
        </li>
      </ul>

      <AppCta
        title="A full Qaida course, free"
        body="Pick the learn-to-read track and Quranki teaches letters, joining forms, harakat, sukoon, shaddah, and madd with audio for every sound. Vocabulary unlocks when you finish."
      />
    </>
  );
}
