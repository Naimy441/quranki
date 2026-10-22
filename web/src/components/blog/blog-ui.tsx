import React from 'react';
import Link from 'next/link';
import { ArrowRight, Lightbulb } from 'lucide-react';
import { LogoMark } from '@/components/brand/logo';
import { cn } from '@/lib/cn';

/** Inline Uthmanic Arabic inside a paragraph. */
export function Ar({ children }: { children: React.ReactNode }) {
  return (
    <span className="ar" lang="ar">
      {children}
    </span>
  );
}

export function Callout({ title, children, className }: { title?: string; children: React.ReactNode; className?: string }) {
  return (
    <aside className={cn('not-prose my-8 flex gap-3.5 rounded-large border border-primary/25 bg-primary/[0.06] p-5', className)}>
      <Lightbulb className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
      <div className="text-[15px] leading-relaxed text-textSecondary">
        {title && <div className="mb-1 font-semibold text-text">{title}</div>}
        {children}
      </div>
    </aside>
  );
}

export function AppCta({ title, body, href = '/onboarding', label = 'Start learning free' }: { title: string; body: string; href?: string; label?: string }) {
  return (
    <aside className="not-prose relative my-12 overflow-hidden rounded-xlarge border border-primary/30 bg-primary/[0.07] p-6 sm:p-8">
      <div aria-hidden className="pointer-events-none absolute -right-20 -top-24 h-64 w-64 rounded-full bg-primary/25 blur-[80px]" />
      <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center">
        <LogoMark size={52} tile />
        <div className="flex-1">
          <div className="font-display text-2xl sm:text-[1.75rem] leading-tight text-text">{title}</div>
          <p className="mt-1.5 text-sm leading-relaxed text-textSecondary">{body}</p>
        </div>
        <Link href={href} className="btn-primary h-11 shrink-0 rounded-pill px-5 shadow-glow">
          {label}
          <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </aside>
  );
}

export function WordTable({ rows }: { rows: { ar: string; tl: string; gloss: string; count?: number; extra?: string }[] }) {
  const hasCount = rows.some((r) => r.count !== undefined);
  return (
    <div className="not-prose my-8 overflow-x-auto rounded-large border border-border bg-card">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-[11px] uppercase tracking-wider text-textMuted">
            <th className="px-4 py-3 font-semibold">#</th>
            <th className="px-4 py-3 font-semibold text-right">Arabic</th>
            <th className="px-4 py-3 font-semibold">Transliteration</th>
            <th className="px-4 py-3 font-semibold">Meaning</th>
            {hasCount && <th className="px-4 py-3 font-semibold text-right">Times</th>}
          </tr>
        </thead>
        <tbody className="divide-y divide-border">
          {rows.map((r, i) => (
            <tr key={r.ar} className="hover:bg-backgroundElement/60">
              <td className="px-4 py-2.5 tabular-nums text-textMuted">{i + 1}</td>
              <td className="px-4 py-2.5 text-right">
                <span className="uthmanic-text text-xl text-text" lang="ar">
                  {r.ar}
                </span>
              </td>
              <td className="px-4 py-2.5 italic text-textSecondary">{r.tl}</td>
              <td className="px-4 py-2.5 text-text">{r.gloss}</td>
              {hasCount && <td className="px-4 py-2.5 text-right tabular-nums font-semibold text-text">{r.count?.toLocaleString()}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
