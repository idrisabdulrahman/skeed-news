import "server-only";
import { getSupabaseReadClient } from "@/lib/supabase/server";
import type { SourceRow } from "@/lib/supabase/types";

// Active sources for scraping/scheduling selection (AGENTS.md §8). Read-only.
// Returns [] on error rather than throwing into a render path.
export async function getActiveSources(): Promise<SourceRow[]> {
  const supabase = getSupabaseReadClient();
  const { data, error } = await supabase
    .from("sources")
    .select("*")
    .eq("active", true)
    .order("name", { ascending: true });

  if (error) {
    console.error("[queries/sources] getActiveSources failed:", error.message);
    return [];
  }
  return data ?? [];
}
