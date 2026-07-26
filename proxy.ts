import { clerkMiddleware } from "@clerk/nextjs/server";

// Next.js 16 renamed `middleware.ts` to `proxy.ts` (nodejs runtime; edge unsupported).
// Clerk's code is identical to the pre-16 middleware. Route protection lives in the page
// (`auth()` in the news details server component), not here — Clerk deprecated
// middleware-level `createRouteMatcher`/`auth.protect` in favour of protecting close to
// the resource.
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
    // Always run for Clerk-specific frontend API routes
    "/__clerk/(.*)",
  ],
};
