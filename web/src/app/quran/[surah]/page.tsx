import { notFound } from 'next/navigation';
import { SurahView } from '@/components/quran/surah-view';

export default async function SurahPage({
  params,
}: {
  params: Promise<{ surah: string }>;
}) {
  const { surah } = await params;
  const surahNumber = parseInt(surah, 10);

  if (isNaN(surahNumber) || surahNumber < 1 || surahNumber > 114) {
    notFound();
  }

  return <SurahView surahNumber={surahNumber} />;
}
