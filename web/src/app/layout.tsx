import type { Metadata, Viewport } from 'next';
import { Inter, Instrument_Serif } from 'next/font/google';
import './globals.css';
import { themeBootScript } from '@/lib/theme-apply';
import { SITE_DESCRIPTION, SITE_NAME, SITE_URL, APP_STORE_URL, PLAY_STORE_URL, GITHUB_URL } from '@/lib/site';

const sans = Inter({ subsets: ['latin'], variable: '--font-sans', display: 'swap' });
const display = Instrument_Serif({
  subsets: ['latin'],
  weight: '400',
  style: ['normal', 'italic'],
  variable: '--font-display',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  applicationName: SITE_NAME,
  title: {
    default: 'Quranki - Learn Quranic Arabic with Spaced Repetition',
    template: '%s - Quranki',
  },
  description: SITE_DESCRIPTION,
  keywords: [
    'Quranki',
    'learn Quranic Arabic',
    'Quran vocabulary',
    'Quran word by word',
    'Quran flashcards',
    'Anki Quran',
    'FSRS spaced repetition',
    'Tajweed Quran reader',
    'Quran with translation',
    'Quran recitation',
    'Quran memorization',
    'hifz',
    'Asma ul-Husna',
    'Noorani Qaida',
  ],
  authors: [{ name: 'Quranki', url: SITE_URL }],
  creator: 'Quranki',
  publisher: 'Quranki',
  category: 'education',
  formatDetection: { email: false, address: false, telephone: false },
  manifest: '/manifest.webmanifest',
  appleWebApp: { capable: true, title: SITE_NAME, statusBarStyle: 'default' },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: SITE_URL,
    siteName: SITE_NAME,
    title: 'Quranki - Learn Quranic Arabic with Spaced Repetition',
    description: SITE_DESCRIPTION,
    images: [{ url: '/images/play-feature-graphic.png', width: 1024, height: 500, alt: 'Quranki' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quranki - Learn Quranic Arabic with Spaced Repetition',
    description: SITE_DESCRIPTION,
    images: ['/images/play-feature-graphic.png'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, 'max-image-preview': 'large', 'max-snippet': -1 },
  },
  other: {
    'apple-itunes-app': 'app-id=6805386348',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: light)', color: '#fbfcfb' },
    { media: '(prefers-color-scheme: dark)', color: '#090c0a' },
  ],
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': `${SITE_URL}/#organization`,
      name: SITE_NAME,
      url: SITE_URL,
      logo: {
        '@type': 'ImageObject',
        url: `${SITE_URL}/images/icon-512.png`,
        width: 512,
        height: 512,
      },
      sameAs: [APP_STORE_URL, PLAY_STORE_URL, GITHUB_URL],
    },
    {
      '@type': 'WebSite',
      '@id': `${SITE_URL}/#website`,
      name: SITE_NAME,
      alternateName: ['Quranki.org', 'Quran Anki'],
      url: SITE_URL,
      publisher: { '@id': `${SITE_URL}/#organization` },
      inLanguage: 'en',
    },
  ],
};

const themeScript = themeBootScript();

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      </head>
      <body className="antialiased min-h-screen bg-background text-text font-sans">
        {children}
      </body>
    </html>
  );
}
