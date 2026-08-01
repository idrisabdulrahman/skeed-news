import React from "react";
import { SidebarCard } from "@/components/SidebarCard";
import { Button } from "@/components/Button";
import type { BiasLabel } from "@/lib/types/article";
import { BIAS_LEFT, BIAS_RIGHT, biasDisplayLabel, biasTextClass } from "@/lib/bias";

export interface BiasAnalysisPanelProps {
  biasLabel: BiasLabel;
  leftPercentage: number;
  centerPercentage: number;
  rightPercentage: number;
  sourcesCount: number;
  className?: string;
}

interface RowProps {
  label: string;
  percent: number;
  /** Bar fill color; undefined renders the neutral center track. */
  color?: string;
}

// One L/C/R row: label, percentage, and a thin hairline bar.
const BiasRow: React.FC<RowProps> = ({ label, percent, color }) => (
  <div className="flex items-center gap-3">
    <span className="w-14 text-body-small text-text-secondary">{label}</span>
    <span className="w-10 text-body-small tabular-nums text-text-primary">{percent}%</span>
    <div className="flex-1 h-1.5 bg-border-subtle overflow-hidden">
      <div
        className="h-full"
        style={{
          width: `${percent}%`,
          backgroundColor: color ?? "var(--text-quaternary)",
        }}
      />
    </div>
  </div>
);

// "Bias Analysis" sidebar card: overall bias headline, L/C/R rows, explainer,
// and a "How We Analyze Bias" button. Framing is AI-estimated (AGENTS.md §19).
export const BiasAnalysisPanel: React.FC<BiasAnalysisPanelProps> = ({
  biasLabel,
  leftPercentage,
  centerPercentage,
  rightPercentage,
  sourcesCount,
  className = "",
}) => {
  // Headline percentage tracks the strongest lean of the label.
  const headlinePercent =
    biasLabel === "left"
      ? leftPercentage
      : biasLabel === "right"
        ? rightPercentage
        : centerPercentage;

  return (
    <SidebarCard title="Bias Analysis" className={className}>
      <p className="text-caption text-text-tertiary mb-1">Overall bias</p>
      <p className={`text-h3 font-semibold leading-none mb-2 ${biasTextClass(biasLabel)}`}>
        {biasDisplayLabel(biasLabel)} {headlinePercent}%
      </p>
      <p className="text-caption text-text-tertiary tabular-nums mb-5">
        Based on {sourcesCount} balanced sources
      </p>

      <div className="flex flex-col gap-3 pb-5 border-b border-border-subtle">
        <BiasRow label="Left" percent={leftPercentage} color={BIAS_LEFT} />
        <BiasRow label="Center" percent={centerPercentage} />
        <BiasRow label="Right" percent={rightPercentage} color={BIAS_RIGHT} />
      </div>

      <p className="text-body-small text-text-secondary leading-relaxed my-5">
        Our analysis is AI-estimated from the political leaning of the publications and how the
        story is framed. Sources are weighted by reliability and recency.
      </p>

      <Button variant="secondary" isOutline className="w-full">
        How We Analyze Bias
      </Button>
    </SidebarCard>
  );
};
