import { NextResponse } from "next/server";
import { requireAdminSecret } from "@/lib/http/admin-auth";
import { runAnalysisPipeline } from "@/lib/pipeline/analyze";
import { getPostHogClient } from "@/lib/posthog-server";
import type { AnalysisOptions } from "@/lib/pipeline/types";

// POST /api/analyze — manual AI analysis action (AGENTS.md §19).
// Thin handler: auth → parse body → run the analysis pipeline → return the
// summary. All AI/validation/DB logic lives in lib/ (§5). Admin-secret
// protected (§15). Defaults to analyzing ALL pending articles; respects an
// optional limit or specific articleIds.

// Analysis does live model I/O and can be long-running; never cache/prerender.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface AnalyzeBody {
  articleIds?: string[];
  limit?: number;
  batchSize?: number;
}

async function parseBody(req: Request): Promise<AnalyzeBody> {
  try {
    const raw = await req.json();
    if (raw && typeof raw === "object") return raw as AnalyzeBody;
  } catch {
    // empty/invalid body → defaults (analyze all pending)
  }
  return {};
}

export async function POST(req: Request): Promise<NextResponse> {
  const denied = requireAdminSecret(req);
  if (denied) return denied;

  const body = await parseBody(req);

  const options: AnalysisOptions = {};
  if (Array.isArray(body.articleIds) && body.articleIds.length > 0) {
    options.articleIds = body.articleIds.filter((id) => typeof id === "string");
  }
  if (typeof body.limit === "number" && body.limit > 0) {
    options.limit = Math.floor(body.limit);
  }
  if (typeof body.batchSize === "number" && body.batchSize > 0) {
    options.batchSize = Math.floor(body.batchSize);
  }

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: "admin",
    event: "analysis_pipeline_triggered",
    properties: {
      has_article_ids: Array.isArray(options.articleIds) && options.articleIds.length > 0,
      limit: options.limit ?? null,
      batch_size: options.batchSize ?? null,
    },
  });
  await posthog.flush();

  const summary = await runAnalysisPipeline(options);
  return NextResponse.json(summary);
}
