"use client";

import React from "react";
import posthog from "posthog-js";
import { Button } from "@/components/Button";

export interface NewsletterCtaProps {
  className?: string;
}

// "Stay informed. Stay balanced." hairline band with an underline email input +
// ink Subscribe button. Presentational only — no submit handler, matches the
// reference layout.
export const NewsletterCta: React.FC<NewsletterCtaProps> = ({ className = "" }) => {
  return (
    <section
      className={`border border-border-subtle p-8 flex flex-col md:flex-row md:items-center md:justify-between gap-6 ${className}`}
    >
      <div>
        <h3 className="text-h4 font-semibold text-text-primary mb-1">
          Stay informed. Stay balanced.
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
          className="flex-1 md:w-64 h-11 bg-transparent border-b border-border-strong text-body-small text-text-primary placeholder:text-text-tertiary focus:outline-none focus:border-accent-app transition-colors duration-200"
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
