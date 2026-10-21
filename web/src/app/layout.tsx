import type { Metadata, Viewport } from 'next';
import './globals.css';
import { ProgressProvider } from '@/context/progress-context';
import { RecitationProvider } from '@/context/recitation-context';
import { AppShell } from '@/components/layout/app-shell';

export const metadata: Metadata = {
  metadataBase: new URL('https://quranki.com'),
  title: {
    default: 'Quranki - Master Quranic Arabic with Spaced Repetition (FSRS) & Reader',
    template: '%s - Quranki',
  },
  description:
    'Understand 80% of the Quran in 100 days. Quranki combines the modern FSRS memory algorithm with a word-by-word Tajweed Quran reader, 141 structured levels, and 10 world-class reciters. Free on Web, iOS, and Android.',
  keywords: [
    'Quran vocabulary',
    'Quran spaced repetition',
    'Anki Quran',
    'Quranki',
    'learn Quranic Arabic',
    'FSRS Quran',
    'Quran word by word',
    'Tajweed reader',
    'Quran flashcards',
    'learn Arabic vocabulary',
    'Quran memorization',
    'Hifz helper',
    'Quran Arabic roots',
    'Mushaf reader with audio',
    'Uthmanic Hafs',
    'Asma ul-Husna',
    'The Qaida',
  ],
  authors: [{ name: 'Quranki Team', url: 'https://quranki.com' }],
  creator: 'Quranki',
  publisher: 'Quranki',
  formatDetection: {
    email: false,
    address: false,
    telephone: false,
  },
  icons: {
    icon: [
      { url: '/images/favicon.png', sizes: '48x48', type: 'image/png' },
      { url: '/images/Quranki.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: [{ url: '/images/Quranki.png', sizes: '180x180', type: 'image/png' }],
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://quranki.com',
    siteName: 'Quranki',
    title: 'Quranki - Master Quranic Arabic with Spaced Repetition',
    description:
      'Understand 80% of the Quran in 100 days with modern FSRS spaced repetition, synchronized word-by-word recitations, and authentic Tajweed reader.',
    images: [
      {
        url: '/images/play-feature-graphic.png',
        width: 1024,
        height: 500,
        alt: 'Quranki - Quran Spaced Repetition & Reader',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quranki - Master Quranic Arabic with Spaced Repetition',
    description:
      'Understand 80% of the Quran with modern FSRS spaced repetition and a word-by-word Tajweed reader.',
    images: ['/images/play-feature-graphic.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: 'https://quranki.com',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#FFFFFF' },
    { media: '(prefers-color-scheme: dark)', color: '#0A0D0B' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="antialiased min-h-screen bg-background text-text font-sans">
        <ProgressProvider>
          <RecitationProvider>
            <AppShell>{children}</AppShell>
          </RecitationProvider>
        </ProgressProvider>
      </body>
    </html>
  );
}
