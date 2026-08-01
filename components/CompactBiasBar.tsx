import React from "react";
import { BiasTrack } from "@/components/BiasTrack";

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
      <BiasTrack
        leftPercent={leftPercent}
        centerPercent={centerPercent}
        rightPercent={rightPercent}
      />
    </div>
  );
};
