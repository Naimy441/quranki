'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Check, Loader2 } from 'lucide-react';
import { AuthShell, Field, FormError } from '@/components/auth/auth-shell';
import { useAccountStore } from '@/store/account-store';
import { useProgressStore } from '@/store/progress-store';

export default function SignUpPage() {
  const router = useRouter();
  const createAccount = useAccountStore((s) => s.createAccount);
  const busy = useAccountStore((s) => s.busy);
  const error = useAccountStore((s) => s.error);
  const clearError = useAccountStore((s) => s.clearError);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [localError, setLocalError] = useState('');

  useEffect(() => clearError, [clearError]);

  return (
    <AuthShell
      title="Create your account"
      subtitle="Keep the words you have learned if you get a new phone or switch to the web. Free, and your progress on this device comes with you."
      footer={
        <>
          Already have an account?{' '}
          <Link href="/sign-in" className="font-semibold text-primary hover:underline">
            Sign in
          </Link>
        </>
      }
    >
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (password !== confirm) {
            setLocalError('Passwords do not match.');
            return;
          }
          await createAccount(email, password);
          if (useAccountStore.getState().uid) router.replace(useProgressStore.getState().onboardingCompleted ? '/learn' : '/onboarding');
        }}
        className="space-y-4"
      >
        <FormError message={localError || error || ''} />
        <Field label="Email" type="email" autoComplete="email" required value={email} onChange={(e) => { clearError(); setLocalError(''); setEmail(e.target.value); }} placeholder="you@example.com" />
        <Field
          label="Password"
          type="password"
          autoComplete="new-password"
          required
          minLength={6}
          value={password}
          onChange={(e) => { clearError(); setLocalError(''); setPassword(e.target.value); }}
          hint={<span className={password.length >= 6 ? 'text-primary' : 'text-textMuted'}>6+ characters</span>}
        />
        <Field label="Confirm password" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => { setLocalError(''); setConfirm(e.target.value); }} />
        <button type="submit" disabled={busy} className="btn-primary h-11 w-full">
          {busy && <Loader2 className="w-4 h-4 animate-spin" />}
          {busy ? 'Creating account' : 'Create account'}
        </button>
        <ul className="space-y-1.5 pt-2 text-xs text-textMuted">
          {['Sync with Quranki on iPhone and Android', 'Back up reviews, bookmarks, Hifz, and streaks', 'Delete your account any time from Settings'].map((t) => (
            <li key={t} className="flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-primary" /> {t}
            </li>
          ))}
        </ul>
      </form>
    </AuthShell>
  );
}
