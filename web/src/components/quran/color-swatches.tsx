'use client';

import { Check } from 'lucide-react';
import { MARK_COLORS } from '@/lib/quran-marks';

export function ColorSwatches({ value, onChange }: { value: string; onChange: (color: string) => void }) {
  return (
    <div className="flex flex-wrap gap-2">
      {MARK_COLORS.map((color) => (
        <button
          type="button"
          key={color}
          onClick={() => onChange(color)}
          className="h-7 w-7 rounded-full flex items-center justify-center transition-transform hover:scale-110"
          style={{ background: color, boxShadow: value === color ? `0 0 0 2px var(--card), 0 0 0 4px ${color}` : undefined }}
          aria-label={`Color ${color}`}
          aria-pressed={value === color}
        >
          {value === color && <Check className="w-3.5 h-3.5 text-white" />}
        </button>
      ))}
    </div>
  );
}

/** Name plus color, used for pins and collections. */
export function NameColorComposer({
  name,
  color,
  placeholder,
  actionLabel,
  onNameChange,
  onColorChange,
  onAction,
  onCancel,
}: {
  name: string;
  color: string;
  placeholder: string;
  actionLabel: string;
  onNameChange: (name: string) => void;
  onColorChange: (color: string) => void;
  onAction: () => void;
  onCancel?: () => void;
}) {
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        onAction();
      }}
      className="mt-2 space-y-3 rounded-medium border border-border p-3"
    >
      <input autoFocus value={name} onChange={(e) => onNameChange(e.target.value)} placeholder={placeholder} maxLength={40} className="input h-10" />
      <ColorSwatches value={color} onChange={onColorChange} />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" onClick={onCancel} className="btn-ghost h-9 px-3">
            Cancel
          </button>
        )}
        <button type="submit" className="btn-primary h-9 px-4">
          {actionLabel}
        </button>
      </div>
    </form>
  );
}
