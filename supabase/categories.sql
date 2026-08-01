-- Skeem News — categories feature (run once in Supabase Dashboard → SQL Editor)
--
-- Adds the optional articles.category column (nullable — extraction is
-- best-effort and never a gate rejection) and backfills existing rows by
-- keyword matching against the canonical taxonomy terms. New scrapes populate
-- real sections from the article detail page (article:section / og:section /
-- JSON-LD articleSection) instead.
--
-- Idempotent: re-running is safe. Each backfill UPDATE only touches rows where
-- category IS NULL, so re-runs never overwrite extracted values.

alter table public.articles add column if not exists category text;

create index if not exists articles_category_idx on public.articles (category);

-- ─── Backfill (best-effort keyword tags; rows matching nothing stay NULL) ────

update public.articles set category = 'World Cup'
  where category is null and (title ilike '%world cup%' or raw_text ilike '%world cup%');

update public.articles set category = 'IPL'
  where category is null and (title ilike '%ipl%' or raw_text ilike '%ipl%');

update public.articles set category = 'Social Media'
  where category is null and (title ilike '%social media%' or raw_text ilike '%social media%');

update public.articles set category = 'Business & Markets'
  where category is null and (title ilike '%business%' or raw_text ilike '%business%');

update public.articles set category = 'Health & Medicine'
  where category is null and (title ilike '%health%' or raw_text ilike '%health%' or raw_text ilike '%medicine%');

update public.articles set category = 'Soccer'
  where category is null and (title ilike '%soccer%' or raw_text ilike '%soccer%');

update public.articles set category = 'Artificial Intelligence'
  where category is null and (title ilike '%artificial intelligence%' or raw_text ilike '%artificial intelligence%');

update public.articles set category = 'Arsenal FC'
  where category is null and (title ilike '%arsenal%' or raw_text ilike '%arsenal%');

update public.articles set category = 'Extreme Weather'
  where category is null and (title ilike '%extreme weather%' or raw_text ilike '%extreme weather%');

-- Sanity check after running:
--   select category, count(*) from public.articles where category is not null group by 1 order by 2 desc;
