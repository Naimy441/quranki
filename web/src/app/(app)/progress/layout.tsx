import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Progress',
  alternates: { canonical: '/progress' },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
