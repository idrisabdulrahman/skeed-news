import React from "react";
import Link from "next/link";

// Shared site footer. Auth-aware: signed-in users get reading nav links
// (News, Saved), signed-out users get sign-in / account links — one branch
// swaps for the other depending on auth state.
export function Footer({ isSignedIn = false }: { isSignedIn?: boolean }) {
  return (
    <footer className="border-t border-border-strong">
      <div className="brand-container py-8">
        {isSignedIn ? (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-body-small font-semibold text-text-primary tracking-tight">
                SKEEM NEWS
              </p>
              <p className="mt-1 text-body-small text-text-tertiary">
                Real stories. Real fast.
              </p>
            </div>
            <nav className="flex items-center gap-6">
              <Link
                href="/category/news"
                className="text-body-small text-text-secondary hover:text-accent-app transition-colors"
              >
                News
              </Link>
              <Link
                href="/saved"
                className="text-body-small text-text-secondary hover:text-accent-app transition-colors"
              >
                Saved
              </Link>
            </nav>
          </div>
        ) : (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <p className="text-body-small font-semibold text-text-primary tracking-tight">
                SKEEM NEWS
              </p>
              <p className="mt-1 text-body-small text-text-tertiary">
                Real stories. Real fast.
              </p>
            </div>
            <nav className="flex items-center gap-6">
              <Link
                href="/sign-in"
                className="text-body-small text-text-secondary hover:text-accent-app transition-colors"
              >
                Sign in
              </Link>
              <Link
                href="/sign-up"
                className="text-body-small text-text-secondary hover:text-accent-app transition-colors"
              >
                Create account
              </Link>
            </nav>
          </div>
        )}
        <p className="mt-4 text-caption text-text-quaternary">
          Biasly Platform © 2026
        </p>
      </div>
    </footer>
  );
}
