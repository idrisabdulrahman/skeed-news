# Oxylabs Scheduler + Vercel Cron — automatic hourly pipeline

## Goal

Implement the full Oxylabs Scheduler integration so active source homepages are
scraped hourly by Oxylabs, and a Vercel Cron job processes the completed results
and runs AI analysis automatically — with no manual intervention after schedules
are created (AGENTS.md §18).

Deliver **all parts together** (§18): sync-schedules route, list-schedules route,
manual process route, runs read route, cron pipeline route, and the Vercel Cron
config (already present — verify only).

## Skills read

- `.agents/skills/oxylabs-web-scraper/SKILL.md` — Web Scraper API auth, sources,
  `render`, and Push-Pull vs Realtime endpoints.
- `.agents/skills/supabase/SKILL.md` — service-role writes bypass RLS; keep the
  operational tables (`oxylabs_schedules`, `oxylabs_schedule_runs`) service-role
  only; use existing supabase-js query patterns; avoid the joined-filter gotcha.
- Live Oxylabs docs (fetched per §18, do not trust memory):
  - Scheduler: `https://developers.oxylabs.io/products/web-scraper-api/features/scheduler`
  - Push-Pull: `https://developers.oxylabs.io/products/web-scraper-api/integration-methods/push-pull`

### Confirmed Oxylabs endpoints (base host `https://data.oxylabs.io/v1`, Basic auth)

| Purpose | Method | Path | Notes |
|---|---|---|---|
| Create schedule | POST | `/schedules` | body: `cron`, `items[]`, `end_time`. Response: `schedule_id` (large int), `active`, `next_run_at` |
| List schedules | GET | `/schedules` | `{ "schedules": [<int>, ...] }` — array of schedule ids |
| Get runs | GET | `/schedules/{id}/runs` | `{ "runs": [{ "run_id", "jobs": [{ "id", "result_status", ... }], "success_rate" }] }` |
| Update state | PUT | `/schedules/{id}/state` | body `{ "active": false }` → 202, empty body |
| Fetch job result | GET | `/queries/{job_id}/results` | `{ "results": [{ "content": "<html…>", "status_code" }] }` — the homepage HTML |

## Existing code inspected

- `lib/pipeline/scrape.ts` — **provider-agnostic** `runScrapePipeline(options)`;
  the `getHomepageHtml(source)` / `getDetailHtml(url)` seam is the reuse point
  (§18). The scheduler must reuse this engine unchanged — no scheduler-only
  branching inside it.
- `lib/pipeline/types.ts` — `PipelineOptions`, `ScrapeSummary`, `AnalysisSummary`.
- `lib/pipeline/analyze.ts` — `runAnalysisPipeline(options)`, already
  trigger-agnostic; the cron chains it after processing.
- `lib/scraping/oxylabs.ts` — `scrapeHtml(url)` Realtime client (detail pages).
- `app/api/scrape/route.ts` / `app/api/analyze/route.ts` — thin-handler pattern,
  `requireAdminSecret`, `dynamic="force-dynamic"`, `maxDuration=300`, PostHog.
- `lib/http/admin-auth.ts` — `requireAdminSecret(req)` → 401 or null.
- `lib/supabase/admin.ts` — `getSupabaseAdminClient()` service-role, RLS-bypass.
- `lib/supabase/queries/articles.ts` — `getExistingOriginalUrls` (chunked ≤15),
  `insertArticle`, `getPendingArticles` (LEFT-JOIN pending detection).
- `lib/supabase/queries/logs.ts` — `writeLog({scope,message,context})`, never throws.
- `supabase/schema.sql` + `lib/supabase/types.ts` — `oxylabs_schedules`
  (`schedule_id text`, `source_id`, `active`, `cron`) and `oxylabs_schedule_runs`
  (`schedule_id text`, `run_id text`, `job_id text`, `result_status`,
  `processed_at`, unique `(schedule_id, run_id, job_id)`) **already exist**.
- `vercel.json` — cron `"15 * * * *"` → `/api/cron/pipeline` **already present**.
- `.env.example` — has `OXY_WSA_*`, `SKEEM_ADMIN_SECRET`; `CRON_SECRET` absent
  (correct — Vercel-injected, §18).

## Decisions / assumptions

1. **One Oxylabs schedule per active source** (§18 wording). Each schedule's
   `items` = `[{ source: "universal", url: <source.listing_url>, render: "html" }]`.
   Schedule `cron = "0 * * * *"` (top of every hour); Vercel Cron fires at `:15`,
   giving Oxylabs ~15 min (§18). `end_time` far future (`"2035-12-31 23:59:59"`).
2. **Homepage HTML only comes from scheduled results** (§18). Article **detail**
   pages are still scraped live via `scrapeHtml` (Realtime). This is exactly the
   `getHomepageHtml` / `getDetailHtml` seam split.
3. **Large-int precision (§18, critical).** `schedule_id` and job `id` exceed
   `Number.MAX_SAFE_INTEGER`. Extract every such id from the **raw response text
   via regex before any `JSON.parse`** and keep it as a string end-to-end. Never
   `JSON.parse` then stringify. `/runs` parsing pairs each job `"id"` with its
   following `"result_status"` over raw text.
4. **Idempotent sync.** Create a schedule only for an active source that has no
   active `oxylabs_schedules` row yet — avoids duplicate schedules and orphan
   churn (§18 warning). Sources whose row already exists+active are skipped.
5. **Orphan deactivation (§18).** After creating, `GET /schedules`, diff against
   DB `schedule_id`s, `PUT /schedules/{id}/state {active:false}` for any Oxylabs
   schedule not in the DB. Also deactivate + mark inactive any DB schedule whose
   `source` is no longer active (clean, cheap correctness).
6. **Process the latest done run per schedule** each invocation. For each active
   schedule row: `GET /runs`, pick the most recent job with
   `result_status === "done"` not already in `oxylabs_schedule_runs`, fetch its
   result HTML, and record the job (unique constraint = idempotent). Skip
   `pending`/`faulted` (§18). Never save a homepage result as an article (§18).
7. **Reuse the engine, not the logic.** Processing builds a
   `Map<source_id, homepageHtml>` from the done results, then calls
   `runScrapePipeline` with `getHomepageHtml` reading the map and `getDetailHtml`
   = live `scrapeHtml`. All validation/cleanup/dedupe/URL-existence/run-logging
   is the shared §9 pipeline — not duplicated (§18).
8. **Cron chaining (§18).** `GET /api/cron/pipeline`: step 1 process scheduled
   results, step 2 run analysis on all pending. Step 2 **always runs even if step
   1 throws** (there may be pre-existing unanalyzed articles). Log both steps.
9. **Cron auth (§18).** Protect with `CRON_SECRET` via `Authorization: Bearer`
   (Vercel injects it). Skip the check when `NODE_ENV !== "production"` (local
   dev). Do **not** use `SKEEM_ADMIN_SECRET` for cron; do not add `CRON_SECRET`
   to `.env.local`. `.env.example` gets a commented note only (canonical list §21).
10. **No schema change needed** — tables + types already match §7/§18.

## Files likely to change / create

**New — Oxylabs Scheduler client (transport + precision-safe parsing):**
- `lib/scraping/scheduler.ts`
  - `createSchedule({ cron, items, endTime })` → returns `scheduleId: string`
    (regex `"schedule_id"\s*:\s*(\d+)` on raw text).
  - `listScheduleIds()` → `string[]` (all digit tokens in the `schedules` array).
  - `getScheduleRuns(scheduleId)` → `{ runId: string; jobs: { id: string;
    resultStatus: string }[] }[]` parsed from raw text (precision-safe pairing).
  - `setScheduleState(scheduleId, active)` → `PUT …/state`.
  - `fetchJobResultHtml(jobId)` → `string` from `/queries/{id}/results`
    (`results[0].content`; throw on empty).
  - Shared Basic-auth header + timeout (reuse `OXYLABS_TIMEOUT_MS`); server-only.

**New — orchestration (thin routes, logic in lib, §5):**
- `lib/pipeline/scheduler-sync.ts` — `syncSchedules()`: load active sources →
  create missing schedules → store rows → orphan deactivation → return
  `SyncSummary`. Logs scope `"scheduler"`, writes a summary log.
- `lib/pipeline/scheduler-process.ts` — `processScheduledResults()`: gather latest
  done results per active schedule → build homepage map → `runScrapePipeline` →
  record processed runs → return `SchedulerProcessSummary` (scheduler counters +
  embedded `ScrapeSummary`). Logs scope `"scheduler"`.

**New — schedule queries:**
- `lib/supabase/queries/schedules.ts` — `insertSchedule`, `getActiveSchedules`,
  `getAllSchedules`, `deactivateSchedule(scheduleId)`, `recordScheduleRun`,
  `getProcessedJobIds`, `getRecentRuns(limit)`. Service-role client.

**New — routes:**
- `app/api/oxylabs/schedules/route.ts` — `POST` (admin secret → `syncSchedules`),
  `GET` (list stored schedule rows joined to source name).
- `app/api/oxylabs/scheduled-results/process/route.ts` — `POST` (admin secret →
  `processScheduledResults`).
- `app/api/oxylabs/runs/route.ts` — `GET` read route → `getRecentRuns`.
- `app/api/cron/pipeline/route.ts` — `GET`, `CRON_SECRET` guard, chains
  process → analyze; step 2 runs even if step 1 fails.

**Edit:**
- `lib/pipeline/types.ts` — add `SyncSummary`, `SchedulerProcessSummary`.
- `lib/pipeline/limits.ts` — add `SCHEDULER_CRON = "0 * * * *"`,
  `SCHEDULE_END_TIME`, `OXYLABS_DATA_BASE = "https://data.oxylabs.io/v1"`.
- `.env.example` — add a commented `CRON_SECRET` note (Vercel-injected; never set
  locally).
- `vercel.json` — verify only (already correct); no change expected.

## Implementation requirements

- Thin route handlers; all Oxylabs/DB/orchestration logic in `lib/` (§5).
- Every action route (`POST /api/oxylabs/schedules`,
  `POST /api/oxylabs/scheduled-results/process`) requires the
  `x-skeem-admin-secret` header via `requireAdminSecret` and returns 401 when
  missing/invalid (§15). Read routes (`GET` schedules/runs) are unauthenticated
  (§14).
- Cron route uses `GET` (Vercel sends GET), guarded by `CRON_SECRET` bearer token,
  skipped in dev (§18). Never callable by browsers when deployed.
- `dynamic = "force-dynamic"` and `maxDuration = 300` on the process + cron routes
  (live network I/O, long-running).
- Precision-safe id handling everywhere (decision 3); store all Oxylabs ids as
  `text` (columns already `text`).
- Per-source / per-schedule errors are isolated: logged + counted, never fatal to
  the whole run (matches `scrape.ts` behaviour).
- Run logging (§9/§18): neat greppable `[scheduler]` console lines during the run
  (sync started, schedules created, orphans deactivated; process started,
  schedules checked, done jobs found, results fetched, then the reused pipeline's
  `[scrape]` lines, processing completed) plus a final summary object mirrored to
  the `logs` table via `writeLog`.
- Reuse `runScrapePipeline` and `runAnalysisPipeline` verbatim — do not copy
  validation/cleanup/dedupe/analysis logic (§18).
- TypeScript throughout, explicit types, no `any`; new modules are `server-only`.

## Security requirements

- Oxylabs credentials, service-role key, admin secret, and `CRON_SECRET` are
  read only in server modules — never `NEXT_PUBLIC_`, never in client bundles (§21).
- No Oxylabs/model/scraping/analysis calls from browser code (§21).
- Admin secret sent only via header, never query string (§15).
- Cron secret compared server-side; 401 on missing/wrong when deployed (§18).
- `oxylabs_schedules` / `oxylabs_schedule_runs` stay service-role only (RLS on,
  no public policies — already so).

## Acceptance criteria

- `POST /api/oxylabs/schedules` creates exactly one Oxylabs schedule per active
  source lacking one, stores each `schedule_id` losslessly as text, deactivates
  orphans, and is idempotent on re-run (no duplicate schedules).
- `GET /api/oxylabs/schedules` returns stored schedule rows with source names.
- `POST /api/oxylabs/scheduled-results/process` fetches only `done` job results,
  parses homepage HTML through the shared pipeline, inserts only valid new
  articles (never a homepage), records processed runs, and returns the summary.
- `GET /api/oxylabs/runs` returns recent recorded runs.
- `GET /api/cron/pipeline` runs process then analysis; analysis runs even if
  process throws; rejects unauthorized requests with 401 when deployed; works
  without the secret in local dev.
- Large ids never corrupt (verified by comparing stored `schedule_id` / `job_id`
  digits to the raw Oxylabs response).
- `npm run typecheck` and `npm run lint` pass; `npm run build` passes (new routes).

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build` (new routes + server modules added)

## Manual test steps (share after implementation)

Watch the `npm run dev` terminal for `[scheduler]` / `[scrape]` / `[analyze]`
logs during every call (§17).

1. **Inspect sources**
   ```bash
   curl -s http://localhost:3000/api/sources | jq
   ```
2. **Create schedules (once)**
   ```bash
   curl -s -X POST http://localhost:3000/api/oxylabs/schedules \
     -H "x-skeem-admin-secret: $SKEEM_ADMIN_SECRET" | jq
   ```
   Re-run to confirm idempotency (no new schedules created).
3. **List schedules**
   ```bash
   curl -s http://localhost:3000/api/oxylabs/schedules | jq
   ```
4. **Wait for at least one hourly Oxylabs run**, then process manually:
   ```bash
   curl -s -X POST http://localhost:3000/api/oxylabs/scheduled-results/process \
     -H "x-skeem-admin-secret: $SKEEM_ADMIN_SECRET" | jq
   ```
5. **List runs**
   ```bash
   curl -s http://localhost:3000/api/oxylabs/runs | jq
   ```
6. **Run the cron chain locally (dev skips the secret):**
   ```bash
   curl -s http://localhost:3000/api/cron/pipeline | jq
   ```
   Confirm process → analysis both ran, and that analysis still runs if there are
   pre-existing pending articles.
7. **Auth negative tests**
   ```bash
   # 401 — missing admin secret
   curl -s -o /dev/null -w "%{http_code}\n" -X POST \
     http://localhost:3000/api/oxylabs/scheduled-results/process
   ```
8. Verify on the homepage that newly analyzed articles appear (they surface only
   after `analyzed_at` is set by the analysis step).
9. **Deploy note:** Vercel Cron (`vercel.json`, `15 * * * *`) calls
   `/api/cron/pipeline` automatically; `CRON_SECRET` is injected by Vercel. The
   two one-time setups (create Oxylabs schedules; Vercel Cron config) are
   independent — both must be done for full automation (§18).
```
