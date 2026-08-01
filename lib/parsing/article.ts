import "server-only";
import * as cheerio from "cheerio";
import type { CheerioAPI } from "cheerio";
import type { RejectionReason } from "@/lib/pipeline/types";
import {
  MIN_BODY_CHARS,
  MIN_BODY_PARAGRAPHS,
  MIN_PARAGRAPH_CHARS,
} from "@/lib/pipeline/limits";

// Article detail-page parse, cleanup, and the validation gate (AGENTS.md §13).
// Pure parsing over an HTML string — no network, no secrets.

export interface ParsedArticle {
  title: string;
  imageUrl: string; // required by the content gate (§13)
  publishedAt: string; // ISO string, required by the content gate (§13)
  canonicalUrl: string | null;
  category: string | null; // section extracted from meta/JSON-LD (categories feature)
  paragraphs: string[];
  rawText: string;
}

export type ArticleGateResult =
  | { ok: true; article: ParsedArticle }
  | { ok: false; reason: RejectionReason };

// Selectors whose whole subtrees are noise and must be scrubbed before we read
// body text (§13): scripts/styles, ads, newsletters, subscription, related,
// most-viewed, load-more, social share, nav chrome.
const NOISE_SELECTORS = [
  "script",
  "style",
  "noscript",
  "iframe",
  "svg",
  "form",
  "nav",
  "header",
  "footer",
  "aside",
  "figure figcaption",
  "[class*='ad-']",
  "[class*='advert']",
  "[id*='advert']",
  "[class*='newsletter']",
  "[class*='subscribe']",
  "[class*='subscription']",
  "[class*='related']",
  "[class*='most-read']",
  "[class*='most-viewed']",
  "[class*='trending']",
  "[class*='recommend']",
  "[class*='load-more']",
  "[class*='social']",
  "[class*='share']",
  "[class*='promo']",
  "[class*='sponsor']",
  "[class*='cookie']",
  "[class*='breadcrumb']",
  "[class*='nav']",
  "[class*='menu']",
  "[role='navigation']",
  "[role='complementary']",
  "[aria-hidden='true']",
].join(", ");

// Generic titles that mark a listing/section/show page, not one article (§13).
const GENERIC_TITLE = new Set(
  [
    "home",
    "homepage",
    "news",
    "latest",
    "latest news",
    "breaking news",
    "top stories",
    "world",
    "world news",
    "politics",
    "business",
    "sport",
    "sports",
    "video",
    "videos",
    "live",
    "search",
    "not found",
    "404",
    "page not found",
    "error",
  ].map((s) => s.toLowerCase()),
);

/** Parse and validate a detail page against the content gate (§13). */
export function parseAndValidateArticle(
  html: string,
  url: string,
): ArticleGateResult {
  const $ = cheerio.load(html);

  const title = extractTitle($);
  const imageUrl = extractImageUrl($, url);
  const publishedAt = extractPublishedAt($);
  const canonicalUrl = extractCanonical($, url);
  // Category must be read BEFORE the noise scrub — breadcrumbs and section
  // chrome are removed by NOISE_SELECTORS below, and this comes from
  // meta/JSON-LD, so keep the ordering explicit.
  const category = extractCategory($);

  // Scrub noise, then read body from the best article container.
  $(NOISE_SELECTORS).remove();
  const paragraphs = extractParagraphs($);
  const rawText = paragraphs.join("\n\n");

  // ── gate (§13) ────────────────────────────────────────────────────────────
  if (!title) return { ok: false, reason: "generic_title" };
  if (GENERIC_TITLE.has(title.toLowerCase())) {
    return { ok: false, reason: "generic_title" };
  }
  if (!imageUrl) return { ok: false, reason: "missing_image" };
  if (!publishedAt) return { ok: false, reason: "missing_published_at" };

  // Canonical must not point back at a listing/section page. A canonical that
  // is just the origin (no path) signals a non-article page.
  if (canonicalUrl && isBareHost(canonicalUrl)) {
    return { ok: false, reason: "no_article_subject" };
  }

  const meaningful = paragraphs.filter((p) => p.length >= MIN_PARAGRAPH_CHARS);
  const totalChars = meaningful.reduce((n, p) => n + p.length, 0);

  // Body passes by ≥3 meaningful paragraphs OR ≥900 clean chars (§13). Do not
  // reject solely because extraction yielded one paragraph.
  const passesByParagraphs = meaningful.length >= MIN_BODY_PARAGRAPHS;
  const passesByChars = totalChars >= MIN_BODY_CHARS;
  if (!passesByParagraphs && !passesByChars) {
    return { ok: false, reason: "thin_body" };
  }

  return {
    ok: true,
    article: {
      title,
      imageUrl,
      publishedAt,
      canonicalUrl,
      category,
      paragraphs: meaningful.length > 0 ? meaningful : paragraphs,
      rawText,
    },
  };
}

// ── field extraction ──────────────────────────────────────────────────────

function extractTitle($: CheerioAPI): string {
  const candidates = [
    $("meta[property='og:title']").attr("content"),
    $("meta[name='twitter:title']").attr("content"),
    $("h1").first().text(),
    $("title").text(),
  ];
  for (const c of candidates) {
    const t = clean(c);
    if (t && t.length >= 8) return t;
  }
  return "";
}

function extractImageUrl($: CheerioAPI, base: string): string | null {
  const candidates = [
    $("meta[property='og:image']").attr("content"),
    $("meta[property='og:image:url']").attr("content"),
    $("meta[name='twitter:image']").attr("content"),
    $("article img").first().attr("src"),
  ];
  for (const c of candidates) {
    const v = c?.trim();
    if (!v) continue;
    try {
      const abs = new URL(v, base).toString();
      if (abs.startsWith("http")) return abs;
    } catch {
      // ignore malformed
    }
  }
  return null;
}

function extractPublishedAt($: CheerioAPI): string | null {
  const candidates: (string | undefined)[] = [
    $("meta[property='article:published_time']").attr("content"),
    $("meta[name='article:published_time']").attr("content"),
    $("meta[property='og:published_time']").attr("content"),
    $("meta[name='og:published_time']").attr("content"),
    $("meta[itemprop='datePublished']").attr("content"),
    $("meta[name='date']").attr("content"),
    $("meta[name='pubdate']").attr("content"),
    $("meta[name='publish-date']").attr("content"),
    $("meta[name='parsely-pub-date']").attr("content"),
    $("time[datetime]").first().attr("datetime"),
    $("time[pubdate]").first().attr("datetime"),
  ];

  // JSON-LD dates as a structured fallback. Gather these BEFORE evaluating the
  // candidate list — the previous code looped candidates first, so this block
  // (which pushes here) never contributed. Prefer datePublished, then
  // dateModified, then uploadDate; scan @graph arrays too (regex handles both
  // flat objects and nested graphs without a strict JSON parse).
  $("script[type='application/ld+json']").each((_, el) => {
    const raw = $(el).text();
    candidates.push(
      findJsonLdDate(raw, "datePublished"),
      findJsonLdDate(raw, "dateModified"),
      findJsonLdDate(raw, "uploadDate"),
    );
  });

  for (const c of candidates) {
    const iso = toIso(c);
    if (iso) return iso;
  }
  return null;
}

function extractCanonical($: CheerioAPI, base: string): string | null {
  const href =
    $("link[rel='canonical']").attr("href") ||
    $("meta[property='og:url']").attr("content");
  if (!href) return null;
  try {
    return new URL(href, base).toString();
  } catch {
    return null;
  }
}

/**
 * Extract the section/category for the categories feature. Chain (prompt
 * decision): `article:section` meta → `og:section` meta → JSON-LD
 * `articleSection`. Null when none is present — category is optional.
 */
function extractCategory($: CheerioAPI): string | null {
  const candidates: (string | undefined)[] = [
    $("meta[property='article:section']").attr("content"),
    $("meta[name='article:section']").attr("content"),
    $("meta[property='og:section']").attr("content"),
  ];

  $("script[type='application/ld+json']").each((_, el) => {
    const raw = $(el).text();
    // A @graph block can carry many articleSection values; take the first.
    const re = /"articleSection"\s*:\s*"([^"]+)"/;
    const m = raw.match(re);
    if (m) candidates.push(m[1]);
  });

  for (const c of candidates) {
    const label = clean(c);
    // Reject meta noise: bare booleans, empty, or over-long section strings.
    if (!label || label.length > 60) continue;
    if (label.length < 2) continue;
    return label;
  }
  return null;
}

/**
 * Extract body paragraphs from the most article-like container. If the best
 * container yields a single large blob, split it into sentences so the content
 * gate can measure it (§13 — never reject solely for one paragraph).
 */
function extractParagraphs($: CheerioAPI): string[] {
  const container = pickArticleContainer($);
  const scope = container ?? $("body");

  const paras: string[] = [];
  scope.find("p").each((_, el) => {
    const t = clean($(el).text());
    if (t) paras.push(t);
  });

  if (paras.length >= 2) return paras;

  // One blob → split on sentence boundaries as a fallback.
  const blob = clean(scope.text());
  if (!blob) return paras;
  const sentences = blob
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'])/)
    .map((s) => s.trim())
    .filter(Boolean);
  return sentences.length > 1 ? sentences : [blob];
}

// Choose the container most likely to hold the article body.
function pickArticleContainer($: CheerioAPI) {
  const selectors = [
    "article",
    "[itemprop='articleBody']",
    "[class*='article-body']",
    "[class*='articleBody']",
    "[class*='story-body']",
    "[class*='post-content']",
    "[class*='entry-content']",
    "main",
  ];
  for (const sel of selectors) {
    const el = $(sel).first();
    if (el.length && el.find("p").length >= 2) return el;
  }
  // Fall back to whichever candidate has the most <p> text.
  let best: ReturnType<CheerioAPI> | null = null;
  let bestLen = 0;
  for (const sel of selectors) {
    const el = $(sel).first();
    if (!el.length) continue;
    const len = el.text().length;
    if (len > bestLen) {
      best = el;
      bestLen = len;
    }
  }
  return best;
}

// ── helpers ─────────────────────────────────────────────────────────────────

function clean(value: string | undefined | null): string {
  if (!value) return "";
  return value.replace(/\s+/g, " ").trim();
}

function toIso(value: string | undefined | null): string | null {
  if (!value) return null;
  const d = new Date(value.trim());
  if (Number.isNaN(d.getTime())) return null;
  // Reject absurd dates (parser catching a stray number).
  const year = d.getFullYear();
  if (year < 1990 || year > 2100) return null;
  return d.toISOString();
}

function isBareHost(url: string): boolean {
  try {
    const u = new URL(url);
    return u.pathname === "/" || u.pathname === "";
  } catch {
    return true;
  }
}

function findJsonLdDate(jsonLd: string, key: string): string | undefined {
  // Cheap extraction without a full JSON parse (LD blocks are sometimes arrays,
  // nested in @graph, or contain invalid trailing commas). Grab the first value
  // for the requested date key anywhere in the block.
  const re = new RegExp(`"${key}"\\s*:\\s*"([^"]+)"`);
  const m = jsonLd.match(re);
  return m ? m[1] : undefined;
}
