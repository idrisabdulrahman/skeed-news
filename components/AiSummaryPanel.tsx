import React from "react";
import { SidebarCard } from "@/components/SidebarCard";
import { Button } from "@/components/Button";

export interface AiSummaryPanelProps {
  points: string[];
  generatedAt: string;
  readTimeMinutes: number;
  className?: string;
}

// "AI Summary" sidebar card: generated meta line, bulleted neutral summary,
// a "can make mistakes" caption, and a "Provide Feedback" button. Maps to the
// AGENTS.md §19 `summary`; the summary is AI-estimated, not objective truth.
export const AiSummaryPanel: React.FC<AiSummaryPanelProps> = ({
  points,
  generatedAt,
  readTimeMinutes,
  className = "",
}) => {
  const dateLabel = new Date(generatedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  // A rough read time for the summary itself (mock).
  const summaryReadMinutes = Math.max(1, Math.round(readTimeMinutes / 4));

  return (
    <SidebarCard title="AI Summary" className={className}>
      <p className="text-caption text-text-tertiary tabular-nums mb-4">
        Generated {dateLabel} · {summaryReadMinutes} min read
      </p>

      <ul className="flex flex-col gap-4 mb-5">
        {points.map((point, i) => (
          <li key={i} className="flex gap-3 text-body-small text-text-secondary leading-relaxed">
            <span
              className="mt-2 w-1.5 h-1.5 flex-shrink-0 bg-accent-app"
              aria-hidden="true"
            />
            <span>{point}</span>
          </li>
        ))}
      </ul>

      <p className="text-caption text-text-tertiary mb-4">AI summaries can make mistakes.</p>

      <Button variant="secondary" isOutline className="w-full">
        Provide Feedback
      </Button>
    </SidebarCard>
  );
};
