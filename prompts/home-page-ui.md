# Prompt: Skeem News Home Page UI

## Goal

Implement the Skeem News (biasly) home page: a "Top News" grid of analyzed article cards
rendered from typed mock data, styled to the SKEEM NEWS dark design system. The page is
UI-only and displays stored-shape data; it must not scrape, analyze, or mutate any pipeline
state (AGENTS.md §5).

Layout follows the biasly reference screenshot but adapted to the dark brand and reduced to a
grid-focused scope (per user decision): header + category chip row + Top News card grid +
footer. Deferred chrome (top utility bar, For You / Local / Blindspot nav, Subscribe / Login,
theme switcher, location) is out of scope until those features exist.

## Decisions / assumptions (confirmed with user)

- **Data source:** typed mock data now. No Supabase, no `lib/supabase`, no DB setup in this
  task. A typed article-card shape matching AGENTS.md §19 card fields is served from a local
  mock module so it swaps cleanly to real Supabase queries later.
- **Theme:** dark (brand). Uses existing dark tokens. The page forces the `dark` class so the
  home page renders in the brand's dark palette regardless of the OS preference, matching the
  design-system/brand rather than the light reference screenshot.
- **Layout scope:** grid-focused. No top utility bar, no For You/Local/Blindspot nav, no
  Subscribe/Login, no location or theme switch.

## Skills read

- `AGENTS.md` — full file (product scope, architecture layers §5, card fields §19, UI display
  rules, security §21, checks §22).
- `node_modules/next/dist/docs/` — will consult the App Router / Server Components and
  `next/image` guidance relevant to a server-rendered page before writing code (this Next is
  16.x and may differ from training data).

No pipeline skills (clerk / supabase / oxylabs / ai-sdk) are needed — this is display-only UI.

## Existing code inspected

- `app/page.tsx` — current hero/landing page. Will be replaced by the Top News home page.
- `app/layout.tsx` — root layout, Geist + JetBrains Mono font variables, `min-h-full flex flex-col` body.
- `app/globals.css` — Tailwind v4 `@theme` tokens: colors (`bg-app`, `surface-app`,
  `text-primary/secondary/tertiary/quaternary`, `border-strong/subtle`, `accent-app`,
  semantic `breaking/success/info/trending/warning`), typography scale (`h1..h4`,
  `body-large/medium/small`, `caption`, `code-inline`), radii (`brand-sm/md/lg/full`),
  shadows (`brand-sm/md/lg`), `.dark` variables, `.brand-container` (max-width 1280px).
- `components/Card.tsx` — existing **horizontal** (image-left) card. The reference home grid
  uses a **vertical** card (image top, meta, title, bias meter, "N sources"). The existing
  horizontal Card is used on the design-system page and must not be broken.
- `components/BiasMeter.tsx` — full-width bias bar with axis scale; heavier than the compact
  inline L/Center/Right bar shown inside the reference cards.
- `components/Chip.tsx` — category chip with `+` affordance and active state. Matches the
  reference category row.
- `components/Button.tsx` — brand button variants.
- `app/design-system/page.tsx` — `"use client"` showcase; consumes all four components. Must
  keep compiling.
- `tsconfig.json` — path alias `@/*` → project root.
- `public/skyline_markets.jpg` — the only real article-style image available; used as the
  shared placeholder for all mock cards. Other public images are svgs / design refs.

## Files likely to change or be added

- `lib/types/article.ts` — **new.** Typed shapes for a home-page article card. Central,
  reusable, mirrors AGENTS.md §19 card fields so a future Supabase query returns the same type.
- `lib/mock/articles.ts` — **new.** ~12 mock `ArticleCard` records (matching the reference
  grid) using `/skyline_markets.jpg` as the image. Clearly labelled mock; single source of the
  home page's data for now.
- `components/StoryCard.tsx` — **new.** Vertical article card (image top → category · region →
  title → compact inline bias bar → "N sources"). Presentational, typed via `ArticleCard`.
- `components/CompactBiasBar.tsx` — **new.** Compact three-segment L/Center/Right bar with
  inline labels for use inside `StoryCard` (distinct from the larger `BiasMeter`).
- `components/CategoryChipRow.tsx` — **new.** Horizontally scrollable row of category `Chip`s.
  A `"use client"` component only if it needs interaction; otherwise render `Chip`s statically.
- `app/page.tsx` — **replaced.** Server component composing header, category chip row, "Top
  News" heading, the responsive 3-column card grid, and footer.
- Possibly `app/globals.css` — only if a genuinely missing token is needed (avoid; prefer
  existing tokens).

Existing `Card.tsx`, `BiasMeter.tsx`, `Chip.tsx`, `Button.tsx` are **not modified**.

## Implementation requirements

Data / types:
- `ArticleCard` type includes: `id`, `slug`, `title`, `imageUrl`, `sourceCategory` (e.g.
  "Politics"), `region` (e.g. "United States"), `sentimentLabel` (`positive|neutral|negative`),
  `biasLabel` (`left|center|right|mixed|unclear`), `leftPercentage`, `centerPercentage`,
  `rightPercentage` (numbers 0–100 summing to 100), `confidence` (0–1, optional),
  `sourcesCount`, and optional `publishedAt`. This matches AGENTS.md §19 card fields
  (title, source, image, framing label + L/C/R percentages, sentiment, confidence).
- Mock records live only in `lib/mock/articles.ts`; the page imports from there. No fetching,
  no network, no side effects.

Home page (`app/page.tsx`, server component):
- Header: SKEEM NEWS lightning logo + wordmark (reuse the lightning SVG already in
  `app/page.tsx`), and a "Design System →" link to `/design-system`. Consistent with brand.
- Category chip row beneath the header (World Cup, IPL, Social Media, Business & Markets,
  Health & Medicine, Soccer, Artificial Intelligence, Arsenal FC, Extreme Weather — mirroring
  the reference), horizontally scrollable on small screens.
- "Top News" section heading using an appropriate type token (h2/h3).
- Responsive card grid: 1 column mobile, 2 columns md, 3 columns lg — using the mock cards.
- Footer: reuse the existing brand footer style (SKEEM NEWS, tagline, © 2026).
- Force dark theme: add the `dark` class on the page's root wrapper (mirrors how the
  design-system page toggles the class) so the home page always renders the dark palette.

StoryCard (vertical):
- Structure top→bottom: image (16:9-ish, `next/image` with `fill` + `sizes`), then a body with
  category · region meta (mono caption), h3 title (clamp to ~3 lines), a `CompactBiasBar`, and
  a "{sourcesCount} sources" line in mono caption.
- Uses only design tokens (surface, borders, radii `brand-md`, shadows `brand-md`→hover
  `brand-lg`). Hover lift consistent with existing `Card`.
- Fully typed props (`article: ArticleCard`). No `any`.
- Title links to `/news/[slug]` (route not built yet — link is fine and future-proofs the
  details page; it will 404 until § Details page work, which is acceptable and noted in test steps).

CompactBiasBar:
- Three segments sized by `leftPercentage / centerPercentage / rightPercentage`, colors red
  (`#E53935`) / neutral surface / blue (`#3B82F6`) matching `BiasMeter` and the design system.
- Inline labels `L {n}%`, `Center {n}%`, `Right {n}%` as in the reference, truncating
  gracefully when a segment is narrow.
- Presentational, typed, no state.

Accessibility:
- All images have meaningful `alt` (the article title).
- Interactive elements are real `button`/`a` with visible focus (reuse existing focus-ring
  pattern from `Button`).
- Category row scroll container is keyboard-reachable; chips are buttons.
- Color is not the only signal for bias (labels present).

## Security requirements (AGENTS.md §5, §21)

- No secrets, no service keys, no pipeline calls anywhere in this UI.
- No scraping, analysis, or mutation. Read-only display of static mock data.
- No `NEXT_PUBLIC_*` needed. Nothing server-only leaks to the client because there is no
  server data access at all yet.
- Keep UI and business logic separate: cards are presentational; data shape lives in `lib/`.

## Acceptance criteria

- `/` renders a dark-theme Top News page: brand header, category chip row, "Top News" heading,
  a responsive 1/2/3-column grid of ~12 vertical StoryCards, and the brand footer.
- Each card shows image, category · region, title, a compact L/Center/Right bias bar with
  labels, and "N sources" — matching the reference layout adapted to dark tokens.
- Bias percentages per card sum to 100 and render proportional segments.
- `/design-system` still renders unchanged (existing components untouched).
- Only design-system tokens are used for color/spacing/type/radius/shadow; no ad-hoc hex beyond
  the established `#E53935` / `#3B82F6` / `#0A0B0A` already used in the codebase.
- Strict TypeScript: no `any`, explicit prop types, small focused components.

## Checks to run (AGENTS.md §22)

- `npm run lint` — ESLint. (Note: repo has no `typecheck` script; TS is still enforced by the
  Next build. If a lightweight `tsc --noEmit` is warranted I will run `npx tsc --noEmit`.)
- `npm run build` — Next.js production build, since a route (`app/page.tsx`) and new modules
  changed. Report exact output; fix any errors before presenting.

## Manual test steps (share after implementation)

1. `npm run dev`
2. Open `http://localhost:3000/` — confirm the dark Top News grid: header, category chips,
   "Top News", ~12 vertical cards each with image, category · region, title, L/Center/Right
   bias bar, and "N sources"; footer at the bottom.
3. Resize the window: 1 column on mobile, 2 at `md`, 3 at `lg`. Category chip row scrolls
   horizontally on narrow screens.
4. Open `http://localhost:3000/design-system` — confirm it still renders and all four original
   components look unchanged.
5. Clicking a card title navigates to `/news/<slug>` and 404s for now — expected; the details
   page is a separate, later task.
