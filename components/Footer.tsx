import React from "react";

// Shared site footer used on the home page and news details page.
export function Footer() {
  return (
    <footer className="border-t border-border-strong bg-surface-app">
      <div className="brand-container py-6 flex flex-col sm:flex-row items-center justify-between gap-2 text-caption font-mono text-text-tertiary">
        <div className="flex items-center gap-2">
          <div className="flex items-center justify-center w-6 h-6 rounded-brand-sm bg-accent-app text-on-accent">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="currentColor"
              className="w-3.5 h-3.5"
            >
              <path
                fillRule="evenodd"
                d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <span className="font-bold text-text-secondary tracking-tight">
            SKEEM NEWS
          </span>
          <span className="mx-1">·</span>
          <span>Real stories. Real fast.</span>
        </div>
        <span>biasly Platform © 2026</span>
      </div>
    </footer>
  );
}
