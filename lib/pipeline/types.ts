import "server-only";
import type { SourceRow } from "@/lib/supabase/types";

// Typed pipeline results shared by the engine, the routes, and (later) the
// scheduler reuse (AGENTS.md §5/§18). Kept provider-agnostic on purpose.

/**
 * Why a candidate URL or a scraped detail page was rejected. Grouped by count
 * in the final summary (§9 run logging).
 */
export type RejectionReason =
  | "non_article_url" // matched the non-article reject list (§9/§11/§12)
  | "not_article_shaped_url" // did not look like an article detail URL (§12)
  | "duplicate_in_db" // original_url already stored (§9/§10)
  | "duplicate_in_batch" // seen earlier in this same run
  | "detail_scrape_failed" // the scraper provider failed for the detail page
  | "missing_image" // no image_url (§7/§13)
  | "missing_published_at" // no published date (§7/§13)
  | "generic_title" // title is a category/section/show name (§13)
  | "thin_body" // body failed the content gate (§13)
  | "no_article_subject"; // page has no clear single article subject (§13)

/**
 * Signature for supplying a source's homepage HTML. This is the seam that lets
 * the same engine serve manual scraping (live provider fetch — direct or
 * Oxylabs) and the scheduler (completed Oxylabs job results) with no other
 * change (§18).
 */
export type HomepageHtmlProvider = (source: SourceRow) => Promise<string>;

/** Signature for fetching an article detail page's HTML by URL. */
export type DetailHtmlProvider = (url: string) => Promise<string>;

export interface PipelineOptions {
  /** Sources to scrape (already filtered to the caller's selection). */
  sources: SourceRow[];
  /** Max valid articles to insert per source. */
  perSource: number;
  /** Homepage HTML source — the reuse seam (§18). */
  getHomepageHtml: HomepageHtmlProvider;
  /** Article detail-page HTML source. */
  getDetailHtml: DetailHtmlProvider;
}

/** Per-source outcome, folded into the run summary. */
export interface SourceResult {
  sourceId: string;
  sourceName: string;
  candidatesFound: number;
  candidatesRejected: number;
  duplicatesSkipped: number;
  detailPagesScraped: number;
  articlesInserted: number;
  articlesRejected: number;
  articlesFailed: number;
  error?: string;
}

// ─── AI analysis (§19/§20) ───────────────────────────────────────────────────

/** Optional caller controls for a single analysis run (§19). */
export interface AnalysisOptions {
  /** Only analyze these article ids (§19: respect selected ids). */
  articleIds?: string[];
  /** Cap total articles processed this run (§19: respect a limit). */
  limit?: number;
  /** Articles per batch; defaults to ANALYSIS_BATCH_SIZE. */
  batchSize?: number;
}

/** Why an article was skipped or failed during analysis (grouped in the summary). */
export type AnalysisFailureReason =
  | "invalid_ai_output" // failed Zod/schema validation twice (§19)
  | "ai_call_failed" // transient/connection/per-minute error, threw twice
  | "rate_limited" // OpenRouter daily free-tier quota exhausted — run stops early (§19)
  | "embedding_failed" // embedding could not be generated
  | "save_failed"; // DB insert/update failed

/** The final analysis run summary (§19). Returned in the API response + logged. */
export interface AnalysisSummary {
  status: "completed" | "failed";
  /** Pending articles found for this run (after id/limit filtering). */
  pending: number;
  /** Full analyses successfully saved. */
  analyzed: number;
  /** Embedding-only backfills successfully saved (§20). */
  embeddingsBackfilled: number;
  /** Articles skipped (nothing to do / already analyzed mid-run). */
  skipped: number;
  /** Articles that failed and were not saved. */
  failed: number;
  /** Batches processed. */
  batches: number;
  totalDurationMs: number;
  /** Failure reasons grouped by count. */
  failureReasons: Partial<Record<AnalysisFailureReason, number>>;
}

/** The final run summary object (§9). Returned in the API response + logged. */
export interface ScrapeSummary {
  /** `deferred` = skipped by the backlog guard (§16 cautious scraping). */
  status: "completed" | "failed" | "deferred";
  sourcesChecked: number;
  candidatesFound: number;
  candidatesRejected: number;
  duplicatesSkipped: number;
  detailPagesScraped: number;
  articlesInserted: number;
  articlesRejected: number;
  articlesFailed: number;
  totalDurationMs: number;
  /** Rejection reasons grouped by count (§9). */
  rejectionReasons: Partial<Record<RejectionReason, number>>;
  perSource: SourceResult[];
}

// ─── Oxylabs Scheduler (§18) ─────────────────────────────────────────────────

/**
 * Result of syncing Oxylabs schedules to the active source set (§18).
 * Returned by `syncSchedules()` and the schedules route; also logged.
 */
export interface SyncSummary {
  status: "completed" | "failed";
  /** Active sources considered for scheduling. */
  activeSources: number;
  /** New Oxylabs schedules created this run (one per source lacking one). */
  schedulesCreated: number;
  /** Sources skipped because an active schedule row already existed. */
  schedulesSkipped: number;
  /** Oxylabs schedules deactivated because they are not in the DB (orphans, §18). */
  orphansDeactivated: number;
  /** DB schedule rows deactivated because their source is no longer active. */
  staleDeactivated: number;
  totalDurationMs: number;
  /** Non-fatal per-item errors, grouped by count. */
  errors: number;
}

/**
 * Result of processing completed scheduled Oxylabs results (§18).
 * Wraps the shared `ScrapeSummary` from the reused engine plus scheduler-only
 * counters describing how the homepage HTML was gathered.
 */
export interface SchedulerProcessSummary {
  status: "completed" | "failed";
  /** Active schedule rows inspected this run. */
  schedulesChecked: number;
  /** New `done` jobs found (not previously processed). */
  doneJobsFound: number;
  /** Job result HTML documents fetched successfully. */
  resultsFetched: number;
  /** Job results that failed to fetch (non-fatal, isolated). */
  resultsFailed: number;
  /** Processed-run rows recorded in oxylabs_schedule_runs. */
  runsRecorded: number;
  totalDurationMs: number;
  /**
   * The reused scrape-to-insert engine's summary (§9), or null when there were
   * no new done results to feed it this run.
   */
  scrape: ScrapeSummary | null;
}
