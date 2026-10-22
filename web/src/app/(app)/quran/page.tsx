import type { Metadata } from 'next';
import { SurahList } from '@/components/quran/surah-list';

export const metadata: Metadata = {
  title: 'Read the Quran Word by Word',
  description:
    'Read all 114 surahs of the Quran with word-by-word English meanings, Tajweed colors, transliteration, Sahih International translation, and synchronized recitation from 13 reciters.',
  alternates: { canonical: '/quran' },
};

export default function QuranDirectoryPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 lg:px-8 py-6 lg:py-10">
      <div className="mb-8">
        <h1 className="font-display text-4xl lg:text-5xl tracking-tight">The Quran</h1>
        <p className="mt-2 text-sm text-textSecondary max-w-xl">
          Word by word, with Tajweed colors and recitation. Words you have learned show without a translation.
        </p>
      </div>
      <SurahList />
    </div>
  );
}
