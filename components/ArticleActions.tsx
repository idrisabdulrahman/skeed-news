"use client";

import posthog from "posthog-js";

interface ArticleActionsProps {
  articleSlug: string;
  articleTitle: string;
}

// Save and Share buttons for the article details page. Client component so
// PostHog can capture these interaction events in the browser.
export function ArticleActions({ articleSlug, articleTitle }: ArticleActionsProps) {
  return (
    <div className="flex items-center gap-4 text-text-tertiary">
      <button
        className="inline-flex items-center gap-1.5 text-caption font-mono hover:text-text-primary transition-colors duration-200"
        onClick={() =>
          posthog.capture("article_saved", {
            article_slug: articleSlug,
            article_title: articleTitle,
          })
        }
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z" />
        </svg>
        Save
      </button>
      <button
        className="inline-flex items-center gap-1.5 text-caption font-mono hover:text-text-primary transition-colors duration-200"
        onClick={() =>
          posthog.capture("article_shared", {
            article_slug: articleSlug,
            article_title: articleTitle,
          })
        }
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.217 10.907a2.25 2.25 0 100 2.186m0-2.186c.18.324.283.696.283 1.093s-.103.77-.283 1.093m0-2.186l9.566-5.314m-9.566 7.5l9.566 5.314m0 0a2.25 2.25 0 103.935 2.186 2.25 2.25 0 00-3.935-2.186zm0-12.814a2.25 2.25 0 103.933-2.185 2.25 2.25 0 00-3.933 2.185z" />
        </svg>
        Share
      </button>
    </div>
  );
}
