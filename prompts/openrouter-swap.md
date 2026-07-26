# Prompt: Swap AI provider from @ai-sdk/google (Gemini direct) to OpenRouter

## Goal

Move the AI analysis pipeline (§19) and the embeddings/Related-Articles pipeline
(§20) off the direct Google Generative AI provider (`@ai-sdk/google` +
`GOOGLE_GENERATIVE_AI_API_KEY`) and onto **OpenRouter**, using the
`@openrouter/ai-sdk-provider` so the existing Vercel AI SDK code
(`generateObject` + Zod, `embed`) stays almost unchanged.

The same *analysis* model is kept, now reached through OpenRouter
(`google/gemini-2.5-flash`). Embeddings can no longer use
`gemini-embedding-001` (Google-only); they switch to OpenRouter's
`openai/text-embedding-3-small`, which is natively **1536 dims** — so the
existing `article_analyses.embedding vector(1536)` column, index, and
`match_articles` RPC are unchanged.

Auth is a single server-only key: `OPENROUTER_API_KEY` (already in the user's
`.env.local`). `@ai-sdk/google` and `GOOGLE_GENERATIVE_AI_API_KEY` are removed.

## Scope

In scope:
- Replace the provider in `lib/ai/analyze.ts` and `lib/ai/embed.ts`.
- Update model constants in `lib/pipeline/limits.ts`.
- Update `.env.example`, `AGENTS.md` §21 env table.
- Add the `@openrouter/ai-sdk-provider` dependency; remove `@ai-sdk/google`.
- Provider factory module so the OpenRouter client/key is read in one place.

Out of scope (unchanged):
- Zod schema (`lib/ai/schema.ts`), normalization / bias-derivation logic,
  batching/orchestration (`lib/pipeline/analyze.ts`), queries, route handler,
  DB schema, index, `match_articles` RPC, UI. The 1536-dim column stays correct.
- No change to `@openrouter/sdk` `callModel` — the user chose the AI-SDK
  provider path explicitly, keeping `generateObject`/`embed`.

## Skills read
- `.claude/skills/openrouter-typescript-sdk/SKILL.md` — OpenRouter SDK reference.
  Note: it documents `@openrouter/sdk` (`callModel`); per the user's decision we
  use the AI-SDK provider (`@openrouter/ai-sdk-provider`) instead, which keeps
  `generateObject`/`embed`.
- `.agents/skills/ai-sdk` — AI SDK usage (existing project pattern).

## API facts verified (do not write from memory)
- `createOpenRouter({ apiKey })` returns a provider; `provider.chat(modelId)`
  gives a chat model usable directly by `generateObject` from `ai`.
- `provider.textEmbeddingModel(modelId)` gives an embedding model usable by
  `embed` / `embedMany` from `ai`.
- `openai/text-embedding-3-small` on OpenRouter returns 1536-dim vectors
  natively → matches `vector(1536)`. No `outputDimensionality` / `taskType` /
  `providerOptions.google` (those were Google-provider-specific and are dropped).
- Env var: `OPENROUTER_API_KEY` (server-only).

## Existing code inspected
- `lib/ai/analyze.ts` — uses `google(ANALYSIS_MODEL)` in `generateObject`.
- `lib/ai/embed.ts` — uses `google.embedding(...)` + `providerOptions.google`.
- `lib/pipeline/limits.ts` — `ANALYSIS_MODEL = "gemini-2-flash"` (also a bug:
  should have been `gemini-2.5-flash`), `EMBEDDING_MODEL`, `EMBEDDING_DIMENSIONS`.
- `.env.example`, `AGENTS.md` §21 table — currently reference the Google key.
- `supabase/schema.sql`, `lib/supabase/types.ts` — 1536-dim column: unchanged.

## Decisions / assumptions
1. New module `lib/ai/provider.ts` (server-only) exports a single
   `openrouter = createOpenRouter({ apiKey: process.env.OPENROUTER_API_KEY })`,
   so the key is read in exactly one place (§21 centralization).
2. `ANALYSIS_MODEL = "google/gemini-2.5-flash"` (OpenRouter-namespaced,
   correcting the prior `gemini-2-flash` typo).
3. `EMBEDDING_MODEL = "openai/text-embedding-3-small"`; `EMBEDDING_DIMENSIONS`
   stays 1536 (still asserts the column contract, even though the model is fixed
   at 1536 and takes no dimension option).
4. `embed.ts` drops `providerOptions`/`taskType`/`outputDimensionality` — not
   supported by the OpenRouter embeddings path; the model is inherently 1536-dim.
5. `analyze.ts` keeps `generateObject`, `NoObjectGeneratedError`, the single
   retry, all normalization and `deriveBiasLabel` logic. Only the `model:`
   argument changes from `google(...)` to `openrouter.chat(ANALYSIS_MODEL)`.
6. Remove `@ai-sdk/google` from `package.json` since nothing else imports it
   (will grep to confirm before removing).
7. Package install: add `@openrouter/ai-sdk-provider`. Use the project's
   package manager (pnpm — `pnpm-lock.yaml` present).

## Files to change
- `package.json` — add `@openrouter/ai-sdk-provider`, remove `@ai-sdk/google`.
- `lib/ai/provider.ts` — NEW: `createOpenRouter` factory (server-only).
- `lib/ai/analyze.ts` — swap model source to OpenRouter.
- `lib/ai/embed.ts` — swap model source to OpenRouter; drop Google options.
- `lib/pipeline/limits.ts` — update `ANALYSIS_MODEL`, `EMBEDDING_MODEL`.
- `.env.example` — replace `GOOGLE_GENERATIVE_AI_API_KEY` block with
  `OPENROUTER_API_KEY`.
- `AGENTS.md` §21 table — the `OPENROUTER_API_KEY` row already exists; update its
  model names to `google/gemini-2.5-flash` + `openai/text-embedding-3-small` and
  remove the stale `@ai-sdk/google` mention.

## Implementation requirements
- `lib/ai/provider.ts` starts with `import "server-only";`.
- Missing `OPENROUTER_API_KEY` must surface a clear server-side error (the
  provider will throw on use; acceptable — do not swallow).
- No `NEXT_PUBLIC_` exposure of the key; all three AI modules stay server-only.
- Keep functions small, explicit types, no `any`, no unrelated refactors (§21).

## Security requirements (§21)
- `OPENROUTER_API_KEY` is server-only, read only in `lib/ai/provider.ts`.
- No model/embedding call may run from browser code.
- No key in query strings or client bundles.

## Acceptance criteria
- `generateObject` analysis runs through `google/gemini-2.5-flash` via OpenRouter.
- `embed` runs through `openai/text-embedding-3-small` via OpenRouter, returns
  1536-dim vectors that insert into `article_analyses.embedding` without error.
- No remaining import of `@ai-sdk/google`; `GOOGLE_GENERATIVE_AI_API_KEY` gone
  from `.env.example` and `AGENTS.md`.
- `POST /api/analyze` still: detects pending via LEFT JOIN, validates with Zod,
  retries once, saves analysis + embedding, stamps `analyzed_at` only after both.
- Related Articles still works (column/index/RPC untouched).

## Checks to run
- `pnpm run typecheck`
- `pnpm run lint`
- `pnpm run build` (server modules + a route changed)

## Manual test steps (after implementation)
1. Ensure `OPENROUTER_API_KEY` is set in `.env.local`.
2. Start dev: `pnpm run dev` (watch the terminal for analysis logs — §17).
3. With pending (scraped-but-unanalyzed) articles present, run:
   ```
   curl -X POST http://localhost:3000/api/analyze \
     -H "x-skeem-admin-secret: $SKEEM_ADMIN_SECRET"
   ```
   Expect a summary object (analyzed / embeddingsBackfilled / skipped / failed).
4. Open a news detail page for an analyzed article → full analysis renders, and
   the Related Stories section appears when ≥1 other article has an embedding.
