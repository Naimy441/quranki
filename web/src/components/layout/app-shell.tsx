'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { AudioBar } from '@/components/layout/audio-bar';
import { useRecitation } from '@/context/recitation-context';

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { hasActiveRecitation } = useRecitation();

  const isPublicPage =
    pathname === '/' ||
    pathname === '/onboarding' ||
    pathname === '/sign-in' ||
    pathname === '/signup';

  if (isPublicPage) {
    return (
      <div className="min-h-screen flex flex-col bg-background text-text">
        <main className="flex-1">{children}</main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-text font-sans">
      {/* Left Sidebar for Desktop */}
      <Sidebar />

      {/* Main Application Area */}
      <div className={`flex-1 flex flex-col min-w-0 ${hasActiveRecitation ? 'pb-16' : ''}`}>
        <Header />
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>

      {/* Sticky Audio Recitation Player Bar */}
      <AudioBar />
    </div>
  );
}
