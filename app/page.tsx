import React from "react";
import { StoryCard } from "@/components/StoryCard";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { getTopArticles } from "@/lib/supabase/queries/articles";

// Read fresh from Supabase on each request — manually inserted articles should
// appear without a rebuild (prompt decision 8).
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const articles = await getTopArticles();
  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    // Theme class is set on <html> by the blocking pre-paint script in
    // layout.tsx (no light-then-dark flash). #theme-root carries layout only.
    <div id="theme-root" className="flex-1 bg-bg-app text-text-primary flex flex-col font-sans">
      {/* N6 masthead: date · centred wordmark · auth + theme toggle · live chips */}
      <Masthead />

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
