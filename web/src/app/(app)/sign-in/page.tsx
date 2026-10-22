'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Loader2 } from 'lucide-react';
import { AuthShell, Field, FormError } from '@/components/auth/auth-shell';
import { useAccountStore } from '@/store/account-store';
import { useProgressStore } from '@/store/progress-store';

export default function SignInPage() {
  const router = useRouter();
  const signIn = useAccountStore((s) => s.signIn);
  const busy = useAccountStore((s) => s.busy);
  const error = useAccountStore((s) => s.error);
  const clearError = useAccountStore((s) => s.clearError);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => clearError, [clearError]);

  return (
    <AuthShell
      title="Welcome back"
      subtitle="Your learned words come back after you sign in. Reviews, bookmarks, Hifz, and settings sync with the Quranki app."
      footer={
        <>
          New to Quranki?{' '}
          <Link href="/signup" className="font-semibold text-primary hover:underline">
            Create a free account
          </Link>
        </>
      }
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          await signIn(email, password);
          if (useAccountStore.getState().uid) router.replace(useProgressStore.getState().onboardingCompleted ? '/learn' : '/onboarding');
        }}
        className="space-y-4"
      >
        <FormError message={error ?? ''} />
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => { clearError(); setEmail(e.target.value); }} placeholder="you@example.com" />
        <Field
          label="Password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => { clearError(); setPassword(e.target.value); }}
          hint={
            <Link href={`/reset-password${email ? `?email=${encodeURIComponent(email)}` : ''}`} className="text-primary hover:underline">
              Forgot password?
            </Link>
          }
        />
        <button type="submit" disabled={busy} className="btn-primary h-11 w-full">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {busy ? 'Signing in' : 'Sign in'}
        </button>
      </form>
    </AuthShell>
  );
}
