# Swap sources: remove Arise News, add Nigerian + international outlets

## Goal

Update the active source set in Supabase (the source of truth, §7):

- **Remove** Arise News via **hard delete** — `DELETE FROM public.sources` where the
  row matches Arise. Because `articles.source_id` is `ON DELETE CASCADE`
  (schema.sql:44), this also permanently removes all Arise articles and their
  `article_analyses` rows (including embeddings). User explicitly chose this.
- **Add** four Nigerian outlets: Premium Times, The Punch, The Cable, Daily Trust.
- **Add** three international outlets: Reuters, BBC News, Associated Press.

Keep `supabase/seed.sql` in sync so a fresh apply reflects the new set, and give
the user exact SQL to run against the live DB (seed.sql alone does not mutate an
existing DB — the ON CONFLICT DO NOTHING insert won't touch existing rows and
won't delete Arise).

## Skills read

- `.agents/skills/supabase/SKILL.md` — schema/seed conventions, service-role,
  idempotent seed patterns. Re-read AGENTS.md §7 (sources fields), §8 (only
  active sources scraped; source URLs never hardcoded in scraping logic — seed
  SQL is the allowed place), §9/§11 (homepage entry pages only).

## Existing code inspected

- `supabase/seed.sql` — current 5 sources incl. `('Arise News','https://www.arise.tv',true)`,
  idempotent via `on conflict (listing_url) do nothing`.
- `supabase/schema.sql:26-34` — `sources` columns: name, listing_url (unique),
  parser, active, logo_url, created_at.
- `supabase/schema.sql:44` — `source_id ... references public.sources (id) on delete cascade`
  → confirms cascade blast radius of a hard delete.
- `lib/parsing/links.ts:171-219` — `looksLikeArticleUrl` / `isArticleCandidate`.
  Confirmed the default strict heuristic (date paths, 5+ digit ids, long slugs,
  article/story markers) covers all new outlets' detail URL shapes, so **no
  `parser` strategy** is set for any new source.

## Verified homepage URLs (§11 homepage entry pages only)

| Source | listing_url |
| --- | --- |
| Premium Times | https://www.premiumtimesng.com |
| The Punch | https://www.punchng.com |
| The Cable | https://www.thecable.ng |
| Daily Trust | https://dailytrust.com |
| Reuters | https://www.reuters.com |
| BBC News | https://www.bbc.com/news |
| Associated Press | https://apnews.com |

## Decisions / assumptions

- Hard delete Arise (user choice), accepting cascade loss of its articles.
- Match Arise by `listing_url = 'https://www.arise.tv'` (the unique key) rather
  than name, to hit the exact seeded row.
- No `parser` value for new rows (default strict candidate check suffices).
- No `logo_url` seeded (optional per §7; can be added later).
- All new sources `active = true`.
- seed.sql stays idempotent (`on conflict (listing_url) do nothing`) and drops
  the Arise line so a fresh apply never re-creates it.
- Kept: Channels TV, Fox News, Al Jazeera, The Guardian.

## Files likely to change

- `supabase/seed.sql` — remove Arise line, add 7 new sources, refresh header
  comment.

(No app/TS code changes — sources are data, loaded at runtime from Supabase.)

## Implementation requirements

1. Rewrite `supabase/seed.sql` source list to:
   Channels TV, Fox News, Al Jazeera, The Guardian (kept) + the 7 new rows above.
   Remove the Arise News row. Keep the idempotent `on conflict` clause.
2. Update the header comment (no longer "five example outlets from §11").
3. Provide, in the test steps, the exact **live-DB** SQL the user runs in
   Supabase Dashboard → SQL Editor, because editing seed.sql does not mutate the
   running DB:
   - `DELETE FROM public.sources WHERE listing_url = 'https://www.arise.tv';`
   - the `INSERT ... ON CONFLICT (listing_url) DO NOTHING` for the 7 new rows.

## Security requirements

- No secrets touched. Source data only. Scraper still loads active sources from
  Supabase at runtime (§8) — URLs are not hardcoded into scraping logic.

## Acceptance criteria

- `supabase/seed.sql` lists exactly: Channels TV, Fox News, Al Jazeera,
  The Guardian, Premium Times, The Punch, The Cable, Daily Trust, Reuters,
  BBC News, Associated Press — and NOT Arise News.
- Running the provided live SQL removes Arise (and cascades its articles) and
  inserts the 7 new active sources without duplicating existing rows.
- No `parser` set on new rows; all `active = true`.

## Checks to run

- `npm run typecheck`
- `npm run lint`
- (No build — no app code changed; seed.sql is not compiled.)

## Manual test steps

1. Apply the live SQL in Supabase Dashboard → SQL Editor (delete Arise + insert
   new sources).
2. Verify the source list:
   ```
   curl http://localhost:3000/api/sources
   ```
   Confirm Arise is gone and the 7 new outlets appear as active.
3. Optional smoke scrape of a couple new sources:
   ```
   curl -X POST http://localhost:3000/api/scrape \
     -H "content-type: application/json" \
     -H "x-skeem-admin-secret: $SKEEM_ADMIN_SECRET" \
     -d '{"perSource":3}'
   ```
   Watch the dev-server terminal for per-source candidate/insert logs; confirm
   the new homepages yield article candidates (adjust `parser`/selectors later
   only if a specific source yields none).
