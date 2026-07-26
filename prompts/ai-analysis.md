# Prompt: AI Article Analysis Pipeline (`POST /api/analyze`) + pgvector Related Articles

## Goal

Implement skeem's **AI article analysis pipeline** (AGENTS.md §19) using **Google Gemini** via the Vercel AI SDK (not OpenAI), and fold in **§20 pgvector embeddings + Related Articles** since analysis and embedding are generated together in the same run (user-confirmed scope).

On demand (`POST /api/analyze`) the pipeline:

1. Finds **pending** articles via the **pending-analysis check** (§19.1): LEFT JOIN `articles` → `article_analyses`; an article is pending when **no `article_analyses` row exists** for it. Never rely on `analyzed_at IS NULL` alone.
2. Processes them in **configurable batches** (`ANALYSIS_BATCH_SIZE`, default 5) and continues until no pending articles remain (unless a limit / selected IDs are given).
3. For each article, calls Gemini once to produce a structured analysis (summary, sentiment, framing percentages, label, confidence, framing notes, loaded terms, disclaimer), **validates the output with Zod before saving**, and computes `bias_score = (right_percentage − left_percentage) / 100`.
4. Also generates a **Gemini text embedding** for the article and saves it to `article_analyses.embedding` (§20).
5. Inserts the validated `article_analyses` row and sets `articles.analyzed_at` **only after both analysis and embedding are saved**.
6. On invalid AI output, **retries once**, then marks the article failed **without saving bad analysis**.
7. Emits neat console **run logging** during the run (analyzed / skipped / failed per batch) and a **final summary object**, returned in the API response and written to `logs`.

Also implement **Related Articles** on the news details page (§20): a `getRelatedArticles(articleId, embedding)` query using cosine distance, wired into `/news/[slug]`, shown only when the current article has an embedding.

## Confirmed decisions (from the user)

- **Model:** `gemini-2.5-flash` for analysis. (Verify the exact ID + that it is current against the installed `@ai-sdk/google` bundled docs before coding; do not use a model ID from memory — AI SDK skill.)
- **Scope:** §19 **and** §20 together in this task.

## In scope

- `POST /api/analyze` (admin-secret protected, §14/§15).
- AI layer: Gemini call, Zod schema + validation, single-retry, `bias_score` derivation, embedding generation (`lib/ai/`).
- Analysis orchestration/batching + run-logging summary (`lib/pipeline/analyze.ts`).
- Pending-article + analysis-insert + related-articles queries (`lib/supabase/queries/articles.ts`).
- pgvector: enable extension, add `embedding vector(1536)` column + IVFFlat cosine index; update `supabase/schema.sql`, `lib/supabase/types.ts`, and provide the exact ALTER SQL to run in the SQL Editor (§7/§20).
- Wire Related Articles into `app/news/[slug]/page.tsx` (show conditionally).
- Deps: `ai`, `@ai-sdk/google` (zod v4 already installed).
- `.env.example` + AGENTS.md §21 env table additions.

## Out of scope (do NOT build)

- Oxylabs Scheduler, sync/process routes, `/api/cron/pipeline`, `vercel.json` (§18) — separate task. (The cron pipeline will later *call* the analysis step; author `lib/pipeline/analyze.ts` as a reusable function so §18 can reuse it, but write no scheduler/cron code now.)
- `GET /api/logs`, `GET /api/runs`.
- Any change to the scrape engine (`lib/pipeline/scrape.ts`) beyond leaving it untouched.

## Skills read

- `.agents/skills/ai-sdk/SKILL.md` — never write AI SDK code from memory; install only `ai`, read bundled docs in `node_modules/ai/docs/` + `node_modules/@ai-sdk/google/docs/` for the **installed** version; run typecheck after.
- `.agents/skills/supabase/SKILL.md` + memory `supabase-data-layer` / `supabase-schema-mapping-gaps` — read vs admin client, **joined-filter gotcha (§21): never `.eq('article_analyses.col', …)`; select the join and filter in JS**; queries return `[]`/`null`, never throw into render.
- Live AI SDK Google provider docs (already fetched): package `@ai-sdk/google`; default key env `GOOGLE_GENERATIVE_AI_API_KEY`; embeddings via `google.embedding(<id>)` with `providerOptions.google.outputDimensionality`; structured output via `generateObject` (verify against bundled docs — some builds prefer `generateText` + `Output.object`; `z.union`/`z.record` unsupported in Google structured mode).

## Existing code inspected

- `lib/supabase/admin.ts` — `getSupabaseAdminClient()` (service-role, RLS bypass, `server-only`). Used for all analysis writes + pending reads.
- `lib/supabase/queries/articles.ts` — read/mapper layer; analyzed = `article_analyses` row exists (§21 JS-side join filter). `relatedArticles` currently hardcoded `[]` (line 140). Write layer has `getExistingOriginalUrls` + `insertArticle`. **Add** `getPendingArticles`, `saveAnalysis`, `getRelatedArticles` here.
- `lib/supabase/queries/logs.ts` — `writeLog({level, scope, message, context})`, never throws.
- `lib/supabase/types.ts` — hand-written `Database`; `ArticleAnalysisInsert` already has every §19 field (`summary`, `sentiment_*`, `bias_*`, `*_percentage`, `confidence`, `framing_notes`, `loaded_terms`, `disclaimer`, `model`). **Must add `embedding: number[] | null` to `ArticleAnalysisRow`/`Insert`** for §20. Row/Insert must stay `type` aliases, and keep the `{ [_ in never]: never }` idiom (memory `supabase-data-layer` — else supabase-js degrades tables to `never`).
- `supabase/schema.sql` — `article_analyses` exists; `embedding` intentionally omitted (comment at line ~80), to be added now per §20.
- `lib/http/admin-auth.ts` — `requireAdminSecret(req)` returns `NextResponse | null`. Reuse verbatim.
- `lib/pipeline/limits.ts` — centralized limits; **add `ANALYSIS_BATCH_SIZE` default 5** (read from env, fallback 5) and `EMBEDDING_DIMENSIONS = 1536`.
- `lib/pipeline/scrape.ts` / `types.ts` — pattern to mirror: `server-only`, small functions, `log()` helper with a `[scope]` prefix, typed summary object returned + logged.
- `app/api/scrape/route.ts` — thin-handler pattern to mirror for `/api/analyze`: `dynamic = "force-dynamic"`, `maxDuration = 300`, auth → parse body → run pipeline → return summary.
- `app/news/[slug]/page.tsx` (line ~205) — "Related Stories" block currently always renders `article.relatedArticles`. Make it conditional on a non-empty list (§20: hide when no embedding → no related).
- `lib/types/article.ts` — `ArticleDetail.relatedArticles: ArticleCard[]`; label unions `SentimentLabel`/`BiasLabel`. AI Zod schema labels must match these exactly.
- `next.config.ts` — images allow any https host (related-card thumbnails fine).

## Decisions / assumptions

1. **Provider & auth:** `@ai-sdk/google` reading `GOOGLE_GENERATIVE_AI_API_KEY` (server-only). AGENTS.md §21 lists `OPENAI_API_KEY` **or** `GEMINI_API_KEY`; since the provider's default env var is `GOOGLE_GENERATIVE_AI_API_KEY`, standardize on that name in `.env.example` + the §21 table (documented deviation; the AGENTS table already allows a Gemini key). Never `NEXT_PUBLIC_`. AI module is `import "server-only"`.
2. **Model:** analysis `gemini-2.5-flash`; embedding model `gemini-embedding-001` (or current bundled equivalent) with `outputDimensionality: 1536` to match the `vector(1536)` column mandated by §20. Store the analysis model string in `article_analyses.model`. Verify both IDs against bundled docs before coding.
3. **Structured output + validation (§19):** define a Zod schema (`leftPercentage`/`centerPercentage`/`rightPercentage` numbers 0–100, `politicalFramingLabel` ∈ left|center|right|mixed|unclear, `sentimentLabel`, `sentimentScore` −1..1, `confidence` 0..1, `summary`, `framingNotes`, `loadedTerms: string[]`, `disclaimer`). Prefer `generateObject` with the Zod schema; if the installed Google structured-output path rejects the schema, fall back to `generateText` + `Output.object` (per provider docs) — pick whichever the bundled docs support. Avoid `z.union`/`z.record` (unsupported by Google structured mode). After parsing, additionally enforce **percentages sum to 100** (allow ±1 rounding, then normalize) and **label matches strongest percentage unless confidence low / percentages close**, else `unclear` (§19 framing rules). Use **article text (`raw_text`/title) evidence only — never infer bias from source name** (§19).
4. **bias_score derivation:** compute in the AI layer as `(right_percentage − left_percentage) / 100`, clamp to [−1, 1]; do not ask the model for it.
5. **Retry/failure:** one retry on invalid/failed AI output; on second failure, count as failed, log, **do not** write a partial `article_analyses` row and **do not** set `analyzed_at`.
6. **Embedding (§20):** embed the article (title + cleaned `raw_text`, truncated to a safe token budget). Save `embedding` in the same `article_analyses` insert. Set `analyzed_at` only after the row (with embedding) is saved. Backfill note: because pending detection is LEFT-JOIN based, a future run naturally re-picks rows where the analysis row exists but `embedding IS NULL` — add an **embedding-backfill path** that updates just the embedding for such rows without re-running full analysis (§20).
7. **Pending detection query (§19.1 / §21 gotcha):** fetch articles with their `article_analyses` join (no `.eq` on the joined table); in JS keep only rows with **no** analysis row (full-analysis pending) and, separately, rows whose analysis row has `embedding IS NULL` (embedding backfill). Respect optional `articleIds` / `limit` from the request body; default = all pending.
8. **Batching:** process in slices of `ANALYSIS_BATCH_SIZE`; within a batch, run article calls sequentially or with small concurrency to avoid Gemini rate limits (keep it simple: sequential). Log per-batch analyzed/skipped/failed.
9. **Method/auth (§14/§15):** `POST /api/analyze` requires header `x-skeem-admin-secret` == `SKEEM_ADMIN_SECRET`, else `401`. Never GET, never query-string secret.
10. **Related Articles query (§20):** `getRelatedArticles(articleId, embedding)` joins `article_analyses` → `articles` → `sources`, filters `embedding IS NOT NULL` + analyzed + not the current article, orders by cosine distance `embedding <=> current`, limit 5, mapped to `ArticleCard[]`. Because supabase-js can't express `<=>` ordering directly, implement via a Postgres RPC function `match_articles(query_embedding vector, match_article_id uuid, match_count int)` created in the SQL Editor and called with `supabase.rpc(...)`, OR a `.select().order()` on a view — **prefer the RPC** (cleanest for cosine distance). Add the RPC SQL to `supabase/schema.sql` and the manual-run SQL. Use the **service-role client** for this query (per §20 wording) inside the `server-only` details-page read path.
11. **Details page:** render "Related Stories" only when `relatedArticles.length > 0`; pass the current article's stored embedding through the detail mapper so `getArticleBySlug` can call `getRelatedArticles`.

## Files likely to change / add

**Deps:** `pnpm add ai @ai-sdk/google` (zod already present).

**New:**
- `lib/ai/schema.ts` — Zod analysis schema + inferred type.
- `lib/ai/analyze.ts` — `analyzeArticle(article)`: Gemini `generateObject` call, validation, single retry, `bias_score` + framing normalization → typed result (`server-only`).
- `lib/ai/embed.ts` — `embedArticle(text)`: Gemini embedding at 1536 dims (`server-only`).
- `lib/pipeline/analyze.ts` — `runAnalysisPipeline({ articleIds?, limit?, batchSize })`: pending detection, batching, per-article analyze+embed+save, run logging, typed `AnalysisSummary` (reusable by §18 cron later).
- `app/api/analyze/route.ts` — thin `POST` handler (auth → parse → run → return summary).

**Edit:**
- `lib/pipeline/limits.ts` — add `ANALYSIS_BATCH_SIZE` (env, default 5), `EMBEDDING_DIMENSIONS = 1536`, analysis/embedding model constants.
- `lib/pipeline/types.ts` — add `AnalysisSummary` + per-article outcome types.
- `lib/supabase/types.ts` — add `embedding: number[] | null` to `ArticleAnalysisRow`/`ArticleAnalysisInsert`.
- `lib/supabase/queries/articles.ts` — add `getPendingArticles`, `saveAnalysis`, `getRelatedArticles`; make `getArticleBySlug` populate `relatedArticles`.
- `supabase/schema.sql` — enable pgvector, `embedding vector(1536)` column, IVFFlat cosine index, `match_articles` RPC (with §20 comment block).
- `app/news/[slug]/page.tsx` — conditional Related Stories block.
- `.env.example` + `AGENTS.md` §21 table — add `GOOGLE_GENERATIVE_AI_API_KEY`, `ANALYSIS_BATCH_SIZE`.

## Security requirements (§21)

- `GOOGLE_GENERATIVE_AI_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `SKEEM_ADMIN_SECRET` server-only; never `NEXT_PUBLIC_`, never reach browser code.
- All Gemini calls, analysis, and embedding run server-side only (`import "server-only"` on every AI/pipeline module).
- `/api/analyze` rejects missing/invalid admin secret with `401`; secret via header only.
- Do not log the API key or full raw model responses containing secrets; log counts/titles/reasons only.

## Acceptance criteria

- `POST /api/analyze` with a valid secret analyzes **all** pending articles (not a fixed 10, not latest-scrape-only, not specific IDs) unless `limit`/`articleIds` given; missing/invalid secret → `401`.
- Pending detection uses the LEFT-JOIN rule (analysis-row-absent), not `analyzed_at IS NULL`.
- Each saved `article_analyses` row has all §19 fields; percentages are 0–100 and sum to 100; `bias_label` ∈ the union and matches the strongest percentage unless low-confidence/close → `unclear`; `bias_score == (right−left)/100`; `embedding` populated (1536 dims).
- Invalid AI output retries once then fails without writing a row; `analyzed_at` set only after analysis **and** embedding saved.
- Zod validation gates every save; no `any` in the AI layer.
- Run logging: per-batch + final summary object (analyzed, skipped, failed, batches, duration) returned in the response and written to `logs`.
- News details page shows Related Stories (≤5, cosine-nearest) only when the article has an embedding; hidden otherwise.
- `supabase/schema.sql`, `lib/supabase/types.ts` updated together; exact ALTER + RPC SQL provided for the SQL Editor.

## Checks to run (§22)

- `npm run typecheck`
- `npm run lint`
- `npm run build` (new route + server modules + schema types changed)

## Manual test steps (shared after implementation, §17)

Preconditions: run the provided pgvector ALTER + `match_articles` RPC SQL in Supabase SQL Editor; set `GOOGLE_GENERATIVE_AI_API_KEY` and `SKEEM_ADMIN_SECRET` (and optional `ANALYSIS_BATCH_SIZE`) in `.env.local`; have scraped articles present. Watch the `npm run dev` terminal for progress logs.

1. Analyze all pending:
   ```bash
   curl -X POST http://localhost:3000/api/analyze \
     -H "x-skeem-admin-secret: $SKEEM_ADMIN_SECRET"
   ```
2. Limited batch:
   ```bash
   curl -X POST http://localhost:3000/api/analyze \
     -H "x-skeem-admin-secret: $SKEEM_ADMIN_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"limit": 2}'
   ```
3. Selected IDs:
   ```bash
   curl -X POST http://localhost:3000/api/analyze \
     -H "x-skeem-admin-secret: $SKEEM_ADMIN_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"articleIds": ["<uuid>"]}'
   ```
4. Auth rejection (expect `401`):
   ```bash
   curl -i -X POST http://localhost:3000/api/analyze
   ```
5. UI: reload the home page — newly analyzed articles now appear as cards (sentiment + framing). Open a details page — full analysis panels render, and "Related Stories" shows up-to-5 cosine-nearest articles once ≥2 articles have embeddings.
