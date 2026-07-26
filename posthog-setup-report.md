# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into Skeem News. The integration covers client-side event tracking with `posthog-js` (initialized via `instrumentation-client.ts` for Next.js 15.3+), server-side event tracking with `posthog-node` in API route handlers, user identification via Clerk, a reverse proxy through Next.js rewrites to improve ad-blocker resilience, and error tracking via `capture_exceptions: true`.

| Event name | Description | File |
|---|---|---|
| `article_clicked` | Fired when a user clicks on a news article card on the home page. | `components/StoryCard.tsx` |
| `article_analysis_viewed` | Fired when a signed-in user lands on an article details page and sees the full AI analysis — top of the authenticated content funnel. | `app/news/[slug]/page.tsx` |
| `analysis_gate_sign_in_clicked` | Fired when a signed-out visitor clicks the Sign in button on the article analysis gate. | `components/AnalysisGate.tsx` |
| `analysis_gate_sign_up_clicked` | Fired when a signed-out visitor clicks the Create account button on the article analysis gate. | `components/AnalysisGate.tsx` |
| `newsletter_subscribe_clicked` | Fired when a user clicks the Subscribe button on the newsletter CTA section. | `components/NewsletterCta.tsx` |
| `article_saved` | Fired when a signed-in user clicks the Save button on an article details page. | `components/ArticleActions.tsx` |
| `article_shared` | Fired when a signed-in user clicks the Share button on an article details page. | `components/ArticleActions.tsx` |
| `related_article_clicked` | Fired when a user clicks on a related story card on an article details page. | `components/RelatedStoryCard.tsx` |
| `scrape_pipeline_triggered` | Server-side event fired when the manual scrape pipeline is invoked via POST /api/scrape. | `app/api/scrape/route.ts` |
| `analysis_pipeline_triggered` | Server-side event fired when the AI analysis pipeline is invoked via POST /api/analyze. | `app/api/analyze/route.ts` |

**New files created:**
- `instrumentation-client.ts` — PostHog client-side init (Next.js 15.3+ pattern)
- `lib/posthog-server.ts` — Singleton PostHog Node client for server-side capture
- `components/PostHogUserIdentifier.tsx` — Clerk-based user identification/reset component
- `components/ArticleActions.tsx` — Client wrapper for Save/Share buttons with tracking
- `components/ArticleAnalysisViewTracker.tsx` — Client component that fires `article_analysis_viewed` on mount

**Files modified:**
- `next.config.ts` — Added PostHog reverse proxy rewrites (`/ingest/*`) and `skipTrailingSlashRedirect: true`
- `app/layout.tsx` — Added `<PostHogUserIdentifier />` in the root body
- `components/StoryCard.tsx` — Added `"use client"` + `article_clicked` capture on link click
- `components/RelatedStoryCard.tsx` — Added `"use client"` + `related_article_clicked` capture
- `components/AnalysisGate.tsx` — Added `analysis_gate_sign_in_clicked` / `analysis_gate_sign_up_clicked` captures
- `components/NewsletterCta.tsx` — Added `"use client"` + `newsletter_subscribe_clicked` capture
- `app/news/[slug]/page.tsx` — Replaced inline Save/Share buttons with `<ArticleActions>`, added `<ArticleAnalysisViewTracker>`
- `app/api/scrape/route.ts` — Added `scrape_pipeline_triggered` server-side event with flush
- `app/api/analyze/route.ts` — Added `analysis_pipeline_triggered` server-side event with flush

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

- [Analytics basics (wizard) — Dashboard](https://us.posthog.com/project/373177/dashboard/1905023)
- [Content engagement funnel (wizard)](https://us.posthog.com/project/373177/insights/tKh73i93)
- [Article clicks over time (wizard)](https://us.posthog.com/project/373177/insights/6wrjpK2Y)
- [Auth gate conversions (wizard)](https://us.posthog.com/project/373177/insights/3c8OUtcc)
- [Newsletter subscribe clicks (wizard)](https://us.posthog.com/project/373177/insights/mL2ljEc7)
- [Pipeline operations (wizard)](https://us.posthog.com/project/373177/insights/qsdmdqbD)

## Verify before merging

- [ ] Run a full production build (the wizard only verified the files it touched) and fix any lint or type errors introduced by the generated code.
- [ ] Run the test suite — call sites that were rewritten or instrumented may need updated mocks or fixtures.
- [ ] Add `NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN` and `NEXT_PUBLIC_POSTHOG_HOST` to `.env.example` and any monorepo/bootstrap scripts so collaborators know what to set.
- [ ] Wire source-map upload (`posthog-cli sourcemap` or your bundler's upload step) into CI so production stack traces de-minify.
- [ ] Confirm the returning-visitor path also calls `identify` — `PostHogUserIdentifier` runs `posthog.identify()` whenever `useUser()` resolves a signed-in user, which covers both fresh logins and page refreshes; verify this works in your staging environment.
- [ ] This project uses Supabase, Clerk, and OpenRouter as data sources. Run `npx @posthog/wizard warehouse` to connect them to PostHog's data warehouse for richer analytics.

### Agent skill

We've left an agent skill folder in your project. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
