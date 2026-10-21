'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Image from 'next/image';
import { ArrowLeft, ArrowRight, Lock, Mail, AlertCircle } from 'lucide-react';
import { useProgress } from '@/context/progress-context';

export default function SignInPage() {
  const router = useRouter();
  const { signIn } = useProgress();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email.trim() || !password.trim()) {
      setError('Please fill in both your email and password.');
      return;
    }

    if (!email.includes('@')) {
      setError('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await signIn(email.trim(), password.trim());
      router.replace('/learn');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to sign in. Please try again.';
      setError(msg);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-text flex flex-col justify-center items-center p-6 select-none animate-fadeIn">
      <div className="max-w-md w-full space-y-6">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-textSecondary hover:text-text transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Home</span>
        </Link>

        {/* Card */}
        <div className="p-8 rounded-large bg-card border border-border shadow-sm space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full overflow-hidden bg-backgroundSelected border border-border flex items-center justify-center mx-auto shadow-xs">
              <Image
                src="/images/Quranki.png"
                alt="Quranki Logo"
                width={56}
                height={56}
                className="w-full h-full object-cover rounded-full"
              />
            </div>
            <h1 className="text-2xl font-bold text-text">Sign In to Quranki</h1>
            <p className="text-xs text-textSecondary">
              Your learned words and spaced repetition schedule will sync
            </p>
          </div>

          {error && (
            <div className="p-3 rounded-medium bg-danger/10 border border-danger/30 text-danger text-xs font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="text-xs font-bold text-textSecondary block mb-1">
                Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted" />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-medium bg-background border border-border text-sm text-text placeholder-textMuted focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-textSecondary block mb-1">
                Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-textMuted" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Your password"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 rounded-medium bg-background border border-border text-sm text-text placeholder-textMuted focus:outline-none focus:border-primary"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full h-11 bg-primary hover:opacity-90 text-onPrimary font-bold text-xs rounded-medium shadow-xs transition-opacity flex items-center justify-center gap-2"
            >
              <span>{loading ? 'Signing in...' : 'Sign In'}</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </form>

          <div className="pt-2 border-t border-border flex flex-col gap-2 text-center text-xs">
            <div className="text-textSecondary">
              Don&apos;t have an account yet?{' '}
              <Link href="/signup" className="text-primary font-bold hover:underline">
                Create Account
              </Link>
            </div>
            <Link href="/learn" className="text-textMuted hover:text-text transition-colors">
              Continue as guest without signing in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
