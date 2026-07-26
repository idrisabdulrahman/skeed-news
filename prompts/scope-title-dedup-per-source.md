# Scope title dedup per-source to restore cross-source related articles

## Goal

Stop cross-source fuzzy-title deduplication from discarding a second outlet's
coverage of the same story. Those discarded articles are exactly what the §20
Related Articles feature should surface (same event, different framing), but
they are dropped before insert, so they are never embedded and can never match.

Keep real duplicate protection intact:

- Canonical-URL dedup stays **cross-source** (one wire story carried verbatim by
  two outlets under the same canonical URL is still one article).
- Original-URL dedup stays **cross-source** (unchanged, already correct).
- Normalized-title dedup becomes **per-source only** (catches one outlet's own
  re-publish / near-dupes, never strips another outlet's coverage).

This also realigns with §10, which specifies dedup by original + canonical URL.

## Skills read

- None required — this is a pipeline/query correctness fix using existing
  project patterns. Relevant sections re-read: AGENTS.md §9 (shared pipeline
  rules, URL existence check), §10 (append-only + dedup by original/canonical
  URL), §20 (pgvector related articles), §21 (joined-filter gotcha).

## Existing code inspected

- `lib/pipeline/scrape.ts`
  - `RunSeen` (124-127): run-level `canonicalUrls` + `titles` sets, shared across
    all sources.
  - `scrapeSource` step 6a (232-241): rejects if canonical OR title seen this run.
  - step 6b (243-252): rejects if normalized title already in DB (all sources).
  - insert success (266-272): records canonical + title into the shared sets.
- `lib/supabase/queries/articles.ts`
  - `getExistingTitles(titles)` (264-294): DB title existence check, **not**
    scoped by source — this is the cross-source DB leak.
  - `getExistingOriginalUrls` (228-253): cross-source URL check — stays as is.
  - `match_articles` RPC caller `getRelatedArticles` (495-529): no source filter,
    already correct — confirmed the bug is upstream, not here.
- `lib/parsing/url.ts` `normalizeTitle` (75-85): fuzzy (lowercases, strips
  diacritics + trailing " - Source", collapses punctuation) — why two outlets'
  headlines collide. Left unchanged; only its *scope* of application changes.
- `supabase/schema.sql` `match_articles` (202-245): cross-source by design — no
  change needed.

## Decisions / assumptions

- Chosen approach: **Option 3** (per-source title dedup, cross-source URL dedup).
- Title dedup within a single run is scoped by keeping a **local** `Set` inside
  `scrapeSource` instead of the shared `RunSeen.titles`. Since `scrapeSource`
  handles exactly one source, a local set is naturally per-source and needs no
  keying.
- `RunSeen.canonicalUrls` stays shared/cross-source. `RunSeen.titles` is removed.
- `getExistingTitles` gains a required `sourceId` param and filters the query
  with `.eq("source_id", sourceId)` — a same-table column filter, so the §21
  joined-filter gotcha does not apply.
- No schema change, no migration, no type change (signatures only).

## Files likely to change

- `lib/pipeline/scrape.ts` — remove `titles` from `RunSeen`; add a per-source
  local `seenTitles` set; update 6a/6b/insert accordingly.
- `lib/supabase/queries/articles.ts` — add `sourceId` param to
  `getExistingTitles` and scope the query by source; update its doc comment.

## Implementation requirements

1. `getExistingTitles(titles: string[], sourceId: string)`:
   - add `.eq("source_id", sourceId)` to each chunked query.
   - keep the ≤`URL_IN_CHUNK` chunking and conservative on-error behavior.
   - update the doc comment: title dedup is per-source; cross-source coverage is
     intentionally preserved for Related Articles (§20).
2. `RunSeen`: drop the `titles` field; keep `canonicalUrls`. Update the init in
   the pipeline entry (currently ~57-60) to `{ canonicalUrls: new Set() }`.
3. `scrapeSource`: declare `const seenTitles = new Set<string>()` at the top of
   the per-source loop scope (once per source, not per candidate).
   - 6a: reject if `canonicalKey && ctx.seen.canonicalUrls.has(canonicalKey)`
     (cross-source) **or** `titleKey && seenTitles.has(titleKey)` (per-source).
   - 6b: `getExistingTitles([article.title], source.id)`.
   - insert success: `ctx.seen.canonicalUrls.add(canonicalKey)` (shared) and
     `seenTitles.add(titleKey)` (local).
4. Update comments referencing cross-source title dedup so they describe the new
   per-source scope and the reason (Related Articles).

## Security requirements

- No new external calls, no secret handling changes. Service-role client usage in
  `getExistingTitles` is unchanged. Server-only modules stay server-only.

## Acceptance criteria

- Two active sources covering the same story both get inserted, embedded, and can
  appear in each other's Related Articles.
- A single source re-publishing the same headline in one run or across runs is
  still skipped (`duplicate_in_batch` / `duplicate_in_db`).
- Cross-source identical canonical/original URLs are still skipped.
- `getExistingTitles` never returns titles from other sources.
- No behavior change to the `match_articles` RPC or `getRelatedArticles`.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- `npm run build` (server pipeline module changed)

## Manual test steps

1. Ensure ≥2 active sources likely to co-cover a major story.
2. Scrape:
   ```
   curl -X POST http://localhost:3000/api/scrape \
     -H "content-type: application/json" \
     -H "x-skeem-admin-secret: $SKEEM_ADMIN_SECRET" \
     -d '{"perSource":5}'
   ```
   Watch the dev-server terminal: confirm cross-source same-story articles are no
   longer logged as `duplicate in batch` / `duplicate in db (title)`.
3. Analyze (creates analysis + embedding):
   ```
   curl -X POST http://localhost:3000/api/analyze \
     -H "content-type: application/json" \
     -H "x-skeem-admin-secret: $SKEEM_ADMIN_SECRET" \
     -d '{}'
   ```
4. Open a news details page for a story with known co-coverage and confirm the
   Related Articles section shows items from a **different** source.
5. Re-run the scrape and confirm same-source repeats still skip as duplicates.
