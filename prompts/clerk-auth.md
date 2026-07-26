# Prompt: Clerk Authentication

## Goal

Add Clerk authentication to biasly (Skeem News):

- Wrap the app in `<ClerkProvider>`.
- Add Clerk's `proxy.ts` (Next.js 16's renamed middleware) so Clerk auth context is
  available on every request.
- Add auth UI to the header: modal Sign in / Sign up buttons for signed-out users, and a
  `<UserButton>` for signed-in users.
- Gate the **full analysis** (news details page `app/news/[slug]`): signed-out visitors see a
  sign-in gate instead of the analysis; signed-in visitors see the full page. Home page and
  design-system page stay public.

Minimal, responsive, matches the existing SKEEM NEWS dark design system. Do not overbuild
(AGENTS.md §1).

## Skills read

- `AGENTS.md` / `CLAUDE.md` — full file (tech stack §6: Clerk required; §21 security:
  `CLERK_SECRET_KEY` server-only, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` client+server; §1 minimal
  UI, do not overbuild; §22 checks).
- `.agents/skills/clerk/SKILL.md` — the Clerk router. It routes "adding authentication" →
  `clerk-setup` and "Next.js patterns" → `clerk-nextjs-patterns`. **Those sub-skill files are
  not present on disk** (only the router `SKILL.md` ships). Documenting this gap here per
  AGENTS.md §2/§3. Filled the gap with Clerk's official current-SDK reference (below) rather
  than inventing a new skill.
- `node_modules/next/dist/docs/01-app/02-guides/upgrading/version-16.md` — confirmed Next 16
  renames `middleware.ts` → `proxy.ts`; `proxy` runs on the **nodejs** runtime (edge not
  supported); the named export is `proxy`.
- Clerk reference `clerk.com/docs/reference/nextjs/clerk-middleware` — current `clerkMiddleware()`
  usage and matcher config. Confirms Next 16 uses `proxy.ts` with identical Clerk code, and that
  `createRouteMatcher` + middleware-level protection is now **deprecated** in favor of protecting
  "as close to the resource as possible" (so we gate in the page, not the middleware).

## Existing code inspected

- `package.json` — Next `16.2.10`, React `19.2.4`. No `@clerk/*` installed. Scripts: `dev`,
  `build`, `lint`, `typecheck`.
- `app/layout.tsx` — root layout, Geist + JetBrains Mono font vars, `min-h-full flex flex-col`
  body. No provider yet.
- `app/page.tsx` — home page (client-safe, server component). Header has a brand mark + a
  "Design System →" link, no auth controls. Forces `dark` class.
- `app/news/[slug]/page.tsx` — server component news details page rendering full analysis from
  mock data (`getArticleDetailBySlug`). This is what we gate.
- `app/design-system/page.tsx` — internal design reference, stays public.
- `.env.local` — already has `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (`pk_test_…`) and
  `CLERK_SECRET_KEY` (`sk_test_…`). No further keys needed for modal flow.
- No `proxy.ts` / `middleware.ts` exists yet.
- No `.env.example` exists yet.

## Decisions / assumptions (confirmed with user)

- **Protection scope:** gate the full analysis. News details page requires sign-in; home and
  design-system stay public.
- **Auth flow:** modal buttons (`<SignInButton mode="modal">` / `<SignUpButton mode="modal">`).
  No dedicated `/sign-in` or `/sign-up` routes, so **no** `NEXT_PUBLIC_CLERK_SIGN_IN_URL` etc.
  are needed.
- **Gating mechanism:** because there is no sign-in *page* to redirect to, the news page checks
  `auth()` server-side and, when signed out, renders an in-page gate ("Sign in to read the full
  analysis") containing a modal `<SignInButton>` — instead of `redirectToSignIn()`. Signed-in
  users get the normal page. This keeps server/client boundaries clean and avoids a redirect to
  a route that doesn't exist.
- **Middleware:** use `proxy.ts` (Next 16 name) at project root with `export default
  clerkMiddleware()` and the standard matcher. No `createRouteMatcher`/`auth.protect` in the
  proxy (deprecated per Clerk; protection lives in the page).
- **Package version:** install latest `@clerk/nextjs` (current SDK, v7+) to match the current
  patterns in the Clerk router skill.
- **Header auth controls:** add to the home page header. `<SignedOut>` → Sign in + Sign up
  (buttons styled to match the existing accent/outline button look). `<SignedIn>` →
  `<UserButton>`. The news page header (currently a `CategoryChipRow` area) is not required to
  carry the buttons for this minimal scope, but the gate on that page provides sign-in.

## Files likely to change / add

- `package.json` / lockfile — add `@clerk/nextjs`.
- `app/layout.tsx` — wrap `<html>`/children in `<ClerkProvider>`.
- `proxy.ts` (new, project root) — `clerkMiddleware()` + matcher config.
- `app/page.tsx` — add auth controls to header (`SignedIn`/`SignedOut`/`SignInButton`/
  `SignUpButton`/`UserButton`).
- `app/news/[slug]/page.tsx` — `auth()` check; render gate when signed out.
- `components/AuthControls.tsx` (new, optional) — small client component wrapping the header
  auth buttons if the page must stay a server component and modal buttons need client context.
  (Clerk's control components are client components; isolate them to keep the page server-side.)
- `components/AnalysisGate.tsx` (new, optional) — the signed-out gate UI for the news page.
- `.env.example` (new) — document the Clerk vars (publishable + secret) without real values,
  per AGENTS.md §21.

## Implementation requirements

1. Install `@clerk/nextjs` (latest / current SDK).
2. Create `proxy.ts` at project root:
   ```ts
   import { clerkMiddleware } from '@clerk/nextjs/server'
   export default clerkMiddleware()
   export const config = {
     matcher: [
       '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
       '/(api|trpc)(.*)',
       '/__clerk/(.*)',
     ],
   }
   ```
   No named `proxy` export needed since Clerk uses a default export; no edge runtime.
3. Wrap the root layout in `<ClerkProvider>` (imported from `@clerk/nextjs`), keeping the
   existing `<html>`/`<body>` classes and font variables intact.
4. Home header: signed-out → modal Sign in + Sign up buttons; signed-in → `<UserButton>`.
   Style buttons to match existing header controls (accent fill for primary, outline for
   secondary) and keep the layout responsive. Preserve the existing "Design System →" link.
5. News details page: call `auth()` (server) at the top; if there is no `userId`, render the
   `AnalysisGate` (brand-styled, with a modal `<SignInButton>` and a link back home) instead of
   the analysis body. Keep the page a server component; push Clerk client components into small
   `"use client"` components.
6. Keep all Clerk secret usage server-only. Only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` reaches the
   browser (Clerk handles this). Do not log or expose `CLERK_SECRET_KEY`.
7. Add `.env.example` listing `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` (plus
   the already-present Supabase vars) with placeholder values.

## Security requirements (AGENTS.md §21)

- `CLERK_SECRET_KEY` server-only; never imported into client code or logged.
- Only `NEXT_PUBLIC_*` Clerk value reaches the browser.
- No secrets in URLs or query strings.
- Auth check for gated content runs server-side (`auth()` in the server component), not just
  hidden in client UI.

## Acceptance criteria

- App builds and runs with `<ClerkProvider>` and `proxy.ts` in place; no middleware/proxy
  runtime warnings.
- Home page shows Sign in + Sign up (signed out) and `<UserButton>` (signed in); it stays
  publicly viewable.
- Visiting a news details URL while signed out shows the sign-in gate, not the analysis.
- After signing in via the modal, the same news URL shows the full analysis.
- Design-system page stays public.
- No Clerk secret is referenced in any client component.
- `npm run typecheck` and `npm run lint` pass; `npm run build` succeeds (routes/layout/proxy
  changed, so build is run per §22).

## Checks to run (§22)

- `npm run typecheck`
- `npm run lint`
- `npm run build` (layout, a route, and proxy changed)

## Exact manual test steps expected after implementation

1. `npm run dev` and open `http://localhost:3000`.
   - Confirm the header shows **Sign in** and **Sign up** buttons while signed out, and the home
     grid is fully visible.
2. Click a story card to open `/news/<slug>` **while signed out**.
   - Confirm the sign-in gate appears ("Sign in to read the full analysis") and the analysis
     body is not rendered.
3. Click **Sign in** (or the gate's button), complete the modal auth flow with a Clerk test
   user.
   - Confirm the header now shows the `<UserButton>` avatar.
4. Reload / revisit `/news/<slug>` **while signed in**.
   - Confirm the full analysis renders.
5. Open `/design-system` signed out — confirm it still loads (public).
6. Sign out via `<UserButton>` and confirm the news page reverts to the gate.
