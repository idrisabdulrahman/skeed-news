import "server-only";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import type { LogInsert, LogLevel } from "@/lib/supabase/types";

// Small logs writer for pipeline run logging (AGENTS.md §9/§16/§19).
// Uses the service-role client (RLS-bypass) — logs is an operational table with
// no public policies. Never throws: logging must not break the caller.
export async function writeLog(entry: {
  level?: LogLevel;
  scope?: string;
  message: string;
  context?: Record<string, unknown>;
}): Promise<void> {
  try {
    const supabase = getSupabaseAdminClient();
    const row: LogInsert = {
      level: entry.level ?? "info",
      scope: entry.scope ?? null,
      message: entry.message,
      context: entry.context ?? null,
    };
    const { error } = await supabase.from("logs").insert(row);
    if (error) {
      console.error("[queries/logs] writeLog failed:", error.message);
    }
  } catch (err) {
    console.error("[queries/logs] writeLog threw:", err);
  }
}
