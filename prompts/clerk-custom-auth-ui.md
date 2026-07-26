# Clerk Custom Auth UI

## Goal
Replace the default Clerk hosted sign-in/sign-up panel with custom-styled pages that match the Skeem News design system — dark background, amber accent, Geist Sans / JetBrains Mono fonts, and the existing border/surface tokens.

## Skills read
- `.agents/skills/clerk/SKILL.md` — routes to `clerk-custom-ui` for custom flows

## Existing code inspected
- `app/layout.tsx` — `ClerkProvider` wraps the app; Geist Sans + JetBrains Mono loaded
- `app/globals.css` — full design token set (dark: bg `#0A0B0A`, surface `#14171A`, accent `#E8B54B`, border-strong `#262C31`, text-primary `#E6E8E6`)
- `app/page.tsx` — `AuthControls` component in header
- `components/AuthControls.tsx` — exists (not yet read; assumed to use `<SignInButton>` / `<UserButton>`)
- `.env.local` — only `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` present; sign-in/sign-up URL vars missing
- No `middleware.ts` exists
- No `app/sign-in` or `app/sign-up` directories exist

## Decisions / assumptions
- Use Clerk's `<SignIn>` and `<SignUp>` components with the `appearance` prop — this is the standard Clerk custom-UI approach and requires no custom hook logic
- Mount them at `app/sign-in/[[...sign-in]]/page.tsx` and `app/sign-up/[[...sign-up]]/page.tsx` (Clerk catch-all route convention)
- Create `middleware.ts` using `clerkMiddleware` to enable Clerk on all routes; keep all routes public for now (no forced auth wall — the app is read-public, auth is opt-in)
- Add the four missing Clerk env vars to `.env.local` and `.env.example`
- Center the auth card on a full-screen dark page matching `bg-bg-app`

## Files likely to change
| File | Action |
|---|---|
| `app/sign-in/[[...sign-in]]/page.tsx` | Create |
| `app/sign-up/[[...sign-up]]/page.tsx` | Create |
| `middleware.ts` | Create |
| `.env.local` | Add 4 Clerk URL vars |
| `.env.example` | Add 4 Clerk URL vars |

## Implementation requirements

### 1. Env vars — add to `.env.local` and `.env.example`
```
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_SIGN_IN_FALLBACK_REDIRECT_URL=/
NEXT_PUBLIC_CLERK_SIGN_UP_FALLBACK_REDIRECT_URL=/
```

### 2. `middleware.ts` (project root)
```ts
import { clerkMiddleware } from '@clerk/nextjs/server'
export default clerkMiddleware()
export const config = {
  matcher: ['/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)', '/(api|trpc)(.*)'],
}
```
All routes remain public — no `createRouteMatcher` protection needed at this stage.

### 3. Sign-in page — `app/sign-in/[[...sign-in]]/page.tsx`
- Full-screen dark page: `min-h-screen bg-bg-app flex items-center justify-center`
- Render `<SignIn />` from `@clerk/nextjs` with `appearance` prop (see below)
- No extra wrapper card — Clerk's card IS the card

### 4. Sign-up page — `app/sign-up/[[...sign-up]]/page.tsx`
- Same layout as sign-in
- Render `<SignUp />` with the same `appearance` prop

### 5. Shared `appearance` object
Extract to `lib/clerk-appearance.ts` (server-safe, no `"use client"` needed — it's a plain object):

```ts
export const clerkAppearance = {
  variables: {
    colorBackground: '#14171A',        // --surface-app dark
    colorInputBackground: '#0A0B0A',   // --bg-app dark
    colorInputText: '#E6E8E6',         // --text-primary dark
    colorText: '#E6E8E6',
    colorTextSecondary: '#A0A6A3',
    colorPrimary: '#E8B54B',           // --accent-app dark
    colorDanger: '#E53935',
    borderRadius: '6px',
    fontFamily: 'var(--font-geist-sans), sans-serif',
    fontFamilyButtons: 'var(--font-jetbrains-mono), monospace',
  },
  elements: {
    card: 'shadow-none border border-[#262C31] bg-[#14171A]',
    headerTitle: 'text-[#E6E8E6] font-bold tracking-tight',
    headerSubtitle: 'text-[#A0A6A3]',
    formButtonPrimary: 'bg-[#E8B54B] text-[#0A0B0A] hover:bg-[#d4a43e] font-mono font-medium',
    formFieldInput: 'bg-[#0A0B0A] border-[#262C31] text-[#E6E8E6] focus:border-[#E8B54B]',
    formFieldLabel: 'text-[#A0A6A3] text-sm',
    footerActionLink: 'text-[#E8B54B] hover:text-[#d4a43e]',
    identityPreviewText: 'text-[#E6E8E6]',
    dividerLine: 'bg-[#262C31]',
    dividerText: 'text-[#6A7270]',
    socialButtonsBlockButton: 'border-[#262C31] text-[#E6E8E6] hover:bg-[#262C31]',
  },
}
```

## Security requirements
- No secrets in browser code — all Clerk server keys stay server-only
- `NEXT_PUBLIC_*` vars only for publishable key and URL config

## Acceptance criteria
- Navigating to `/sign-in` shows a dark-themed Clerk sign-in card (not the hosted popup)
- Navigating to `/sign-up` shows a dark-themed Clerk sign-up card
- Amber accent on primary button, inputs, and links
- Fonts match the rest of the app (Geist Sans body, JetBrains Mono buttons)
- After sign-in, user is redirected to `/`
- `AuthControls` in the header still works (sign-in button opens `/sign-in`, user button shows avatar)
- `npm run typecheck` passes
- `npm run lint` passes

## Checks to run
```
npm run typecheck
npm run lint
```

## Manual test steps
1. `npm run dev`
2. Open `http://localhost:3000` — header shows Sign In button
3. Click Sign In — browser navigates to `http://localhost:3000/sign-in` (not a popup)
4. Verify dark card with amber accent, correct fonts
5. Sign in with a test account — redirected to `/`
6. Click Sign Up link inside the card — navigates to `/sign-up`
7. Verify sign-up card matches the same design
8. Sign out via the user button — returns to signed-out state
