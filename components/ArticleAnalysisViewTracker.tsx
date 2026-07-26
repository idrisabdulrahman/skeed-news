"use client";

import { useEffect } from "react";
import posthog from "posthog-js";

interface ArticleAnalysisViewTrackerProps {
  articleSlug: string;
  articleTitle: string;
  biasLabel: string;
  sentimentLabel: string;
}

// Fires article_analysis_viewed once when a signed-in user lands on the full
// analysis view — the top of the authenticated content funnel.
export function ArticleAnalysisViewTracker({
  articleSlug,
  articleTitle,
  biasLabel,
  sentimentLabel,
}: ArticleAnalysisViewTrackerProps) {
  useEffect(() => {
    posthog.capture("article_analysis_viewed", {
      article_slug: articleSlug,
      article_title: articleTitle,
      bias_label: biasLabel,
      sentiment_label: sentimentLabel,
    });
    // Run once on mount only — the external system is PostHog.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return null;
}
