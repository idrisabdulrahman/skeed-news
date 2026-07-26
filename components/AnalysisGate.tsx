"use client";

import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import posthog from "posthog-js";

// Shown on the news details page to signed-out visitors instead of the full analysis.
// Uses modal auth (no dedicated /sign-in route), matching the header controls. Client
// component because Clerk's modal buttons are client-only.
export function AnalysisGate({ title }: { title: string }) {
  return (
    <div className="flex flex-col items-center justify-center text-center max-w-lg mx-auto py-16">
      <div className="flex items-center justify-center w-12 h-12 rounded-brand-md bg-surface-app border border-border-subtle text-accent-app mb-5">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.8}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z"
          />
        </svg>
      </div>

      <h1 className="text-h4 md:text-h3 font-bold text-text-primary leading-tight tracking-tight mb-2">
        Sign in to read the full analysis
      </h1>
      <p className="text-body-medium text-text-secondary leading-relaxed mb-1">
        The full AI framing and bias analysis for
      </p>
      <p className="text-body-medium font-semibold text-text-primary leading-relaxed mb-6">
        &ldquo;{title}&rdquo;
      </p>

      <div className="flex flex-wrap items-center justify-center gap-3">
        <SignInButton mode="modal">
          <button
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-accent-app text-on-accent rounded-brand-sm hover:opacity-90 transition-all duration-200 text-body-small font-medium font-mono"
            onClick={() =>
              posthog.capture("analysis_gate_sign_in_clicked", {
                article_title: title,
              })
            }
          >
            Sign in
          </button>
        </SignInButton>
        <SignUpButton mode="modal">
          <button
            className="inline-flex items-center gap-2 px-5 py-2.5 border border-accent-app text-accent-app rounded-brand-sm hover:bg-accent-app hover:text-on-accent transition-all duration-200 text-body-small font-medium font-mono"
            onClick={() =>
              posthog.capture("analysis_gate_sign_up_clicked", {
                article_title: title,
              })
            }
          >
            Create account
          </button>
        </SignUpButton>
      </div>

      <Link
        href="/"
        className="mt-6 font-mono text-caption text-text-tertiary hover:text-text-primary transition-colors duration-200"
      >
        ← Back to Top News
      </Link>
    </div>
  );
}
