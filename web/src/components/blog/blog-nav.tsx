'use client';

import { Nav } from '@/components/landing/landing';
import { useReturningVisitor } from '@/hooks/use-returning-visitor';

export function BlogNav() {
  const visitor = useReturningVisitor();
  return <Nav startHref={visitor.hasCompletedOnboarding ? '/learn' : '/onboarding'} />;
}
