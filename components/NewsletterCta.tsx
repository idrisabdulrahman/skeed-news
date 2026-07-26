"use client";

import React from "react";
import posthog from "posthog-js";
import { Button } from "@/components/Button";

export interface NewsletterCtaProps {
  className?: string;
}

// "Stay Informed. Stay Balanced." band with an email input + Subscribe button.
// Presentational only — no submit handler, matches the reference layout.
export const NewsletterCta: React.FC<NewsletterCtaProps> = ({ className = "" }) => {
  return (
    <section
      className={`rounded-brand-md border border-border-subtle bg-surface-app shadow-brand-md p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 ${className}`}
    >
      <div>
        <h3 className="text-h3 font-semibold text-text-primary mb-1">
          Stay Informed. Stay Balanced.
        </h3>
        <p className="text-body-small text-text-secondary">
          Get the top stories and bias analysis delivered to your inbox.
        </p>
      </div>

      <div className="flex w-full md:w-auto items-center gap-3">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          placeholder="Enter your email"
          className="flex-1 md:w-64 h-[42px] px-4 rounded-brand-sm bg-bg-app border border-border-strong text-body-small text-text-primary placeholder:text-text-tertiary focus:outline-none focus:ring-2 focus:ring-accent-app/50"
        />
        <Button
          variant="primary"
          onClick={() => posthog.capture("newsletter_subscribe_clicked")}
        >
          Subscribe
        </Button>
      </div>
    </section>
  );
};
