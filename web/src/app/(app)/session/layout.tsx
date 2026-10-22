import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Study',
  alternates: { canonical: '/session' },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
