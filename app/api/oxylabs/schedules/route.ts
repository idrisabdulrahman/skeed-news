import { NextResponse } from "next/server";
import { requireAdminSecret } from "@/lib/http/admin-auth";
import { syncSchedules } from "@/lib/pipeline/scheduler-sync";
import { getSchedulesWithSource } from "@/lib/supabase/queries/schedules";
import { getPostHogClient } from "@/lib/posthog-server";

// /api/oxylabs/schedules (AGENTS.md §18).
//   POST — sync Oxylabs schedules to the active source set (admin secret, §15).
//   GET  — list stored schedule rows with source names (read route, §14).
// Thin handlers: all orchestration/DB logic lives in lib/ (§5).

// Sync does live Oxylabs network I/O; never cache/prerender.
export const dynamic = "force-dynamic";
export const maxDuration = 300;

export async function POST(req: Request): Promise<NextResponse> {
  const denied = requireAdminSecret(req);
  if (denied) return denied;

  const posthog = getPostHogClient();
  posthog.capture({
    distinctId: "admin",
    event: "oxylabs_schedules_sync_triggered",
  });
  await posthog.flush();

  const summary = await syncSchedules();
  return NextResponse.json(summary);
}

export async function GET(): Promise<NextResponse> {
  const schedules = await getSchedulesWithSource();
  return NextResponse.json({ schedules });
}
