import Link from 'next/link';
import { Ar, AppCta, Callout } from '@/components/blog/blog-ui';
import { Figure, TopWordsBars } from '@/components/blog/charts';
import { frequencyOf } from '@/lib/blog/quran-stats';
import { NAMES } from '@/lib/blog/surah-words';

export const toc = [
  { id: 'about', label: 'About the 99 Names' },
  { id: 'most-repeated', label: 'The names the Quran repeats most' },
  { id: 'list', label: 'All 99 Names with meanings' },
  { id: 'patterns', label: 'Patterns that help you learn them' },
  { id: 'memorize', label: 'How to memorize them' },
];

/** Attribute forms as the corpus spells them, without al- or case endings. */
const REPEATED: { ar: string; gloss: string }[] = [
  { ar: 'عَلِيم', gloss: 'All-Knowing' },
  { ar: 'رَّحِيم', gloss: 'Merciful' },
  { ar: 'عَزِيز', gloss: 'Almighty' },
  { ar: 'حَكِيم', gloss: 'All-Wise' },
  { ar: 'غَفُور', gloss: 'Forgiving' },
  { ar: 'رَّحْمَٰن', gloss: 'Most Merciful' },
  { ar: 'بَصِير', gloss: 'All-Seeing' },
  { ar: 'سَمِيع', gloss: 'All-Hearing' },
  { ar: 'خَبِير', gloss: 'All-Aware' },
];

export default function Post() {
  const repeated = REPEATED.map((r) => ({ ...r, freq: frequencyOf(r.ar) })).sort((a, b) => b.freq - a.freq);
  return (
    <>
      <p>
        The Quran calls them <Ar>ٱلْأَسْمَآءُ ٱلْحُسْنَىٰ</Ar>, the most beautiful names. Learning them is one of
        the most direct ways to know who Allah is, and because these names run through the whole Quran, it is also one
        of the most rewarding ways to build your Quranic vocabulary.
      </p>
      <blockquote>
        And to Allah belong the best names, so invoke Him by them. (Al-A&rsquo;raf 7:180)
      </blockquote>
      <p>
        Below you will find all 99 names with Arabic, transliteration, and meaning, each linked to a verse in the
        Quran, plus the names the Quran repeats most often.
      </p>

      <h2 id="about">About the 99 Names</h2>
      <p>
        The Prophet ﷺ said that Allah has ninety-nine names, and whoever learns and preserves them will enter
        Paradise (Bukhari and Muslim). The familiar list of 99 comes from a narration in Tirmidhi. Scholars note that
        Allah&rsquo;s names are not limited to 99, and that a few names on the traditional list do not appear in the
        Quran in exactly that form. For those, the verse linked below describes Allah with the same meaning.
      </p>

      <h2 id="most-repeated">The names the Quran repeats most</h2>
      <p>
        Many of Allah&rsquo;s names close an ayah, often in pairs such as <Ar>ٱلْعَزِيزُ ٱلْحَكِيمُ</Ar> (the
        Almighty, the All-Wise) or <Ar>ٱلْغَفُورُ ٱلرَّحِيمُ</Ar> (the Forgiving, the Merciful). Learning these
        endings means you will recognize the close of hundreds of ayahs.
      </p>
      <Figure
        title="How often key names appear in the Quran"
        subtitle="Every occurrence of the word, with or without al-"
        caption="Counted by dictionary form in the Quranic Arabic Corpus. Counts include every use of the word, and nearly all of these describe Allah."
      >
        <TopWordsBars rows={repeated} />
      </Figure>

      <h2 id="list">All 99 Names of Allah with meanings</h2>
      <p>Tap a verse reference to read it word by word in the Quran reader.</p>
      <ol className="not-prose my-8 grid gap-3 sm:grid-cols-2">
        {NAMES.map((name) => (
          <li key={name.n} className="flex items-start gap-3 rounded-large border border-border bg-card p-4">
            <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold tabular-nums text-primary">
              {name.n}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-text">{name.tl}</span>
                <span className="uthmanic-text text-2xl leading-[1.5] text-text" lang="ar">
                  {name.ar}
                </span>
              </div>
              <div className="text-[13px] leading-snug text-textSecondary">{name.en}</div>
              {name.verse && (
                <Link
                  href={`/quran/${name.verse.s}?ayah=${name.verse.a}`}
                  className="mt-1.5 inline-block text-xs font-semibold text-primary hover:underline"
                >
                  Quran {name.verse.s}:{name.verse.a}
                </Link>
              )}
            </div>
          </li>
        ))}
      </ol>

      <h2 id="patterns">Patterns that help you learn them</h2>
      <p>The names are not 99 unrelated words. A few patterns make them much easier to learn and remember:</p>
      <ul>
        <li>
          <strong>Shared roots.</strong> <Ar>ٱلرَّحْمَٰنُ</Ar> and <Ar>ٱلرَّحِيمُ</Ar> both come from ر ح م (mercy).{' '}
          <Ar>ٱلْغَفَّارُ</Ar> and <Ar>ٱلْغَفُورُ</Ar> both come from غ ف ر (forgiveness).
        </li>
        <li>
          <strong>The fa&lsquo;īl pattern</strong> describes a permanent quality: <Ar>عَلِيم</Ar> (all-knowing),{' '}
          <Ar>حَكِيم</Ar> (all-wise), <Ar>سَمِيع</Ar> (all-hearing), <Ar>بَصِير</Ar> (all-seeing).
        </li>
        <li>
          <strong>The fa&lsquo;&lsquo;āl pattern</strong> adds intensity and repetition: <Ar>ٱلْغَفَّارُ</Ar> (the
          one who forgives again and again), <Ar>ٱلرَّزَّاقُ</Ar> (the constant provider), <Ar>ٱلْوَهَّابُ</Ar>{' '}
          (the giver of gifts).
        </li>
        <li>
          <strong>Pairs of opposites.</strong> <Ar>ٱلْقَابِضُ</Ar> and <Ar>ٱلْبَاسِطُ</Ar> (the withholder and the
          extender), <Ar>ٱلْأَوَّلُ</Ar> and <Ar>ٱلْآخِرُ</Ar> (the first and the last).
        </li>
      </ul>
      <Callout title="Learn the root, get the family">
        Knowing <Ar>عَلِيم</Ar> helps you recognize <Ar>عِلْم</Ar> (knowledge), <Ar>عَلِمَ</Ar> (he knew), and{' '}
        <Ar>ٱلْعَٰلَمِينَ</Ar> (the worlds). The 99 Names are a gateway into hundreds of related Quranic words.
      </Callout>

      <h2 id="memorize">How to memorize the 99 Names</h2>
      <ol>
        <li>
          <strong>Learn ten a week.</strong> Ten weeks covers the full list without overload.
        </li>
        <li>
          <strong>Review with spaced repetition</strong> so early names do not fade while you add new ones. See{' '}
          <Link href="/blog/spaced-repetition-for-quranic-arabic">how spaced repetition works</Link>.
        </li>
        <li>
          <strong>Read each name in its verse.</strong> Context turns a list into meaning.
        </li>
        <li>
          <strong>Use them in dua.</strong> Call on Allah by the name that fits what you are asking for: Ar-Razzaq for
          provision, Al-Ghafur for forgiveness, Al-Hadi for guidance.
        </li>
      </ol>

      <AppCta
        title="The 99 Names, built into your study"
        body="Quranki includes a full stage for the 99 Names of Allah, with a Quran verse for every name and FSRS reviews so they stay with you."
      />
    </>
  );
}
