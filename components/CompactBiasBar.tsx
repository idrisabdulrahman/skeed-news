import React from "react";

export interface CompactBiasBarProps {
  left: number;
  center: number;
  right: number;
  className?: string;
}

// Compact three-segment framing bar for use inside a StoryCard.
// Distinct from the larger BiasMeter (which has an axis scale). Colors match
// the design system: red (Left) / neutral surface (Center) / blue (Right).
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
    <div
      className={`flex w-full h-6 overflow-hidden rounded-brand-sm border border-border-strong select-none ${className}`}
    >
      {leftPercent > 0 && (
        <div
          style={{ width: `${leftPercent}%` }}
          className="flex items-center px-2 bg-breaking text-white text-caption font-semibold"
        >
          <span className="truncate">L {leftPercent}%</span>
        </div>
      )}
      {centerPercent > 0 && (
        <div
          style={{ width: `${centerPercent}%` }}
          className="flex items-center justify-center bg-surface-app border-x border-border-strong text-text-primary text-caption font-semibold"
        >
          <span className="truncate">Center {centerPercent}%</span>
        </div>
      )}
      {rightPercent > 0 && (
        <div
          style={{ width: `${rightPercent}%` }}
          className="flex items-center justify-end px-2 bg-info text-white text-caption font-semibold"
        >
          <span className="truncate">Right {rightPercent}%</span>
        </div>
      )}
    </div>
  );
};
