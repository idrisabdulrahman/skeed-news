import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type {
  OxylabsScheduleRow,
  OxylabsScheduleInsert,
  OxylabsScheduleRunInsert,
} from "@/lib/supabase/types";

// Query layer for the operational scheduler tables (AGENTS.md §18). Service-role
// client only — oxylabs_schedules / oxylabs_schedule_runs have RLS on and no
// public policies, so they are never reachable from the browser. All Oxylabs
// ids are stored/compared as text to preserve 64-bit precision (§18).

// ─── oxylabs_schedules ──────────────────────────────────────────────────────

/** Insert a new schedule row (§18). One row per active source. */
export async function insertSchedule(
  row: OxylabsScheduleInsert,
): Promise<"inserted" | "error"> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("oxylabs_schedules").insert(row);
  if (error) {
    console.error("[queries/schedules] insertSchedule failed:", error.message);
    return "error";
  }
  return "inserted";
}

/** All active schedule rows (§18 processing input). */
export async function getActiveSchedules(): Promise<OxylabsScheduleRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("oxylabs_schedules")
    .select("*")
    .eq("active", true)
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[queries/schedules] getActiveSchedules failed:", error.message);
    return [];
  }
  return data ?? [];
}

/** Every schedule row (active or not) — the list route + orphan diff (§18). */
export async function getAllSchedules(): Promise<OxylabsScheduleRow[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("oxylabs_schedules")
    .select("*")
    .order("created_at", { ascending: true });
  if (error) {
    console.error("[queries/schedules] getAllSchedules failed:", error.message);
    return [];
  }
  return data ?? [];
}

/**
 * Schedule rows joined to their source name, for `GET /api/oxylabs/schedules`.
 * Fetches the join without a joined-table filter (§21 gotcha) and shapes in JS.
 */
export interface ScheduleWithSource {
  id: string;
  scheduleId: string;
  sourceId: string | null;
  sourceName: string | null;
  active: boolean;
  cron: string | null;
  createdAt: string;
  updatedAt: string;
}

interface JoinedScheduleRow extends OxylabsScheduleRow {
  sources: { id: string; name: string } | { id: string; name: string }[] | null;
}

export async function getSchedulesWithSource(): Promise<ScheduleWithSource[]> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("oxylabs_schedules")
    .select("*, sources(id, name)")
    .order("created_at", { ascending: true });
  if (error) {
    console.error(
      "[queries/schedules] getSchedulesWithSource failed:",
      error.message,
    );
    return [];
  }

  const rows = (data ?? []) as unknown as JoinedScheduleRow[];
  return rows.map((row) => {
    const source = Array.isArray(row.sources) ? row.sources[0] ?? null : row.sources;
    return {
      id: row.id,
      scheduleId: row.schedule_id,
      sourceId: row.source_id,
      sourceName: source?.name ?? null,
      active: row.active,
      cron: row.cron,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    };
  });
}

/** Mark a DB schedule row inactive by its Oxylabs schedule_id (§18). */
export async function deactivateSchedule(
  scheduleId: string,
): Promise<"updated" | "error"> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase
    .from("oxylabs_schedules")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("schedule_id", scheduleId);
  if (error) {
    console.error("[queries/schedules] deactivateSchedule failed:", error.message);
    return "error";
  }
  return "updated";
}

// ─── oxylabs_schedule_runs ──────────────────────────────────────────────────

/**
 * Record a processed run/job (§18). Idempotent: the unique
 * (schedule_id, run_id, job_id) constraint turns a re-process into a skip, not
 * an error. Returns 'duplicate' when the job was already recorded.
 */
export async function recordScheduleRun(
  row: OxylabsScheduleRunInsert,
): Promise<"recorded" | "duplicate" | "error"> {
  const supabase = getSupabaseAdminClient();
  const { error } = await supabase.from("oxylabs_schedule_runs").insert(row);
  if (!error) return "recorded";
  if (error.code === "23505") return "duplicate";
  console.error("[queries/schedules] recordScheduleRun failed:", error.message);
  return "error";
}

/**
 * Job ids already processed for a schedule (§18 — skip re-processing done jobs).
 * Returned as a Set for O(1) membership checks. Only non-null job ids.
 */
export async function getProcessedJobIds(
  scheduleId: string,
): Promise<Set<string>> {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("oxylabs_schedule_runs")
    .select("job_id")
    .eq("schedule_id", scheduleId);
  if (error) {
    console.error("[queries/schedules] getProcessedJobIds failed:", error.message);
    return new Set();
  }
  const ids = new Set<string>();
  for (const row of data ?? []) {
    if (row.job_id) ids.add(row.job_id);
  }
  return ids;
}

/** Recent recorded runs for `GET /api/oxylabs/runs` (read route). */
export async function getRecentRuns(limit = 50) {
  const supabase = getSupabaseAdminClient();
  const { data, error } = await supabase
    .from("oxylabs_schedule_runs")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    console.error("[queries/schedules] getRecentRuns failed:", error.message);
    return [];
  }
  return data ?? [];
}
