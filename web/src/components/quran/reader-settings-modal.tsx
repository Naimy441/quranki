'use client';

import React from 'react';
import { useProgressStore } from '@/store/progress-store';
import { Modal } from '@/components/ui/modal';
import { Segmented, SettingRow, Slider, Switch } from '@/components/ui/controls';
import { ReciterSetting, TranslationSetting } from '@/components/quran/pickers';
import { TajweedColors } from '@/lib/quran-colors';
import { useIsDark } from '@/hooks/use-is-dark';

export const ARABIC_SIZE_RANGE = { min: 18, max: 38, step: 4 };
export const GLOSS_SIZE_RANGE = { min: 11, max: 19, step: 2 };
export const TRANSLITERATION_SIZE_RANGE = { min: 10, max: 18, step: 2 };

const TAJWEED_LEGEND: [string, string][] = [
  ['ghunnah', 'Ghunnah'],
  ['ikhafa', 'Ikhfa'],
  ['idgham_ghunnah', 'Idgham'],
  ['iqlab', 'Iqlab'],
  ['qalaqah', 'Qalqalah'],
  ['madda_normal', 'Madd'],
  ['madda_necessary', 'Madd lazim'],
  ['ham_wasl', 'Silent'],
];

function SizeSlider({
  label,
  value,
  range,
  onChange,
}: {
  label: string;
  value: number;
  range: { min: number; max: number; step: number };
  onChange: (v: number) => void;
}) {
  return (
    <div className="py-4 space-y-2.5">
      <div className="flex justify-between text-sm">
        <span className="font-medium">{label}</span>
        <span className="font-semibold text-primary tabular-nums">{value}</span>
      </div>
      <Slider label={label} min={range.min} max={range.max} step={range.step} value={value} onChange={onChange} />
    </div>
  );
}

/** Every reader display setting from the mobile app, plus the web-only layout and Tajweed toggles. */
export function ReaderDisplaySettings() {
  const settings = useProgressStore((s) => s.settings);
  const updateSettings = useProgressStore((s) => s.updateSettings);
  const isDark = useIsDark();
  return (
    <div className="divide-y divide-border">
      <SizeSlider
        label="Arabic text"
        value={settings.readerArabicSize}
        range={ARABIC_SIZE_RANGE}
        onChange={(readerArabicSize) => updateSettings({ readerArabicSize })}
      />
      <SizeSlider
        label="Word-by-word translation"
        value={settings.readerGlossSize}
        range={GLOSS_SIZE_RANGE}
        onChange={(readerGlossSize) => updateSettings({ readerGlossSize })}
      />
      {settings.readerTransliteration && (
        <SizeSlider
          label="Transliteration"
          value={settings.readerTransliterationSize}
          range={TRANSLITERATION_SIZE_RANGE}
          onChange={(readerTransliterationSize) => updateSettings({ readerTransliterationSize })}
        />
      )}
      <SettingRow title="Show word-by-word translation">
        <Switch checked={settings.readerShowTranslation} onChange={(v) => updateSettings({ readerShowTranslation: v })} />
      </SettingRow>
      <SettingRow title="Show transliteration">
        <Switch checked={settings.readerTransliteration} onChange={(v) => updateSettings({ readerTransliteration: v })} />
      </SettingRow>
      <SettingRow title="Show ayah coverage %" description="How much of each ayah's vocabulary you know">
        <Switch checked={settings.readerShowAyahCoverage} onChange={(v) => updateSettings({ readerShowAyahCoverage: v })} />
      </SettingRow>
      <SettingRow title="Show ruku markers">
        <Switch checked={settings.readerShowRukuMarkers} onChange={(v) => updateSettings({ readerShowRukuMarkers: v })} />
      </SettingRow>
      <SettingRow title="Always show full translation" description="Otherwise use Translate on each ayah">
        <Switch
          checked={settings.readerAlwaysShowTranslation}
          onChange={(v) => updateSettings({ readerAlwaysShowTranslation: v })}
        />
      </SettingRow>
      <SettingRow title="Tajweed colors">
        <Switch checked={settings.readerShowTajweed !== false} onChange={(v) => updateSettings({ readerShowTajweed: v })} />
      </SettingRow>
      {settings.readerShowTajweed !== false && (
        <div className="py-3 flex flex-wrap gap-x-3 gap-y-1.5">
          {TAJWEED_LEGEND.map(([cls, label]) => (
            <span key={cls} className="flex items-center gap-1.5 text-xs text-textSecondary">
              <span className="h-2.5 w-2.5 rounded-full" style={{ background: isDark ? TajweedColors[cls].dark : TajweedColors[cls].light }} />
              {label}
            </span>
          ))}
        </div>
      )}
      <SettingRow title="Layout" description="Reading flows the Arabic like a printed page">
        <Segmented
          value={settings.readerMode ?? 'wbw'}
          onChange={(v) => updateSettings({ readerMode: v })}
          options={[
            { value: 'wbw', label: 'Word by word' },
            { value: 'reading', label: 'Reading' },
          ]}
        />
      </SettingRow>
    </div>
  );
}

export function ReaderSettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} variant="sheet" title="Reader settings">
      <div className="divide-y divide-border">
        <ReciterSetting />
        <TranslationSetting />
      </div>
      <ReaderDisplaySettings />
    </Modal>
  );
}
