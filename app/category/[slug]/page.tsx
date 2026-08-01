import React from "react";
import type { Metadata } from "next";
import { StoryCard } from "@/components/StoryCard";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import { getArticlesByCategory } from "@/lib/supabase/queries/articles";
import { slugToLabel } from "@/lib/categories";

// Categories change as the pipeline runs — always read fresh.
export const dynamic = "force-dynamic";

type PageParams = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${slugToLabel(slug)} — Skeem News` };
}

export default async function CategoryPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { slug } = await params;
  const label = slugToLabel(slug);
  const articles = await getArticlesByCategory(slug);

  return (
    // Theme class is set on <html> by the blocking pre-paint script in
    // layout.tsx (no light-then-dark flash). #theme-root carries layout only.
    <div id="theme-root" className="flex-1 bg-bg-app text-text-primary flex flex-col font-sans">
      {/* N6 masthead — same as home, with the current section highlighted */}
      <Masthead activeCategorySlug={slug} />

      <main className="brand-container flex-1 w-full py-12">
        {articles.length === 0 ? (
          <div className="border border-border-subtle p-12 text-center">
            <p className="text-body-medium text-text-primary">
              No analyzed stories in {label} yet.
            </p>
            <p className="mt-1 text-caption text-text-tertiary">
              Check back after the next pipeline run.
            </p>
          </div>
        ) : (
          // Mirrors the homepage story-grid section (same card + spacing).
          <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] gap-10 lg:gap-16 items-start">
            <div className="lg:sticky lg:top-8">
              <h1 className="text-h3 md:text-h2 font-bold tracking-tight">
                {label}
              </h1>
              <p className="mt-3 text-body-small text-text-tertiary leading-relaxed max-w-[32ch]">
                Every story filed under this section, newest first.
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
