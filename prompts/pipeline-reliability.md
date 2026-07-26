# Prompt: Pipeline reliability — rate-limit handling, Oxylabs cap, in-run dedup, date parser

## Goal

Fix four related pipeline problems surfaced during live testing, without
overbuilding:

1. **AI failure mis-counting + wasted runs.** All `analyzeArticle` throws are
   bucketed as `invalid_ai_output`, hiding the real cause (OpenRouter free-tier
   daily quota: `Rate limit exceeded: free-models-per-day`). A quota-exhausted
   run also keeps hammering ~30 more doomed calls for 7.8 min. Classify errors
   correctly and **fail-fast** the whole run once the daily quota is hit.
2. **Oxylabs usage too high.** Tighten per-source limits so a run makes far
   fewer Oxylabs requests (user chose "tighten per-source", not a global cap).
3. **Duplicates across sources.** Wire stories carried by multiple outlets get
   scraped/inserted twice. Add dedup by canonical URL **and** normalized title,
   both within a single run and against the DB.
4. **`missing_published_at` false rejections.** Real articles (e.g. Arise News)
   are rejected because the JSON-LD date fallback has an ordering bug and the
   key set is too narrow.

Keep the AI provider/model as-is: `openai/gpt-oss-20b:free` for analysis,
`openai/text-embedding-3-small` for embeddings (user is adding OpenRouter
credits to lift the daily quota).

## Skills read

- `AGENTS.md` (§8 source selection, §9 shared pipeline rules + reject list, §10
  storage/dedup, §12 candidate filtering, §13 validation/cleanup, §16 manual
  scraping, §19 analysis behavior + failure counting, §21 standards)
- `.agents/skills/supabase/SKILL.md` — query patterns, `.in()` chunking, joined
  filter gotcha (already used by `getExistingOriginalUrls`)
- `.agents/skills/ai-sdk` — `generateObject` error surface (`NoObjectGeneratedError`,
  `AI_APICallError`), retry semantics

## Existing code inspected

- `lib/pipeline/analyze.ts` — `processArticle` catches `analyzeArticle` throw and
  always `bump(..., "invalid_ai_output")` (line ~166). No fail-fast; loops all
  pending even after quota exhaustion.
- `lib/ai/analyze.ts` — `analyzeArticle` retries once then throws; error message
  carries the provider text (`Rate limit exceeded: free-models-per-day`,
  `Cannot connect to API`).
- `lib/pipeline/types.ts` — `AnalysisFailureReason` already includes
  `ai_call_failed` (unused); `RejectionReason` already includes
  `duplicate_in_batch` (unused). Need to add `rate_limited`.
- `lib/pipeline/scrape.ts` — per-source loop stops at `perSource` inserts or
  `MAX_DETAIL_SCRAPES_PER_SOURCE` attempts. `dedupeUrls` only dedups exact
  strings per source; no cross-source or title dedup.
- `lib/pipeline/limits.ts` — `DEFAULT_PER_SOURCE = 5`,
  `MAX_DETAIL_SCRAPES_PER_SOURCE = 20`.
- `lib/parsing/url.ts` — `normalizeUrl`, `dedupeUrls`, `slugify`. No title
  normalization helper.
- `lib/parsing/article.ts` — `extractPublishedAt`: the `for (const c of
  candidates)` loop consumes `candidates` **before** the `.each()` JSON-LD block
  pushes into it, so the JSON-LD fallback never runs. Key set omits
  `dateModified`, `uploadDate`, `og:...:published_time`, nested `@graph`.
- `lib/supabase/queries/articles.ts` — `getExistingOriginalUrls` (chunked ≤15).
  No title-existence check exists yet.

## Decisions / assumptions

1. **Fail-fast trigger** is specifically the daily-quota error
   (`free-models-per-day` / `per-day` in the message). Transient errors
   (`Cannot connect to API`, per-minute limits) do **not** trip fail-fast — they
   count as `ai_call_failed` for that article and the run continues. Rationale:
   the daily cap will not recover within a run; per-minute/connection errors may.
2. When fail-fast trips, the run stops processing further articles, sets summary
   `status: "failed"`, and records `rate_limited`. Already-saved analyses stay
   saved (append-only). This is surfaced clearly in the response + logs.
3. **Per-source tightening**: `DEFAULT_PER_SOURCE` 5 → 3;
   `MAX_DETAIL_SCRAPES_PER_SOURCE` 20 → 8. This bounds Oxylabs detail requests to
   ≤8 per source regardless of homepage link count. Homepage fetch is still 1 per
   source. Centralized in `limits.ts` (§21 no scattered magic numbers). The user's
   explicit "3 sources, 5 per source"-style instruction still overrides via the
   API body (unchanged behavior).
4. **Dedup scope**: add a run-level `seen` set keyed by (a) canonical URL and (b)
   normalized title, shared across all sources in one run; plus a DB title-
   existence check alongside the existing URL check. Title normalization:
   lowercase, strip punctuation, collapse whitespace, drop a trailing
   " - Source"/" | Source" suffix. Two stories with the same normalized title are
   treated as duplicates → counted `duplicate_in_batch` (in-run) or
   `duplicate_in_db` (DB), not scraped/inserted again.
   - Because canonical URL and title are only known **after** the detail scrape,
     the in-run URL/title dedup and DB title check happen post-scrape,
     pre-insert. The pre-scrape `original_url` DB check + per-source
     `dedupeUrls` stay as the cheap first line. (We accept that a cross-source
     duplicate still costs one detail scrape; the alternative — a homepage-title
     guess — is unreliable. Documented trade-off.)
5. **Date parser**: fix the ordering bug (collect JSON-LD candidates first, then
   evaluate all candidates) and widen the key/selector set. Do not loosen the
   gate otherwise — a genuinely date-less page still rejects (§13).
6. No new dependencies. No schema/env changes. Model IDs unchanged.

## Files likely to change

- `lib/pipeline/limits.ts` — lower the two constants (+ comment update).
- `lib/pipeline/types.ts` — add `rate_limited` to `AnalysisFailureReason`; note
  `ai_call_failed`/`duplicate_in_batch` now used.
- `lib/ai/analyze.ts` — export a small error classifier (or throw a typed error)
  distinguishing `rate_limited_daily` / `transient` / `invalid_output`; keep the
  single-retry behavior but do not retry on a daily-quota error (pointless).
- `lib/pipeline/analyze.ts` — use the classifier: bucket
  `rate_limited`/`ai_call_failed`/`invalid_ai_output` correctly; fail-fast the
  run on daily quota; set summary `status` accordingly.
- `lib/parsing/url.ts` — add `normalizeTitle(title)` helper.
- `lib/parsing/article.ts` — fix `extractPublishedAt` ordering + widen keys.
- `lib/pipeline/scrape.ts` — run-level `seen` set (canonical URL + normalized
  title); post-scrape/pre-insert dedup using it + DB title check.
- `lib/supabase/queries/articles.ts` — add `getExistingTitles(titles)` (chunked
  ≤`URL_IN_CHUNK`, same pattern as `getExistingOriginalUrls`).

## Implementation requirements

### AI error classification + fail-fast (§19)
- In `lib/ai/analyze.ts`, detect the daily-quota case from the error message
  (case-insensitive match on `free-models-per-day` OR `per-day`) and surface it
  distinctly — either a typed error class (`AiQuotaError`) or a returned
  discriminated result. Do **not** spend the retry on a daily-quota error.
- Keep the existing single retry for `NoObjectGeneratedError` (invalid output)
  and generic transient errors.
- In `lib/pipeline/analyze.ts`:
  - `invalid_ai_output` only when output failed schema validation twice.
  - `ai_call_failed` for transient/connection/per-minute errors (twice).
  - `rate_limited` for the daily-quota case; when seen, **stop the run**: break
    out of the batch loops, do not process remaining pending articles.
  - Summary `status: "failed"` if the run stopped early on `rate_limited`;
    otherwise `"completed"`. All counts remain accurate for what was processed.
  - Log a clear line, e.g. `[analyze] daily quota exhausted — stopping run early`.

### Oxylabs cap (§8/§16)
- `DEFAULT_PER_SOURCE = 3`, `MAX_DETAIL_SCRAPES_PER_SOURCE = 8` in `limits.ts`.
- No behavior change to the API override path (user-specified perSource wins).

### In-run + DB dedup (§9/§10)
- Add `normalizeTitle` to `lib/parsing/url.ts` (pure).
- Add `getExistingTitles(titles: string[]): Promise<Set<string>>` to
  `queries/articles.ts` — chunked ≤`URL_IN_CHUNK`, selects `title`, returns a Set
  of **normalized** titles for comparison (normalize both stored + candidate).
- In `scrape.ts`, maintain a run-level `seen` object (Sets for canonical URL and
  normalized title) across sources. After a detail page validates and before
  insert:
  - If canonical URL or normalized title is already in `seen` → count
    `duplicate_in_batch`, skip insert.
  - Else if normalized title exists in the DB title set → count
    `duplicate_in_db`, skip insert.
  - Else add to `seen` and insert.
- The existing pre-scrape `original_url` DB check and per-source `dedupeUrls`
  stay. Fetch the DB title set once per source (or once per run) for the batch of
  candidate-derived titles — simplest correct approach; document the choice.

### Date parser (§13)
- Fix `extractPublishedAt` so JSON-LD candidates are gathered **before** the
  candidate loop evaluates them.
- Widen keys/selectors: `meta[property='article:published_time']`,
  `meta[name='article:published_time']`, `meta[itemprop='datePublished']`,
  `meta[name='date']`, `meta[name='pubdate']`, `meta[name='publish-date']`,
  `meta[name='parsely-pub-date']`, `meta[property='og:published_time']`,
  `time[datetime]`, `time[pubdate]`; JSON-LD `datePublished` then `dateModified`
  then `uploadDate` (including inside `@graph` arrays — the regex approach is
  fine, just also match `dateModified`/`uploadDate` as ordered fallbacks).
- Keep `toIso` sanity bounds (year 1990–2100). Do not otherwise weaken the gate.

## Security requirements (§21)
- No secrets to browser code; all touched modules stay `server-only`.
- No new env vars, no service-role key exposure. Dedup/title queries use the
  existing admin client already used for writes.

## Acceptance criteria
- A quota-exhausted analysis run stops early, returns `status: "failed"` with
  `failureReasons: { rate_limited: N }` (N ≥ 1), and does **not** log 30+
  consecutive failures or run for minutes.
- With credits added, a normal run classifies genuine bad output as
  `invalid_ai_output`, connection blips as `ai_call_failed`, and completes.
- A scrape run makes ≤8 detail requests per source and ≤`perSource` inserts.
- The same wire story appearing on two sources is inserted once; the second is
  counted `duplicate_in_batch` (or `duplicate_in_db` if already stored).
- Arise News articles that previously failed `missing_published_at` now extract a
  date and pass the gate (assuming they truly carry a date in JSON-LD/meta).
- `npm run typecheck` and `npm run lint` pass.

## Checks to run
- `npm run typecheck`
- `npm run lint`
- `npm run build` (server modules + pipeline changed)

## Manual test steps
Watch the dev-server terminal for `[scrape]` / `[analyze]` logs (§17).

1. Start dev server:
   ```
   npm run dev
   ```
2. Scrape a couple of sources (cap + dedup):
   ```
   curl -X POST http://localhost:3000/api/scrape \
     -H "x-skeem-admin-secret: $SKEEM_ADMIN_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"perSource": 3}' | jq
   ```
   Expect: per source, `detailScraped` ≤ 8; cross-source duplicates show up as
   `duplicate_in_batch` in `rejectionReasons`; Arise-style articles no longer
   dominated by `missing_published_at`.
3. Analyze (before adding credits — verify fail-fast):
   ```
   curl -X POST http://localhost:3000/api/analyze \
     -H "x-skeem-admin-secret: $SKEEM_ADMIN_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"limit": 3}' | jq
   ```
   Expect (if quota already exhausted): quick return, `status: "failed"`,
   `failureReasons: { rate_limited: 1 }`, and a single
   `[analyze] daily quota exhausted — stopping run early` log — NOT 31 failures
   over minutes.
4. Analyze (after adding OpenRouter credits):
   ```
   curl -X POST http://localhost:3000/api/analyze \
     -H "x-skeem-admin-secret: $SKEEM_ADMIN_SECRET" \
     -H "Content-Type: application/json" \
     -d '{"limit": 3}' | jq
   ```
   Expect: `analyzed` > 0, embeddings saved, `status: "completed"`.

## Note on the `{"limit: 3"}` typo
The curl commands you ran sent `-d '{"limit: 3"}'` — that is malformed JSON (the
key/quote is wrong), so the route received no usable `limit` and defaulted to all
pending. Correct form is `-d '{"limit": 3}'`. Not a code bug, but worth flagging
so testing reflects the intended limit.
