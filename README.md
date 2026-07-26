# skeem

**News articles analysis powered by AI.** skeem fetches articles from specified news sources, reads them with AI, and displays things that no other reader would know — the sentiment, the framing, the biased language, and how confident the machine really is about any of it.

It is not a news aggregator. Every story on the homepage was scraped, cleaned, validated, analyzed, embedded, and cross-linked with similar stories — automatically, at the rate of one pass per hour.

> *Real stories. Real fast. Stay informed. Stay ahead.*

---

## A look at it

**Homepage** — a grid of story cards, each carrying its own left / center / right bias bar.

![skeem homepage](public/01-homepage.png)

**Article details** — the full read alongside a bias breakdown, an AI summary, and a per-source split.

![skeem news details page](public/02-news-details%20.png)

---

## What it does

- **Scrapes real sources.** Scrapes article links from source homepages using the Oxylabs Web Scraper API, follows the links to the detail pages, and discards everything that is not a true article (category pages, live blogs, podcasts, shopping links, and more).
- **Analyzes with AI.** Provides a neutral summary, a sentiment score and label, and an *estimated* political framing breakdown (left / center / right percentages) for each article — always as an estimate, never objective truth.
- **Finds related stories.** Analyzed data is stored in pgvector, making it possible to find up to five semantically similar articles on the details page by cosine similarity.
- **Runs itself.** Sources' homepages are scraped hourly by the Oxylabs Scheduler, which then triggers a Vercel Cron job 15 minutes later to process the results and analyze any new content — no need for babysitting after setting it up.
- **Keeps receipts.** All pipeline runs log their activity — sources scanned, candidates for processing found and discarded, duplicates skipped, articles inserted, errors — to both console and a `logs` table.

## The whole pipeline, end to end

```
Oxylabs Scheduler        Vercel Cron (:15 past the hour)
      │                            │
   scrape homepages          GET /api/cron/pipeline
      │                            │
      ▼                            ▼
  homepage HTML  ──►  extract links ──►  reject non-articles ──►  dedupe
                                                                    │
                          scrape detail pages  ◄─────────────────────
                                   │
                          validate + clean  ──►  insert into Supabase
                                                        │
                                              AI analysis + embedding
                                                        │
                                                 homepage + details UI
```

Manual and scheduled scraping share the same *pipeline* — the difference is only in fetching homepage HTML.

## Tech stack

| Layer          | Tool                                              |
| -------------- | ------------------------------------------------- |
| Framework      | Next.js (App Router) + React 19                    |
| Auth           | Clerk                                              |
| Database       | Supabase (Postgres + pgvector)                     |
| Scraping       | Oxylabs Web Scraper API + Scheduler, Cheerio      |
| AI             | Vercel AI SDK — Google Gemini (analysis + embeddings) |
| Validation     | Zod                                               |
| UI             | Tailwind CSS + shadcn/ui                           |
| Scheduling     | Vercel Cron                                        |
| Analytics      | PostHog                                            |

## Design language

skeem has its own design system (browse it live at `/design-system`, or see the boards below in dark and light).

![skeem design system — dark](public/UI%20design%20lang.png)
![skeem design system — light](public/UI%20design_lang_light.png)

- **Brand.** A yellow lightning bolt beside a bold **SKEEM NEWS** wordmark — energetic but restrained.
- **Type.** [Geist](https://vercel.com/font) for headlines and UI, [JetBrains Mono](https://www.jetbrains.com/lp/mono/) for data, labels, and metadata. On an 86px hero scale down to an 11px caption.
- **Color.** An amber accent (`#E8B54B`) over a near-black canvas (`#0A0B0A`) and dark surfaces (`#14171A`), with a full semantic set — breaking red, success green, info blue, trending purple, warning amber. Ships in **both dark and light** themes.
- **The bias meter.** The signature component: a horizontal **Left (red) · Center (neutral) · Right (blue)** bar that appears compact on every card and expanded on the details page. It's how framing becomes something you can read at a glance.
- **System.** A 4px spacing base, a 1280px / 12-column grid, and defined shadow and radius scales — so cards, chips, and panels stay consistent everywhere.

## Getting started

**1. Install dependencies**

```bash
pnpm install
```

**2. Configure environment**

Copy `.env.example` to `.env.local` and fill in your keys:

```bash
cp .env.example .env.local
```

You'll need credentials for Clerk, Supabase, Oxylabs, and Google Generative AI, plus a `SKEEM_ADMIN_SECRET` of your own choosing. `CRON_SECRET` is injected by Vercel in production — don't add it locally.

**3. Set up the database**

Run `supabase/schema.sql` in the Supabase SQL Editor, then `supabase/seed.sql` to load the active news sources. Enable the **pgvector** extension under Database → Extensions before the embedding column is used.

**4. Run the dev server**

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Watch the dev-server terminal — scrape and analysis progress is logged there.

## Feeding it data

Nothing shows on the homepage until articles are scraped **and** analyzed. To bootstrap manually:

```bash
# Scrape (defaults to all active sources, up to 5 articles each)
curl -X POST http://localhost:3000/api/scrape \
  -H "x-skeem-admin-secret: $SKEEM_ADMIN_SECRET"

# Analyze everything still pending
curl -X POST http://localhost:3000/api/analyze \
  -H "x-skeem-admin-secret: $SKEEM_ADMIN_SECRET"
```

Once deployed, `POST /api/oxylabs/schedules` registers the hourly Oxylabs jobs and `vercel.json` wires up the cron trigger — after that the pipeline runs on its own.

## API routes

| Method | Route                                    | Purpose                                  |
| ------ | ---------------------------------------- | ---------------------------------------- |
| `POST` | `/api/scrape`                            | Manual scrape run                        |
| `POST` | `/api/analyze`                           | Analyze pending articles                 |
| `POST` | `/api/oxylabs/schedules`                 | Create/sync hourly Oxylabs schedules     |
| `GET`  | `/api/oxylabs/schedules`                 | List stored schedules                    |
| `GET`  | `/api/oxylabs/runs`                      | List schedule runs                       |
| `POST` | `/api/oxylabs/scheduled-results/process` | Process completed scheduled results      |
| `GET`  | `/api/sources`                           | List active sources                      |
| `GET`  | `/api/cron/pipeline`                     | Internal — cron-only, `CRON_SECRET` gated |

Every action route (`POST`) requires the `x-skeem-admin-secret` header. The cron route is internal and protected separately by `CRON_SECRET`.

## Project layout

```
app/            Pages, auth UI, and thin API route handlers
components/      UI — story cards, bias meters, analysis panels
lib/
  ai/           Model calls, analysis schema, embeddings
  parsing/      Link extraction, URL normalization, article cleanup
  pipeline/     Scrape + analysis orchestration and typed results
  scraping/     Oxylabs client and Scheduler integration
  supabase/     Clients and typed queries
supabase/       schema.sql + seed.sql (source of truth)
```

The layers stay separate on purpose: the UI only ever *displays* stored data — it never scrapes, analyzes, or mutates pipeline state.

## Checks

```bash
pnpm typecheck   # tsc --noEmit
pnpm lint        # eslint
pnpm build       # production build
```

## A note on the analysis

The political framing is generated by an AI model from article text alone — not from a source's reputation, and not as a statement of fact. It's an estimate, it carries a confidence score, and it can be wrong. Read it as one more lens on a story, not the last word on it.
