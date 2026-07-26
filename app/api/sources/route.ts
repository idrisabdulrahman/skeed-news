import { NextResponse } from "next/server";
import { getActiveSources } from "@/lib/supabase/queries/sources";

// GET /api/sources — read route to inspect active sources before choosing what
// to scrape (AGENTS.md §8). Plain read, no admin secret (§14). Returns the
// fields needed for selection only.

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const sources = await getActiveSources();
  return NextResponse.json({
    sources: sources.map((s) => ({
      id: s.id,
      name: s.name,
      listingUrl: s.listing_url,
    })),
  });
}
