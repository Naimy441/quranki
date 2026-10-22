import type { Metadata } from 'next';
import fatiha from '../../public/data/surahs/001.json';
import coverage from '@/data/quran/lemma-level-coverage.json';
import { Landing, type DemoAyah } from '@/components/landing/landing';
import { FAQS } from '@/components/landing/faqs';
import { APP_STORE_URL, PLAY_STORE_URL, SITE_DESCRIPTION, SITE_URL } from '@/lib/site';
import type { ReaderAyah } from '@/lib/quran-data';

export const metadata: Metadata = {
  title: { absolute: 'Quranki - Learn Quranic Arabic with Spaced Repetition' },
  description: SITE_DESCRIPTION,
  alternates: { canonical: '/' },
};

function demoAyahs(): DemoAyah[] {
  return (fatiha as ReaderAyah[]).slice(1, 4).map((ayah) => ({
    a: ayah.a,
    words: ayah.w.map((w) => ({ ar: w.ar, en: w.en, tl: w.tl ?? '' })),
    translation: ayah.tr.map((part) => part.t ?? '').join(''),
  }));
}

function coverageCurve(): { level: number; pct: number }[] {
  const { totalWords, levels } = coverage as { totalWords: number; levels: Record<string, number> };
  const points: { level: number; pct: number }[] = [{ level: 0, pct: 0 }];
  for (const [level, words] of Object.entries(levels)) {
    const n = Number(level);
    if (n <= 60 || n % 4 === 0 || n === 446) points.push({ level: n, pct: (words / totalWords) * 100 });
  }
  return points;
}

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'SoftwareApplication',
      name: 'Quranki',
      url: SITE_URL,
      image: `${SITE_URL}/images/icon-512.png`,
      description: SITE_DESCRIPTION,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web, iOS, Android',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      downloadUrl: [APP_STORE_URL, PLAY_STORE_URL],
      publisher: { '@id': `${SITE_URL}/#organization` },
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQS.map((faq) => ({
        '@type': 'Question',
        name: faq.q,
        acceptedAnswer: { '@type': 'Answer', text: faq.a },
      })),
    },
  ],
};

export default function HomePage() {
  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <Landing ayahs={demoAyahs()} curve={coverageCurve()} />
    </>
  );
}
