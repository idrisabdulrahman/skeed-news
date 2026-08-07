import React from "react";
import Link from "next/link";
import { SignInButton, SignUpButton } from "@clerk/nextjs";
import { auth } from "@clerk/nextjs/server";
import { StoryCard } from "@/components/StoryCard";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { getSavedArticles } from "@/lib/supabase/queries/saved";

// Bookmarks are per-user and change at any time - always read fresh.
export const dynamic = "force-dynamic";

export default async function SavedPage() {
  const { userId } = await auth();
  const isSignedIn = Boolean(userId);
  const articles = userId ? await getSavedArticles(userId) : [];

  return (
    // Theme class is set on <html> by the blocking pre-paint script in
    // layout.tsx (no light-then-dark flash). #theme-root carries layout only.
    <div id="theme-root" className="flex-1 bg-bg-app text-text-primary flex flex-col font-sans">
      {/* Masthead matches home: date · centred wordmark · auth + theme toggle */}
      <Masthead />

      <main className="brand-container flex-1 w-full py-12">
        {!isSignedIn ? (
          // Signed-out state - AnalysisGate-style modal auth prompt (no new route).
          <div className="flex flex-col items-center justify-center text-center max-w-lg mx-auto py-16">
            <div className="flex items-center justify-center w-12 h-12 rounded-brand-md bg-surface-app border border-border-subtle text-accent-app mb-5">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.8}
                stroke="currentColor"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                />
              </svg>
            </div>

            <h1 className="text-h4 md:text-h3 font-semibold text-text-primary leading-tight tracking-tight mb-2">
              Sign in to view your saved articles
            </h1>
            <p className="text-body-medium text-text-secondary leading-relaxed mb-6">
              Bookmarked stories sync across devices with your account.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-3">
              <SignInButton mode="modal">
                <button className="inline-flex items-center justify-center gap-2 h-11 px-5 bg-text-primary text-bg-app rounded-brand-sm hover:bg-accent-app hover:text-on-accent transition-colors duration-200 text-body-small font-medium">
                  Sign in
                </button>
              </SignInButton>
              <SignUpButton mode="modal">
                <button className="inline-flex items-center justify-center gap-2 h-11 px-5 border border-border-strong text-text-primary rounded-brand-sm hover:border-accent-app hover:text-accent-app transition-colors duration-200 text-body-small font-medium">
                  Create account
                </button>
              </SignUpButton>
            </div>

            <Link
              href="/"
              className="mt-6 text-caption text-text-tertiary hover:text-accent-app transition-colors duration-200"
            >
              ← Back to Top News
            </Link>
          </div>
        ) : articles.length === 0 ? (
          // Signed in with no bookmarks yet.
          <div className="border border-border-subtle p-12 text-center">
            <p className="text-body-medium text-text-primary">
              No saved articles yet.
            </p>
            <p className="mt-1 text-caption text-text-tertiary">
              Tap the Save button on any article to bookmark it here.
            </p>
          </div>
        ) : (
          // Mirrors the home page's story-grid section (same card component).
          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] gap-10 lg:gap-16 items-start">
            <div className="lg:sticky lg:top-8">
              <p className="text-caption text-accent-app font-medium uppercase tracking-widest mb-3">
                Your reading list
              </p>
              <h1 className="text-h3 md:text-h2 font-bold tracking-tight">
                Saved articles
              </h1>
              <p className="mt-3 text-body-small text-text-tertiary leading-relaxed max-w-[32ch]">
                Your bookmarked stories, newest saves first.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-12">
              {articles.map((article) => (
                <StoryCard key={article.id} article={article} />
              ))}
            </div>
          </section>
        )}
      </main>

      {/* Ft4 colophon */}
      <Footer />
    </div>
  );
}
