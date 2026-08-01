import React from "react";

export interface CompactBiasBarProps {
  left: number;
  center: number;
  right: number;
  className?: string;
}

// Compact framing indicator for inside a StoryCard: a hairline data track with
// semantic segments (red = Left, neutral = Center, blue = Right) and a quiet
// sentence-case numeral row underneath. Tabular numerals keep the % aligned.
export const CompactBiasBar: React.FC<CompactBiasBarProps> = ({
  left,
  center,
  right,
  className = "",
}) => {
  // Normalize so the three segments always fill exactly 100%.
  const total = left + center + right;
  const leftPercent = total > 0 ? Math.round((left / total) * 100) : 0;
  const centerPercent = total > 0 ? Math.round((center / total) * 100) : 0;
  const rightPercent = total > 0 ? 100 - leftPercent - centerPercent : 0;

  return (
    <div className={`w-full select-none ${className}`}>
      <div className="flex w-full h-1.5 overflow-hidden bg-border-subtle">
        {leftPercent > 0 && (
          <div
            style={{ width: `${leftPercent}%` }}
            className="h-full bg-breaking"
          />
        )}
        {centerPercent > 0 && (
          <div
            style={{ width: `${centerPercent}%` }}
            className="h-full"
          />
        )}
        {rightPercent > 0 && (
          <div
            style={{ width: `${rightPercent}%` }}
            className="h-full bg-info"
          />
        )}
      </div>
      <div className="mt-2 flex items-center justify-between text-caption text-text-tertiary tabular-nums">
        <span>Left {leftPercent}%</span>
        <span>Center {centerPercent}%</span>
        <span>Right {rightPercent}%</span>
      </div>
    </div>
  );
};
