-- Skeem News (biasly) — source seed data
-- Active outlets scraped by the pipeline (AGENTS.md §7/§8). Homepage entry pages
-- only (§9/§11). Apply after schema.sql via SQL Editor.
--
-- Idempotent via ON CONFLICT on the unique listing_url — re-running will not
-- create duplicates. NOTE: this insert does NOT delete removed sources from an
-- existing DB; run the DELETE separately (see prompts/swap-news-sources.md).

insert into public.sources (name, listing_url, active) values
  ('Channels TV',      'https://www.channelstv.com',   true),
  ('Fox News',         'https://www.foxnews.com',      true),
  ('Al Jazeera',       'https://www.aljazeera.com',    true),
  ('The Guardian',     'https://www.theguardian.com',  true),
  ('Premium Times',    'https://www.premiumtimesng.com', true),
  ('The Punch',        'https://www.punchng.com',      true),
  ('The Cable',        'https://www.thecable.ng',      true),
  ('Daily Trust',      'https://dailytrust.com',        true),
  ('Reuters',          'https://www.reuters.com',      true),
  ('BBC News',         'https://www.bbc.com/news',      true),
  ('Associated Press', 'https://apnews.com',            true)
on conflict (listing_url) do nothing;
