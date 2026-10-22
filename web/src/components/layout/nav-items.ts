import { BarChart3, BookOpen, BookMarked, Bookmark, GraduationCap, Settings } from 'lucide-react';

export const NAV_ITEMS = [
  { href: '/learn', label: 'Learn', icon: GraduationCap, match: ['/learn', '/level'] },
  { href: '/quran', label: 'Quran', icon: BookOpen, match: ['/quran'] },
  { href: '/memorize', label: 'Memorize', icon: BookMarked, match: ['/memorize', '/hifz'] },
  { href: '/saved', label: 'Saved', icon: Bookmark, match: ['/saved'] },
  { href: '/progress', label: 'Progress', icon: BarChart3, match: ['/progress'] },
  { href: '/settings', label: 'Settings', icon: Settings, match: ['/settings'] },
] as const;

export function isNavActive(pathname: string, match: readonly string[]): boolean {
  return match.some((m) => pathname === m || pathname.startsWith(`${m}/`));
}
