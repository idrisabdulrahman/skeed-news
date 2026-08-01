import React from "react";
import { BiasTrack } from "@/components/BiasTrack";

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
      <BiasTrack
        leftPercent={leftPercent}
        centerPercent={centerPercent}
        rightPercent={rightPercent}
      />
    </div>
  );
};
