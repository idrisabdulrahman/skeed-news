import { NextResponse } from "next/server";
import { processScheduledResults } from "@/lib/pipeline/scheduler-process";
import { runAnalysisPipeline } from "@/lib/pipeline/analyze";
import { writeLog } from "@/lib/supabase/queries/logs";
import type {
  SchedulerProcessSummary,
  AnalysisSummary,
} from "@/lib/pipeline/types";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const LOG_SCOPE = "cron";

function log(message: string, extra?: Record<string, unknown>): void {
  if (extra) console.log(`[${LOG_SCOPE}] ${message}`, extra);
  else console.log(`[${LOG_SCOPE}] ${message}`);
}

/** Cron auth (§18): require the CRON_SECRET bearer token in production; skip in
 *  dev. Returns a 401 Response when unauthorized, or null when allowed. */
function authorizeCron(req: Request): NextResponse | null {
  // Local dev: skip the check so the route can be tested manually (§18).
  if (process.env.NODE_ENV !== "production") return null;

  const expected = process.env.CRON_SECRET;
  if (!expected) {
    // Deployed but no secret configured → fail closed.
    console.error("[cron] CRON_SECRET is not set — rejecting request.");
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const auth = req.headers.get("authorization");
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }
  return null;
}

export async function GET(req: Request): Promise<NextResponse> {
  const denied = authorizeCron(req);
  if (denied) return denied;

  const start = Date.now();
  log("cron pipeline started");

  // ── step 1: process scheduled results ──────────────────────────────────────
  let process: SchedulerProcessSummary | null = null;
  let processError: string | null = null;
  try {
    process = await processScheduledResults();
    log("step 1 (process) done", {
      inserted: process.scrape?.articlesInserted ?? 0,
    });
  } catch (err) {
    processError = String(err);
    console.error("[cron] step 1 (process) failed:", err);
    // Do NOT return — step 2 must still run (§18.6).
  }

  // ── step 2: analyze all pending (always runs) ──────────────────────────────
  let analysis: AnalysisSummary | null = null;
  let analysisError: string | null = null;
  try {
    analysis = await runAnalysisPipeline();
    log("step 2 (analyze) done", { analyzed: analysis.analyzed });
  } catch (err) {
    analysisError = String(err);
    console.error("[cron] step 2 (analyze) failed:", err);
  }

  const body = {
    status: processError || analysisError ? ("partial" as const) : ("completed" as const),
    process,
    processError,
    analysis,
    analysisError,
    totalDurationMs: Date.now() - start,
  };

  log("cron pipeline completed", {
    status: body.status,
    durationMs: body.totalDurationMs,
  });
  await writeLog({
    level: body.status === "completed" ? "info" : "warn",
    scope: LOG_SCOPE,
    message: "Cron pipeline run completed",
    context: { ...body },
  });

  return NextResponse.json(body);
}
