'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Loader2, MailCheck } from 'lucide-react';
import { sendPasswordResetEmail } from '@/lib/account-auth';
import { AuthShell, Field, FormError } from '@/components/auth/auth-shell';

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    const preset = new URLSearchParams(window.location.search).get('email');
    if (preset) setEmail(preset);
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendPasswordResetEmail(email);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send the email. Try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthShell
      title={sent ? 'Check your email' : 'Reset your password'}
      subtitle={
        sent
          ? `If an account exists for ${email}, a reset link is on its way. It can take a minute to arrive.`
          : 'Enter your account email and we will send you a link to choose a new password.'
      }
      footer={
        <Link href="/sign-in" className="font-semibold text-primary hover:underline">
          Back to sign in
        </Link>
      }
    >
      {sent ? (
        <div className="card p-6 flex items-center gap-4">
          <span className="h-12 w-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <MailCheck className="w-5 h-5" />
          </span>
          <p className="text-sm text-textSecondary">Open the link in the email, set a new password, then sign in here.</p>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-4">
          <FormError message={error} />
          <Field
            label="Email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
          <button type="submit" disabled={loading} className="btn-primary w-full h-11">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            Send reset link
          </button>
        </form>
      )}
    </AuthShell>
  );
}
