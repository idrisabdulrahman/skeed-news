import "server-only";

// URL normalization, canonicalization, dedupe, and slug generation for the
// scrape pipeline (AGENTS.md §9/§10). Pure functions — no I/O, no secrets.

/**
 * Resolve a possibly-relative href against the page base and strip tracking
 * noise so the same article maps to one canonical string. Returns null when the
 * href is not an http(s) URL we can use (mailto:, javascript:, fragments, …).
 */
export function normalizeUrl(href: string, base: string): string | null {
  const raw = href?.trim();
  if (!raw) return null;
  if (raw.startsWith("#")) return null;
  if (/^(mailto:|tel:|javascript:|data:)/i.test(raw)) return null;

  let url: URL;
  try {
    url = new URL(raw, base);
  } catch {
    return null;
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") return null;

  // Drop tracking params and fragments; keep meaningful query keys (some CMSes
  // put the article id in ?p= / ?id=). Anything utm_*/fbclid/gclid is noise.
  const TRACKING = /^(utm_|fbclid$|gclid$|mc_|ref$|ref_src$|cmpid$|igshid$)/i;
  for (const key of [...url.searchParams.keys()]) {
    if (TRACKING.test(key)) url.searchParams.delete(key);
  }
  url.hash = "";

  // Normalize trailing slash on non-root paths so /a/ and /a dedupe together.
  if (url.pathname.length > 1 && url.pathname.endsWith("/")) {
    url.pathname = url.pathname.replace(/\/+$/, "");
  }

  return url.toString();
}

/** Same-registrable-host check used to keep candidates on the source domain. */
export function isSameSite(url: string, base: string): boolean {
  try {
    const a = new URL(url);
    const b = new URL(base);
    const host = (h: string) => h.replace(/^www\./, "");
    const rootA = host(a.hostname);
    const rootB = host(b.hostname);
    return rootA === rootB || rootA.endsWith(`.${rootB}`) || rootB.endsWith(`.${rootA}`);
  } catch {
    return false;
  }
}

/** Dedupe a list of URLs preserving first-seen order. */
export function dedupeUrls(urls: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const u of urls) {
    if (seen.has(u)) continue;
    seen.add(u);
    out.push(u);
  }
  return out;
}

/**
 * Normalize an article title into a stable dedupe key (§9/§10). The same wire
 * story carried by two outlets often shares a headline modulo casing,
 * punctuation, whitespace, and a trailing " - Source" / " | Source" suffix.
 * Lowercase, drop that suffix, strip punctuation, collapse whitespace. Returns
 * "" for an empty/whitespace title so callers can skip meaningless keys.
 */
export function normalizeTitle(title: string | null | undefined): string {
  if (!title) return "";
  return title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/\s*[|\-–—]\s*[^|\-–—]+$/u, "") // drop trailing " - Source"/" | Source"
    .replace(/[^a-z0-9]+/g, " ") // punctuation → space
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Build a URL-safe slug from a title, with the article id/host as a uniqueness
 * suffix so two same-titled stories from different sources don't collide on the
 * `articles.slug` unique constraint (§decision 6).
 */
export function slugify(title: string, uniquenessSeed: string): string {
  const base = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "") // strip diacritics
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80)
    .replace(/-+$/g, "");

  const suffix = shortHash(uniquenessSeed);
  const stem = base || "article";
  return `${stem}-${suffix}`;
}

// Small deterministic hash (djb2) → base36. Enough to disambiguate slugs; not
// used for anything security-sensitive.
function shortHash(input: string): string {
  let hash = 5381;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 33) ^ input.charCodeAt(i);
  }
  return (hash >>> 0).toString(36);
}
