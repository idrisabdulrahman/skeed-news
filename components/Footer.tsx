import React from "react";

// Shared site footer used on the home page and news details page.
// Ft4 dense colophon: one quiet text block on a hairline rule — no icon tile,
// no mono, no surface band. Ragged right.
export function Footer() {
  return (
    <footer className="border-t border-border-strong">
      <div className="brand-container py-8">
        <p className="text-body-small font-semibold text-text-primary tracking-tight">
          SKEEM NEWS
        </p>
        <p className="mt-1 text-body-small text-text-tertiary">
          Real stories. Real fast.
        </p>
        <p className="mt-4 text-caption text-text-quaternary">
          Biasly Platform © 2026
        </p>
      </div>
    </footer>
  );
}
