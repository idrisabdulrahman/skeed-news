-- Skeem News (biasly) — Supabase schema
-- Source of truth for app data (AGENTS.md §7). Apply via Supabase Dashboard → SQL Editor.
--
-- Covers the six core tables (sources, articles, article_analyses, logs,
-- oxylabs_schedules, oxylabs_schedule_runs) plus the saved_articles
-- user-bookmark table.
--
-- NOTE: the `embedding vector(1536)` column on article_analyses + the IVFFlat
-- cosine index + the match_articles RPC are added per AGENTS.md §20 (pgvector).
--
-- RLS model:
--   • sources, articles, article_analyses  → public display data: RLS on + public SELECT.
--   • logs, oxylabs_schedules, oxylabs_schedule_runs → operational: RLS on, no policies
--     (deny-all to anon/authenticated). Only the service-role client (bypasses RLS) writes.

create extension if not exists pgcrypto;

-- pgvector — powers article_analyses.embedding + Related Articles (§20). Enable
-- it in Supabase Dashboard → Database → Extensions, or via this statement.
create extension if not exists vector;

-- ─────────────────────────────────────────────────────────────────────────────
-- sources
-- Active source homepages the scraper loads (AGENTS.md §7/§8). Homepage entry
-- pages only — never sub-endpoints.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.sources (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  listing_url  text not null unique,           -- homepage URL
  parser       text,                            -- optional parser strategy
  active       boolean not null default true,
  logo_url     text,
  created_at   timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- articles
-- Append-only during scraping (AGENTS.md §10). original_url is the dedupe key.
-- image_url + published_at are required before an article is saved (§7/§13).
-- `slug` is a deliberate extension of §7 to support the /news/[slug] route.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.articles (
  id             uuid primary key default gen_random_uuid(),
  source_id      uuid not null references public.sources (id) on delete cascade,
  slug           text not null unique,
  original_url   text not null unique,          -- dedupe key
  canonical_url  text,
  title          text not null,
  image_url      text not null,                 -- required before save (§7)
  published_at   timestamptz not null,          -- required before save (§7)
  raw_text       text,
  scraped_at     timestamptz not null default now(),
  analyzed_at    timestamptz                     -- null until analysis is saved
);

create index if not exists articles_published_at_idx on public.articles (published_at desc);
create index if not exists articles_source_id_idx     on public.articles (source_id);
create index if not exists articles_analyzed_at_idx    on public.articles (analyzed_at);

-- ─────────────────────────────────────────────────────────────────────────────
-- article_analyses
-- One AI analysis per article (§19). bias_score is derived as
-- (right_percentage − left_percentage) / 100 by the AI layer before insert.
-- Percentages summing to 100 is validated in the AI layer, not enforced in SQL
-- (avoids rounding rejections).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.article_analyses (
  id                uuid primary key default gen_random_uuid(),
  article_id        uuid not null unique references public.articles (id) on delete cascade,
  summary           text not null,
  sentiment_score   double precision not null check (sentiment_score between -1 and 1),
  sentiment_label   text not null check (sentiment_label in ('positive', 'neutral', 'negative')),
  bias_score        double precision not null check (bias_score between -1 and 1),
  bias_label        text not null check (bias_label in ('left', 'center', 'right', 'mixed', 'unclear')),
  left_percentage   double precision not null check (left_percentage between 0 and 100),
  center_percentage double precision not null check (center_percentage between 0 and 100),
  right_percentage  double precision not null check (right_percentage between 0 and 100),
  confidence        double precision not null check (confidence between 0 and 1),
  framing_notes     text,
  loaded_terms      text[] not null default '{}',
  disclaimer        text,
  model             text not null,
  created_at        timestamptz not null default now(),
  -- pgvector embedding (§20). Gemini gemini-embedding-001 at outputDimensionality
  -- 1536 to match this column. Nullable so an analysis row can exist before the
  -- embedding is backfilled (LEFT-JOIN pending detection re-picks it — §19/§20).
  embedding         vector(1536)
);

-- Migration for existing installs: `create table if not exists` above is SKIPPED
-- entirely when article_analyses already exists, so the embedding column is not
-- added retroactively — and the index below would then fail with
-- "column embedding does not exist". This ALTER adds the column to an existing
-- table and is a no-op on a fresh create. Any future column added to an existing
-- table needs its own `add column if not exists` here for the same reason.
alter table public.article_analyses
  add column if not exists embedding vector(1536);

-- IVFFlat cosine index for Related Articles similarity search (§20). `lists`
-- tuned for a small dataset; raise as the corpus grows. Cosine distance (<=>)
-- matches the ordering used by match_articles below.
create index if not exists article_analyses_embedding_idx
  on public.article_analyses
  using ivfflat (embedding vector_cosine_ops)
  with (lists = 100);

-- ─────────────────────────────────────────────────────────────────────────────
-- logs
-- Pipeline run logging (§9 run logging, §16/§19 summaries). Operational only.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.logs (
  id          uuid primary key default gen_random_uuid(),
  level       text not null default 'info' check (level in ('debug', 'info', 'warn', 'error')),
  scope       text,                              -- e.g. 'scrape', 'analyze', 'scheduler'
  message     text not null,
  context     jsonb,                             -- structured run summary / details
  created_at  timestamptz not null default now()
);

create index if not exists logs_created_at_idx on public.logs (created_at desc);
create index if not exists logs_scope_idx       on public.logs (scope);

-- ─────────────────────────────────────────────────────────────────────────────
-- oxylabs_schedules
-- One row per active source schedule (§18). schedule_id is a large 64-bit int
-- stored as text to preserve exact digits (§18 precision warning).
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.oxylabs_schedules (
  id            uuid primary key default gen_random_uuid(),
  schedule_id   text not null unique,            -- Oxylabs schedule id (large int as text)
  source_id     uuid references public.sources (id) on delete set null,
  active        boolean not null default true,
  cron          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ─────────────────────────────────────────────────────────────────────────────
-- oxylabs_schedule_runs
-- Per-run job tracking from /schedules/{id}/runs (§18). run_id / job_id are
-- large 64-bit ints stored as text.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.oxylabs_schedule_runs (
  id             uuid primary key default gen_random_uuid(),
  schedule_id    text not null,                  -- Oxylabs schedule id (large int as text)
  run_id         text not null,                  -- Oxylabs run id (large int as text)
  job_id         text,                           -- Oxylabs job id (large int as text)
  result_status  text,                           -- 'done' | 'pending' | 'faulted'
  processed_at   timestamptz,
  created_at     timestamptz not null default now(),
  unique (schedule_id, run_id, job_id)
);

create index if not exists oxylabs_schedule_runs_schedule_idx on public.oxylabs_schedule_runs (schedule_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- saved_articles
-- Per-user article bookmarks (Save button on the details page). Auth is Clerk,
-- not Supabase Auth (§6), so user_id is the Clerk `sub` string — no FK to a
-- users table (Clerk owns user data). Composite unique (user_id, article_id)
-- makes the toggle idempotent at the DB level; a racing double-save is a
-- no-op, never a duplicate.
-- ─────────────────────────────────────────────────────────────────────────────
create table if not exists public.saved_articles (
  id          uuid primary key default gen_random_uuid(),
  user_id     text not null,                          -- Clerk userId (auth().userId)
  article_id  uuid not null references public.articles (id) on delete cascade,
  created_at  timestamptz not null default now(),
  unique (user_id, article_id)
);

create index if not exists saved_articles_user_id_idx on public.saved_articles (user_id);

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────
alter table public.sources               enable row level security;
alter table public.articles              enable row level security;
alter table public.article_analyses      enable row level security;
alter table public.logs                  enable row level security;
alter table public.oxylabs_schedules     enable row level security;
alter table public.oxylabs_schedule_runs enable row level security;
alter table public.saved_articles        enable row level security;

-- Public read for display tables. Writes go through the service-role client,
-- which bypasses RLS, so no INSERT/UPDATE/DELETE policies are defined.
drop policy if exists "Public read sources" on public.sources;
create policy "Public read sources" on public.sources
  for select to anon, authenticated using (true);

drop policy if exists "Public read articles" on public.articles;
create policy "Public read articles" on public.articles
  for select to anon, authenticated using (true);

drop policy if exists "Public read article_analyses" on public.article_analyses;
create policy "Public read article_analyses" on public.article_analyses
  for select to anon, authenticated using (true);

-- logs / oxylabs_schedules / oxylabs_schedule_runs / saved_articles: RLS
-- enabled, no policies → deny-all to anon/authenticated. Service-role access
-- only. saved_articles is user-private: app users are Clerk identities, not
-- Supabase Auth users, so auth.jwt() is never populated — all bookmark
-- reads/writes go through the service-role client, gated by Clerk auth()
-- userId in /api/saved (§6). RLS is defense-in-depth against accidental
-- exposure, not the primary gate.

-- ─────────────────────────────────────────────────────────────────────────────
-- Data API grants
-- Depending on Data API settings, SQL-created tables may not be auto-exposed.
-- Grant SELECT on the public display tables to anon/authenticated so the
-- publishable read client can reach them (RLS still governs rows).
-- ─────────────────────────────────────────────────────────────────────────────
grant select on public.sources          to anon, authenticated;
grant select on public.articles         to anon, authenticated;
grant select on public.article_analyses to anon, authenticated;

-- ─────────────────────────────────────────────────────────────────────────────
-- match_articles — Related Articles similarity search (§20)
-- supabase-js cannot express the `<=>` cosine-distance ordering directly, so the
-- query lives in this RPC. Returns up to `match_count` analyzed articles ordered
-- by cosine distance to `query_embedding`, excluding `match_article_id` and rows
-- without an embedding. Called from getRelatedArticles via the service-role
-- client. SECURITY DEFINER so it can read regardless of the caller's grants;
-- the pipeline only ever calls it server-side.
-- ─────────────────────────────────────────────────────────────────────────────
create or replace function public.match_articles(
  query_embedding   vector(1536),
  match_article_id  uuid,
  match_count       int default 5
)
returns table (
  id                uuid,
  slug              text,
  title             text,
  image_url         text,
  published_at      timestamptz,
  sentiment_label   text,
  bias_label        text,
  left_percentage   double precision,
  center_percentage double precision,
  right_percentage  double precision,
  confidence        double precision,
  distance          double precision
)
language sql
stable
security definer
set search_path = public
as $$
  select
    a.id,
    a.slug,
    a.title,
    a.image_url,
    a.published_at,
    an.sentiment_label,
    an.bias_label,
    an.left_percentage,
    an.center_percentage,
    an.right_percentage,
    an.confidence,
    (an.embedding <=> query_embedding) as distance
  from public.article_analyses an
  join public.articles a on a.id = an.article_id
  where an.embedding is not null
    and a.id <> match_article_id
  order by an.embedding <=> query_embedding
  limit match_count;
$$;
