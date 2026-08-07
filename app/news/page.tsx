import React from "react";
import { StoryCard } from "@/components/StoryCard";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { getTopArticles } from "@/lib/supabase/queries/articles";

// Read fresh from Supabase on each request: analyzed articles should appear
// without a rebuild.
export const dynamic = "force-dynamic";

// News index: the product's reading surface. Newest analyzed stories first,
// with a sticky "Latest briefings" rail matching the landing page voice.
export default async function NewsIndexPage() {
  const articles = await getTopArticles();
  const featured = articles[0];
  const rest = articles.slice(1);

  return (
    <div id="theme-root" className="flex-1 bg-bg-app text-text-primary flex flex-col font-sans">
      {/* N6 masthead: same as home, with auth + theme toggle */}
      <Masthead />

      <main className="brand-container flex-1 w-full py-12">
        {articles.length === 0 ? (
          <div className="border border-border-subtle p-12 text-center">
            <p className="text-body-medium text-text-primary">
              No briefings yet.
            </p>
            <p className="mt-1 text-caption text-text-tertiary">
              Check back after the next pipeline run.
            </p>
          </div>
        ) : (
          // Sticky rail heading · featured + card grid
          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] gap-10 lg:gap-16 items-start">
            <div className="lg:sticky lg:top-8">
              <p className="text-caption text-accent-app font-medium uppercase tracking-widest mb-3">
                Latest briefings
              </p>
              <h1 className="text-h3 md:text-h2 font-bold tracking-tight">
                Today&apos;s stories
              </h1>
              <p className="mt-3 text-body-small text-text-tertiary leading-relaxed max-w-[28ch]">
                Newest first, from the live pipeline. Open any story for the
                full analysis.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-12">
              {featured && <StoryCard article={featured} featured />}
              {rest.map((article) => (
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