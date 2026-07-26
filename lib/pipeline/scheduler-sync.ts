import "server-only";
import type { SyncSummary } from "@/lib/pipeline/types";
import {
  SCHEDULER_CRON,
  SCHEDULE_END_TIME,
} from "@/lib/pipeline/limits";
import {
  createSchedule,
  listScheduleIds,
  setScheduleState,
} from "@/lib/scraping/scheduler";
import { getActiveSources } from "@/lib/supabase/queries/sources";
import {
  getAllSchedules,
  insertSchedule,
  deactivateSchedule,
} from "@/lib/supabase/queries/schedules";
import { writeLog } from "@/lib/supabase/queries/logs";

// Oxylabs schedule sync (AGENTS.md §18). Creates one Oxylabs schedule per active
// source that lacks one, stores the schedule_id (text, precision-safe), then
// deactivates orphaned Oxylabs schedules not present in the DB. Idempotent: a
// re-run creates nothing new when every active source already has a schedule.

const LOG_SCOPE = "scheduler";

function log(message: string, extra?: Record<string, unknown>): void {
  if (extra) console.log(`[${LOG_SCOPE}] ${message}`, extra);
  else console.log(`[${LOG_SCOPE}] ${message}`);
}

export async function syncSchedules(): Promise<SyncSummary> {
  const start = Date.now();
  let schedulesCreated = 0;
  let schedulesSkipped = 0;
  let orphansDeactivated = 0;
  let staleDeactivated = 0;
  let errors = 0;

  log("sync started");

  const activeSources = await getActiveSources();
  const existing = await getAllSchedules();

  // Source ids that already have an ACTIVE schedule row → skip (idempotency).
  const activeScheduledSourceIds = new Set(
    existing.filter((s) => s.active && s.source_id).map((s) => s.source_id as string),
  );

  log("active sources loaded", {
    activeSources: activeSources.length,
    existingSchedules: existing.length,
  });

  // 1. create a schedule for each active source lacking an active one.
  for (const source of activeSources) {
    if (activeScheduledSourceIds.has(source.id)) {
      schedulesSkipped++;
      continue;
    }
    try {
      const scheduleId = await createSchedule({
        cron: SCHEDULER_CRON,
        endTime: SCHEDULE_END_TIME,
        items: [{ source: "universal", url: source.listing_url, render: "html" }],
      });
      const outcome = await insertSchedule({
        schedule_id: scheduleId,
        source_id: source.id,
        active: true,
        cron: SCHEDULER_CRON,
      });
      if (outcome === "inserted") {
        schedulesCreated++;
        activeScheduledSourceIds.add(source.id);
        log(`schedule created: ${source.name}`, { scheduleId });
      } else {
        errors++;
      }
    } catch (err) {
      errors++;
      console.error(`[${LOG_SCOPE}] create schedule failed (${source.name}):`, err);
    }
  }

  // 2. deactivate DB schedules whose source is no longer active (clean up).
  const activeSourceIds = new Set(activeSources.map((s) => s.id));
  for (const row of existing) {
    if (!row.active) continue;
    if (row.source_id && !activeSourceIds.has(row.source_id)) {
      try {
        await setScheduleState(row.schedule_id, false);
        await deactivateSchedule(row.schedule_id);
        staleDeactivated++;
        log(`stale schedule deactivated`, { scheduleId: row.schedule_id });
      } catch (err) {
        errors++;
        console.error(`[${LOG_SCOPE}] stale deactivation failed:`, err);
      }
    }
  }

  // 3. orphan deactivation (§18): any Oxylabs schedule not present in the DB is
  // deactivated so it stops running hourly and billing.
  try {
    const oxyIds = await listScheduleIds();
    const dbIds = new Set(
      (await getAllSchedules()).map((s) => s.schedule_id),
    );
    for (const oxyId of oxyIds) {
      if (!dbIds.has(oxyId)) {
        try {
          await setScheduleState(oxyId, false);
          orphansDeactivated++;
          log(`orphan schedule deactivated`, { scheduleId: oxyId });
        } catch (err) {
          errors++;
          console.error(`[${LOG_SCOPE}] orphan deactivation failed (${oxyId}):`, err);
        }
      }
    }
  } catch (err) {
    errors++;
    console.error(`[${LOG_SCOPE}] orphan listing failed:`, err);
  }

  const summary: SyncSummary = {
    status: "completed",
    activeSources: activeSources.length,
    schedulesCreated,
    schedulesSkipped,
    orphansDeactivated,
    staleDeactivated,
    totalDurationMs: Date.now() - start,
    errors,
  };

  log("sync completed", { ...summary });
  await writeLog({
    level: errors > 0 ? "warn" : "info",
    scope: LOG_SCOPE,
    message: "Schedule sync completed",
    context: { ...summary },
  });

  return summary;
}
