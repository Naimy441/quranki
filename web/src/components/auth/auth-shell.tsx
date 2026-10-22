'use client';

import React from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowLeft } from 'lucide-react';
import { Wordmark } from '@/components/brand/logo';

export function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-[100dvh] grid lg:grid-cols-2">
      <div className="flex flex-col px-5 sm:px-10 py-6">
        <div className="flex items-center justify-between">
          <Link href="/" aria-label="Quranki home">
            <Wordmark size={30} />
          </Link>
          <Link href="/learn" className="btn-ghost h-9 px-3 text-xs">
            <ArrowLeft className="w-3.5 h-3.5" /> Continue without an account
          </Link>
        </div>
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 140, damping: 20 }}
          className="my-auto w-full max-w-sm mx-auto py-12"
        >
          <h1 className="font-display text-4xl tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-sm text-textSecondary">{subtitle}</p>}
          <div className="mt-8">{children}</div>
          {footer && <div className="mt-8 text-sm text-textSecondary">{footer}</div>}
        </motion.div>
      </div>
      <div className="hidden lg:flex relative overflow-hidden border-l border-border bg-card items-center justify-center p-12">
        <div aria-hidden className="absolute inset-0 bg-grid opacity-40 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />
        <div aria-hidden className="absolute left-1/2 top-1/2 h-[28rem] w-[28rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[100px]" />
        <div className="relative max-w-md text-center">
          <p dir="rtl" className="uthmanic-text text-5xl leading-[1.9] text-text">
            وَلَقَدۡ يَسَّرۡنَا ٱلۡقُرۡءَانَ لِلذِّكۡرِ فَهَلۡ مِن مُّدَّكِرٍ
          </p>
          <p className="mt-6 font-display text-2xl italic text-textSecondary">
            &ldquo;And We have certainly made the Qur&rsquo;an easy for remembrance, so is there any who will remember?&rdquo;
          </p>
          <p className="mt-3 text-xs text-textMuted">Al-Qamar 54:17 - Sahih International</p>
        </div>
      </div>
    </div>
  );
}

export function Field({
  label,
  hint,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: React.ReactNode }) {
  return (
    <label className="block">
      <span className="flex items-center justify-between text-xs font-medium text-textSecondary mb-1.5">
        {label}
        {hint}
      </span>
      <input {...props} className="input" />
    </label>
  );
}

export function FormError({ message }: { message: string }) {
  if (!message) return null;
  return (
    <div role="alert" className="rounded-medium border border-danger/30 bg-danger/10 px-3.5 py-2.5 text-sm text-danger">
      {message}
    </div>
  );
}
