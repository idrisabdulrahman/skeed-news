# Prompt: Manual Scraping Pipeline (`POST /api/scrape`)

## Goal

Implement skeem's **manual scraping pipeline** — the `POST /api/scrape` action route and the layered scrape-to-insert engine behind it (AGENTS.md §9 + §16). On demand it:

1. Loads selected active sources from Supabase (all active by default; §8).
2. Fetches each source's homepage HTML **live through Oxylabs** (`universal` source, Realtime endpoint).
3. Extracts visible **story-card links from the homepage only** (§11).
4. Rejects non-article URLs via the **non-article reject list** + source-specific URL checks (§9/§11/§12).
5. Normalizes + dedupes candidates, then skips URLs already in Supabase via the **URL existence check** (<15 per `.in()`; §9).
6. Scrapes each surviving candidate's **article detail page** through Oxylabs.
7. Validates + cleans each detail page against the **article content gate** (§13).
8. Inserts only valid articles, **append-only** (§10) — never a homepage/listing/category page.
9. Emits **run logging** during the run + a **final summary object**, returned in the API response and written to `logs`.

Default source selection: **all active sources, up to 5 valid articles per source** (user-confirmed).

**Design goal (not just a constraint):** the pipeline modules are written as a reusable `extract → filter → dedupe → detail-scrape → validate → clean → insert → log` core, parameterized by an **HTML provider**, so the future Scheduler task (§18) reuses this engine unchanged and differs *only* in where the homepage HTML comes from (live fetch here vs. completed Oxylabs job results there). Getting this seam right is a primary objective of this task.

## In scope

- The manual scraping engine (`lib/pipeline` + `lib/scraping` + `lib/parsing`).
- `POST /api/scrape` (admin-secret protected).
- `GET /api/sources` (read route used to inspect sources per §8).
- Article write queries (existence check + append-only insert).
- `cheerio` dependency (HTML parsing).
- `.env.example` additions.

## Out of scope (separate tasks — do NOT build)

- Oxylabs Scheduler, sync/process routes, `oxylabs_schedules`/`oxylabs_schedule_runs` writes (§18).
- AI analysis / `POST /api/analyze` (§19).
- pgvector / Related Articles (§20).
- Vercel Cron / `vercel.json` / `/api/cron/pipeline` (§18).
- `GET /api/logs` (not required for this task; scrape summary is returned inline + written to `logs`).

The engine is authored so §18 can reuse it, but **no scheduler code is written now**.

## Skills read

- `.agents/skills/oxylabs-web-scraper/SKILL.md`, `sources.md`, `examples.md` — Web Scraper API auth (Basic), `universal` source, `POST https://realtime.oxylabs.io/v1/queries` realtime, `render:"html"` for JS pages, response `results[0].content` = raw HTML.
- `.agents/skills/supabase/SKILL.md` + memory `supabase-data-layer` / `supabase-schema-mapping-gaps` — read vs admin clients, joined-filter gotcha (§21), analyzed = `article_analyses` row exists, queries return `[]`/`null` not throw.
- Next 16 `route-handlers.md` / `route.md` — `route.ts` handlers, not cached by default, one route file per segment.

## Existing code inspected

- `lib/supabase/admin.ts` — `getSupabaseAdminClient()` (service-role, RLS bypass, `server-only`). Used for all pipeline writes.
- `lib/supabase/server.ts` — `getSupabaseReadClient()` (publishable, RLS). Read path only.
- `lib/supabase/queries/sources.ts` — `getActiveSources()` returns active `SourceRow[]`.
- `lib/supabase/queries/articles.ts` — read/mapper layer (analyzed-only, §21 JS-side join filter). No write functions yet.
- `lib/supabase/queries/logs.ts` — `writeLog({level, scope, message, context})`, never throws.
- `lib/supabase/types.ts` — hand-written `Database` + Row/Insert types; `ArticleInsert` already has `slug`, `original_url`, `canonical_url`, `title`, `image_url`, `published_at`, `raw_text`. **No schema change needed.**
- `supabase/schema.sql` / `seed.sql` — six tables exist; five active sources seeded (Channels TV, Arise News, Fox News, Al Jazeera, The Guardian). `articles.original_url` is `unique` (dedupe key); `slug` is `unique not null`.
- `proxy.ts` — Clerk middleware; matcher runs on `/api/*`. Routes are server-only handlers so this is fine.
- `next.config.ts` — images allow any https host (scraped hero images OK).
- Package manager: **pnpm** (`pnpm-lock.yaml`). `cheerio` is **not installed**.
- No `app/api` directory yet.

## Decisions / assumptions

1. **Scraper call:** `universal` source with `render: "html"` against `https://realtime.oxylabs.io/v1/queries`, Basic auth from `OXY_WSA_USERNAME`/`OXY_WSA_PASSWORD`. News homepages and detail pages are JS-heavy; `render` is needed for visible story cards. Raw HTML is `results[0].content`. Set a generous client timeout (~180s) per skill guidance for rendered requests.
2. **HTML parsing:** add `cheerio` for homepage link extraction (§11) and detail-page cleanup/validation (§13). No `zod` needed this task — the request body is a tiny optional shape validated by hand; save `zod` for §19 AI-output validation.
3. **HTML provider seam (core design goal):** `lib/pipeline/scrape.ts` exports `runScrapePipeline({ sources, perSource, getHomepageHtml })` where `getHomepageHtml: (source) => Promise<string>`. Manual scraping passes a live-Oxylabs provider; §18 will later pass a "read completed job result" provider. **All** extract/filter/dedupe/detail-scrape/validate/clean/insert/log logic lives here, provider-agnostic — nothing scheduler-specific leaks in, and nothing here is manual-only.
4. **Candidate URL / non-article filtering (§9 reject list / §11 / §12):** generic heuristics — reject query-only, section/category, tag, author, search, live, video-only, show/program/podcast, game, product/review, corporate/support, newsletter paths; prefer long story slugs, date-based paths, numeric article IDs. Plus a per-source `parser` hook read from `sources.parser` when present. When uncertain, reject (§12 stricter-choice rule). Reject **before** detail scrape.
5. **Article content gate (§13):** accept only with article-specific URL + article-specific (non-generic) title + image_url + published_at + meaningful body — body passes by **≥3 meaningful paragraphs OR ≥900 clean chars**. If extraction yields one big blob, split by DOM blocks / sentence boundaries before validation (do not reject solely for one paragraph). Scrub scripts, styles, ad/newsletter/subscription/related/most-viewed/load-more/social blocks, repeated nav labels, inline JS errors, and CSS class dumps from `raw_text` so it reads like one article.
6. **Dedupe + existence check (§9/§10):** normalize/canonicalize candidate URLs, drop in-batch dupes, then chunked existence check against `articles.original_url` — **never more than 15 URLs per `.in()`**. Insert is append-only; rely on the `original_url` unique constraint as a backstop and treat a unique-violation as a skipped duplicate, not an error. Generate a unique `slug` from the title (dedupe suffix on collision).
7. **Method/auth (§14/§15):** `POST /api/scrape` (action) requires header `x-skeem-admin-secret` matching `SKEEM_ADMIN_SECRET`, else `401` — never via query string. `GET /api/sources` is a plain read (no secret).
8. **Env additions (§21):** add `OXY_WSA_USERNAME`, `OXY_WSA_PASSWORD`, `SKEEM_ADMIN_SECRET` to `.env.example` (all server-only, no `NEXT_PUBLIC_`). These already exist in the AGENTS.md §21 table, so the table needs no change. `.env.local` is the user's to fill.
9. **Per-source failure isolation:** a source-level error (Oxylabs failure, unparseable homepage) is logged and counted, then skipped — never fatal to the whole run.

## Files likely to change / add

**Deps:** `pnpm add cheerio` (+ `@types/cheerio` if not bundled).

**New — `lib/` server-only modules (small functions, explicit types, `import "server-only"`):**
- `lib/pipeline/types.ts` — `ScrapeSummary`, `RejectionReason`, `SourceResult`, `PipelineOptions` (incl. `getHomepageHtml` provider) types.
- `lib/pipeline/scrape.ts` — the canonical provider-agnostic scrape-to-insert engine (§9 steps 1–9). This is the reusable core.
- `lib/scraping/oxylabs.ts` — Web Scraper API client: `scrapeHtml(url)` (realtime `universal` + `render:"html"`, Basic auth). Also the concrete live homepage provider used by manual scraping.
- `lib/parsing/links.ts` — homepage story-card link extraction + candidate URL filtering (§11/§12), per-source parser hook.
- `lib/parsing/article.ts` — detail-page parse, cleanup, and the validation gate (§13): title/image/published-at/body extraction, `raw_text` scrubbing, accept/reject with typed reasons.
- `lib/parsing/url.ts` — normalize / canonicalize / dedupe + slug generation.
- `lib/pipeline/limits.ts` — centralized constants (`DEFAULT_PER_SOURCE = 5`, `URL_IN_CHUNK = 15`, min body thresholds).
- `lib/http/admin-auth.ts` — `requireAdminSecret(req): Response | null` (401 on missing/invalid).

**New — queries (writes via admin client), extend `lib/supabase/queries/articles.ts`:**
- `getExistingOriginalUrls(urls: string[]): Promise<Set<string>>` — chunked `.in()`, ≤15 per call (§9 URL existence check).
- `insertArticle(row: ArticleInsert): Promise<'inserted' | 'duplicate' | 'error'>` — append-only; unique-violation → `'duplicate'`.

**New — API routes:**
- `app/api/scrape/route.ts` — `POST` (admin secret). Optional body `{ sourceIds?: string[], perSource?: number }`; default all active, 5/source. Thin: auth → parse body → build live provider → call `runScrapePipeline` → return summary. Returns the §9 summary object.
- `app/api/sources/route.ts` — `GET` active sources (id + name + listing_url) for selection (§8).

**Edited:** `.env.example` (decision 8).

## Implementation requirements

- **Layer separation (§5):** routes are thin (auth + parse + delegate + return); all scraping/parsing/DB/pipeline logic in `lib/`. No business logic in the route handler.
- **Reusable core (design goal):** `runScrapePipeline` is provider-agnostic. The live Oxylabs homepage fetch is injected, not hard-wired, so §18 can pass a different provider with zero changes to extract/filter/validate/insert/log.
- **Append-only (§10):** never delete/replace/reset articles; dedupe by `original_url` (+ canonical); skip already-stored via chunked existence check (≤15 per `.in()`).
- **Content gate (§13):** enforce body/image/published-at/article-URL/title rules and `raw_text` scrubbing exactly as decision 5.
- **Reject list (§9/§11/§12):** never save homepage/listing/category/section/topic/author/search/show/live/game/product/corporate/newsletter pages.
- **Run logging (§9):** neat server-side `console` messages per stage (scrape started, selected sources, per-source start, homepage fetched, candidate links found, candidates rejected pre-detail, duplicates skipped, detail pages scraped, articles inserted, articles rejected post-validation, source errors, completed/failed) + a final **summary object**: status, sources checked, candidates found, candidates rejected, duplicates skipped, detail pages scraped, articles inserted, articles rejected, articles failed, total duration, rejection reasons grouped by count. Mirror the summary into `writeLog(...)` and return it in the API response.
- **TypeScript:** explicit types, no `any`, centralized limits as named constants, typed pipeline results, safe error handling (source-level errors isolated per decision 9). Prefer "insert fewer good articles than bad ones" (§16).

## Security requirements (§15/§21)

- `POST /api/scrape` requires a valid `x-skeem-admin-secret`; missing/invalid → `401`. Never read the secret from the query string.
- Oxylabs credentials + service-role key are server-only; every new `lib/` module imports `server-only`. No `NEXT_PUBLIC_` for any of these; nothing secret reaches browser code.
- Never run Oxylabs calls or scraping from browser code (they live in server route handlers → `lib` only).
- Do not log secret values; reference by name.

## Acceptance criteria

- `POST /api/scrape` with a valid secret scrapes all active source homepages live via Oxylabs, extracts + filters story-card links, dedupes vs DB (chunked ≤15), scrapes + validates detail pages, inserts only valid articles append-only, and returns the §9 summary object. Missing/invalid secret → `401`.
- Optional body `{sourceIds, perSource}` narrows the run; absent → all active sources, 5/source.
- No homepage/listing/category/non-article page is ever inserted as an article; articles missing image_url or published_at are rejected with a recorded reason.
- Duplicate `original_url`s already in the DB are skipped, not re-inserted or errored.
- `GET /api/sources` returns active sources for selection.
- Run summary is logged to the console, written to `logs`, and returned in the response.
- The pipeline core (`runScrapePipeline`) takes an injected HTML provider and contains no manual-only or scheduler-only branching — verifiable by the live provider living in `lib/scraping/oxylabs.ts`, not inside the pipeline.
- New server modules are `server-only`; no secret reaches client code.

## Checks to run (§22)

- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run build` (routes + server modules added → build affected)

Report exact command output; fix any errors before presenting.

## Manual test steps (§17)

Set `OXY_WSA_USERNAME`, `OXY_WSA_PASSWORD`, `SKEEM_ADMIN_SECRET` in `.env.local`; ensure `schema.sql` + `seed.sql` are applied; run `pnpm run dev` and **watch the dev-server terminal** — scrape progress logs there.

```bash
# 1. list active sources (choose which to scrape)
curl -s localhost:3000/api/sources | jq

# 2. manual scrape — all active sources, 5/source (default)
curl -s -X POST localhost:3000/api/scrape \
  -H 'x-skeem-admin-secret: <SKEEM_ADMIN_SECRET>' | jq

# 3. scrape a subset with a custom per-source limit
curl -s -X POST localhost:3000/api/scrape \
  -H 'x-skeem-admin-secret: <SKEEM_ADMIN_SECRET>' \
  -H 'content-type: application/json' \
  -d '{"sourceIds":["<source-uuid>"],"perSource":3}' | jq

# 4. auth rejection (expect 401)
curl -s -o /dev/null -w '%{http_code}\n' -X POST localhost:3000/api/scrape
```

Inserted articles will **not** appear on the homepage yet — the home/detail pages show only analyzed articles (an `article_analyses` row must exist, §19). That AI-analysis step is a separate deliverable; until it runs, verify inserts directly in the Supabase `articles` table and via the returned summary. This is expected.
