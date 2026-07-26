import { NextResponse } from "next/server";
import { requireAdminSecret } from "@/lib/http/admin-auth";
import { getActiveSources } from "@/lib/supabase/queries/sources";
import { runScrapePipeline } from "@/lib/pipeline/scrape";
import { scrapeHtml } from "@/lib/scraping/oxylabs";
import { DEFAULT_PER_SOURCE } from "@/lib/pipeline/limits";
import { getPostHogClient } from "@/lib/posthog-server";
import type { SourceRow } from "@/lib/supabase/types";

// POST /api/scrape — manual scrape-to-insert action (AGENTS.md §16).
// Thin handler: auth → parse body → build the live Oxylabs provider → run the
// provider-agnostic pipeline → return the §9 summary. All scraping/parsing/DB
// logic lives in lib/ (§5). Admin-secret protected (§15).

// Scraping is long-running and does live network I/O; never cache/prerender.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

interface ScrapeBody {
  sourceIds?: string[];
  perSource?: number;
}

async function parseBody(req: Request): Promise<ScrapeBody> {
  try {
    const raw = await req.json();
    if (raw && typeof raw === "object") return raw as ScrapeBody;
  } catch {
    // empty/invalid body → defaults
  }
  return {};
}

export async function POST(req: Request): Promise<NextResponse> {
  const denied = requireAdminSecret(req);
  if (denied) return denied;

  const body = await parseBody(req);

  // Selection (§8): default to all active sources, else the requested subset.
  const active = await getActiveSources();
  let sources: SourceRow[] = active;
  if (Array.isArray(body.sourceIds) && body.sourceIds.length > 0) {
    const wanted = new Set(body.sourceIds);
    sources = active.filter((s) => wanted.has(s.id));
  }

  if (sources.length === 0) {
    return NextResponse.json(
      { error: "No matching active sources to scrape." },
      { status: 400 },
    );
  }

  const perSource =
    typeof body.perSource === "number" && body.perSource > 0
      ? Math.floor(body.perSource)
      : DEFAULT_PER_SOURCE;

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: "admin",
    event: "scrape_pipeline_triggered",
    properties: {
      source_count: sources.length,
      per_source: perSource,
      source_names: sources.map((s) => s.name),
    },
  });
  await posthog.flush();

  const summary = await runScrapePipeline({
    sources,
    perSource,
    // Live Oxylabs providers — the reuse seam. Homepage and detail HTML both
    // come from a live fetch here; the scheduler (§18) will pass different
    // providers to the same pipeline.
    getHomepageHtml: (source) => scrapeHtml(source.listing_url),
    getDetailHtml: (url) => scrapeHtml(url),
  });

  return NextResponse.json(summary);
}
