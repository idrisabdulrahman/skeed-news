import { NextResponse } from "next/server";
import { requireAdminSecret } from "@/lib/http/admin-auth";
import { processScheduledResults } from "@/lib/pipeline/scheduler-process";
import { DEFAULT_PER_SOURCE } from "@/lib/pipeline/limits";
import { getPostHogClient } from "@/lib/posthog-server";

// POST /api/oxylabs/scheduled-results/process (AGENTS.md §18).
// On-demand processing of completed Oxylabs scheduled results: fetch done job
// HTML → run the shared scrape-to-insert pipeline → record processed runs.
// Admin-secret protected (§15); thin handler (§5).

// Live network I/O + long-running pipeline; never cache/prerender.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface ProcessBody {
  perSource?: number;
}

async function parseBody(req: Request): Promise<ProcessBody> {
  try {
    const raw = await req.json();
    if (raw && typeof raw === "object") return raw as ProcessBody;
  } catch {
    // empty/invalid body → defaults
  }
  return {};
}

export async function POST(req: Request): Promise<NextResponse> {
  const denied = requireAdminSecret(req);
  if (denied) return denied;

  const body = await parseBody(req);
  const perSource =
    typeof body.perSource === "number" && body.perSource > 0
      ? Math.floor(body.perSource)
      : DEFAULT_PER_SOURCE;

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: "admin",
    event: "oxylabs_scheduled_results_process_triggered",
    properties: { per_source: perSource },
  });
  await posthog.flush();

  const summary = await processScheduledResults(perSource);
  return NextResponse.json(summary);
}
