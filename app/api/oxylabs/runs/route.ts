import { NextResponse } from "next/server";
import { getRecentRuns } from "@/lib/supabase/queries/schedules";

// GET /api/oxylabs/runs — read route for recently recorded scheduled runs
// (AGENTS.md §14/§18). No admin secret (read/status route).

export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const runs = await getRecentRuns(50);
  return NextResponse.json({ runs });
}
