import React from "react";

export interface BiasTrackProps {
  leftPercent: number;
  centerPercent: number;
  rightPercent: number;
}

// The shared framing track + numeral row used by BiasMeter (details page) and
// CompactBiasBar (story cards): a hairline data track with semantic segments
// (red = Left, neutral = Center, blue = Right) and a quiet sentence-case
// numeral row underneath. Tabular numerals keep the % aligned. Segments are
// omitted at 0% so the track reads as pure data.
export const BiasTrack: React.FC<BiasTrackProps> = ({
  leftPercent,
  centerPercent,
  rightPercent,
}) => {
  return (
    <>
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

      <div className="flex justify-between items-center mt-2 text-caption text-text-tertiary tabular-nums">
        <span>Left {leftPercent}%</span>
        <span>Center {centerPercent}%</span>
        <span>Right {rightPercent}%</span>
      </div>
    </>
  );
};
