# SKEEM NEWS — Design System (Hallmark)

One design, one brand. Two macrostructures share one token layer; they differ
only in how they assemble those tokens.

- **Genre:** editorial
- **Macrostructure family:** home = Split Studio · details = Long Document
- **Theme:** custom — light paper (the pre-existing `--bg-app`), cool-blue accent
- **Enrichment:** none
- **Nav:** N6 newspaper masthead (both pages)
- **Footer:** Ft4 dense colophon

---

## Theme

| Token | Light | Dark |
| --- | --- | --- |
| `--bg-app` (paper) | `#FFFFFF` (spec: current background) | `oklch(15% 0.014 265)` |
| `--surface-app` | `oklch(96.8% 0.007 262)` | `oklch(19% 0.014 265)` |
| `--text-primary` (ink) | `oklch(24% 0.015 262)` | `oklch(92% 0.008 262)` |
| `--text-secondary` | `oklch(40% 0.012 262)` | `oklch(76% 0.006 262)` |
| `--text-tertiary` | `oklch(52% 0.008 262)` | `oklch(62% 0.006 262)` |
| `--text-quaternary` | `oklch(64% 0.006 262)` | `oklch(50% 0.005 262)` |
| `--border-strong` (rule) | `oklch(87% 0.006 262)` | `oklch(30% 0.012 265)` |
| `--border-subtle` | `oklch(92.5% 0.005 262)` | `oklch(25% 0.01 265)` |
| `--accent-app` (cool cobalt) | `oklch(51% 0.16 262)` | `oklch(72% 0.12 258)` |
| `--on-accent` | `oklch(99% 0.002 262)` | `oklch(16% 0.02 265)` |

- Greys are tinted toward the cool-blue anchor hue (262–265), never pure neutral.
- Dark mode = higher lightness + lower chroma on the same hue.
- Semantic data-viz colors (`--breaking` red, `--info` blue, `--success`,
  `--trending`, `--warning`) are distinct from the brand accent — framing bars
  read as data, not brand.
- Theme flip: `.light` / `.dark` classes on `#theme-root` (both pages);
  persisted via `skeem-theme` (localStorage). `prefers-color-scheme: dark`
  applies dark unless `.light` is present. **Light is the default; dark is
  first-class and available on every page.**

## Typography

One family: Geist (same family for display, body, and labels). No mono in UI;
numbers use tabular numerals (`font-variant-numeric: tabular-nums`).

| Slot | Token | Size / weight |
| --- | --- | --- |
| Display (hero h1) | `--text-display` | clamp(2.375rem → 3.25rem), bold, lh 1.08 |
| Heading h2 | `--text-h2` | 44px bold |
| Heading h3 | `--text-h3` | 20px semibold |
| Heading h4 / card title | `--text-h4` | 17px semibold |
| Body | `--text-body-medium` | 17px, lh 1.625 (relaxed) |
| Lede | `--text-body-large` | 17px, secondary ink |
| Label / small | `--text-body-small` | 13px medium |
| Caption | `--text-caption` | 11px, tertiary ink |

- Headlines and labels are **sentence case** — no uppercase, no eyebrows,
  no small caps, no italics.
- Article body is set in ink (`--text-primary`) at ~65ch for long-form reading.

## Spacing

4pt scale (`--space-1`…`--space-24`). Page gutter 24px; container max-width
1280px. Section rhythm: py-12, hero/section separators are hairlines.

## Motion

Editorial default: **off**. Only affordances move:

- Hover: color shifts on clickable text/buttons (`--dur-short` 180ms,
  `--ease-out`).
- Press: instant 1px sink on buttons (`active:translate-y-px`).
- Theme flip: 200ms paper/ink crossfade.
- Focus: **instant** 2px accent outline, offset 2px, via the global
  `:focus-visible` rule (`transition: none` on the focused element).
- `prefers-reduced-motion`: all durations collapse to ~0.
- No `transition-all` anywhere; no autoplay, no infinite animation, no
  scrolling/marquee, no parallax.

## Microinteractions

- Card titles shift to accent on hover; the image does not scale (print-like).
- The framing track stays static — data, not decoration.
- Nav row: quiet text links; active state is accent ink.

## CTA voice

- Primary = ink fill (paper text) → hover: accent fill. Used once per band
  (Subscribe, Sign up).
- Secondary = hairline outline → hover: accent ink.
- Text = typographic accent link, underline on hover.
- All targets ≥ 44px tall.

## Removed (this redesign)

- The floating info affordance overlay on story-card images (decorative,
  hover-only chrome).
- The `+` add affordance on category chips (no behavior behind it).
- The Design System link in the home masthead (dev artifact; page remains at
  `/design-system`).
- Mono in UI (JetBrains Mono retired from interface text; kept as a font token).
- Shadows and surface fills on cards/panels — hairline borders on paper only.

## Per-page allowances

| Page | Macrostructure | Allows | Requires |
| --- | --- | --- | --- |
| Home (`/`) | Split Studio | hero diptych, split section with left rail | N6 masthead, Ft4 footer |
| Details (`/news/[slug]`) | Long Document | sidebar panels, related-stories grid | N6 masthead, 65ch measure |

Both pages share: `#theme-root`, ThemeToggle in the masthead, the category
row, and every token.

## Exports

- `tokens.css` — canonical token layer (`:root` / `.dark` / `.light` /
  prefers-color-scheme), imported by `app/globals.css`. Change tokens here
  and update this file together.
- `app/globals.css` — Tailwind v4 `@theme inline` mapping (keeps the existing
  `--color-*` utility names so all components inherit), global focus rule,
  `overflow-x: clip`, reduced-motion block.
