import { OG_SIZE, renderOgCard } from '@/lib/blog/og-card';

export const size = OG_SIZE;
export const contentType = 'image/png';
export const alt = 'Quranki blog';

export default async function Image() {
  return renderOgCard({ eyebrow: 'Blog', title: 'Learn the Quran’s Arabic, with real numbers.' });
}
