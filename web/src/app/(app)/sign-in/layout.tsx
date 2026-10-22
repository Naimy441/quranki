import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Sign in',
  alternates: { canonical: '/sign-in' },
  robots: { index: false, follow: true },
};

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
