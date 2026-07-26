// Shared, reusable shapes for a home-page article card.
// Mirrors the AI analysis card fields in AGENTS.md §19 so a future Supabase
// query can return this exact type without changing the UI.

export type SentimentLabel = "positive" | "neutral" | "negative";

export type BiasLabel = "left" | "center" | "right" | "mixed" | "unclear";

export interface ArticleCard {
  /** Stable identifier (article row id). */
  id: string;
  /** URL slug used to link to the details page (`/news/[slug]`). */
  slug: string;
  /** Article-specific headline. */
  title: string;
  /** Image URL (required before an article is stored — AGENTS.md §7). */
  imageUrl: string;
  /** Top-level category label, e.g. "Politics". */
  sourceCategory: string;
  /** Region / locale label, e.g. "United States". */
  region: string;
  /** AI sentiment label. */
  sentimentLabel: SentimentLabel;
  /** AI-estimated political framing label. */
  biasLabel: BiasLabel;
  /** Left framing percentage, 0–100. */
  leftPercentage: number;
  /** Center framing percentage, 0–100. */
  centerPercentage: number;
  /** Right framing percentage, 0–100. */
  rightPercentage: number;
  /** Model confidence, 0–1. Optional — shown only when available. */
  confidence?: number;
  /** Number of sources covering the story. */
  sourcesCount: number;
  /** ISO published timestamp. Optional. */
  publishedAt?: string;
}

// ── News details page shapes ──────────────────────────────────────────────
// Mirrors AGENTS.md §7 (article fields) and §19 (full AI analysis fields) so a
// future Supabase query can return this exact type without changing the UI.

/** One named outlet in the Source Breakdown panel, with its estimated lean. */
export interface OutletBias {
  /** Outlet display name, e.g. "RT", "Arise News". */
  name: string;
  /** AI-estimated lean of this outlet's coverage. */
  biasLabel: BiasLabel;
}

/**
 * Full analysis + article payload for the `/news/[slug]` details page.
 * Reuses the card fields and label unions above, then adds the body text and
 * the full analysis surface (summary, framing notes, loaded terms, disclaimer).
 */
export interface ArticleDetail {
  /** Stable identifier (article row id). */
  id: string;
  /** URL slug (`/news/[slug]`). Matches the home card slug. */
  slug: string;
  /** Article-specific headline. */
  title: string;
  /** Hero image URL (required before storage — AGENTS.md §7). */
  imageUrl: string;
  /** Caption + photo credit shown beneath the hero image. */
  imageCaption?: string;
  /** Byline author name. */
  author: string;
  /** ISO published timestamp. */
  publishedAt: string;
  /** Estimated read time in minutes. */
  readTimeMinutes: number;
  /** Top-level category label, e.g. "Politics". */
  sourceCategory: string;
  /** Region / locale label, e.g. "United States". */
  region: string;
  /** Canonical article URL (AGENTS.md §7). */
  canonicalUrl: string;
  /** Article body as ordered paragraphs. */
  body: string[];

  // ── AI analysis (AGENTS.md §19) ──
  /** Neutral summary rendered as bullet points. */
  summaryPoints: string[];
  /** Sentiment score, −1 to 1. */
  sentimentScore: number;
  /** Sentiment label. */
  sentimentLabel: SentimentLabel;
  /** AI-estimated political framing label. */
  biasLabel: BiasLabel;
  /** Left framing percentage, 0–100. */
  leftPercentage: number;
  /** Center framing percentage, 0–100. */
  centerPercentage: number;
  /** Right framing percentage, 0–100. */
  rightPercentage: number;
  /** Derived bias score, `(right − left) / 100` — AGENTS.md §7/§19. */
  biasScore: number;
  /** Model confidence, 0–1. */
  confidence: number;
  /** Framing notes paragraph. */
  framingNotes: string;
  /** Loaded / charged terms detected in the article. */
  loadedTerms: string[];
  /** Analysis disclaimer copy. */
  disclaimer: string;
  /** Model name that produced the analysis. */
  model: string;
  /** ISO timestamp the AI summary was generated. */
  summaryGeneratedAt: string;

  // ── Source breakdown ──
  /** Total number of sources covering the story. */
  sourcesCount: number;
  /** Count of sources in each lean bucket (sums to `sourcesCount`). */
  sourceCounts: { left: number; center: number; right: number };
  /** Named outlets covering the story, with per-outlet lean. */
  topSources: OutletBias[];

  /** Up to 5 related stories (same shape as home cards). */
  relatedArticles: ArticleCard[];
}
