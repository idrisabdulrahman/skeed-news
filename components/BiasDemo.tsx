"use client";

import { useState } from "react";

/**
 * Interactive analysis preview for the landing page bento cell.
 * Cycles through three sample briefings on click, showing source, sentiment,
 * summary, the left/center/right distribution, and a confidence score.
 */

interface SampleAnalysis {
  source: string;
  section: string;
  headline: string;
  sentiment: string;
  summary: string;
  left: number;
  center: number;
  right: number;
  confidence: number;
}

const SAMPLES: SampleAnalysis[] = [
  {
    source: "Reuters",
    section: "Markets",
    headline: "Fed holds rates as inflation cools",
    sentiment: "Neutral",
    summary:
      "The report leads with consumer confidence before the rate decision, softening the headline.",
    left: 28,
    center: 44,
    right: 28,
    confidence: 0.91,
  },
  {
    source: "AP News",
    section: "Technology",
    headline: "Export rules tighten on advanced chips",
    sentiment: "Negative",
    summary:
      "Supplier pain is foregrounded while policy rationale appears late in the piece.",
    left: 22,
    center: 38,
    right: 40,
    confidence: 0.87,
  },
  {
    source: "BBC",
    section: "Climate",
    headline: "Coastal cities map adaptation budgets",
    sentiment: "Positive",
    summary:
      "Local agency is the lead frame; federal funding gaps are mentioned once.",
    left: 45,
    center: 35,
    right: 20,
    confidence: 0.82,
  },
];

export function BiasDemo() {
  const [active, setActive] = useState(0);
  const sample = SAMPLES[active];

  return (
    <button
      type="button"
      onClick={() => setActive((active + 1) % SAMPLES.length)}
      className="group flex h-full w-full cursor-pointer flex-col border border-border-subtle rounded-brand-md p-8 text-left focus-visible:outline-2 focus-visible:outline-accent-app focus-visible:outline-offset-2"
      aria-label={`Show analysis for ${sample.headline}. Click to cycle through samples.`}
    >
      <p className="text-caption text-text-tertiary uppercase tracking-widest">
        Analysis preview
      </p>

      <p className="mt-5 text-caption text-text-quaternary tabular-nums">
        {sample.source} · {sample.section}
      </p>

      <h3 className="mt-2 text-h3 font-bold tracking-tight text-text-primary group-hover:text-accent-app transition-colors duration-150">
        {sample.headline}
      </h3>

      <p className="mt-3 text-body-small text-text-secondary leading-relaxed">
        {sample.summary}
      </p>

      <div className="mt-4">
        <span className="inline-flex items-center px-2 py-0.5 rounded-brand-sm bg-surface-app text-caption text-text-secondary">
          Sentiment: {sample.sentiment}
        </span>
      </div>

      {/* Three-bar distribution */}
      <div className="mt-8 space-y-3">
        <div>
          <div className="mb-1.5 flex justify-between">
            <span className="text-caption text-text-tertiary">Left</span>
            <span className="text-caption font-medium text-text-primary tabular-nums">
              {sample.left}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-brand-full bg-border-subtle">
            <div
              className="h-full rounded-brand-full bg-info transition-all duration-300"
              style={{ width: `${sample.left}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex justify-between">
            <span className="text-caption text-text-tertiary">Center</span>
            <span className="text-caption font-medium text-text-primary tabular-nums">
              {sample.center}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-brand-full bg-border-subtle">
            <div
              className="h-full rounded-brand-full bg-success transition-all duration-300"
              style={{ width: `${sample.center}%` }}
            />
          </div>
        </div>

        <div>
          <div className="mb-1.5 flex justify-between">
            <span className="text-caption text-text-tertiary">Right</span>
            <span className="text-caption font-medium text-text-primary tabular-nums">
              {sample.right}%
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-brand-full bg-border-subtle">
            <div
              className="h-full rounded-brand-full bg-trending transition-all duration-300"
              style={{ width: `${sample.right}%` }}
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center justify-between border-t border-border-subtle pt-4">
        <span className="text-caption text-text-tertiary tabular-nums">
          Confidence {sample.confidence.toFixed(2)}
        </span>
        <span className="text-caption text-text-quaternary">
          Click to cycle
        </span>
      </div>

      <p className="mt-3 text-caption text-text-quaternary">
        AI-estimated, not objective truth.
      </p>
    </button>
  );
}
