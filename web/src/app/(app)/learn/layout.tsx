import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Learn',
  alternates: { canonical: '/learn' },
  robots: { index: true, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
