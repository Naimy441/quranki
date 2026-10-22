'use client';

import React from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Header } from '@/components/layout/header';
import { MobileNav } from '@/components/layout/mobile-nav';
import { AudioBar } from '@/components/layout/audio-bar';
import { CommandPaletteProvider } from '@/components/layout/command-palette';
import { useRecitationStore } from '@/store/recitation-store';
import { DigitConverter } from '@/components/providers/digit-converter';
import { cn } from '@/lib/cn';

const PUBLIC_PATHS = new Set(['/', '/onboarding', '/sign-in', '/signup', '/reset-password']);

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <CommandPaletteProvider>
      <ShellLayout>{children}</ShellLayout>
    </CommandPaletteProvider>
  );
}

function ShellLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const hasActiveRecitation = useRecitationStore((s) => s.visible);

  if (PUBLIC_PATHS.has(pathname)) {
    return <main className="min-h-screen">{children}</main>;
  }

  // Study sessions get the whole screen.
  if (pathname.startsWith('/session') || pathname.startsWith('/hifz-intro')) {
    return (
      <main className="min-h-[100dvh] bg-background">
        <DigitConverter>{children}</DigitConverter>
      </main>
    );
  }

  return (
    <div className="min-h-screen flex">
      <Sidebar />
      <div className="flex-1 min-w-0 flex flex-col">
        <Header />
        <main id="app-main" className={cn('flex-1 pb-20 lg:pb-0', hasActiveRecitation && 'pb-40 lg:pb-24')}>
          <DigitConverter>{children}</DigitConverter>
        </main>
      </div>
      <AudioBar />
      <MobileNav />
    </div>
  );
}
