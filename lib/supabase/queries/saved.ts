import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { ArticleCard } from "@/lib/types/article";
import type { ArticleAnalysisRow, ArticleRow, SourceRow } from "@/lib/supabase/types";

// Bookmarks (Save button) — per-user, Clerk userId scoped. All reads/writes go
// through the service-role client: RLS on saved_articles is deny-all, and app
// users are Clerk identities, not Supabase Auth users (§6). Every query is
// scoped by the userId from the server — a userId from a request body is never
// trusted (AGENTS.md §21). `server-only` keeps this module out of browser
// bundles.

// Postgres unique-violation code — a racing double-save is treated as a
// success (the row is already there), never an error.
const UNIQUE_VIOLATION = "23505";

/**
 * Toggle a bookmark for a user. Returns the resulting state. Idempotent: the
 * unique (user_id, article_id) constraint makes a concurrent double-save a
 * no-op instead of a duplicate.
 */
export async function toggleSaved(
  userId: string,
  articleId: string,
): Promise<{ saved: boolean; error?: string }> {
  const supabase = getSupabaseAdminClient();

  const { data } = await supabase
    .from("saved_articles")
    .select("id")
    .eq("user_id", userId)
    .eq("article_id", articleId)
    .maybeSingle();

  if (data) {
    const { error } = await supabase
      .from("saved_articles")
      .delete()
      .eq("user_id", userId)
      .eq("article_id", articleId);
    if (error) {
      console.error("[queries/saved] toggleSaved delete failed:", error.message);
      return { saved: true, error: error.message };
    }
    return { saved: false };
  }

  const { error } = await supabase
    .from("saved_articles")
    .insert({ user_id: userId, article_id: articleId });
  if (error) {
    if (error.code === UNIQUE_VIOLATION) return { saved: true }; // race → already saved
    console.error("[queries/saved] toggleSaved insert failed:", error.message);
    return { saved: false, error: error.message };
  }
  return { saved: true };
}

/**
 * Remove a bookmark. Idempotent — deleting a non-existent row is a no-op, so
 * the explicit "remove" path never errors on a stale UI state.
 */
export async function removeSaved(
  userId: string,
  articleId: string,
): Promise<string | null> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("saved_articles")
    .delete()
    .eq("user_id", userId)
    .eq("article_id", articleId);
  if (error) {
    console.error("[queries/saved] removeSaved failed:", error.message);
    return error.message;
  }
  return null;
}

/** Saved article ids for a user, newest saves first (hydrates bookmark state). */
export async function getSavedArticleIds(userId: string): Promise<string[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("saved_articles")
    .select("article_id")
    .eq("user_id", userId)
    .order("created_at", { ascending: false });

  if (error) {
    console.error("[queries/saved] getSavedArticleIds failed:", error.message);
    return [];
  }
  return (data ?? []).map((row) => row.article_id);
}

// Shape of a saved row with its article + analysis + source (supabase-js
// nested select).
interface SavedJoinRow {
  id: string;
  created_at: string;
  articles:
    | (ArticleRow & {
        article_analyses: ArticleAnalysisRow | ArticleAnalysisRow[] | null;
        sources: Pick<SourceRow, "id" | "name"> | null;
      })
    | null;
}

// A nested to-one relation comes back as an object, but be defensive: normalise
// arrays (some PostgREST relationship shapes) to the first element.
function firstAnalysis(
  value: ArticleAnalysisRow | ArticleAnalysisRow[] | null,
): ArticleAnalysisRow | null {
  if (!value) return null;
  return Array.isArray(value) ? value[0] ?? null : value;
}

const SELECT_SAVED_WITH_JOINS =
  "id, created_at, articles(*, article_analyses(*), sources(id, name))";

/**
 * Saved articles for a user mapped to home-page cards, newest saves first.
 * Only analyzed articles surface — same rule as the home page (§19). Because
 * the analyzed-only condition is on a joined table, it is applied in JS after
 * the query (§21 joined-filter gotcha), never `.eq('article_analyses.id', …)`.
 */
export async function getSavedArticles(userId: string): Promise<ArticleCard[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("saved_articles")
    .select(SELECT_SAVED_WITH_JOINS)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(200); // bound the rendered page; bookmarks beyond this are unreachable anyway

  if (error) {
    console.error("[queries/saved] getSavedArticles failed:", error.message);
    return [];
  }

  const cards: ArticleCard[] = [];
  for (const row of (data ?? []) as unknown as SavedJoinRow[]) {
    const article = row.articles;
    const analysis = article ? firstAnalysis(article.article_analyses) : null;
    if (!article || !analysis) continue; // analyzed-only filter, applied in JS (§21)
    cards.push({
      id: article.id,
      slug: article.slug,
      title: article.title,
      imageUrl: article.image_url,
      sourceCategory: article.category ?? "News",
      region: "", // UI-only, not persisted
      sentimentLabel: analysis.sentiment_label,
      biasLabel: analysis.bias_label,
      leftPercentage: analysis.left_percentage,
      centerPercentage: analysis.center_percentage,
      rightPercentage: analysis.right_percentage,
      confidence: analysis.confidence,
      sourcesCount: 1, // no multi-outlet breakdown yet
      publishedAt: article.published_at,
    });
  }
  return cards;
}
