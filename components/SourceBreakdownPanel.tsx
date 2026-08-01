import React from "react";
import { SidebarCard } from "@/components/SidebarCard";
import { Button } from "@/components/Button";
import type { OutletBias } from "@/lib/types/article";
import { BIAS_LEFT, BIAS_RIGHT, biasDisplayLabel, biasTextClass } from "@/lib/bias";

export interface SourceBreakdownPanelProps {
  sourcesCount: number;
  counts: { left: number; center: number; right: number };
  topSources: OutletBias[];
  className?: string;
}

interface CountRowProps {
  label: string;
  count: number;
  percent: number;
  color?: string;
}

// One L/C/R row: label, "count (pct%)", and a thin hairline bar.
const CountRow: React.FC<CountRowProps> = ({ label, count, percent, color }) => (
  <div className="flex items-center gap-3">
    <span className="w-14 text-body-small text-text-secondary">{label}</span>
    <span className="w-16 text-body-small tabular-nums text-text-primary">
      {count} ({percent}%)
    </span>
    <div className="flex-1 h-1.5 bg-border-subtle overflow-hidden">
      <div
        className="h-full"
        style={{ width: `${percent}%`, backgroundColor: color ?? "var(--text-quaternary)" }}
      />
    </div>
  </div>
);

// "Source Breakdown" sidebar card: total sources, L/C/R count rows, a named
// Top Sources list (international outlet mix) with per-outlet lean, and a
// "View All Sources" button.
export const SourceBreakdownPanel: React.FC<SourceBreakdownPanelProps> = ({
  sourcesCount,
  counts,
  topSources,
  className = "",
}) => {
  const pct = (n: number) =>
    sourcesCount > 0 ? Math.round((n / sourcesCount) * 100) : 0;

  return (
    <SidebarCard title="Source Breakdown" className={className}>
      <p className="text-caption text-text-tertiary tabular-nums mb-4">{sourcesCount} total sources</p>

      <div className="flex flex-col gap-3 pb-5 border-b border-border-subtle">
        <CountRow label="Left" count={counts.left} percent={pct(counts.left)} color={BIAS_LEFT} />
        <CountRow label="Center" count={counts.center} percent={pct(counts.center)} />
        <CountRow label="Right" count={counts.right} percent={pct(counts.right)} color={BIAS_RIGHT} />
      </div>

      <div className="flex items-center justify-between mt-5 mb-2">
        <span className="text-caption text-text-tertiary">
          Top sources
        </span>
        <span className="text-caption text-text-tertiary">
          Bias
        </span>
      </div>

      <ul className="flex flex-col divide-y divide-border-subtle mb-5">
        {topSources.map((source) => (
          <li key={source.name} className="flex items-center justify-between py-2">
            <span className="text-body-small text-text-primary">{source.name}</span>
            <span className={`text-body-small font-medium ${biasTextClass(source.biasLabel)}`}>
              {biasDisplayLabel(source.biasLabel)}
            </span>
          </li>
        ))}
      </ul>

      <Button variant="secondary" isOutline className="w-full">
        View All Sources
      </Button>
    </SidebarCard>
  );
};
