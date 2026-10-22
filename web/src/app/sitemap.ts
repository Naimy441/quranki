import type { MetadataRoute } from 'next';
import { SURAH_INDEX } from '@/lib/quran-data';
import { SITE_URL } from '@/lib/site';
import { POSTS } from '@/lib/blog/posts';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date('2026-10-21');
  return [
    { url: SITE_URL, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${SITE_URL}/quran`, lastModified, changeFrequency: 'monthly', priority: 0.9 },
    { url: `${SITE_URL}/learn`, lastModified, changeFrequency: 'monthly', priority: 0.7 },
    { url: `${SITE_URL}/blog`, lastModified, changeFrequency: 'weekly', priority: 0.8 },
    ...POSTS.map((post) => ({
      url: `${SITE_URL}/blog/${post.slug}`,
      lastModified: new Date(post.updated),
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
    ...SURAH_INDEX.map((surah) => ({
      url: `${SITE_URL}/quran/${surah.n}`,
      lastModified,
      changeFrequency: 'yearly' as const,
      priority: surah.n === 1 || surah.n >= 78 ? 0.8 : 0.7,
    })),
  ];
}
