'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  AlertTriangle,
  ArrowUpRight,
  Check,
  ChevronRight,
  Cloud,
  Download,
  FlaskConical,
  Laptop,
  List,
  Loader2,
  LogIn,
  LogOut,
  Moon,
  RefreshCw,
  Sun,
  Trash2,
  Upload,
  UserPlus,
} from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { SettingRow, Slider, Switch } from '@/components/ui/controls';
import { useToast } from '@/components/ui/toast';
import { ReaderDisplaySettings } from '@/components/quran/reader-settings-modal';
import { ReciterSetting, TranslationSetting } from '@/components/quran/pickers';
import { ReminderTimePicker } from '@/components/quranki/reminder-time-picker';
import { useStoresHydrated } from '@/components/providers/app-state';
import { ACCENTS, type AccentId } from '@/lib/theme-tokens';
import { clampWordsPerSession, WORDS_PER_SESSION_MAX, WORDS_PER_SESSION_MIN } from '@/lib/storage';
import { deleteAccount } from '@/lib/account-auth';
import { deleteCloudSnapshot, mergeAccountCloud } from '@/lib/account-sync';
import { useSyncStatus } from '@/lib/sync-status';
import { exportBackup, importBackup } from '@/lib/backup';
import { reminderPermissionGranted, requestReminderPermission } from '@/lib/practice-reminder';
import { APP_STORE_URL, GITHUB_URL, PLAY_STORE_URL } from '@/lib/site';
import { useIsDark } from '@/hooks/use-is-dark';
import { useAccountStore } from '@/store/account-store';
import { useHifzStore } from '@/store/hifz-store';
import { useProgressStore } from '@/store/progress-store';
import { cn } from '@/lib/cn';

function sessionPaceLabel(count: number): string {
  if (count <= 5) return 'Relaxed';
  if (count <= 10) return 'Comfortable';
  if (count <= 20) return 'Focused';
  return 'Intense';
}

function Section({ id, title, accessory, children }: { id?: string; title: string; accessory?: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24">
      <div className="mb-2 flex items-center justify-between px-1">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-textSecondary">{title}</h2>
        {accessory && <span className="text-xs font-semibold text-textMuted">{accessory}</span>}
      </div>
      <div className="rounded-large bg-backgroundElement px-5 py-1">{children}</div>
    </section>
  );
}

function ActionRow({
  icon: Icon,
  label,
  href,
  onClick,
  destructive,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  href?: string;
  onClick?: () => void;
  destructive?: boolean;
}) {
  const inner = (
    <>
      <span className={cn('flex h-9 w-9 items-center justify-center rounded-full', destructive ? 'bg-danger/10 text-danger' : 'bg-card text-text')}>
        <Icon className="w-4 h-4" />
      </span>
      <span className={cn('flex-1 text-sm font-semibold', destructive && 'text-danger')}>{label}</span>
      {href && <ChevronRight className="w-4 h-4 text-textMuted" />}
    </>
  );
  const cls = 'my-2 flex w-full items-center gap-3 rounded-medium border border-border bg-card p-3 text-left transition-colors hover:border-primary/30';
  return href ? (
    <Link href={href} className={cls}>
      {inner}
    </Link>
  ) : (
    <button onClick={onClick} className={cls}>
      {inner}
    </button>
  );
}

function timeAgo(ms: number | null): string {
  if (!ms) return 'not yet';
  const s = Math.round((Date.now() - ms) / 1000);
  if (s < 10) return 'just now';
  if (s < 60) return `${s}s ago`;
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  return new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

export default function SettingsPage() {
  const router = useRouter();
  const hydrated = useStoresHydrated();
  const settings = useProgressStore((s) => s.settings);
  const updateSettings = useProgressStore((s) => s.updateSettings);
  const resetProgress = useProgressStore((s) => s.resetProgress);
  const masterAllWords = useProgressStore((s) => s.masterAllWords);
  const markMemWordsDoubleEasy = useProgressStore((s) => s.markMemWordsDoubleEasy);
  const seedDemoStudyTime = useProgressStore((s) => s.seedDemoStudyTime);
  const setOnboardingCompleted = useProgressStore((s) => s.setOnboardingCompleted);
  const resetIntroSeen = useHifzStore((s) => s.resetIntroSeen);
  const email = useAccountStore((s) => s.email);
  const signOut = useAccountStore((s) => s.signOut);
  const sync = useSyncStatus();
  const isDark = useIsDark();
  const { toast } = useToast();
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [confirm, setConfirm] = useState<'reset' | 'delete' | 'signout' | null>(null);
  const [busy, setBusy] = useState(false);
  const isDev = process.env.NODE_ENV === 'development';

  if (!hydrated) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 space-y-4">
        <div className="skeleton h-10 w-40" />
        <div className="skeleton h-40" />
        <div className="skeleton h-56" />
      </div>
    );
  }

  const wordsPerSession = clampWordsPerSession(settings.wordsPerSession);
  const accent = ACCENTS.find((a) => a.id === settings.accentColor) ?? ACCENTS[0];

  return (
    <div className="mx-auto max-w-2xl px-4 lg:px-8 py-6 lg:py-10 space-y-8">
      <h1 className="font-display text-4xl lg:text-5xl tracking-tight">Settings</h1>

      {email && (
        <Section id="account" title="Account">
          <div className="py-4">
            <div className="font-semibold">{email}</div>
            <div className="mt-1 flex items-center gap-1.5 text-xs text-textMuted">
              {sync.syncing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Cloud className={cn('w-3.5 h-3.5', sync.error ? 'text-danger' : 'text-primary')} />}
              {sync.syncing ? 'Syncing' : sync.error ? `Sync paused: ${sync.error}` : `Synced ${timeAgo(sync.lastSyncedAt)}`}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <button onClick={() => void mergeAccountCloud()} disabled={sync.syncing} className="btn-secondary h-9 px-3.5">
                <RefreshCw className="w-4 h-4" /> Sync now
              </button>
              <button onClick={() => setConfirm('signout')} className="btn-secondary h-9 px-3.5">
                <LogOut className="w-4 h-4" /> Sign out
              </button>
              <button onClick={() => setConfirm('delete')} className="btn-ghost h-9 px-3 text-danger hover:bg-danger/10 hover:text-danger">
                <Trash2 className="w-4 h-4" /> Delete account
              </button>
            </div>
          </div>
        </Section>
      )}

      <Section title="New words per day">
        <div className="py-5">
          <div className="text-center">
            <div className="text-4xl font-semibold">{wordsPerSession}</div>
            <div className="text-sm font-semibold text-primary">{sessionPaceLabel(wordsPerSession)}</div>
          </div>
          <div className="mt-4">
            <Slider
              label="New words per day"
              min={WORDS_PER_SESSION_MIN}
              max={WORDS_PER_SESSION_MAX}
              value={wordsPerSession}
              onChange={(v) => {
                const next = clampWordsPerSession(v);
                if (next !== settings.wordsPerSession) updateSettings({ wordsPerSession: next });
              }}
            />
          </div>
          <div className="mt-1 flex justify-between text-xs text-textMuted">
            <span>{WORDS_PER_SESSION_MIN}</span>
            <span>{WORDS_PER_SESSION_MAX}</span>
          </div>
        </div>
      </Section>

      <Section title="Arabic reading">
        <SettingRow title="I can read the Quran" description="Turn this off to study the Qaida first: letters, vowels, then reading.">
          <Switch checked={settings.canReadQuran} onChange={(canReadQuran) => updateSettings({ canReadQuran })} />
        </SettingRow>
      </Section>

      <Section title="Notifications">
        <SettingRow title="Daily reminder" description={settings.reminderEnabled ? undefined : 'A simple nudge to open a few words.'}>
          <Switch
            checked={settings.reminderEnabled}
            onChange={async (reminderEnabled) => {
              if (reminderEnabled) {
                const ok = await requestReminderPermission();
                if (!ok) toast('Notifications are blocked for this site. The phone app can still remind you.', { kind: 'info' });
              }
              updateSettings({ reminderEnabled });
            }}
          />
        </SettingRow>
        {settings.reminderEnabled && (
          <div className="pb-4">
            <ReminderTimePicker
              hour={settings.reminderHour}
              minute={settings.reminderMinute}
              onChange={(reminderHour, reminderMinute) => updateSettings({ reminderHour, reminderMinute })}
            />
            <p className="mt-3 text-xs text-textMuted">
              On the web the reminder appears while Quranki is open in a tab. The time syncs to your phone, where it arrives as a normal notification.
            </p>
            <ReminderPermissionNote />
          </div>
        )}
      </Section>

      <Section title="Appearance">
        <div className="py-4">
          <div className="grid grid-cols-3 gap-2">
            {[
              { value: 'system', label: 'System', icon: Laptop },
              { value: 'light', label: 'Light', icon: Sun },
              { value: 'dark', label: 'Dark', icon: Moon },
            ].map((o) => (
              <button
                key={o.value}
                onClick={() => updateSettings({ themePreference: o.value as typeof settings.themePreference })}
                className={cn(
                  'flex flex-col items-center gap-1.5 rounded-medium border py-3 text-sm font-semibold transition-colors',
                  settings.themePreference === o.value ? 'border-primary bg-backgroundSelected text-primary' : 'border-border bg-card',
                )}
              >
                <o.icon className="w-5 h-5" />
                {o.label}
              </button>
            ))}
          </div>
          <div className="mt-5 flex items-center justify-between px-1 text-sm font-semibold">
            <span className="text-textSecondary">Accent</span>
            <span className="text-primary">{accent.label}</span>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-2">
            {ACCENTS.map((a) => {
              const selected = a.id === accent.id;
              const tokens = a[isDark ? 'dark' : 'light'];
              return (
                <button
                  key={a.id}
                  onClick={() => updateSettings({ accentColor: a.id as AccentId })}
                  title={a.label}
                  aria-label={a.label}
                  aria-pressed={selected}
                  className="flex aspect-square items-center justify-center rounded-full border-2 transition-transform hover:scale-105"
                  style={{ background: tokens.primary, borderColor: selected ? 'var(--text)' : 'var(--border)' }}
                >
                  {selected && <Check className="w-4 h-4" style={{ color: tokens.onPrimary }} />}
                </button>
              );
            })}
          </div>
        </div>
      </Section>

      <Section title="Quran">
        <div className="divide-y divide-border">
          <ReciterSetting />
          <TranslationSetting />
        </div>
        <ReaderDisplaySettings />
      </Section>

      <Section title="Data">
        <div className="py-1">
          {!email && <ActionRow icon={LogIn} label="Sign in" href="/sign-in" />}
          {!email && <ActionRow icon={UserPlus} label="Create account" href="/signup" />}
          <ActionRow icon={List} label="Known words" href="/known-words" />
          <ActionRow
            icon={Download}
            label="Download a backup"
            onClick={async () => {
              const blob = new Blob([await exportBackup()], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `quranki-backup-${new Date().toISOString().slice(0, 10)}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}
          />
          <ActionRow icon={Upload} label="Restore a backup" onClick={() => fileRef.current?.click()} />
          <input
            ref={fileRef}
            type="file"
            accept="application/json,.json"
            className="hidden"
            onChange={async (e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              if (await importBackup(await file.text())) {
                toast('Backup restored. Reloading.');
                setTimeout(() => window.location.reload(), 600);
              } else toast('That file is not a Quranki backup', { kind: 'error' });
            }}
          />
          <ActionRow icon={RefreshCw} label="Reset progress" destructive onClick={() => setConfirm('reset')} />
          {isDev && (
            <>
              <ActionRow icon={FlaskConical} label="Master all words" onClick={masterAllWords} />
              <ActionRow icon={FlaskConical} label="Force overlays" onClick={markMemWordsDoubleEasy} />
              <ActionRow icon={FlaskConical} label="Fill study time" onClick={seedDemoStudyTime} />
              <ActionRow icon={FlaskConical} label="Replay onboarding" onClick={() => { setOnboardingCompleted(false); router.replace('/onboarding'); }} />
              <ActionRow icon={FlaskConical} label="Replay ruku intro" onClick={() => { resetIntroSeen(); router.push('/hifz-intro'); }} />
            </>
          )}
        </div>
      </Section>

      <Section title="About">
        {[
          [APP_STORE_URL, 'Quranki for iPhone'],
          [PLAY_STORE_URL, 'Quranki for Android'],
          [GITHUB_URL, 'Source code'],
        ].map(([href, label]) => (
          <a key={href} href={href} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between border-b border-border py-3.5 text-sm last:border-0 hover:text-primary">
            {label}
            <ArrowUpRight className="w-4 h-4 text-textMuted" />
          </a>
        ))}
      </Section>

      <Modal
        open={confirm !== null}
        onClose={() => !busy && setConfirm(null)}
        title={
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-5 h-5 text-danger" />
            {confirm === 'delete' ? 'Delete your account?' : confirm === 'signout' ? 'Sign out?' : 'Reset all progress?'}
          </span>
        }
      >
        <p className="text-sm text-textSecondary">
          {confirm === 'delete'
            ? 'This permanently deletes your account and its cloud backup. Progress on this device stays. This cannot be undone.'
            : confirm === 'signout'
              ? 'Your progress stays on this device. Sign back in any time to sync again.'
              : 'This clears review history, known-word marks, Quran bookmarks, and the memorization deck, and starts vocabulary over from the first word. This cannot be undone.'}
        </p>
        <div className="mt-6 flex justify-end gap-2">
          <button onClick={() => setConfirm(null)} disabled={busy} className="btn-ghost h-10 px-4">
            Cancel
          </button>
          <button
            disabled={busy}
            onClick={async () => {
              if (confirm === 'reset') {
                resetProgress();
                toast('Progress reset');
                setConfirm(null);
                return;
              }
              if (confirm === 'signout') {
                await signOut();
                setConfirm(null);
                return;
              }
              setBusy(true);
              try {
                await deleteCloudSnapshot();
                await deleteAccount();
                await signOut();
                toast('Account deleted');
                setConfirm(null);
              } catch (err) {
                toast(err instanceof Error ? err.message : 'Could not delete account', { kind: 'error' });
              } finally {
                setBusy(false);
              }
            }}
            className={cn('btn h-10 px-4', confirm === 'signout' ? 'bg-text text-background' : 'bg-danger text-white hover:brightness-110')}
          >
            {busy && <Loader2 className="w-4 h-4 animate-spin" />}
            {confirm === 'delete' ? 'Delete account' : confirm === 'signout' ? 'Sign out' : 'Reset'}
          </button>
        </div>
      </Modal>
    </div>
  );
}

function ReminderPermissionNote() {
  const [granted, setGranted] = useState<boolean | null>(null);
  React.useEffect(() => {
    void reminderPermissionGranted().then(setGranted);
  }, []);
  if (granted !== false) return null;
  return (
    <button
      onClick={async () => setGranted(await requestReminderPermission())}
      className="mt-2 text-xs font-semibold text-primary"
    >
      Allow notifications in this browser
    </button>
  );
}
