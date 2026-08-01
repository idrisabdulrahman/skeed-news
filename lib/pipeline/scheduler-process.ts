import "server-only";
import type { SourceRow } from "@/lib/supabase/types";
import type { SchedulerProcessSummary } from "@/lib/pipeline/types";
import { DEFAULT_PER_SOURCE } from "@/lib/pipeline/limits";
import { runScrapePipeline } from "@/lib/pipeline/scrape";
import { scrapeHtml } from "@/lib/scraping/provider";
import {
  getScheduleRuns,
  fetchJobResultHtml,
  type ScheduleRun,
} from "@/lib/scraping/scheduler";
import { getActiveSources } from "@/lib/supabase/queries/sources";
import {
  getActiveSchedules,
  getProcessedJobIds,
  recordScheduleRun,
} from "@/lib/supabase/queries/schedules";
import { writeLog } from "@/lib/supabase/queries/logs";

// Scheduled-result processing (AGENTS.md §18). Gathers the latest completed
// (`result_status === "done"`) Oxylabs job per active schedule, fetches its
// stored homepage HTML, then feeds it into the SHARED scrape-to-insert engine
// (runScrapePipeline) via the getHomepageHtml seam — so all validation, cleanup,
// dedupe, URL-existence, and run logging is reused, never duplicated (§18).
// Article DETAIL pages are still scraped live (via the active scraper
// provider); only the homepage HTML comes from scheduled results.

const LOG_SCOPE = "scheduler";

function log(message: string, extra?: Record<string, unknown>): void {
  if (extra) console.log(`[${LOG_SCOPE}] ${message}`, extra);
  else console.log(`[${LOG_SCOPE}] ${message}`);
}

/** The newest `done` job not yet processed for a schedule, or null. */
function pickLatestDoneJob(
  runs: ScheduleRun[],
  processed: Set<string>,
): { runId: string; jobId: string } | null {
  // /runs returns newest-first per Oxylabs; iterate in order and take the first
  // done job we have not already recorded.
  for (const run of runs) {
    for (const job of run.jobs) {
      if (job.resultStatus === "done" && !processed.has(job.id)) {
        return { runId: run.runId, jobId: job.id };
      }
    }
  }
  return null;
}

export async function processScheduledResults(
  perSource: number = DEFAULT_PER_SOURCE,
): Promise<SchedulerProcessSummary> {
  const start = Date.now();
  let doneJobsFound = 0;
  let resultsFetched = 0;
  let resultsFailed = 0;
  let runsRecorded = 0;

  log("process started");

  const [schedules, activeSources] = await Promise.all([
    getActiveSchedules(),
    getActiveSources(),
  ]);
  const sourceById = new Map(activeSources.map((s) => [s.id, s]));

  log("schedules loaded", {
    schedules: schedules.length,
    activeSources: activeSources.length,
  });

  // source_id → homepage HTML from the latest done job. Also collect the sources
  // we actually have HTML for, to pass to the engine.
  const homepageBySourceId = new Map<string, string>();
  const sourcesToScrape: SourceRow[] = [];

  for (const schedule of schedules) {
    if (!schedule.source_id) continue;
    const source = sourceById.get(schedule.source_id);
    if (!source) continue; // source no longer active — skip (stale schedule)

    try {
      const runs = await getScheduleRuns(schedule.schedule_id);
      const processed = await getProcessedJobIds(schedule.schedule_id);
      const pick = pickLatestDoneJob(runs, processed);

      if (!pick) {
        log(`no new done job: ${source.name}`, {
          scheduleId: schedule.schedule_id,
        });
        continue;
      }
      doneJobsFound++;

      let html: string;
      try {
        html = await fetchJobResultHtml(pick.jobId);
        resultsFetched++;
        log(`result fetched: ${source.name}`, {
          jobId: pick.jobId,
          bytes: html.length,
        });
      } catch (err) {
        resultsFailed++;
        console.error(`[${LOG_SCOPE}] fetch result failed (${source.name}):`, err);
        continue;
      }

      homepageBySourceId.set(source.id, html);
      sourcesToScrape.push(source);

      // Record the processed job now (idempotent via unique constraint) so a
      // failed pipeline run does not force a re-fetch of the same homepage.
      const recorded = await recordScheduleRun({
        schedule_id: schedule.schedule_id,
        run_id: pick.runId,
        job_id: pick.jobId,
        result_status: "done",
        processed_at: new Date().toISOString(),
      });
      if (recorded === "recorded") runsRecorded++;
    } catch (err) {
      resultsFailed++;
      console.error(`[${LOG_SCOPE}] schedule processing failed (${source.name}):`, err);
    }
  }

  log("scheduled results gathered", {
    doneJobsFound,
    resultsFetched,
    sourcesToScrape: sourcesToScrape.length,
  });

  // Feed the reused engine only the sources we have homepage HTML for. The
  // getHomepageHtml seam reads the map (§18); detail pages stay live.
  let scrape = null;
  if (sourcesToScrape.length > 0) {
    scrape = await runScrapePipeline({
      sources: sourcesToScrape,
      perSource,
      getHomepageHtml: (source) => {
        const html = homepageBySourceId.get(source.id);
        if (!html) {
          // Should never happen — sourcesToScrape is built from the map — but
          // reject clearly so the engine isolates it per source.
          return Promise.reject(
            new Error(`No scheduled homepage HTML for source ${source.name}`),
          );
        }
        return Promise.resolve(html);
      },
      getDetailHtml: (url) => scrapeHtml(url),
    });
  }

  const summary: SchedulerProcessSummary = {
    status: "completed",
    schedulesChecked: schedules.length,
    doneJobsFound,
    resultsFetched,
    resultsFailed,
    runsRecorded,
    totalDurationMs: Date.now() - start,
    scrape,
  };

  log("process completed", {
    doneJobsFound,
    resultsFetched,
    resultsFailed,
    inserted: scrape?.articlesInserted ?? 0,
    durationMs: summary.totalDurationMs,
  });

  await writeLog({
    level: resultsFailed > 0 ? "warn" : "info",
    scope: LOG_SCOPE,
    message: "Scheduled results processed",
    context: { ...summary },
  });

  return summary;
}
