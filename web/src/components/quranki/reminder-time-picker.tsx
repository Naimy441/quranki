'use client';

import React from 'react';
import { Minus, Plus } from 'lucide-react';
import { clampReminderHour, clampReminderMinute, formatReminderTime } from '@/lib/practice-reminder';
import { cn } from '@/lib/cn';

const PRESETS = [
  { label: 'Morning', hour: 8, minute: 0 },
  { label: 'Midday', hour: 12, minute: 0 },
  { label: 'Evening', hour: 17, minute: 0 },
  { label: 'Night', hour: 20, minute: 0 },
] as const;
const MINUTE_STEPS = [0, 15, 30, 45];

function nextMinute(minute: number, delta: number): number {
  const index = MINUTE_STEPS.findIndex((step) => step >= clampReminderMinute(minute));
  const current = index === -1 ? 0 : index;
  return MINUTE_STEPS[(current + delta + MINUTE_STEPS.length) % MINUTE_STEPS.length];
}

function Stepper({ label, onMinus, onPlus }: { label: string; onMinus: () => void; onPlus: () => void }) {
  return (
    <div className="flex items-center gap-2 rounded-medium border border-border bg-card p-1">
      <button onClick={onMinus} className="icon-btn h-8 w-8" aria-label={`Earlier ${label}`}>
        <Minus className="w-4 h-4" />
      </button>
      <span className="w-10 text-center text-xs font-semibold text-textSecondary">{label}</span>
      <button onClick={onPlus} className="icon-btn h-8 w-8" aria-label={`Later ${label}`}>
        <Plus className="w-4 h-4" />
      </button>
    </div>
  );
}

/** Same controls as the mobile reminder picker: steppers plus four presets. */
export function ReminderTimePicker({
  hour,
  minute,
  selected: hasSelection = true,
  onChange,
}: {
  hour: number;
  minute: number;
  selected?: boolean;
  onChange: (hour: number, minute: number) => void;
}) {
  const h = clampReminderHour(hour);
  const m = clampReminderMinute(minute);
  const set = (nh: number, nm: number) => onChange(clampReminderHour(nh), clampReminderMinute(nm));
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="text-4xl font-semibold tabular-nums">{formatReminderTime(h, m)}</div>
      <div className="flex gap-3">
        <Stepper label="Hour" onMinus={() => set((h + 23) % 24, m)} onPlus={() => set((h + 1) % 24, m)} />
        <Stepper label="Min" onMinus={() => set(h, nextMinute(m, -1))} onPlus={() => set(h, nextMinute(m, 1))} />
      </div>
      <div className="grid w-full grid-cols-2 gap-2 sm:grid-cols-4">
        {PRESETS.map((p) => {
          const selected = hasSelection && p.hour === h && p.minute === m;
          return (
            <button
              key={p.label}
              onClick={() => set(p.hour, p.minute)}
              className={cn('rounded-medium border px-3 py-2 text-center', selected ? 'border-primary bg-backgroundSelected text-primary' : 'border-border bg-card')}
            >
              <div className="text-sm font-semibold">{p.label}</div>
              <div className={cn('text-xs', selected ? 'text-primary' : 'text-textMuted')}>{formatReminderTime(p.hour, p.minute)}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
