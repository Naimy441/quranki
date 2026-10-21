'use client';

import React, { useState, useRef } from 'react';
import Link from 'next/link';
import {
  Download,
  Upload,
  RefreshCw,
  Sliders,
  Sun,
  Moon,
  Laptop,
  Check,
  AlertTriangle,
  User,
  LogOut,
  HelpCircle,
} from 'lucide-react';
import { useProgress } from '@/context/progress-context';
import { RECITERS } from '@/lib/reciters';

export default function SettingsPage() {
  const {
    settings,
    updateSettings,
    resetProgress,
    autoMasterAllWords,
    exportDataJson,
    importDataJson,
    account,
    signOut,
  } = useProgress();

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [successNotice, setSuccessNotice] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setSuccessNotice(msg);
    setTimeout(() => setSuccessNotice(null), 3000);
  };

  const handleExport = () => {
    const json = exportDataJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `quranki-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotification('Backup file downloaded successfully');
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const ok = importDataJson(text);
      if (ok) {
        showNotification('Data imported successfully');
      } else {
        alert('Invalid backup file. Please upload a valid Quranki JSON backup.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="max-w-2xl mx-auto px-6 py-6 flex flex-col gap-5 select-none animate-fadeIn">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-text">Settings</h1>
        <p className="text-xs text-textSecondary mt-0.5">
          Study pacing, reciter selection, and data backup
        </p>
      </div>

      {/* Success Banner */}
      {successNotice && (
        <div className="p-3.5 rounded-medium bg-backgroundSelected border border-primary/20 text-primary text-xs font-bold flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span>{successNotice}</span>
        </div>
      )}

      {/* Account Section */}
      <div className="p-5 rounded-large bg-card border border-border shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-text flex items-center gap-2">
          <User className="w-4 h-4 text-primary" /> User Account
        </h3>

        {account ? (
          <div className="flex items-center justify-between p-3 rounded-medium bg-backgroundElement border border-border">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-backgroundSelected text-primary font-bold flex items-center justify-center text-xs">
                {account.email[0].toUpperCase()}
              </div>
              <div>
                <div className="text-xs font-bold text-text">{account.displayName || account.email}</div>
                <div className="text-[11px] text-textSecondary">{account.email}</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                signOut();
                showNotification('Signed out successfully');
              }}
              className="py-1.5 px-3 rounded-small border border-border bg-card hover:bg-danger/10 text-danger text-xs font-bold transition-colors flex items-center gap-1.5"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign Out</span>
            </button>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 rounded-medium bg-backgroundElement border border-border">
            <div>
              <div className="text-xs font-bold text-text">Not Signed In</div>
              <div className="text-[11px] text-textSecondary">
                Create an account to backup and sync your cards across devices.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Link
                href="/sign-in"
                className="py-1.5 px-3 rounded-small bg-backgroundSelected text-primary text-xs font-bold hover:opacity-90"
              >
                Sign In
              </Link>
              <Link
                href="/signup"
                className="py-1.5 px-3 rounded-small bg-primary text-onPrimary text-xs font-bold hover:opacity-90"
              >
                Sign Up
              </Link>
            </div>
          </div>
        )}

        <div className="pt-1">
          <Link
            href="/onboarding"
            className="inline-flex items-center gap-1.5 text-xs text-textSecondary hover:text-text font-medium"
          >
            <HelpCircle className="w-3.5 h-3.5" />
            <span>Restart Onboarding Walkthrough</span>
          </Link>
        </div>
      </div>

      {/* Appearance & Theme */}
      <div className="p-5 rounded-large bg-card border border-border shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-text">Theme</h3>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: 'dark', label: 'Dark', icon: Moon },
              { id: 'light', label: 'Light', icon: Sun },
              { id: 'system', label: 'System', icon: Laptop },
            ] as const
          ).map((t) => {
            const Icon = t.icon;
            const isSelected = settings.theme === t.id;

            return (
              <button
                key={t.id}
                type="button"
                onClick={() => updateSettings({ theme: t.id })}
                className={`py-3 px-2 rounded-medium border text-center flex flex-col items-center gap-1.5 transition-all ${
                  isSelected
                    ? 'border-primary bg-backgroundSelected text-primary font-bold shadow-xs'
                    : 'border-border bg-card text-textSecondary hover:bg-backgroundElement'
                }`}
              >
                <Icon className={`w-4 h-4 ${isSelected ? 'text-primary' : ''}`} />
                <span className="text-xs">{t.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Study Session Configuration */}
      <div className="p-5 rounded-large bg-card border border-border shadow-xs space-y-4">
        <h3 className="font-bold text-sm text-text flex items-center gap-2">
          <Sliders className="w-4 h-4 text-primary" /> Study Configuration
        </h3>

        <div className="space-y-3 divide-y divide-border">
          <div className="flex items-center justify-between gap-2 pt-1">
            <div>
              <div className="text-xs font-bold text-text">Words Per Session</div>
              <div className="text-[11px] text-textSecondary">
                Number of cards introduced per vocabulary sitting
              </div>
            </div>
            <select
              value={settings.wordsPerSession}
              onChange={(e) => updateSettings({ wordsPerSession: parseInt(e.target.value, 10) })}
              className="bg-backgroundElement border border-border rounded-small px-2.5 py-1 text-xs text-text font-bold"
            >
              {[5, 10, 15, 20, 25].map((num) => (
                <option key={num} value={num}>
                  {num} words
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-2 pt-3">
            <div>
              <div className="text-xs font-bold text-text">Daily Review Limit</div>
              <div className="text-[11px] text-textSecondary">
                Maximum spaced repetition reviews scheduled per day
              </div>
            </div>
            <select
              value={settings.dailyReviewLimit}
              onChange={(e) => updateSettings({ dailyReviewLimit: parseInt(e.target.value, 10) })}
              className="bg-backgroundElement border border-border rounded-small px-2.5 py-1 text-xs text-text font-bold"
            >
              {[50, 100, 150, 200, 300].map((num) => (
                <option key={num} value={num}>
                  {num} reviews
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center justify-between gap-2 pt-3">
            <div>
              <div className="text-xs font-bold text-text">Quran Reciter</div>
              <div className="text-[11px] text-textSecondary">
                Default voice used for audio playback
              </div>
            </div>
            <select
              value={settings.selectedReciterKey}
              onChange={(e) => updateSettings({ selectedReciterKey: e.target.value })}
              className="bg-backgroundElement border border-border rounded-small px-2.5 py-1 text-xs text-text font-bold max-w-[180px]"
            >
              {RECITERS.map((r) => (
                <option key={r.key} value={r.key}>
                  {r.name} - {r.style}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Backup and Data Management */}
      <div className="p-5 rounded-large bg-card border border-border shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-text">Data & Backup</h3>
        <p className="text-xs text-textSecondary">
          Export your FSRS flashcard intervals and reviews, or restore progress from another device.
        </p>

        <div className="flex flex-wrap gap-2 pt-1">
          <button
            type="button"
            onClick={handleExport}
            className="flex-1 min-w-[140px] py-2 px-3 bg-backgroundElement hover:bg-backgroundSelected border border-border rounded-medium text-xs font-bold text-text flex items-center justify-center gap-1.5 transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-primary" />
            <span>Export Backup</span>
          </button>

          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex-1 min-w-[140px] py-2 px-3 bg-backgroundElement hover:bg-backgroundSelected border border-border rounded-medium text-xs font-bold text-text flex items-center justify-center gap-1.5 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-primary" />
            <span>Import Backup</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
      </div>

      {/* Advanced Actions */}
      <div className="p-5 rounded-large bg-card border border-border shadow-xs space-y-3">
        <h3 className="font-bold text-sm text-text">Testing Tools</h3>

        <div className="space-y-2">
          <button
            type="button"
            onClick={() => {
              autoMasterAllWords();
              showNotification('Marked first 20 words as mastered');
            }}
            className="w-full py-2 px-3 rounded-medium bg-backgroundElement hover:bg-backgroundSelected border border-border text-xs font-bold text-text flex items-center justify-center gap-2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5 text-primary" />
            <span>Simulate Mastery (Demo)</span>
          </button>

          {!showResetConfirm ? (
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="w-full py-2 px-3 rounded-medium bg-card hover:bg-danger/10 border border-danger/30 text-xs font-bold text-danger flex items-center justify-center gap-2 transition-colors"
            >
              <span>Reset All Progress</span>
            </button>
          ) : (
            <div className="p-3 rounded-medium bg-danger/10 border border-danger/30 space-y-2">
              <div className="text-xs text-danger font-bold flex items-center gap-1.5">
                <AlertTriangle className="w-3.5 h-3.5" />
                Are you sure? This deletes all card history.
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    resetProgress();
                    setShowResetConfirm(false);
                    showNotification('Progress reset successfully');
                  }}
                  className="flex-1 py-1.5 bg-danger text-white text-xs font-bold rounded-small"
                >
                  Yes, Reset
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="flex-1 py-1.5 bg-backgroundElement text-text text-xs font-bold rounded-small"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
