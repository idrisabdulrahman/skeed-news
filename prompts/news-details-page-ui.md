# Prompt: Skeem News News Details Page UI

## Goal

Implement the biasly **news details page** at `/news/[slug]` in the SKEEM NEWS dark design
language, adapted from the light reference screenshot (`public/03-news-details-page.png`). The
page is UI-only: it renders stored-shape analysis data from typed mock data and must not scrape,
analyze, or mutate any pipeline state (AGENTS.md §5). It displays stored data only.

The layout follows the reference: a two-column article layout (main article column + right
analysis sidebar) inside the brand container, plus a Related Stories grid and a newsletter CTA
band, wrapped by the same header + category chip row + footer chrome as the home page.

## Decisions / assumptions (confirmed with user)

- **Theme:** dark brand. The details page forces the `dark` class exactly like `app/page.tsx`,
  so the app stays visually consistent even though the reference screenshot is light-themed.
  Every light surface in the reference maps to the dark tokens (`bg-app`, `surface-app`,
  `border-strong/subtle`, `text-*`).
- **Data source:** typed mock data only. No Supabase, no pipeline. A new typed
  `ArticleDetail` shape mirrors AGENTS.md §7 (article fields) + §19 (full analysis fields:
  summary, sentiment score/label, bias label, left/center/right %, bias score, confidence,
  framing notes, loaded terms, disclaimer, model) so a future Supabase query returns the same
  type without changing the UI.
- **Source Breakdown panel:** included, but with an intentionally international/diverse outlet
  mix rather than the US-only list in the screenshot. Named outlets will include channels such
  as **RT**, **Arise News** (Africa/Nigeria-based), **Channels TV** (Nigeria), plus a few global
  outlets (e.g. Reuters, BBC, Al Jazeera), each with a per-outlet bias label. This is clearly
  mock data.
- **Static chrome:** the top utility bar, For You/Local/Blindspot nav, Subscribe/Login, theme
  switcher, and location selector from the reference remain out of scope (consistent with the
  home page decision). Save/Share/bookmark controls render as presentational buttons with no
  behavior.
- **Routing:** dynamic segment `app/news/[slug]/page.tsx`. The slug is looked up in the mock
  module; an unknown slug returns Next's `notFound()` (404).

## Skills read

- `AGENTS.md` — full file (product scope, architecture layers §5, article fields §7, AI analysis
  + UI framing display rules §19, related-articles concept §20, security §21, checks §22).
- `node_modules/next/dist/docs/01-app` — App Router dynamic routes (`[slug]`), Server
  Components, `generateStaticParams`/`generateMetadata`, `next/navigation` `notFound`, and
  `next/image` guidance. This is Next 16.2.10 and may differ from training data, so the dynamic
  routes + metadata docs will be consulted before writing the route.

No pipeline skills (clerk / supabase / oxylabs / ai-sdk) are needed — this is display-only UI.

## Existing code inspected

- `app/page.tsx` — home page. Forces `dark`, uses `.brand-container`, brand header (SKEEM bolt
  logo + wordmark), category chip row via `CategoryChipRow`, and the brand footer. The details
  page reuses this exact header/footer/chip-row treatment for consistency.
- `app/layout.tsx` — root layout; Geist + JetBrains Mono font variables; `min-h-full flex flex-col` body.
- `app/globals.css` — Tailwind v4 `@theme` tokens: colors, typography scale (`h1..h4`,
  `body-large/medium/small`, `caption`, `code-inline`), radii (`brand-sm/md/lg/full`), shadows
  (`brand-sm/md/lg`), `.dark` palette, `.brand-container` (max-width 1280px, 24px gutters).
- `lib/types/article.ts` — `ArticleCard`, `SentimentLabel`, `BiasLabel`. The new `ArticleDetail`
  type will extend/reuse these shapes and the same label unions.
- `lib/mock/articles.ts` — `mockTopNews: ArticleCard[]`. Slugs here (e.g.
  `trump-sends-iran-revised-peace-proposal`) are what the home cards link to, so the details
  mock must key on the same slugs.
- `components/BiasMeter.tsx` — full-width L/Center/Right bar **with axis scale** (0/50/100).
  Matches the reference "Bias Distribution" block. Reused as-is on the details page.
- `components/CompactBiasBar.tsx` — compact inline framing bar (used by StoryCard and the
  Related Stories mini-cards).
- `components/StoryCard.tsx` — vertical card; the reference Related Stories uses a smaller
  **horizontal** mini-card (thumbnail left, category·region, title, date · read time), so a new
  small presentational component is warranted rather than forcing StoryCard.
- `components/Chip.tsx`, `components/CategoryChipRow.tsx`, `components/Button.tsx` — reused for
  chrome, category tags, and the newsletter Subscribe / "How We Analyze Bias" buttons.
- `app/design-system/page.tsx` — `"use client"` showcase consuming the existing components; must
  keep compiling. Existing components will not be modified.
- `public/skyline_markets.jpg` — only real article-style image; used as the shared placeholder
  for the hero image and Related Stories thumbnails.
- `tsconfig.json` — path alias `@/*` → project root.

## Files likely to change or be added

- `lib/types/article.ts` — **extended.** Add an `ArticleDetail` interface (reusing
  `SentimentLabel` / `BiasLabel`) with: article fields (title, imageUrl, imageCaption, author,
  publishedAt, readTimeMinutes, sourceCategory, region, canonicalUrl) + body (array of paragraph
  strings) + full analysis (summary bullet points, sentimentScore/Label, biasLabel, left/center/
  right %, biasScore, confidence, framingNotes, loadedTerms[], disclaimer, model, sourcesCount)
  + a `sourceBreakdown` shape (per-outlet name + bias label + count/percentage) + a
  `relatedArticles: ArticleCard[]` list. Also add a small `OutletBias` sub-type.
- `lib/mock/articleDetails.ts` — **new.** Mock `ArticleDetail` records keyed by slug, including
  a full write-up for `trump-sends-iran-revised-peace-proposal` (matching the reference copy)
  and lighter entries for the other home slugs. `getArticleDetailBySlug(slug)` helper. Clearly
  labelled mock; the international Source Breakdown outlets (RT, Arise News, Channels TV, Reuters,
  BBC, Al Jazeera, …) live here. Related articles are pulled from `mockTopNews`.
- `app/news/[slug]/page.tsx` — **new.** Server component. Looks up the detail by slug, calls
  `notFound()` when missing, and composes: brand header + category chip row, the two-column
  article + sidebar layout, Related Stories grid, newsletter CTA band, and the brand footer.
  Implements `generateStaticParams` (known slugs) and `generateMetadata` (title/description).
- `components/ArticleHeader.tsx` — **new (optional).** Category·region tag line, H1 title,
  byline row (author · date · read time) with Save / Share / more presentational controls.
- `components/BiasAnalysisPanel.tsx` — **new.** Sidebar card: "Bias Analysis", Overall Bias
  headline (e.g. "Right 49%"), the L/C/R rows with mini bars, explainer copy, and a
  "How We Analyze Bias" button.
- `components/AiSummaryPanel.tsx` — **new.** Sidebar card: "AI Summary", generated meta line,
  bulleted summary, "AI summaries can make mistakes." note, and a "Provide Feedback" button.
- `components/SourceBreakdownPanel.tsx` — **new.** Sidebar card: "Source Breakdown", total
  sources, L/C/R rows with counts + bars, a "Top Sources / Bias" list of named outlets with
  their bias label, and a "View All Sources" button.
- `components/RelatedStoryCard.tsx` — **new.** Small horizontal mini-card (thumbnail left,
  category·region, title, date · read time) for the Related Stories grid.
- `components/NewsletterCta.tsx` — **new (optional).** "Stay Informed. Stay Balanced." band with
  an email input and Subscribe button (presentational; no submit).
- Possibly `app/globals.css` — only if a genuinely missing token is required (avoid; prefer
  existing tokens).

Existing `Card.tsx`, `BiasMeter.tsx`, `CompactBiasBar.tsx`, `StoryCard.tsx`, `Chip.tsx`,
`CategoryChipRow.tsx`, `Button.tsx`, and `app/page.tsx` are **not modified** (home cards already
link to `/news/[slug]`).

## Implementation requirements

Visual interpretation (reference `03-news-details-page.png`, mapped to dark tokens):

- **Overall:** two-column layout inside `.brand-container` — a wide main article column and a
  narrower right sidebar. Below it: Related Stories, then a newsletter CTA band. At `lg` the
  sidebar sits to the right; below `lg` it stacks under the article. Reference container is
  1280px (matches `.brand-container`).
- **Breadcrumb / tag line:** "Politics · United States" in mono caption, `text-tertiary` with
  the category in `text-secondary`, above the title.
- **Title (H1):** the reference detail title is large but not the 86px hero H1; use `text-h2`
  (44px) weight ~600–700, `text-primary`, tight leading. Responsive: smaller on mobile.
- **Byline row:** "By {author}  |  {date}  |  {read time}" in mono caption/`body-small`,
  `text-tertiary`; right-aligned Save / Share / more icons (presentational).
- **Hero image:** full-width `rounded-brand-md`, `aspect-[16/9]` (or similar), `next/image` with
  `fill` + `object-cover`; caption + photo credit line beneath in caption `text-tertiary`.
- **Bias Distribution block:** a `surface-app` card with `border-border-subtle`,
  `rounded-brand-md`, containing the existing `BiasMeter` (L/C/R with 0/50/100 axis) plus an
  "N sources" line. Header "Bias Distribution" with an info icon.
- **Article body:** paragraphs in `body-medium` (17px), `text-secondary`, relaxed leading,
  generous vertical spacing (24px between paragraphs per the 4px spacing system). Rendered from
  the `body: string[]` array.
- **Related Stories:** section heading, a 2-column (1 on mobile) grid of `RelatedStoryCard`
  mini-cards using the same tokens as StoryCard.
- **Newsletter CTA:** `surface-app` band, `rounded-brand-md`, "Stay Informed. Stay Balanced."
  headline, subcopy, email input + Subscribe primary button.
- **Right sidebar cards** (each `surface-app`, `border-border-subtle`, `rounded-brand-md`,
  `shadow-brand-md`, ~24px padding, stacked with 24px gap):
  - **Bias Analysis** — "Overall Bias", a bold accent headline like "Right 49%" (color-coded:
    left → `#E53935`, right → `#3B82F6`, center/mixed/unclear → neutral), "Based on N balanced
    sources", three L/C/R rows each `label — % — mini bar`, explainer paragraph, and a
    "How We Analyze Bias" secondary/outline button.
  - **AI Summary** — "Generated {date} · {read time}", 4–5 bullet points, "AI summaries can make
    mistakes." caption, "Provide Feedback" secondary button. This maps to the AGENTS.md §19
    `summary`; framing is shown as AI-estimated, not objective truth.
  - **Source Breakdown** — "N Total Sources", L/C/R count rows with bars, a "Top Sources | Bias"
    two-column list of named outlets with per-outlet bias label (bias labels color-coded), and a
    "View All Sources" secondary button. Uses the international outlet mix (RT, Arise News,
    Channels TV, Reuters, BBC, Al Jazeera, …).

Framing / analysis display rules (AGENTS.md §19):

- Political framing is labelled **AI-estimated**, never presented as objective truth (the
  disclaimer + "AI summaries can make mistakes." copy covers this).
- `left/center/right` percentages are 0–100 and sum to 100; the overall bias label matches the
  strongest percentage. Confidence is shown when available.
- `biasScore` is derived as `(right − left) / 100` in the mock, consistent with §7/§19.

Engineering:

- Strict TypeScript, no `any`; explicit prop types; small focused presentational components.
- Server component page; `notFound()` for unknown slugs; `generateStaticParams` +
  `generateMetadata`.
- Only design-system tokens for color/spacing/type/radius/shadow; the only ad-hoc hex allowed is
  the already-established `#E53935` / `#3B82F6` / `#0A0B0A` used elsewhere in the codebase.
- Reuse `BiasMeter` and `Button` rather than re-implementing them.

## Security requirements (AGENTS.md §5, §21)

- No secrets, no service keys, no pipeline calls anywhere in this UI.
- No scraping, analysis, or mutation — read-only display of static mock data.
- No `NEXT_PUBLIC_*` needed; there is no server data access yet, so nothing server-only can leak
  to the client.
- Keep UI and business logic separate: cards/panels are presentational; data shape lives in
  `lib/types`, mock data in `lib/mock`.

## Acceptance criteria

- `/news/trump-sends-iran-revised-peace-proposal` renders a dark-theme details page: brand
  header + category chip row, breadcrumb tag line, H1 title, byline row with Save/Share, hero
  image + caption, a Bias Distribution block (`BiasMeter` + N sources), the full article body,
  Related Stories grid, newsletter CTA, and brand footer.
- The right sidebar shows the three cards — Bias Analysis, AI Summary, Source Breakdown — with
  the international outlet mix and color-coded bias labels.
- Every home StoryCard link (`/news/<slug>`) resolves to a rendered details page; an unknown
  slug returns a 404 via `notFound()`.
- Framing percentages sum to 100 and render proportional bars; framing is shown as AI-estimated.
- Layout is responsive: sidebar beside the article at `lg`, stacked below on smaller screens;
  Related Stories 2-col → 1-col.
- `/` and `/design-system` still render unchanged (no existing component modified).
- Strict TypeScript: no `any`, explicit prop types.

## Checks to run (AGENTS.md §22)

- `npm run lint` — ESLint.
- `npx tsc --noEmit` — TypeScript (repo has no `typecheck` script; enforce types explicitly).
- `npm run build` — Next.js production build, since a new route (`app/news/[slug]/page.tsx`) and
  new modules are added. Report exact output; fix any errors before presenting.

## Manual test steps (share after implementation)

1. `npm run dev`
2. Open `http://localhost:3000/` and click the first Top News card title.
3. Confirm it navigates to `/news/trump-sends-iran-revised-peace-proposal` and renders the full
   dark details page: breadcrumb, H1, byline, hero + caption, Bias Distribution bar, article
   body, and the three sidebar cards (Bias Analysis, AI Summary, Source Breakdown with RT / Arise
   News / Channels TV / Reuters / BBC / Al Jazeera etc.), Related Stories, newsletter CTA, footer.
4. Resize the window: at `lg` the sidebar sits right of the article; below `lg` it stacks under
   the article; Related Stories collapses 2-col → 1-col.
5. Visit `http://localhost:3000/news/does-not-exist` — confirm a 404 (notFound).
6. Open `http://localhost:3000/design-system` — confirm it still renders unchanged.
