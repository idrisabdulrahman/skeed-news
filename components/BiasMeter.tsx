import React from "react";

export interface BiasMeterProps {
  left?: number;
  center?: number;
  right?: number;
  className?: string;
}

export const BiasMeter: React.FC<BiasMeterProps> = ({
  left = 28,
  center = 44,
  right = 28,
  className = "",
}) => {
  // Normalize if they don't sum to 100
  const total = left + center + right;
  const leftPercent = total > 0 ? Math.round((left / total) * 100) : 0;
  const centerPercent = total > 0 ? Math.round((center / total) * 100) : 0;
  const rightPercent = total > 0 ? 100 - leftPercent - centerPercent : 0; // ensure exactly 100% total

  return (
    <div className={`w-full ${className}`}>
      {/* Hairline data track — same quiet voice as the CompactBiasBar */}
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

      {/* L/C/R numerals */}
      <div className="flex justify-between items-center mt-2 text-caption text-text-tertiary tabular-nums">
        <span>Left {leftPercent}%</span>
        <span>Center {centerPercent}%</span>
        <span>Right {rightPercent}%</span>
      </div>
    </div>
  );
};
