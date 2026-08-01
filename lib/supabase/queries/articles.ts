import "server-only";
import { getSupabaseReadClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  ArticleRow,
  ArticleAnalysisRow,
  ArticleInsert,
  ArticleAnalysisInsert,
  SourceRow,
  SentimentLabel,
  BiasLabel,
} from "@/lib/supabase/types";
import type { ArticleCard, ArticleDetail } from "@/lib/types/article";
import { URL_IN_CHUNK, EMBEDDING_DIMENSIONS } from "@/lib/pipeline/limits";
import { normalizeTitle } from "@/lib/parsing/url";
import { categoryKey } from "@/lib/categories";

// Read layer for the pages. Returns the exact ArticleCard / ArticleDetail shapes
// the UI already consumes so the pages are a drop-in swap from the old mock.
//
// Only ANALYZED articles surface: an article is "analyzed" when a matching
// article_analyses row exists (AGENTS.md §19 LEFT-JOIN semantics — not
// analyzed_at alone). Because that is a joined-table condition, we select the
// join and filter in JS after the query (§21 joined-filter gotcha), never with
// `.eq('article_analyses.id', …)`.

// Shape of a row with its embedded analysis + source (supabase-js nested select).
interface JoinedArticleRow extends ArticleRow {
  article_analyses: ArticleAnalysisRow | ArticleAnalysisRow[] | null;
  sources: Pick<SourceRow, "id" | "name"> | null;
}

const SELECT_WITH_JOINS =
  "*, article_analyses(*), sources(id, name)";

// ─── mappers ────────────────────────────────────────────────────────────────

// A nested to-one relation comes back as an object, but be defensive: normalise
// arrays (some PostgREST relationship shapes) to the first element.
function firstAnalysis(
  value: JoinedArticleRow["article_analyses"],
): ArticleAnalysisRow | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

// PostgREST returns pgvector columns as JSON-encoded strings (e.g.
// "[0.0147,-0.0427,…]") despite the number[] type in lib/supabase/types.ts —
// passing that raw string on caused a double-encode in getRelatedArticles and
// silently hid the Related Stories section (§20). Normalise both runtime forms
// here, once, at the query seam. [] when missing, unparseable, or the wrong
// shape — a vector must be exactly EMBEDDING_DIMENSIONS finite numbers, or it
// is not usable (a truncated/wrong-dim embedding would break match_articles
// and the pending-backfill detection). Callers (and the section) stay safe.
function parseEmbedding(value: string | number[] | null): number[] {
  if (Array.isArray(value)) {
    return value.length === EMBEDDING_DIMENSIONS &&
      value.every((n) => typeof n === "number" && Number.isFinite(n))
      ? value
      : [];
  }
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) &&
      parsed.length === EMBEDDING_DIMENSIONS &&
      parsed.every((n) => typeof n === "number" && Number.isFinite(n))
      ? (parsed as number[])
      : [];
  } catch {
    return [];
  }
}

// UI-only fields not backed by the schema get documented defaults (prompt
// decision 7) rather than speculative columns.
function toArticleCard(
  row: JoinedArticleRow,
  analysis: ArticleAnalysisRow,
): ArticleCard {
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    imageUrl: row.image_url,
    sourceCategory: "News", // UI-only, not persisted
    region: "", // UI-only, not persisted
    sentimentLabel: analysis.sentiment_label,
    biasLabel: analysis.bias_label,
    leftPercentage: analysis.left_percentage,
    centerPercentage: analysis.center_percentage,
    rightPercentage: analysis.right_percentage,
    confidence: analysis.confidence,
    sourcesCount: 1, // no multi-outlet breakdown yet
    publishedAt: row.published_at,
  };
}

// Split a neutral summary into bullet points. Falls back to a single item when
// there are no clear sentence/newline boundaries.
function toSummaryPoints(summary: string): string[] {
  const byNewline = summary
    .split(/\r?\n+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (byNewline.length > 1) return byNewline;

  const bySentence = summary
    .split(/(?<=[.!?])\s+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return bySentence.length > 0 ? bySentence : [summary.trim()];
}

// ~200 words per minute, minimum 1.
function estimateReadMinutes(rawText: string | null): number {
  if (!rawText) return 1;
  const words = rawText.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 200));
}

// Split raw_text into display paragraphs; fall back to the summary if empty.
function toBodyParagraphs(rawText: string | null, summary: string): string[] {
  if (rawText && rawText.trim()) {
    const paras = rawText
      .split(/\r?\n+/)
      .map((p) => p.trim())
      .filter(Boolean);
    if (paras.length > 0) return paras;
  }
  return [summary.trim()];
}

function toArticleDetail(
  row: JoinedArticleRow,
  analysis: ArticleAnalysisRow,
  relatedArticles: ArticleCard[],
): ArticleDetail {
  const sourceName = row.sources?.name ?? "Unknown source";
  return {
    id: row.id,
    slug: row.slug,
    title: row.title,
    imageUrl: row.image_url,
    // imageCaption omitted — not persisted (prompt decision 7).
    author: sourceName, // UI-only fallback: source name
    publishedAt: row.published_at,
    readTimeMinutes: estimateReadMinutes(row.raw_text),
    sourceCategory: "News", // UI-only, not persisted
    region: "", // UI-only, not persisted
    canonicalUrl: row.canonical_url ?? row.original_url,
    body: toBodyParagraphs(row.raw_text, analysis.summary),

    summaryPoints: toSummaryPoints(analysis.summary),
    sentimentScore: analysis.sentiment_score,
    sentimentLabel: analysis.sentiment_label,
    biasLabel: analysis.bias_label,
    leftPercentage: analysis.left_percentage,
    centerPercentage: analysis.center_percentage,
    rightPercentage: analysis.right_percentage,
    biasScore: analysis.bias_score,
    confidence: analysis.confidence,
    framingNotes: analysis.framing_notes ?? "",
    loadedTerms: analysis.loaded_terms ?? [],
    disclaimer: analysis.disclaimer ?? "",
    model: analysis.model,
    summaryGeneratedAt: analysis.created_at,

    // No multi-outlet breakdown exists yet — represent the single source.
    sourcesCount: 1,
    sourceCounts: bucketFor(analysis.bias_label),
    topSources: [{ name: sourceName, biasLabel: analysis.bias_label }],

    relatedArticles, // §20: cosine-nearest via pgvector, [] when no embedding
  };
}

// Place the single source in the L/C/R bucket matching its bias label.
function bucketFor(
  label: ArticleAnalysisRow["bias_label"],
): { left: number; center: number; right: number } {
  if (label === "left") return { left: 1, center: 0, right: 0 };
  if (label === "right") return { left: 0, center: 0, right: 1 };
  return { left: 0, center: 1, right: 0 };
}

// ─── queries ──────────────────────────────────────────────────────────────

// Analyzed articles, newest first, mapped to home-page cards.
export async function getTopArticles(limit = 30): Promise<ArticleCard[]> {
  const supabase = getSupabaseReadClient();
  const { data, error } = await supabase
    .from("articles")
    .select(SELECT_WITH_JOINS)
    .order("published_at", { ascending: false })
    .limit(limit);

  if (error) {
    console.error("[queries/articles] getTopArticles failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as JoinedArticleRow[];
  const cards: ArticleCard[] = [];
  for (const row of rows) {
    const analysis = firstAnalysis(row.article_analyses);
    if (!analysis) continue; // analyzed-only filter, applied in JS (§21)
    cards.push(toArticleCard(row, analysis));
  }
  return cards;
}

// Single analyzed article by slug, mapped to the details shape. Returns null
// when the slug is unknown or the article has no analysis yet.
export async function getArticleBySlug(
  slug: string,
): Promise<ArticleDetail | null> {
  const supabase = getSupabaseReadClient();
  const { data, error } = await supabase
    .from("articles")
    .select(SELECT_WITH_JOINS)
    .eq("slug", slug)
    .maybeSingle();

  if (error) {
    console.error("[queries/articles] getArticleBySlug failed:", error.message);
    return null;
  }
  if (!data) return null;

  const row = data as unknown as JoinedArticleRow;
  const analysis = firstAnalysis(row.article_analyses);
  if (!analysis) return null; // not analyzed yet → treat as not found

  // §20: related articles by cosine similarity. Only when this article has an
  // embedding — otherwise there is nothing to compare, so the section stays hidden.
  const embedding = parseEmbedding(analysis.embedding);
  const related =
    embedding.length > 0 ? await getRelatedArticles(row.id, embedding) : [];

  return toArticleDetail(row, analysis, related);
}

// ─── categories (§9 categories feature) ───────────────────────────────────────

// Categories are the distinct, non-null `category` values on ANALYZED articles,
// sorted by how many articles they hold (largest first, cap 12 — prompt
// decision 3). Categories only appear after the backfill SQL runs, so an empty
// list is a valid state — the masthead then simply omits the chip row.
export async function getCategories(): Promise<string[]> {
  const supabase = getSupabaseReadClient();
  const { data, error } = await supabase
    .from("articles")
    .select("category")
    .not("category", "is", null);

  if (error) {
    console.error("[queries/articles] getCategories failed:", error.message);
    return [];
  }

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    const label = (row as { category: string }).category.trim();
    if (label) counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 12)
    .map(([label]) => label);
}

// Analyzed articles in one category, newest first. The slug match is done in JS
// (§21 joined-filter idiom): category labels like "Business & Markets" contain
// characters that break ILIKE-from-slug patterns, and the dataset is small.
export async function getArticlesByCategory(
  slug: string,
): Promise<ArticleCard[]> {
  const supabase = getSupabaseReadClient();
  const { data, error } = await supabase
    .from("articles")
    .select(SELECT_WITH_JOINS)
    .not("category", "is", null)
    .order("published_at", { ascending: false })
    .limit(100);

  if (error) {
    console.error(
      "[queries/articles] getArticlesByCategory failed:",
      error.message,
    );
    return [];
  }

  const rows = (data ?? []) as unknown as JoinedArticleRow[];
  const cards: ArticleCard[] = [];
  for (const row of rows) {
    if (categoryKey(row.category ?? "") !== slug) continue;
    const analysis = firstAnalysis(row.article_analyses);
    if (!analysis) continue; // analyzed-only filter, applied in JS (§21)
    cards.push(toArticleCard(row, analysis));
  }
  return cards;
}

// ─── write layer (scrape pipeline) ───────────────────────────────────────────
// Writes use the service-role admin client (RLS bypass). Never imported by
// client code — this whole module is `server-only`.

// Postgres unique-violation code — used to treat a racing duplicate as a skip.
const UNIQUE_VIOLATION = "23505";

/**
 * URL existence check (§9): return the subset of `original_url`s already stored.
 * Queried in chunks — never more than URL_IN_CHUNK (15) URLs per `.in()` call,
 * which is a hard PostgREST/§9 constraint.
 */
export async function getExistingOriginalUrls(
  urls: string[],
): Promise<Set<string>> {
  const existing = new Set<string>();
  if (urls.length === 0) return existing;

  const supabase = getSupabaseAdminClient();
  for (let i = 0; i < urls.length; i += URL_IN_CHUNK) {
    const chunk = urls.slice(i, i + URL_IN_CHUNK);
    const { data, error } = await supabase
      .from("articles")
      .select("original_url")
      .in("original_url", chunk);

    if (error) {
      console.error(
        "[queries/articles] getExistingOriginalUrls chunk failed:",
        error.message,
      );
      // Be conservative: on error, assume the chunk is unknown (do not mark as
      // existing) so we don't silently drop real articles. Detail-scrape + the
      // unique constraint remain the backstop.
      continue;
    }
    for (const row of data ?? []) existing.add(row.original_url);
  }
  return existing;
}

/**
 * Title existence check (§9/§10 per-source dedup). Given candidate titles and a
 * sourceId, return the subset already stored for THAT source — compared by
 * NORMALIZED title so near-dupes from the same outlet are caught. Cross-source
 * coverage of the same story is intentionally preserved for §20 Related Articles.
 * Chunked ≤URL_IN_CHUNK, same pattern as getExistingOriginalUrls.
 */
export async function getExistingTitles(
  titles: string[],
  sourceId: string,
): Promise<Set<string>> {
  const existing = new Set<string>();
  if (titles.length === 0) return existing;

  const supabase = getSupabaseAdminClient();
  for (let i = 0; i < titles.length; i += URL_IN_CHUNK) {
    const chunk = titles.slice(i, i + URL_IN_CHUNK);
    const { data, error } = await supabase
      .from("articles")
      .select("title")
      .eq("source_id", sourceId)
      .in("title", chunk);

    if (error) {
      console.error(
        "[queries/articles] getExistingTitles chunk failed:",
        error.message,
      );
      // Be conservative on error: don't mark as existing so we don't drop real
      // articles. The normalized-title match against exact stored titles is a
      // best-effort second line behind the original_url check.
      continue;
    }
    for (const row of data ?? []) {
      const key = normalizeTitle(row.title);
      if (key) existing.add(key);
    }
  }
  return existing;
}

/**
 * Append-only insert (§10). Returns 'duplicate' on a unique-constraint hit
 * (original_url/slug) instead of throwing, so a race with a concurrent run is a
 * skip, not an error. Never updates or deletes existing rows.
 */
export async function insertArticle(
  row: ArticleInsert,
): Promise<"inserted" | "duplicate" | "error"> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("articles").insert(row);

  if (!error) return "inserted";
  if (error.code === UNIQUE_VIOLATION) return "duplicate";

  console.error("[queries/articles] insertArticle failed:", error.message);
  return "error";
}

// ─── AI analysis layer (§19/§20) ─────────────────────────────────────────────

/** An article that needs work this run. */
export interface PendingArticle {
  id: string;
  title: string;
  rawText: string | null;
  /**
   * true  → no analysis row exists yet: run full analysis + embedding (§19).
   * false → analysis row exists but embedding IS NULL: embedding backfill only (§20).
   */
  needsAnalysis: boolean;
}

// Shape of the join used for pending detection (analysis id + embedding only).
interface PendingJoinRow {
  id: string;
  title: string;
  raw_text: string | null;
  article_analyses:
    | { id: string; embedding: number[] | null }
    | { id: string; embedding: number[] | null }[]
    | null;
}

/**
 * Pending-analysis detection (§19.1 / §20). Uses the LEFT-JOIN rule — pending is
 * decided by the presence/absence of an article_analyses row, NOT analyzed_at.
 * Because that is a joined-table condition, we select the join and filter in JS
 * (§21 joined-filter gotcha), never `.eq('article_analyses.col', …)`.
 *
 * Returns two kinds of work:
 *  • needsAnalysis: true  — no analysis row (full analysis + embedding)
 *  • needsAnalysis: false — analysis row exists but embedding is null (backfill)
 *
 * Respects optional articleIds / limit; default is all pending.
 */
export async function getPendingArticles(opts?: {
  articleIds?: string[];
  limit?: number;
}): Promise<PendingArticle[]> {
  const supabase = getSupabaseAdminClient();
  let query = supabase
    .from("articles")
    .select("id, title, raw_text, article_analyses(id, embedding)")
    .order("scraped_at", { ascending: true });

  if (opts?.articleIds && opts.articleIds.length > 0) {
    query = query.in("id", opts.articleIds);
  }

  const { data, error } = await query;
  if (error) {
    console.error("[queries/articles] getPendingArticles failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as PendingJoinRow[];
  const pending: PendingArticle[] = [];

  for (const row of rows) {
    const analysis = Array.isArray(row.article_analyses)
      ? row.article_analyses[0] ?? null
      : row.article_analyses;

    if (!analysis) {
      // No analysis row → full analysis pending (§19).
      pending.push({
        id: row.id,
        title: row.title,
        rawText: row.raw_text,
        needsAnalysis: true,
      });
    } else if (parseEmbedding(analysis.embedding).length === 0) {
      // Analysis exists but no embedding → backfill only (§20).
      pending.push({
        id: row.id,
        title: row.title,
        rawText: row.raw_text,
        needsAnalysis: false,
      });
    }
  }

  if (typeof opts?.limit === "number" && opts.limit > 0) {
    return pending.slice(0, opts.limit);
  }
  return pending;
}

/** DB-ready analysis fields minus the ids the query layer owns. */
type AnalysisFields = Omit<ArticleAnalysisInsert, "article_id" | "embedding">;

/**
 * Save a full analysis + embedding for an article (§19/§20), then mark
 * analyzed_at — only after BOTH are written. Append-only per article: the
 * unique(article_id) constraint makes a re-run a skip, not a duplicate.
 */
export async function saveAnalysis(
  articleId: string,
  fields: AnalysisFields,
  embedding: number[],
): Promise<"saved" | "duplicate" | "error"> {
  const supabase = getSupabaseAdminClient();

  const row: ArticleAnalysisInsert = {
    ...fields,
    article_id: articleId,
    embedding,
  };

  const { error } = await supabase.from("article_analyses").insert(row);
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return "duplicate";
    console.error("[queries/articles] saveAnalysis insert failed:", error.message);
    return "error";
  }

  // analyzed_at only after the analysis row (with embedding) is saved (§19/§20).
  const stamped = await stampAnalyzedAt(articleId);
  return stamped ? "saved" : "error";
}

/**
 * Embedding backfill (§20): update just the embedding on an existing analysis
 * row (no re-analysis), then stamp analyzed_at. For articles whose analysis row
 * exists but embedding IS NULL.
 */
export async function saveEmbedding(
  articleId: string,
  embedding: number[],
): Promise<"saved" | "error"> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("article_analyses")
    .update({ embedding })
    .eq("article_id", articleId);

  if (error) {
    console.error("[queries/articles] saveEmbedding failed:", error.message);
    return "error";
  }
  const stamped = await stampAnalyzedAt(articleId);
  return stamped ? "saved" : "error";
}

// Set analyzed_at now. Separated so both save paths stamp consistently.
async function stampAnalyzedAt(articleId: string): Promise<boolean> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("articles")
    .update({ analyzed_at: new Date().toISOString() })
    .eq("id", articleId);
  if (error) {
    console.error("[queries/articles] stampAnalyzedAt failed:", error.message);
    return false;
  }
  return true;
}

// Row shape returned by the match_articles RPC (§20).
interface MatchArticleRow {
  id: string;
  slug: string;
  title: string;
  image_url: string;
  published_at: string;
  sentiment_label: SentimentLabel;
  bias_label: BiasLabel;
  left_percentage: number;
  center_percentage: number;
  right_percentage: number;
  confidence: number;
  distance: number;
}

/**
 * Related articles by cosine similarity (§20). Calls the match_articles RPC
 * (supabase-js cannot express the `<=>` ordering). Uses the service-role client
 * per §20. Returns up to 5 cards, nearest first. [] on error or no matches.
 */
export async function getRelatedArticles(
  articleId: string,
  embedding: number[],
): Promise<ArticleCard[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase.rpc("match_articles", {
    // pgvector parses its text input as `[1,2,3]` — exactly JSON array form.
    query_embedding: JSON.stringify(embedding),
    match_article_id: articleId,
    match_count: 5,
  });

  if (error) {
    console.error("[queries/articles] getRelatedArticles failed:", error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as MatchArticleRow[];
  return rows.map((r) => ({
    id: r.id,
    slug: r.slug,
    title: r.title,
    imageUrl: r.image_url,
    sourceCategory: "News", // UI-only, not persisted
    region: "", // UI-only, not persisted
    sentimentLabel: r.sentiment_label,
    biasLabel: r.bias_label,
    leftPercentage: r.left_percentage,
    centerPercentage: r.center_percentage,
    rightPercentage: r.right_percentage,
    confidence: r.confidence,
    sourcesCount: 1,
    publishedAt: r.published_at,
  }));
}
