import React from "react";
import Link from "next/link";
import { StoryCard } from "@/components/StoryCard";
import { CategoryChipRow } from "@/components/CategoryChipRow";
import { AuthControls } from "@/components/AuthControls";
import { ThemeToggle } from "@/components/ThemeToggle";
import { Footer } from "@/components/Footer";
import { getTopArticles } from "@/lib/supabase/queries/articles";

// Read fresh from Supabase on each request — manually inserted articles should
// appear without a rebuild (prompt decision 8).
export const dynamic = "force-dynamic";

// Categories mirror the reference home page chip row. Static for now.
const CATEGORIES = [
  "World Cup",
  "IPL",
  "Social Media",
  "Business & Markets",
  "Health & Medicine",
  "Soccer",
  "Artificial Intelligence",
  "Arsenal FC",
  "Extreme Weather",
];

// Bolt mark used in the masthead.
const BoltIcon = ({ className = "" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path
      fillRule="evenodd"
      d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z"
      clipRule="evenodd"
    />
  </svg>
);

export default async function HomePage() {
  const articles = await getTopArticles();
  const featured = articles[0];
  const rest = articles.slice(1);

  // Masthead date line (N6): sentence case, tabular, hidden on small screens.
  const todayLabel = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    // Theme class is set on <html> by the blocking pre-paint script in
    // layout.tsx (no light-then-dark flash). #theme-root carries layout only.
    <div id="theme-root" className="flex-1 bg-bg-app text-text-primary flex flex-col font-sans">
      {/* N6 masthead: date · centred wordmark · auth + theme toggle */}
      <header>
        <div className="brand-container">
          <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-4">
            <p className="text-caption text-text-tertiary tabular-nums hidden sm:block">
              {todayLabel}
            </p>

            <Link href="/" className="flex items-center gap-2.5 justify-self-center">
              <span className="flex items-center justify-center w-8 h-8 rounded-brand-sm bg-accent-app text-on-accent">
                <BoltIcon className="w-5 h-5" />
              </span>
              <span className="font-bold text-lg tracking-tight">SKEEM NEWS</span>
            </Link>

            <div className="flex items-center gap-2.5 justify-self-end">
              <ThemeToggle />
              <AuthControls />
            </div>
          </div>

          {/* Sentence-case section row */}
          <nav aria-label="Sections" className="border-t border-border-subtle py-3">
            <CategoryChipRow categories={CATEGORIES} />
          </nav>
        </div>
        {/* Double rule */}
        <div className="border-t border-border-strong" />
      </header>

      <main className="brand-container flex-1 w-full py-12">
        {articles.length === 0 ? (
          <div className="border border-border-subtle p-12 text-center">
            <p className="text-body-medium text-text-primary">
              No analyzed articles yet.
            </p>
            <p className="mt-1 text-caption text-text-tertiary">
              Check back after the next pipeline run.
            </p>
          </div>
        ) : (
          <>
            {/* Split hero: left copy · right featured card (H2 diptych) */}
            <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] gap-10 lg:gap-16 items-start pb-12 mb-12 border-b border-border-subtle">
              <div className="lg:pt-3">
                <h1 className="text-display font-bold tracking-tight">
                  Top news, analyzed.
                </h1>
                <p className="mt-5 text-body-large text-text-secondary leading-relaxed max-w-[60ch]">
                  Every story is scraped from its source, read by the AI, and
                  shown with its sentiment and framing — so you can see the
                  news from every side.
                </p>
                <p className="mt-6 text-caption text-text-tertiary">
                  Updated hourly · analysis by AI
                </p>
              </div>

              <div className="min-w-0">
                {featured && <StoryCard article={featured} featured />}
              </div>
            </section>

            {/* Split section: left rail heading · right card grid */}
            {rest.length > 0 && (
              <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] gap-10 lg:gap-16 items-start">
                <div className="lg:sticky lg:top-8">
                  <h2 className="text-h3 md:text-h2 font-bold tracking-tight">
                    Latest stories
                  </h2>
                  <p className="mt-3 text-body-small text-text-tertiary leading-relaxed max-w-[32ch]">
                    Every story from our sources, newest first.
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-12">
                  {rest.map((article) => (
                    <StoryCard key={article.id} article={article} />
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Ft4 colophon */}
      <Footer />
    </div>
  );
}
