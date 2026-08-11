// Category slug helpers shared by the chip row, category pages, and queries.
// Slugs are derived from stored category labels with the same normalization as
// article slugs (lib/parsing/url.ts): lowercase, non-alphanumerics → hyphens.
// Punctuation is stripped FIRST so "U.S. News", "US News", and "us" all
// collapse to one slug ("us-news") — one chip/page per section regardless of
// how the label was stored or AI-written.
// Pure functions — safe on server and client.

/** Normalize a category label to its stable slug key ("Business & Markets" → "business-markets", "U.S. News" → "us-news"). */
export function categoryKey(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
    .replace(/\./g, "") // "U.S. News" → "US News" so dot variants share one slug
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Human-readable fallback label from a slug ("business-markets" → "Business Markets"). */
export function slugToLabel(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

// Display overrides for slugs whose title-cased form reads awkwardly
// ("us-news" → "U.S. News", not "Us News").
const SLUG_DISPLAY_OVERRIDES: Record<string, string> = {
  news: "News",
  "us-news": "U.S. News",
};

/** Display label for a category slug; falls back to the title-cased slug. */
export function labelFromSlug(slug: string): string {
  return SLUG_DISPLAY_OVERRIDES[slug] ?? slugToLabel(slug);
}

// ─── Canonical category taxonomy ──────────────────────────────────────────────
// Single source of truth for category names: the AI analysis prompt (schema),
// the masthead chips, and the category pages all share this list. Legacy
// scrape-era labels ("US news", "World News", "us", ...) are folded into these
// canonical names by canonicalCategory(), so one section has one chip, one
// slug, and every related story — no more "Politics" + "politics" duplicates.

/**
 * The canonical story sections. "News" is the catch-all; it is never suggested
 * to the model (the prompt lists the real sections) — only used as a resolution
 * fallback so an off-list category cannot poison a valid analysis.
 */
export const CATEGORY_OPTIONS = [
  "U.S. News",
  "World",
  "Politics",
  "Business",
  "Technology",
  "Science",
  "Health",
  "Sports",
  "Entertainment",
  "Culture",
  "Opinion",
  "News",
] as const;

export type ArticleCategory = (typeof CATEGORY_OPTIONS)[number];

// Legacy spellings and scrape-era section names mapped to their canonical
// category ("US news"/"U.S. News"/"us" → "U.S. News", "World News" → "World").
const CATEGORY_ALIASES: Record<string, ArticleCategory> = {
  us: "U.S. News",
  usnews: "U.S. News",
  worldnews: "World",
};

/**
 * Resolve any stored label to its canonical category, or null when it has no
 * canonical home ("Sponsored Post", "Top Story", "outkick-sports" → null; those
 * articles still appear on /category/news but in no section page). Key form is
 * lowercased non-alphanumerics, matching categoryKey().
 */
export function canonicalCategory(label: string): ArticleCategory | null {
  const key = label
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "");
  if (!key) return null;

  const alias = CATEGORY_ALIASES[key];
  if (alias) return alias;

  for (const option of CATEGORY_OPTIONS) {
    if (option.toLowerCase().replace(/[^a-z0-9]+/g, "") === key) return option;
  }
  return null;
}
