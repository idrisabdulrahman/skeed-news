// Hand-written Supabase database types for Skeem News (biasly).
// Mirrors supabase/schema.sql exactly. Update both together when the schema
// changes (AGENTS.md §7). The `embedding` column is added in §20.
//
// Shape follows the supabase-js `Database` convention (Tables → Row/Insert/Update)
// so it can be passed to `createClient<Database>()` for typed queries.

import type { SentimentLabel, BiasLabel } from "@/lib/types/article";

// Re-export the shared label unions so DB consumers import them from one place.
export type { SentimentLabel, BiasLabel } from "@/lib/types/article";

export type LogLevel = "debug" | "info" | "warn" | "error";

// ─── sources ──────────────────────────────────────────────────────────────
export type SourceRow = {
  id: string;
  name: string;
  listing_url: string;
  parser: string | null;
  active: boolean;
  logo_url: string | null;
  created_at: string;
}
export type SourceInsert = {
  id?: string;
  name: string;
  listing_url: string;
  parser?: string | null;
  active?: boolean;
  logo_url?: string | null;
  created_at?: string;
}

// ─── articles ─────────────────────────────────────────────────────────────
export type ArticleRow = {
  id: string;
  source_id: string;
  slug: string;
  original_url: string;
  canonical_url: string | null;
  title: string;
  image_url: string;
  published_at: string;
  raw_text: string | null;
  scraped_at: string;
  analyzed_at: string | null;
}
export type ArticleInsert = {
  id?: string;
  source_id: string;
  slug: string;
  original_url: string;
  canonical_url?: string | null;
  title: string;
  image_url: string;
  published_at: string;
  raw_text?: string | null;
  scraped_at?: string;
  analyzed_at?: string | null;
}

// ─── article_analyses ───────────────────────────────────────────────────────
export type ArticleAnalysisRow = {
  id: string;
  article_id: string;
  summary: string;
  sentiment_score: number;
  sentiment_label: SentimentLabel;
  bias_score: number;
  bias_label: BiasLabel;
  left_percentage: number;
  center_percentage: number;
  right_percentage: number;
  confidence: number;
  framing_notes: string | null;
  loaded_terms: string[];
  disclaimer: string | null;
  model: string;
  created_at: string;
  // pgvector embedding (§20). Nullable: the analysis row can precede the
  // embedding backfill. NOTE: PostgREST returns pgvector columns as a
  // JSON-encoded string (e.g. "[0.1,-0.2,…]"), not number[] — callers must
  // normalise with parseEmbedding in lib/supabase/queries/articles.ts.
  embedding: number[] | null;
}
export type ArticleAnalysisInsert = {
  id?: string;
  article_id: string;
  summary: string;
  sentiment_score: number;
  sentiment_label: SentimentLabel;
  bias_score: number;
  bias_label: BiasLabel;
  left_percentage: number;
  center_percentage: number;
  right_percentage: number;
  confidence: number;
  framing_notes?: string | null;
  loaded_terms?: string[];
  disclaimer?: string | null;
  model: string;
  created_at?: string;
  embedding?: number[] | null;
}

// ─── logs ─────────────────────────────────────────────────────────────────
export type LogRow = {
  id: string;
  level: LogLevel;
  scope: string | null;
  message: string;
  context: Record<string, unknown> | null;
  created_at: string;
}
export type LogInsert = {
  id?: string;
  level?: LogLevel;
  scope?: string | null;
  message: string;
  context?: Record<string, unknown> | null;
  created_at?: string;
}

// ─── oxylabs_schedules ──────────────────────────────────────────────────────
export type OxylabsScheduleRow = {
  id: string;
  schedule_id: string;
  source_id: string | null;
  active: boolean;
  cron: string | null;
  created_at: string;
  updated_at: string;
}
export type OxylabsScheduleInsert = {
  id?: string;
  schedule_id: string;
  source_id?: string | null;
  active?: boolean;
  cron?: string | null;
  created_at?: string;
  updated_at?: string;
}

// ─── oxylabs_schedule_runs ────────────────────────────────────────────────
export type OxylabsScheduleRunRow = {
  id: string;
  schedule_id: string;
  run_id: string;
  job_id: string | null;
  result_status: string | null;
  processed_at: string | null;
  created_at: string;
}
export type OxylabsScheduleRunInsert = {
  id?: string;
  schedule_id: string;
  run_id: string;
  job_id?: string | null;
  result_status?: string | null;
  processed_at?: string | null;
  created_at?: string;
}

// ─── saved_articles ─────────────────────────────────────────────────────────
// Per-user bookmarks (Save button). user_id is the Clerk userId string — no
// FK to a users table (Clerk owns user data, §6).
export type SavedArticleRow = {
  id: string;
  user_id: string;
  article_id: string;
  created_at: string;
}
export type SavedArticleInsert = {
  id?: string;
  user_id: string;
  article_id: string;
  created_at?: string;
}

// ─── Database aggregate (supabase-js convention) ────────────────────────────
// The full GenericSchema shape (Tables + Views + Functions + Enums +
// CompositeTypes) is required — if any key is missing, supabase-js fails the
// generic constraint and silently degrades every table to `never`, which then
// surfaces on typed inserts. Each table carries a `Relationships` array for the
// same reason.
export interface Database {
  public: {
    Tables: {
      sources: {
        Row: SourceRow;
        Insert: SourceInsert;
        Update: Partial<SourceInsert>;
        Relationships: [];
      };
      articles: {
        Row: ArticleRow;
        Insert: ArticleInsert;
        Update: Partial<ArticleInsert>;
        Relationships: [];
      };
      article_analyses: {
        Row: ArticleAnalysisRow;
        Insert: ArticleAnalysisInsert;
        Update: Partial<ArticleAnalysisInsert>;
        Relationships: [];
      };
      logs: {
        Row: LogRow;
        Insert: LogInsert;
        Update: Partial<LogInsert>;
        Relationships: [];
      };
      oxylabs_schedules: {
        Row: OxylabsScheduleRow;
        Insert: OxylabsScheduleInsert;
        Update: Partial<OxylabsScheduleInsert>;
        Relationships: [];
      };
      oxylabs_schedule_runs: {
        Row: OxylabsScheduleRunRow;
        Insert: OxylabsScheduleRunInsert;
        Update: Partial<OxylabsScheduleRunInsert>;
        Relationships: [];
      };
      saved_articles: {
        Row: SavedArticleRow;
        Insert: SavedArticleInsert;
        Update: Partial<SavedArticleInsert>;
        Relationships: [];
      };
    };
    // Must use the `{ [_ in never]: never }` idiom, not `Record<string, never>`:
    // the latter has `keyof` = `string`, so `from('logs')` would match the View
    // overload and silently resolve the relation (and its Insert type) to `never`.
    Views: { [_ in never]: never };
    Functions: {
      // match_articles — Related Articles cosine search RPC (§20). Args/Returns
      // mirror the SQL function in supabase/schema.sql. embedding is passed as a
      // string (pgvector text literal) over the wire.
      match_articles: {
        Args: {
          query_embedding: string;
          match_article_id: string;
          match_count?: number;
        };
        Returns: {
          id: string;
          slug: string;
          title: string;
          image_url: string;
          published_at: string;
          sentiment_label: SentimentLabel;
          bias_label: BiasLabel;
          left_percentage: number;
          center_percentage: number;
          right_percentage: number;
          confidence: number;
          distance: number;
        }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
}
