import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";

// Publishable-key read client for page reads (AGENTS.md §21).
// RLS-enforced: only the public display tables (sources, articles,
// article_analyses) are readable through this client.
//
// Auth is Clerk, not Supabase Auth (§6), so there is no Supabase session to
// carry — no cookie/SSR client is needed. `server-only` keeps this out of
// browser bundles even though the publishable key is browser-safe by design.

let client: SupabaseClient<Database> | null = null;

export function getSupabaseReadClient(): SupabaseClient<Database> {
  if (client) return client;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.",
    );
  }

  client = createClient<Database>(url, publishableKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return client;
}
