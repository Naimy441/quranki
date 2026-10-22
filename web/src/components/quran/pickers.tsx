'use client';

import React, { useState } from 'react';
import { Check, ChevronRight } from 'lucide-react';
import { Modal } from '@/components/ui/modal';
import { RECITER_GROUPS, reciterLabel, styleLabel } from '@/lib/reciters';
import { TRANSLATION_OPTIONS, translationLabel } from '@/lib/translations';
import { ensureTranslationDatasetLoaded } from '@/store/translation-store';
import { useProgressStore } from '@/store/progress-store';
import { cn } from '@/lib/cn';

function PickerRow({ title, value, onClick }: { title: string; value: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex w-full items-center gap-3 py-3.5 text-left">
      <span className="flex-1 min-w-0">
        <span className="block text-sm font-medium">{title}</span>
        <span className="block truncate text-xs text-textMuted">{value}</span>
      </span>
      <ChevronRight className="w-4 h-4 text-textMuted" />
    </button>
  );
}

/** Settings row plus picker for the reciter, grouped by reciter like the mobile sheet. */
export function ReciterSetting() {
  const selected = useProgressStore((s) => s.settings.selectedReciterKey);
  const updateSettings = useProgressStore((s) => s.updateSettings);
  const [open, setOpen] = useState(false);
  return (
    <>
      <PickerRow title="Reciter" value={reciterLabel(selected)} onClick={() => setOpen(true)} />
      <ReciterPicker
        open={open}
        selected={selected}
        onClose={() => setOpen(false)}
        onSelect={(key) => {
          updateSettings({ selectedReciterKey: key });
          setOpen(false);
        }}
      />
    </>
  );
}

export function ReciterPicker({
  open,
  selected,
  onClose,
  onSelect,
}: {
  open: boolean;
  selected: string;
  onClose: () => void;
  onSelect: (key: string) => void;
}) {
  return (
    <Modal open={open} onClose={onClose} title="Reciter" variant="sheet">
      <div className="divide-y divide-border">
        {RECITER_GROUPS.map((group) => (
          <div key={group.id} className="py-3">
            <div className="text-sm font-semibold">{group.name}</div>
            <div className="mt-2 flex flex-wrap gap-2">
              {group.options.map((option) => (
                <button
                  key={option.key}
                  onClick={() => onSelect(option.key)}
                  className={cn(
                    'chip h-8 px-3',
                    selected === option.key && 'border-primary/50 bg-primary/10 text-primary',
                  )}
                >
                  {selected === option.key && <Check className="w-3.5 h-3.5" />}
                  {styleLabel(option.style)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

/** Settings row plus picker for the English translation. */
export function TranslationSetting() {
  const selected = useProgressStore((s) => s.settings.selectedTranslationKey);
  const updateSettings = useProgressStore((s) => s.updateSettings);
  const [open, setOpen] = useState(false);
  return (
    <>
      <PickerRow title="Translation" value={translationLabel(selected)} onClick={() => setOpen(true)} />
      <Modal open={open} onClose={() => setOpen(false)} title="Translation" variant="sheet">
        <div className="space-y-1">
          {TRANSLATION_OPTIONS.map((option) => (
            <button
              key={option.key}
              onClick={() => {
                updateSettings({ selectedTranslationKey: option.key });
                ensureTranslationDatasetLoaded(option.key);
                setOpen(false);
              }}
              className={cn(
                'flex w-full items-center gap-3 rounded-medium px-3 py-3 text-left transition-colors',
                selected === option.key ? 'bg-primary/10' : 'hover:bg-backgroundElement',
              )}
            >
              <span className="flex-1">
                <span className={cn('block text-sm font-semibold', selected === option.key && 'text-primary')}>
                  {option.name}
                </span>
                <span className="block text-xs text-textMuted">
                  {option.bundled ? 'Default' : 'Streams as you read'}
                  {option.hasFootnotes ? ' - Has footnotes' : ''}
                </span>
              </span>
              {selected === option.key && <Check className="w-4 h-4 text-primary" />}
            </button>
          ))}
        </div>
      </Modal>
    </>
  );
}
