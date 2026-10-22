import type { MetadataRoute } from 'next';
import { SITE_DESCRIPTION } from '@/lib/site';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Quranki',
    short_name: 'Quranki',
    description: SITE_DESCRIPTION,
    start_url: '/learn',
    scope: '/',
    display: 'standalone',
    background_color: '#090c0a',
    theme_color: '#1e8e5a',
    categories: ['education', 'books'],
    icons: [
      { src: '/images/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/images/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/images/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'Study now', url: '/session/review' },
      { name: 'Read the Quran', url: '/quran' },
      { name: 'Saved ayahs', url: '/saved' },
    ],
  };
}
