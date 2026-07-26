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
    <div className={`w-full font-sans ${className}`}>
      {/* Horizontal Bar container */}
      <div className="relative flex w-full h-10 overflow-hidden rounded-brand-sm border border-border-strong select-none">
        {/* Left (Red) */}
        {leftPercent > 0 && (
          <div
            style={{ width: `${leftPercent}%` }}
            className="flex items-center pl-3 bg-breaking text-white text-body-small font-semibold transition-all duration-500 ease-out"
          >
            <span className="truncate">Left {leftPercent}%</span>
          </div>
        )}

        {/* Center (Gray) */}
        {centerPercent > 0 && (
          <div
            style={{ width: `${centerPercent}%` }}
            className="flex items-center justify-center bg-surface-app border-x border-border-strong text-text-primary text-body-small font-semibold transition-all duration-500 ease-out"
          >
            <span className="truncate">Center {centerPercent}%</span>
          </div>
        )}

        {/* Right (Blue) */}
        {rightPercent > 0 && (
          <div
            style={{ width: `${rightPercent}%` }}
            className="flex items-center justify-end pr-3 bg-info text-white text-body-small font-semibold transition-all duration-500 ease-out"
          >
            <span className="truncate">Right {rightPercent}%</span>
          </div>
        )}
      </div>

      {/* Axis Scale */}
      <div className="flex justify-between items-center mt-2 px-1 text-caption text-text-tertiary font-mono">
        <span>0%</span>
        <span>50%</span>
        <span>100%</span>
      </div>
    </div>
  );
};
