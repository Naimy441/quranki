import fs from 'node:fs/promises';
import path from 'node:path';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { SurahView, type SeoAyah } from '@/components/quran/surah-view';
import { SURAH_INDEX, getSurahMeta, type ReaderAyah } from '@/lib/quran-data';
import { SITE_URL } from '@/lib/site';

type Params = Promise<{ surah: string }>;

export const dynamicParams = false;

export function generateStaticParams() {
  return SURAH_INDEX.map((s) => ({ surah: String(s.n) }));
}

async function loadSurah(n: number): Promise<ReaderAyah[]> {
  const file = path.join(process.cwd(), 'public/data/surahs', `${String(n).padStart(3, '0')}.json`);
  return JSON.parse(await fs.readFile(file, 'utf8')) as ReaderAyah[];
}

function plainTranslation(ayah: ReaderAyah): string {
  return ayah.tr
    .map((p) => p.t ?? '')
    .join('')
    .replace(/\s+/g, ' ')
    .trim();
}

function parse(surah: string): number {
  const n = Number(surah);
  if (!Number.isInteger(n) || n < 1 || n > 114) notFound();
  return n;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const n = parse((await params).surah);
  const meta = getSurahMeta(n)!;
  const ayahs = await loadSurah(n);
  const first = plainTranslation(ayahs[0]);
  const title = `Surah ${meta.en} (${meta.nt}) - Word by Word Translation`;
  const description = `Read Surah ${meta.en} (${meta.ar}), ${meta.nt}, ${meta.ac} ayahs, ${
    meta.rp === 'meccan' ? 'Meccan' : 'Medinan'
  }. Word-by-word English, Tajweed colors, and recitation. ${first.slice(0, 120)}${first.length > 120 ? '...' : ''}`;
  return {
    title,
    description,
    alternates: { canonical: `/quran/${n}` },
    openGraph: { title, description, url: `${SITE_URL}/quran/${n}`, type: 'article' },
  };
}

export default async function SurahPage({ params }: { params: Params }) {
  const n = parse((await params).surah);
  const meta = getSurahMeta(n)!;
  const ayahs = await loadSurah(n);
  const seo: SeoAyah[] = ayahs.map((a) => ({
    a: a.a,
    ar: a.w.map((w) => w.ar.map((s) => s.t).join('')).join(' '),
    tr: plainTranslation(a),
  }));

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Quran', item: `${SITE_URL}/quran` },
      { '@type': 'ListItem', position: 2, name: `Surah ${meta.en}`, item: `${SITE_URL}/quran/${n}` },
    ],
  };

  return (
    <>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <SurahView surahNumber={n} seo={seo} />
    </>
  );
}
