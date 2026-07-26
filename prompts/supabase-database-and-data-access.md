# Prompt: Supabase Database & Data Access

## Goal

Replace the mock data layer entirely with a Supabase-backed data foundation and wire the pages
to it. Data is inserted **manually** (SQL Editor) for now — no pipeline yet. Deliverables:

1. **Schema** — `supabase/schema.sql` creating all six core tables from AGENTS.md §7
   (`sources`, `articles`, `article_analyses`, `logs`, `oxylabs_schedules`,
   `oxylabs_schedule_runs`) with constraints, indexes, and RLS. **No `embedding` column** — that
   is added later in §20 after pgvector is enabled.
2. **Seed** — `supabase/seed.sql` inserting the five example sources (Channels TV, Arise News,
   Fox News, Al Jazeera, The Guardian) as active rows with their homepage `listing_url`s.
3. **Types** — a hand-written `Database` type plus row/insert convenience types in
   `lib/supabase/types.ts`.
4. **Client** — a server-only service-role Supabase client factory (`lib/supabase/admin.ts`) for
   writes/logs, plus a server-only publishable read client (`lib/supabase/server.ts`) for page
   reads so all three env vars are used (see decision 4).
5. **Queries** — typed read functions for the pages (analyzed articles list, single article
   detail, sources) plus a small logs writer, in `lib/supabase/queries/`.
6. **Wire pages** — point the home feed and news detail page at these queries via a mapping
   layer, replacing the mock source, with empty / not-found states. **Remove all mock data.**
7. **Memory + dummy row** — save a project memory documenting the Supabase data-layer
   conventions so future pipelines stay consistent, and hand the user a dummy article SQL block
   to paste into the SQL Editor.

Minimal, responsive, no overbuild (AGENTS.md §1). UI displays stored data only; it never
scrapes, analyzes, or mutates pipeline state (§5).

## Skills read

- `AGENTS.md` / `CLAUDE.md` — full file. Governing sections:
  - §5 architecture (Database layer separate; UI displays stored data only).
  - §6 tech stack: Supabase + pgvector; **Supabase Auth is forbidden** (auth is Clerk).
  - §7 Supabase source of truth — canonical field lists for every table.
  - §11 example source outlets (the seed set is drawn from this list).
  - §19 analysis fields saved to `article_analyses` (schema must hold all of them).
  - §20 pgvector — deferred; `embedding` column is NOT in the initial schema.
  - §21 security + env table + the "Supabase joined table filter gotcha" (no
    `.eq('foreignTable.column', …)` — filter in JS after the query).
  - §22 checks (`typecheck`, `lint`, `build`).
- `.agents/skills/supabase/SKILL.md` — read in full. Applied: verify against changelog/docs
  before implementing (done); RLS on every table in the exposed `public` schema with policies
  matching the real access model; never expose `service_role` to browser code, prefer
  publishable keys for client-reachable code; newly SQL-created tables may need explicit
  `GRANT` to `anon`/`authenticated` for the Data API; pin versions / commit lockfile (already
  satisfied — no new deps).
- Supabase docs verified this session:
  - `supabase.com/changelog.md` — scanned `breaking-change` tags. Only "Upcoming changes to
    Supabase API Keys" is relevant; confirms the publishable-key direction. Nothing breaking for
    plain `createClient` or pgvector here.
  - Auth server-side Next.js guide — confirms the `@supabase/ssr` cookie client exists to carry
    a *Supabase Auth* session. Skeem News uses Clerk and has no Supabase session, so that cookie
    client adds nothing here (decision 4).

## Existing code inspected

- `lib/types/article.ts` — `ArticleCard`, `ArticleDetail`, `SentimentLabel`, `BiasLabel`,
  `OutletBias`. The return contracts the mapping layer must satisfy. **Kept** (not mock).
- `lib/mock/articles.ts`, `lib/mock/articleDetails.ts` — the mock modules. **To be deleted.**
- `app/page.tsx` — imports `mockTopNews`; renders `StoryCard[]`. Rewired + empty state.
- `app/news/[slug]/page.tsx` — server component; `generateStaticParams` +
  `getArticleDetailBySlug(slug)`; Clerk-gated; routes by **slug**. Rewired + not-found state;
  static params handling changes (see requirements).
- `lib/bias.ts` — label→color helpers; confirms the `BiasLabel` union used in DB constraints.
- `.env.example` — `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (+ Clerk);
  no service-role key yet.
- `package.json` — `@supabase/ssr ^0.12.3`, `@supabase/supabase-js ^2.110.7` already installed.
  Next `16.2.10`, React `19`. **No new dependencies required.**
- No `lib/supabase/`, no `supabase/` directory yet.

## Decisions / assumptions

Confirmed with the user:

1. **No mock data remains.** Delete `lib/mock/*`; pages read from Supabase.
2. **Data inserted manually** via SQL Editor; no scraping/analysis in this task.
3. **Seed the five §11 example outlets** as active sources with homepage `listing_url`s:
   - Channels TV — `https://www.channelstv.com`
   - Arise News — `https://www.arise.tv`
   - Fox News — `https://www.foxnews.com`
   - Al Jazeera — `https://www.aljazeera.com`
   - The Guardian — `https://www.theguardian.com`
4. **Env — all three:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`. Two server-only clients so all three are used and read/write
   privileges stay separated (skill guidance):
   - `lib/supabase/server.ts` → **publishable** read client for page reads (RLS-enforced public
     SELECT).
   - `lib/supabase/admin.ts` → **service-role** client (`import "server-only"`) for the logs
     writer and future pipeline writes; bypasses RLS; never imported by client code.
   No `@supabase/ssr` cookie client (Clerk owns auth; no Supabase session). Also update the
   AGENTS.md §21 env table: rename the `NEXT_PUBLIC_SUPABASE_ANON_KEY` row to
   `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` so the doc and `.env.example` agree.
5. **All six core tables** per §7. No `embedding` column (§20 defers it).

Principal-level implementation decisions (confirm on approval):

6. **`slug` column added to `articles`.** The route is `/news/[slug]` and `ArticleDetail`
   carries `slug`, but §7 lists none. Add `slug text unique not null`, derived from title at
   insert time. One deliberate extension of §7, required by the existing URL structure.
7. **UI-only fields not backed by the schema** are mapped with documented defaults (avoids
   speculative columns / overbuild):
   - `sourceCategory` → `"News"`, `region` → `""` (not in §7).
   - `author` → source name fallback; `readTimeMinutes` → derived from `raw_text` word count;
     `imageCaption` → omitted.
   - `summaryPoints` ← `summary` split on sentence/newline boundaries (one item if it doesn't
     split).
   - `sourcesCount`/`sourceCounts`/`topSources` → `1` / single bucket / the article's own
     source (no multi-outlet breakdown exists yet).
   - `relatedArticles` → `[]` (populated in §20).
8. **Detail route becomes dynamic.** Because rows are inserted manually and won't exist at build
   time, drop the build-time `generateStaticParams` prerender of all slugs and render the detail
   page dynamically (on-demand) so new articles appear without a rebuild. Home feed reads fresh
   per request.
9. **Large-int Oxylabs IDs stored as `text`** (`schedule_id`, `run_id`, `job_id`) to preserve
   exact digits (§18 precision warning).
10. **RLS access model:**
    - `sources`, `articles`, `article_analyses` — public display data → RLS enabled + `SELECT`
      policy `TO anon, authenticated USING (true)`; `GRANT SELECT` to `anon, authenticated` if
      Data API settings require it.
    - `logs`, `oxylabs_schedules`, `oxylabs_schedule_runs` — operational → RLS enabled, no
      policies (deny-all); only the service-role client touches them.

## Files likely to change / add

- `supabase/schema.sql` (new) — extensions (`pgcrypto`), six tables, constraints, indexes, RLS
  enable + policies, grants. Idempotent (`create table if not exists`, `create index if not
  exists`).
- `supabase/seed.sql` (new) — the five active sources (decision 3), `on conflict do nothing`.
- `lib/supabase/types.ts` (new) — hand-written `Database` type + `Row`/`Insert` convenience
  types per table; shared label unions re-exported from `lib/types/article.ts`.
- `lib/supabase/server.ts` (new) — publishable-key read client (`server-only`).
- `lib/supabase/admin.ts` (new) — service-role admin client (`server-only`).
- `lib/supabase/queries/articles.ts` (new) — `getTopArticles(limit?)` → `ArticleCard[]`,
  `getArticleBySlug(slug)` → `ArticleDetail | null`, plus row→shape mappers. Analyzed articles
  only (`article_analyses` row present, §19 LEFT-JOIN semantics), newest first. Joined-table
  conditions applied in JS after the query (§21 gotcha).
- `lib/supabase/queries/sources.ts` (new) — `getActiveSources()`.
- `lib/supabase/queries/logs.ts` (new) — small `writeLog(...)` using the service-role client.
- `app/page.tsx` — read via `getTopArticles`; empty state when none.
- `app/news/[slug]/page.tsx` — read via `getArticleBySlug`; `notFound()` when missing; dynamic
  rendering (decision 8).
- `lib/mock/articles.ts`, `lib/mock/articleDetails.ts` — **deleted**.
- `.env.example` — add `SUPABASE_SERVICE_ROLE_KEY` (server-only, never `NEXT_PUBLIC_`).
- `AGENTS.md` §21 env table — rename anon row to publishable (decision 4).

## Implementation requirements

- TypeScript throughout; no `any`. Explicit return types on exported query functions.
- Service-role key unreachable from browser bundles (`import "server-only"` in `admin.ts`).
- Query functions never throw raw Supabase errors into render; return safe empties (`[]`/`null`)
  and log server-side.
- `article_analyses` covers every §19 field: `summary`, `sentiment_score`, `sentiment_label`,
  `bias_score`, `bias_label`, `left_percentage`, `center_percentage`, `right_percentage`,
  `confidence`, `framing_notes`, `loaded_terms` (`text[]`), `disclaimer`, `model`.
- DB check constraints per §19: scores in `[-1,1]`, percentages in `[0,100]`, confidence in
  `[0,1]`, sentiment/bias labels restricted to their unions. (Percentages-sum-to-100 is
  validated in the AI layer later, not a hard SQL constraint — noted.)
- `articles.original_url` unique (dedupe, §10); `article_analyses.article_id` unique; indexes on
  `articles.published_at`, `articles.source_id`, `articles.slug`, `articles.analyzed_at`.
- Keep functions small; no mixing of client/query/UI concerns (§21).

## Security requirements

- `SUPABASE_SERVICE_ROLE_KEY` server-only; never `NEXT_PUBLIC_`, never in client components,
  never logged. Only `admin.ts` reads it.
- RLS enabled on all six tables. Public SELECT only on the three display tables; operational
  tables deny anon/authenticated.
- No secrets in URLs. No Supabase writes/pipeline logic reachable from browser code (§21).
- The Clerk gate on the news detail page is preserved.

## Acceptance criteria

- `supabase/schema.sql` creates all six tables (§7 fields + §19 columns + `slug`), constraints,
  indexes, RLS + policies; no `embedding` column.
- `supabase/seed.sql` inserts the five active sources with homepage URLs.
- `lib/supabase/types.ts` matches the schema (row + insert) with a `Database` aggregate type.
- `getTopArticles` → `ArticleCard[]` (analyzed only, newest first); `getArticleBySlug` →
  `ArticleDetail | null`; `getActiveSources` returns active sources; `writeLog` inserts a log
  row via service role.
- Home page renders DB articles with an empty state; detail page renders DB data or `notFound()`.
- No `lib/mock/*` remains and nothing imports it.
- Service-role key absent from any client-reachable module.
- `.env.example` and AGENTS.md §21 agree (all three vars listed).
- `npm run typecheck`, `npm run lint` pass; `npm run build` succeeds.
- A project memory documents the data-layer conventions; a dummy article SQL block is provided.

## Checks to run (§22)

- `npm run typecheck`
- `npm run lint`
- `npm run build` (pages, server modules, and query layer changed)

## Manual test / apply steps expected after implementation

1. Apply schema: Supabase Dashboard → SQL Editor → paste `supabase/schema.sql` → run. Confirm
   six tables with RLS enabled.
2. Seed sources: paste `supabase/seed.sql` → run. Confirm five active `sources` rows.
3. Set `.env.local`: project URL + **publishable** key + **service-role** key (not committed).
4. Paste the provided **dummy article** SQL block (one `articles` row + matching
   `article_analyses` row referencing a seeded source).
5. `npm run dev` → open `http://localhost:3000`: the dummy article appears on the home feed;
   clicking it opens `/news/<slug>` and (signed in) shows the full analysis.
6. Confirm the home page shows the empty state when no analyzed articles exist, and an unknown
   slug 404s.
