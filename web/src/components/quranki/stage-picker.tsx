'use client';

import React from 'react';
import { Lock } from 'lucide-react';
import {
  getCoverageThroughLevel,
  isAsmaStage,
  isQaidaStage,
  stageDisplayTitle,
  stagePillLabel,
  type ProgressMap,
  type Stage,
  type StageProgress,
} from '@/lib/levels';

export interface StageEntry {
  stage: Stage;
  progress: StageProgress;
  unlocked: boolean;
}

interface StagePickerProps {
  entries: StageEntry[];
  selectedStageId: number;
  wordsPerDay?: number;
  learnToRead: boolean;
  progressMap: ProgressMap;
  onSelect: (stageId: number) => void;
}

export function StagePicker({
  entries,
  selectedStageId,
  wordsPerDay = 10,
  learnToRead,
  onSelect,
}: StagePickerProps) {
  const selected = entries.find((entry) => entry.stage.id === selectedStageId) ?? entries[0];
  if (!selected) return null;

  const { stage, progress, unlocked } = selected;
  const { mastered, total } = progress;
  const coverage = getCoverageThroughLevel(stage.lastLevel);

  let detailText: string;
  if (isQaidaStage(stage)) {
    detailText = unlocked
      ? `${mastered.toLocaleString()} of ${total.toLocaleString()} mastered`
      : `${total.toLocaleString()} cards`;
  } else if (isAsmaStage(stage)) {
    detailText = unlocked
      ? `${mastered.toLocaleString()} of ${total.toLocaleString()} mastered - ${stage.subtitle}`
      : `${stage.subtitle} - ${total.toLocaleString()} cards - unlocks after Stage ${learnToRead ? 2 : 1}`;
  } else if (unlocked) {
    detailText = `${mastered.toLocaleString()} of ${total.toLocaleString()} mastered - ${coverage.percent}% of the Quran`;
  } else if (stage.id === 1) {
    detailText = `${stage.subtitle} - ${total.toLocaleString()} words - unlocks after Stage 1`;
  } else {
    detailText = `${stage.subtitle} - ${total.toLocaleString()} words - unlocks as you progress`;
  }

  const remaining = Math.max(0, total - mastered);
  const daysAtPace = wordsPerDay > 0 ? Math.ceil(remaining / wordsPerDay) : 0;
  const daysLabel = unlocked && daysAtPace > 0 ? `${daysAtPace} ${daysAtPace === 1 ? 'day' : 'days'}` : null;

  return (
    <div className="flex flex-col gap-3">
      {/* Segmented Control Bar */}
      <div className="flex items-center gap-1 p-1 bg-card border border-border rounded-medium">
        {entries.map(({ stage: entryStage, unlocked: entryUnlocked }) => {
          const isSelected = entryStage.id === selectedStageId;
          return (
            <button
              key={entryStage.id}
              type="button"
              disabled={!entryUnlocked}
              onClick={() => onSelect(entryStage.id)}
              className={`flex-1 py-2 px-3 rounded-small text-sm font-bold flex items-center justify-center transition-all ${
                isSelected
                  ? 'bg-backgroundSelected text-primary shadow-xs'
                  : entryUnlocked
                  ? 'text-textSecondary hover:text-text hover:bg-backgroundElement'
                  : 'text-textMuted/40 cursor-not-allowed opacity-50'
              }`}
            >
              {entryUnlocked ? (
                stagePillLabel(entryStage, learnToRead)
              ) : (
                <Lock className="w-3.5 h-3.5" />
              )}
            </button>
          );
        })}
      </div>

      {/* Stage Detail Info */}
      <div className="flex flex-col gap-0.5 px-1">
        <div className="text-sm font-bold text-text">
          {stageDisplayTitle(stage, learnToRead)}
        </div>
        <div className="text-xs text-textSecondary">{detailText}</div>
        {daysLabel && (
          <div className="text-xs text-textMuted">{daysLabel} left at your pace</div>
        )}
      </div>
    </div>
  );
}
