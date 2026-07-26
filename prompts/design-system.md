# Prompt: Implement App Design System (Light & Dark Mode)

This prompt outlines the goal, design tokens, structure, and implementation requirements for establishing the `skeed-news` (Biasly) design system in both Light and Dark modes based on the provided UI reference images.

## Goal
Establish a unified, high-fidelity design system including color schemes, spacing, shadows, border-radii, grid systems, and typography for `skeed-news` in both Light and Dark modes. Create an interactive showcase dashboard page as the primary verification of the design system.

---

## 1. Skills Read
- `tailwindcss` (v4 configuration and directives)
- `next-js` (Layout, routing, fonts, client/server components)
- `modern-web-guidance` (Design system setup, accessibility, theme switching)

---

## 2. Existing Code Inspected
- `app/globals.css`: Uses `@import "tailwindcss";` and `@theme inline` mapping default font variables.
- `app/layout.tsx`: Configures `Geist` (sans) and `Geist_Mono` (mono) from `next/font/google`.
- `app/page.tsx`: Existing simple boiler template.

---

## 3. Decisions & Assumptions
1. **Tailwind Version**: Tailwind v4 is being used. Custom utilities, colors, shadows, font-sizes, and font-families will be defined inside `app/globals.css` using the new `@theme` syntax.
2. **Themes**: Light mode is the default (:root). Dark mode is enabled via the `.dark` class (for manual/Clerk toggle) and fallback `@media (prefers-color-scheme: dark)` media query.
3. **Fonts**: 
   - Primary Sans-Serif: `Geist`
   - Monospace: `JetBrains Mono` (specifically requested in UI spec for code, metadata, and labels)
4. **Primary Color Mapping**:
   - Dark Mode: Accent `#E8B54B`, Background `#0A0B0A`, Surface `#14171A`, Text Primary `#E6E8E6`.
   - Light Mode: Accent `#EBB54B`, Background `#FFFFFF`, Surface `#F6F7F8`, Text Primary `#14171A` (to guarantee contrast on white/off-white background).
5. **Interactive Showcase**: Replace the main page (`app/page.tsx`) with a beautiful, responsive visual reference sheet showing:
   - Logo / Brand section (SKEEM NEWS, subtitle, status badges)
   - Colors Section: Primary, Semantic, and Neutral swatches with color-copy feature
   - Typography: Interactive typography size and line-height cards
   - Grid & Spacing System visualizers
   - UI Elements: Buttons (Primary, Secondary, Text in all states), Chips, Bias Meter (interactive/sliding), and Card Example
   - Floating interactive toggle to test Light vs Dark mode live!

---

## 4. Files Likely to Change
- [app/globals.css](file:///home/asys/JS-TS/apps/project-next/skeed-news/app/globals.css): Define CSS custom properties, Tailwind theme extensions, standard typography components, custom outline buttons, and animations.
- [app/layout.tsx](file:///home/asys/JS-TS/apps/project-next/skeed-news/app/layout.tsx): Import `JetBrains_Mono` alongside `Geist` and configure CSS font variables.
- [app/page.tsx](file:///home/asys/JS-TS/apps/project-next/skeed-news/app/page.tsx): Showcase page implementation.

---

## 5. Implementation Requirements

### CSS Tokens (`app/globals.css`)
Configure the following custom colors and variables:
- **Dark Mode CSS Variables** (`.dark` and `@media (prefers-color-scheme: dark)`):
  - `--background`: `#0A0B0A`
  - `--surface`: `#14171A`
  - `--text-primary`: `#E6E8E6`
  - `--text-secondary`: `#A0A6A3`
  - `--text-tertiary`: `#6A7270`
  - `--text-quaternary`: `#434846`
  - `--border-strong`: `#262C31`
  - `--border-subtle`: rgba(255, 255, 255, 0.06)
  - `--accent`: `#E8B54B`
- **Light Mode CSS Variables** (`:root`):
  - `--background`: `#FFFFFF`
  - `--surface`: `#F6F7F8`
  - `--text-primary`: `#14171A`
  - `--text-secondary`: `#434846`
  - `--text-tertiary`: `#6A7270`
  - `--text-quaternary`: `#A0A6A3`
  - `--border-strong`: `#E6E8E6`
  - `--border-subtle`: `#ECEFF1`
  - `--accent`: `#EBB54B`
- **Semantic Shared Colors** (both modes):
  - `--breaking`: `#E53935`
  - `--success`: `#22C55E`
  - `--info`: `#3B82F6`
  - `--trending`: `#A855F7`
  - `--warning`: `#F59E0B`

- **Tailwind Theme Extensions** (`@theme`):
  - Colors: Map `--color-bg-app`, `--color-surface-app`, `--color-text-primary`, `--color-text-secondary`, `--color-accent-app`, `--color-breaking`, `--color-success`, `--color-info`, `--color-trending`, `--color-warning`, etc.
  - Fonts: Map `--font-sans` to `--font-geist-sans`, and `--font-mono` to `--font-jetbrains-mono`.
  - Font Sizes & Line Heights:
    - `text-h1` (86.4px / 90.72px)
    - `text-h2` (44px / 46.2px)
    - `text-h3` (20px / 26px)
    - `text-h4` (17px / 26.35px)
    - `text-body-large` (17px / 26.35px)
    - `text-body-medium` (17px / 26.35px)
    - `text-body-small` (13px / 18.85px)
    - `text-caption` (11px / 14.5px)
    - `text-code-inline` (9px / 9.9px)
  - Border Radii:
    - `--radius-brand-sm: 4px;`
    - `--radius-brand-md: 8px;`
    - `--radius-brand-lg: 12px;`
    - `--radius-brand-full: 9999px;`
  - Shadows:
    - `--shadow-brand-sm: 0px 1px 3px rgba(0, 0, 0, 0.06);`
    - `--shadow-brand-md: 0px 4px 12px rgba(0, 0, 0, 0.08);`
    - `--shadow-brand-lg: 0px 12px 24px rgba(0, 0, 0, 0.12);`

### Showcase Interface (`app/page.tsx`)
Create a comprehensive responsive layout divided into clean section cards matching the reference system:
1. **Brand Details**: Top banner displaying the "SKEEM NEWS" logo, typography header, breaking tag, and update badge.
2. **Colors Visualizer**: Shows all color categories. Make it interactive so clicking copies the hex code to the clipboard!
3. **Typography Showcase**: Display Geist vs JetBrains Mono with specific styles (H1-H4, body texts, caption, inline code) showing size & weight.
4. **UI Elements**:
   - **Buttons Panel**: Columns for Default, Hover, Outline, and Disabled states. Rows for Primary, Secondary, and Text button types.
   - **Chips / Categories**: Render interactive category tags (e.g. World, Politics, Business, More) with custom indicators.
   - **Bias Meter**: A responsive bias indicator component displaying left, center, right ratios (Left 28%, Center 44%, Right 28%).
   - **Card Example**: A preview card featuring the layout of a news story, with live tag, background image, title, snippet, time metadata, read time, and bookmark actions.
5. **Layout Systems**:
   - Spacing visualizer (showcasing 4px, 8px, 16px, 24px, 32px, 40px, 48px, 64px blocks).
   - Grid visualizer (showing standard 12-column template layout).
   - Border radius demo boxes.
   - Shadow depth level boxes.
6. **Theme Toggler**: Add a sleek floating button in the corner that toggles a `.dark` class on the `html` element so developers can instantly test both light and dark variations of the design system components!

---

## 6. Security Requirements
- Ensure no API keys or mock data contain vulnerable inputs.
- Ensure all copy-to-clipboard logic is handled safely using browser APIs.

---

## 7. Acceptance Criteria
1. Custom properties are defined in `globals.css` matching all colors, sizes, line heights, borders, and shadows in the UI reference.
2. Design Showcase is responsive and perfectly renderable on desktop and mobile layout widths.
3. The interactive theme switcher updates the UI elements seamlessly without layout shifts.
4. Typography looks crisp and matches the correct font families (Geist and JetBrains Mono).
5. Colors match the specified hex values exactly in both dark and light modes.
6. Lint and builds pass successfully.

---

## 8. Verification Checks & Steps
- **Build / Lint Check**: Run `npm run build` or `npm run dev` to ensure no styling errors.
- **Manual Verification Steps**:
  1. Open http://localhost:3000 in your browser.
  2. Toggle between Light and Dark mode using the floating controller.
  3. Verify color matching of Primary, Secondary, semantic, and border tokens.
  4. Verify typography sizes (H1 - H4, Body Large - Small, Caption, Code).
  5. Test interactivity (button hover animations, chip selection, copy-color feature, bias meter).
