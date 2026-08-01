import "server-only";
import type { SourceRow } from "@/lib/supabase/types";
import type {
  PipelineOptions,
  RejectionReason,
  ScrapeSummary,
  SourceResult,
} from "@/lib/pipeline/types";
import {
  MAX_DETAIL_SCRAPES_PER_SOURCE,
} from "@/lib/pipeline/limits";
import { extractHomepageLinks, isArticleCandidate } from "@/lib/parsing/links";
import { dedupeUrls, normalizeTitle, slugify } from "@/lib/parsing/url";
import { parseAndValidateArticle } from "@/lib/parsing/article";
import {
  getExistingOriginalUrls,
  getExistingTitles,
  insertArticle,
} from "@/lib/supabase/queries/articles";
import { writeLog } from "@/lib/supabase/queries/logs";

// The canonical scrape-to-insert engine (AGENTS.md §9 steps 1–9). It is
// PROVIDER-AGNOSTIC: homepage + detail HTML arrive through injected providers
// (PipelineOptions), so manual scraping (live Oxylabs) and the future scheduler
// (completed Oxylabs job results, §18) reuse this identical extract → filter →
// dedupe → detail-scrape → validate → clean → insert → log core with no
// branching on the trigger. Do not add manual-only or scheduler-only logic here.

const LOG_SCOPE = "scrape";

// Neat, greppable console line for the dev-server terminal (§17).
function log(message: string, extra?: Record<string, unknown>): void {
  if (extra) console.log(`[${LOG_SCOPE}] ${message}`, extra);
  else console.log(`[${LOG_SCOPE}] ${message}`);
}

function bump(
  reasons: Partial<Record<RejectionReason, number>>,
  reason: RejectionReason,
): void {
  reasons[reason] = (reasons[reason] ?? 0) + 1;
}

/** Run the full pipeline over the provided sources and return the §9 summary. */
export async function runScrapePipeline(
  options: PipelineOptions,
): Promise<ScrapeSummary> {
  const { sources, perSource, getHomepageHtml, getDetailHtml } = options;
  const start = Date.now();

  const rejectionReasons: Partial<Record<RejectionReason, number>> = {};
  const perSourceResults: SourceResult[] = [];

  // Run-level dedup memory shared across ALL sources (§9/§10). Only canonical URL
  // is cross-source: the same wire story carried verbatim by two outlets under one
  // canonical URL is still one article. Title dedup is intentionally NOT here — it
  // is per-source (see scrapeSource) so different outlets' coverage of the same
  // story survives for §20 Related Articles.
  const seen: RunSeen = {
    canonicalUrls: new Set<string>(),
  };

  log("scrape started", {
    sources: sources.length,
    perSource,
  });
  log(
    "selected sources: " +
      sources.map((s) => s.name).join(", "),
  );

  for (const source of sources) {
    const result = await scrapeSource(source, {
      perSource,
      getHomepageHtml,
      getDetailHtml,
      rejectionReasons,
      seen,
    });
    perSourceResults.push(result);
  }

  const summary: ScrapeSummary = {
    status: "completed",
    sourcesChecked: sources.length,
    candidatesFound: sum(perSourceResults, (r) => r.candidatesFound),
    candidatesRejected: sum(perSourceResults, (r) => r.candidatesRejected),
    duplicatesSkipped: sum(perSourceResults, (r) => r.duplicatesSkipped),
    detailPagesScraped: sum(perSourceResults, (r) => r.detailPagesScraped),
    articlesInserted: sum(perSourceResults, (r) => r.articlesInserted),
    articlesRejected: sum(perSourceResults, (r) => r.articlesRejected),
    articlesFailed: sum(perSourceResults, (r) => r.articlesFailed),
    totalDurationMs: Date.now() - start,
    rejectionReasons,
    perSource: perSourceResults,
  };

  log("scrape completed", {
    inserted: summary.articlesInserted,
    rejected: summary.articlesRejected,
    duplicates: summary.duplicatesSkipped,
    durationMs: summary.totalDurationMs,
  });

  // Mirror the summary into the logs table (§9). writeLog never throws.
  await writeLog({
    level: "info",
    scope: LOG_SCOPE,
    message: "Manual scrape run completed",
    context: { ...summary },
  });

  return summary;
}

interface SourceContext {
  perSource: number;
  getHomepageHtml: PipelineOptions["getHomepageHtml"];
  getDetailHtml: PipelineOptions["getDetailHtml"];
  rejectionReasons: Partial<Record<RejectionReason, number>>;
  seen: RunSeen;
}

/** Run-level dedup memory (§9/§10), shared across every source in one run. */
interface RunSeen {
  canonicalUrls: Set<string>;
}

// Process one source. Per-source errors are isolated: logged + counted, never
// fatal to the whole run (§decision 9).
async function scrapeSource(
  source: SourceRow,
  ctx: SourceContext,
): Promise<SourceResult> {
  const result: SourceResult = {
    sourceId: source.id,
    sourceName: source.name,
    candidatesFound: 0,
    candidatesRejected: 0,
    duplicatesSkipped: 0,
    detailPagesScraped: 0,
    articlesInserted: 0,
    articlesRejected: 0,
    articlesFailed: 0,
  };

  log(`source start: ${source.name}`, { listingUrl: source.listing_url });

  // 1. homepage HTML via injected provider (live fetch or scheduled result).
  let homepageHtml: string;
  try {
    homepageHtml = await ctx.getHomepageHtml(source);
    log(`homepage fetched: ${source.name}`, { bytes: homepageHtml.length });
  } catch (err) {
    result.error = `homepage fetch failed: ${String(err)}`;
    console.error(`[${LOG_SCOPE}] source error (${source.name}):`, err);
    return result;
  }

  // 2. extract visible story-card links (§11).
  const links = extractHomepageLinks(homepageHtml, source.listing_url);

  // 3. reject non-article URLs before any detail scrape (§9/§11/§12).
  const kept: string[] = [];
  for (const url of links) {
    if (isArticleCandidate(url, source.parser)) {
      kept.push(url);
    } else {
      result.candidatesRejected++;
      bump(ctx.rejectionReasons, "non_article_url");
    }
  }
  const candidates = dedupeUrls(kept);
  result.candidatesFound = candidates.length;
  log(`candidate links found: ${source.name}`, {
    total: links.length,
    candidates: candidates.length,
    rejectedPreDetail: result.candidatesRejected,
  });

  // 4. skip URLs already stored (§9 URL existence check, chunked ≤15).
  const existing = await getExistingOriginalUrls(candidates);
  const fresh: string[] = [];
  for (const url of candidates) {
    if (existing.has(url)) {
      result.duplicatesSkipped++;
      bump(ctx.rejectionReasons, "duplicate_in_db");
    } else {
      fresh.push(url);
    }
  }
  log(`duplicates skipped: ${source.name}`, {
    duplicates: result.duplicatesSkipped,
    fresh: fresh.length,
  });

  // Per-source title memory (§10). Scoped to THIS source only so one outlet's
  // re-publish of the same headline is caught, while another outlet's coverage of
  // the same story is kept (needed for §20 Related Articles).
  const seenTitles = new Set<string>();

  // 5. detail-scrape → validate → insert until perSource valid articles, with a
  // hard cap on scrape attempts so one source stays bounded.
  let attempts = 0;
  for (const url of fresh) {
    if (result.articlesInserted >= ctx.perSource) break;
    if (attempts >= MAX_DETAIL_SCRAPES_PER_SOURCE) break;
    attempts++;

    let detailHtml: string;
    try {
      detailHtml = await ctx.getDetailHtml(url);
      result.detailPagesScraped++;
    } catch (err) {
      result.articlesFailed++;
      bump(ctx.rejectionReasons, "detail_scrape_failed");
      console.error(`[${LOG_SCOPE}] detail scrape failed (${url}):`, err);
      continue;
    }

    const gate = parseAndValidateArticle(detailHtml, url);
    if (!gate.ok) {
      result.articlesRejected++;
      bump(ctx.rejectionReasons, gate.reason);
      log(`article rejected: ${url}`, { reason: gate.reason });
      continue;
    }

    const { article } = gate;

    // Dedup (§9/§10). Canonical URL + normalized title are only known now, so this
    // runs post-scrape / pre-insert. Canonical URL is checked cross-source; title
    // is checked per-source only, so two outlets covering one story both survive
    // for §20 Related Articles. (Trade-off: a duplicate still costs one detail
    // scrape; guessing from homepage titles is unreliable.)
    const titleKey = normalizeTitle(article.title);
    const canonicalKey = article.canonicalUrl;

    // 6a. seen earlier in THIS run? canonical = any source; title = this source.
    if (
      (canonicalKey && ctx.seen.canonicalUrls.has(canonicalKey)) ||
      (titleKey && seenTitles.has(titleKey))
    ) {
      result.duplicatesSkipped++;
      bump(ctx.rejectionReasons, "duplicate_in_batch");
      log(`duplicate in batch: ${article.title}`, { url });
      continue;
    }

    // 6b. same normalized title already stored in the DB for THIS source?
    if (titleKey) {
      const existingTitles = await getExistingTitles([article.title], source.id);
      if (existingTitles.has(titleKey)) {
        result.duplicatesSkipped++;
        bump(ctx.rejectionReasons, "duplicate_in_db");
        log(`duplicate in db (title): ${article.title}`, { url });
        continue;
      }
    }

    // 7. insert valid article, append-only (§10).
    const outcome = await insertArticle({
      source_id: source.id,
      slug: slugify(article.title, url),
      original_url: url,
      canonical_url: article.canonicalUrl,
      title: article.title,
      image_url: article.imageUrl,
      published_at: article.publishedAt,
      raw_text: article.rawText,
      category: article.category, // section extracted at scrape time (categories feature)
    });

    if (outcome === "inserted") {
      // Only remember successfully-inserted stories so a failed insert doesn't
      // suppress a later genuine retry.
      if (canonicalKey) ctx.seen.canonicalUrls.add(canonicalKey);
      if (titleKey) seenTitles.add(titleKey);
      result.articlesInserted++;
      log(`article inserted: ${article.title}`, { url });
    } else if (outcome === "duplicate") {
      result.duplicatesSkipped++;
      bump(ctx.rejectionReasons, "duplicate_in_db");
    } else {
      result.articlesFailed++;
    }
  }

  log(`source done: ${source.name}`, {
    inserted: result.articlesInserted,
    rejected: result.articlesRejected,
    failed: result.articlesFailed,
    detailScraped: result.detailPagesScraped,
  });

  return result;
}

function sum(rows: SourceResult[], pick: (r: SourceResult) => number): number {
  return rows.reduce((n, r) => n + pick(r), 0);
}
