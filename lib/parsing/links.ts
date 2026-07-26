import "server-only";
import * as cheerio from "cheerio";
import { normalizeUrl, isSameSite, dedupeUrls } from "@/lib/parsing/url";

// Homepage story-card link extraction + candidate URL filtering
// (AGENTS.md §11/§12 and the §9 non-article reject list). Pure parsing over an
// HTML string — no network, no secrets.

/**
 * Path segments that mark a non-article page. Matched as whole path segments
 * (between slashes) so `/world/` is caught but a slug like `world-cup-final`
 * is not. This encodes the §9 non-article reject list.
 */
const NON_ARTICLE_SEGMENTS = new Set<string>([
  // sections / categories / topics / tags
  "category",
  "categories",
  "section",
  "sections",
  "topic",
  "topics",
  "tag",
  "tags",
  "subject",
  // author pages
  "author",
  "authors",
  "profile",
  "people",
  "contributor",
  // search
  "search",
  // shows / programs / podcasts / video / live
  "show",
  "shows",
  "program",
  "programs",
  "programmes",
  "podcast",
  "podcasts",
  "video",
  "videos",
  "watch",
  "live",
  "livestream",
  "audio",
  "listen",
  "tv",
  "radio",
  // games
  "game",
  "games",
  "puzzles",
  "crossword",
  // products / shopping / reviews
  "shop",
  "shopping",
  "store",
  "product",
  "products",
  "review",
  "reviews",
  "deals",
  // corporate / support / newsletter / subscription / account
  "about",
  "about-us",
  "contact",
  "careers",
  "jobs",
  "advertise",
  "privacy",
  "terms",
  "help",
  "support",
  "faq",
  "newsletter",
  "newsletters",
  "subscribe",
  "subscription",
  "account",
  "login",
  "signin",
  "sign-in",
  "register",
  "membership",
  "sitemap",
  "rss",
  "feed",
]);

/** Full URLs / paths that are clearly navigation, not stories. */
const NAV_HINT = /(^\/?$)|(\/(home|index)(\.html?)?$)/i;

/**
 * Extract candidate article links from visible homepage story cards only.
 * We take anchors inside common story/card/headline containers, plus headline
 * anchors, and drop obvious chrome (nav/header/footer/aside).
 */
export function extractHomepageLinks(html: string, baseUrl: string): string[] {
  const $ = cheerio.load(html);

  // Remove page chrome so we don't harvest menu/footer links (§11).
  $("nav, header, footer, aside, form, script, style, noscript").remove();

  const hrefs: string[] = [];

  // Prefer anchors that sit inside story-card-ish containers or are headlines.
  const CARD_SELECTOR = [
    "article a[href]",
    "[class*='card'] a[href]",
    "[class*='story'] a[href]",
    "[class*='headline'] a[href]",
    "[class*='teaser'] a[href]",
    "[class*='post'] a[href]",
    "[class*='article'] a[href]",
    "h1 a[href]",
    "h2 a[href]",
    "h3 a[href]",
  ].join(", ");

  $(CARD_SELECTOR).each((_, el) => {
    const href = $(el).attr("href");
    if (href) hrefs.push(href);
  });

  // Fallback: if the markup is unusual and card selectors found little, take
  // all remaining anchors (chrome already stripped) — filtering below is the
  // real gate.
  if (hrefs.length < 5) {
    $("a[href]").each((_, el) => {
      const href = $(el).attr("href");
      if (href) hrefs.push(href);
    });
  }

  const normalized: string[] = [];
  for (const href of hrefs) {
    const url = normalizeUrl(href, baseUrl);
    if (!url) continue;
    if (!isSameSite(url, baseUrl)) continue;
    normalized.push(url);
  }

  return dedupeUrls(normalized);
}

/** True when a URL's path contains a non-article segment (§9 reject list). */
export function isNonArticleUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return true;
  }

  if (NAV_HINT.test(parsed.pathname)) return true;

  const segments = parsed.pathname.split("/").filter(Boolean);
  if (segments.length === 0) return true; // homepage root

  for (const seg of segments) {
    if (NON_ARTICLE_SEGMENTS.has(seg.toLowerCase())) return true;
  }
  return false;
}

/**
 * Positive article-shape check (§12): does this look like a real article
 * detail URL? Prefer date paths, numeric ids, and long story slugs.
 */
export function looksLikeArticleUrl(url: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return false;
  }

  const path = parsed.pathname;
  const segments = path.split("/").filter(Boolean);
  if (segments.length === 0) return false;

  // A date-based path, e.g. /2026/07/18/… (§12).
  if (/\/(19|20)\d{2}\/\d{1,2}\/\d{1,2}\//.test(path)) return true;

  // A numeric article id anywhere in the path, e.g. /news/12345 or /a-slug-98765.
  if (/\d{5,}/.test(path)) return true;

  const last = segments[segments.length - 1];

  // A long hyphenated story slug, e.g. /world/big-story-about-something-happening.
  const words = last.split("-").filter(Boolean);
  if (words.length >= 4 && last.length >= 20) return true;

  // Common article path markers with a slug after them.
  if (/\/(article|story|news|articles|stories)\//i.test(path) && last.length >= 8) {
    return true;
  }

  return false;
}

/**
 * Full candidate gate: keep a URL only when it is not a non-article page AND it
 * looks like an article detail URL. When uncertain, reject (§12 stricter
 * choice).
 *
 * `parser` is the per-source strategy hook from `sources.parser` (§11/§12). A
 * source whose detail URLs are opaque (no date/id/long slug) can be marked
 * `"loose"` so the positive article-shape check is relaxed while the
 * non-article reject list still applies. Any other value keeps the default
 * strict behaviour.
 */
export function isArticleCandidate(url: string, parser?: string | null): boolean {
  if (isNonArticleUrl(url)) return false;
  if (parser === "loose") return true;
  if (!looksLikeArticleUrl(url)) return false;
  return true;
}
