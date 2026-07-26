import "server-only";
import type {
  AnalysisOptions,
  AnalysisSummary,
  AnalysisFailureReason,
} from "@/lib/pipeline/types";
import { ANALYSIS_BATCH_SIZE } from "@/lib/pipeline/limits";
import { analyzeArticle, AiQuotaError, AiTransientError } from "@/lib/ai/analyze";
import { embedArticle } from "@/lib/ai/embed";
import {
  getPendingArticles,
  saveAnalysis,
  saveEmbedding,
  type PendingArticle,
} from "@/lib/supabase/queries/articles";
import { writeLog } from "@/lib/supabase/queries/logs";

// AI analysis orchestration (AGENTS.md §19 + §20 embeddings). Provider-agnostic
// of the trigger: this same function backs POST /api/analyze now and the §18
// cron pipeline later — so no route- or cron-specific logic lives here.
//
// Flow: detect pending (LEFT-JOIN rule) → process in batches → per article,
// analyze + embed (or embedding-only backfill) → validate (in lib/ai) → save →
// stamp analyzed_at only after both saved → log per-batch + final summary.

const LOG_SCOPE = "analyze";

function log(message: string, extra?: Record<string, unknown>): void {
  if (extra) console.log(`[${LOG_SCOPE}] ${message}`, extra);
  else console.log(`[${LOG_SCOPE}] ${message}`);
}

function bump(
  reasons: Partial<Record<AnalysisFailureReason, number>>,
  reason: AnalysisFailureReason,
): void {
  reasons[reason] = (reasons[reason] ?? 0) + 1;
}

/** Run the analysis pipeline and return the §19 summary object. */
export async function runAnalysisPipeline(
  options: AnalysisOptions = {},
): Promise<AnalysisSummary> {
  const start = Date.now();
  const batchSize =
    options.batchSize && options.batchSize > 0
      ? Math.floor(options.batchSize)
      : ANALYSIS_BATCH_SIZE;

  const failureReasons: Partial<Record<AnalysisFailureReason, number>> = {};
  let analyzed = 0;
  let embeddingsBackfilled = 0;
  let skipped = 0;
  let failed = 0;
  let batches = 0;

  log("analysis started", {
    articleIds: options.articleIds?.length ?? "all",
    limit: options.limit ?? "none",
    batchSize,
  });

  const pending = await getPendingArticles({
    articleIds: options.articleIds,
    limit: options.limit,
  });

  log(`pending articles: ${pending.length}`);

  // Set when a daily-quota error trips fail-fast: stop processing further
  // articles, mark the run failed (§19 decision 1/2).
  let quotaExhausted = false;

  for (let i = 0; i < pending.length; i += batchSize) {
    const batch = pending.slice(i, i + batchSize);
    batches++;
    log(`batch ${batches} started`, { size: batch.length });

    let bAnalyzed = 0;
    let bBackfilled = 0;
    let bFailed = 0;
    let bSkipped = 0;

    for (const article of batch) {
      const outcome = await processArticle(article, failureReasons);
      if (outcome === "analyzed") {
        analyzed++;
        bAnalyzed++;
      } else if (outcome === "backfilled") {
        embeddingsBackfilled++;
        bBackfilled++;
      } else if (outcome === "skipped") {
        skipped++;
        bSkipped++;
      } else if (outcome === "rate_limited") {
        // Daily quota hit — this article failed and the rest are doomed too.
        failed++;
        bFailed++;
        quotaExhausted = true;
        break;
      } else {
        failed++;
        bFailed++;
      }
    }

    log(`batch ${batches} done`, {
      analyzed: bAnalyzed,
      backfilled: bBackfilled,
      skipped: bSkipped,
      failed: bFailed,
    });

    if (quotaExhausted) {
      log("daily quota exhausted — stopping run early");
      break;
    }
  }

  const summary: AnalysisSummary = {
    status: quotaExhausted ? "failed" : "completed",
    pending: pending.length,
    analyzed,
    embeddingsBackfilled,
    skipped,
    failed,
    batches,
    totalDurationMs: Date.now() - start,
    failureReasons,
  };

  log("analysis completed", { ...summary });
  await writeLog({
    scope: LOG_SCOPE,
    message: "analysis run completed",
    context: { ...summary },
  });

  return summary;
}

type ArticleOutcome =
  | "analyzed"
  | "backfilled"
  | "skipped"
  | "failed"
  | "rate_limited";

// Process one pending article: full analysis + embedding, or embedding-only
// backfill. Any failure is counted (with a reason) and never saves a partial row.
async function processArticle(
  article: PendingArticle,
  failureReasons: Partial<Record<AnalysisFailureReason, number>>,
): Promise<ArticleOutcome> {
  // Embedding-only backfill path (§20): analysis row exists, embedding missing.
  if (!article.needsAnalysis) {
    let embedding: number[];
    try {
      embedding = await embedArticle(article.title, article.rawText);
    } catch (err) {
      bump(failureReasons, "embedding_failed");
      log(`embedding failed (backfill): ${article.title}`, {
        error: (err as Error).message,
      });
      return "failed";
    }

    const saved = await saveEmbedding(article.id, embedding);
    if (saved !== "saved") {
      bump(failureReasons, "save_failed");
      return "failed";
    }
    log(`embedding backfilled: ${article.title}`);
    return "backfilled";
  }

  // Full analysis path (§19): analyze + embed, then save both together.
  let analysisFields;
  try {
    analysisFields = await analyzeArticle({
      title: article.title,
      rawText: article.rawText,
    });
  } catch (err) {
    // analyzeArticle classifies its failures (§19). Bucket them correctly
    // instead of blaming every throw on invalid output.
    if (err instanceof AiQuotaError) {
      // Daily quota exhausted — won't recover within this run. Signal the caller
      // to stop early rather than hammering ~30 more doomed calls.
      bump(failureReasons, "rate_limited");
      log(`analysis failed (daily quota): ${article.title}`, {
        error: err.message,
      });
      return "rate_limited";
    }
    if (err instanceof AiTransientError) {
      // Connection / per-minute / other API error — may recover; count it and
      // let the run continue with the next article.
      bump(failureReasons, "ai_call_failed");
      log(`analysis failed (transient): ${article.title}`, {
        error: err.message,
      });
      return "failed";
    }
    // Anything else is invalid/unparseable output that failed schema twice (§19).
    bump(failureReasons, "invalid_ai_output");
    log(`analysis failed: ${article.title}`, { error: (err as Error).message });
    return "failed";
  }

  let embedding: number[];
  try {
    embedding = await embedArticle(article.title, article.rawText);
  } catch (err) {
    bump(failureReasons, "embedding_failed");
    log(`embedding failed: ${article.title}`, { error: (err as Error).message });
    return "failed";
  }

  const saved = await saveAnalysis(article.id, analysisFields, embedding);
  if (saved === "duplicate") {
    // Analyzed by a concurrent run between detection and save — treat as skip.
    return "skipped";
  }
  if (saved !== "saved") {
    bump(failureReasons, "save_failed");
    return "failed";
  }

  log(`analyzed: ${article.title}`);
  return "analyzed";
}
