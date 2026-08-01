// Category slug helpers shared by the chip row, category pages, and queries.
// Slugs are derived from stored category labels with the same normalization as
// article slugs (lib/parsing/url.ts): lowercase, non-alphanumerics → hyphens.
// Pure functions — safe on server and client.

/** Normalize a category label to its stable slug key ("Business & Markets" → "business-markets"). */
export function categoryKey(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "") // strip diacritics
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
