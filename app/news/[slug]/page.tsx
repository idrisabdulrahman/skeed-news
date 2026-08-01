import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { Masthead } from "@/components/Masthead";
import { AnalysisGate } from "@/components/AnalysisGate";
import { BiasMeter } from "@/components/BiasMeter";
import { BiasAnalysisPanel } from "@/components/BiasAnalysisPanel";
import { AiSummaryPanel } from "@/components/AiSummaryPanel";
import { SourceBreakdownPanel } from "@/components/SourceBreakdownPanel";
import { RelatedStoryCard } from "@/components/RelatedStoryCard";
import { NewsletterCta } from "@/components/NewsletterCta";
import { ArticleActions } from "@/components/ArticleActions";
import { ArticleAnalysisViewTracker } from "@/components/ArticleAnalysisViewTracker";
import { getArticleBySlug } from "@/lib/supabase/queries/articles";
import { getSavedArticleIds } from "@/lib/supabase/queries/saved";

// Render on demand: manually inserted articles won't exist at build time, so we
// skip static prerendering and read fresh per request (prompt decision 8).
export const dynamic = "force-dynamic";

type PageParams = { slug: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);
  if (!article) {
    return { title: "Article not found — Skeem News" };
  }
  return {
    title: `${article.title} — Skeem News`,
    description: article.summaryPoints[0],
  };
}

export default async function NewsDetailsPage({
  params,
}: {
  params: Promise<PageParams>;
}) {
  const { slug } = await params;
  const article = await getArticleBySlug(slug);

  if (!article) {
    notFound();
  }

  // Gate the full analysis: signed-out visitors get an in-page sign-in gate instead of
  // the analysis body (AGENTS.md §21 — auth enforced server-side, not just hidden in UI).
  const { userId } = await auth();
  const isSignedIn = Boolean(userId);

  // Bookmark state for the Save button, rendered server-side so the icon never
  // flashes empty before hydration. Only queried when signed in.
  const savedArticleIds = userId ? await getSavedArticleIds(userId) : [];
  const initialSaved = savedArticleIds.includes(article.id);

  const publishedLabel = new Date(article.publishedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    // Theme class is set on <html> by the blocking pre-paint script in
    // layout.tsx (no light-then-dark flash). #theme-root carries layout only.
    <div id="theme-root" className="flex-1 bg-bg-app text-text-primary flex flex-col font-sans">
      {/* N6 masthead — same as home, without auth controls */}
      <Masthead showAuth={false} />

      {/* Article + sidebar (gated) */}
      {!isSignedIn ? (
        <main className="brand-container flex-1 w-full py-12">
          <AnalysisGate title={article.title} />
        </main>
      ) : (
      <main className="brand-container flex-1 w-full py-12">
        <ArticleAnalysisViewTracker
          articleSlug={article.slug}
          articleTitle={article.title}
          biasLabel={article.biasLabel}
          sentimentLabel={article.sentimentLabel}
        />
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8 lg:gap-12">
          {/* Main column — Long Document measure (65ch) */}
          <article className="min-w-0 max-w-[65ch]">
            {/* Back to home */}
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 mb-5 text-body-small text-text-secondary hover:text-accent-app transition-colors duration-200"
            >
              ← Back to home
            </Link>

            {/* Breadcrumb tag line */}
            <p className="text-caption text-text-tertiary mb-3">
              <span className="text-text-secondary">{article.sourceCategory}</span>
              <span className="mx-1.5">·</span>
              <span>{article.region}</span>
            </p>

            {/* Title */}
            <h1 className="text-h3 md:text-h2 font-bold text-text-primary leading-tight tracking-tight mb-4">
              {article.title}
            </h1>

            {/* Byline row */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-5 mb-5 border-b border-border-subtle">
              <div className="flex items-center gap-2 text-caption text-text-tertiary tabular-nums">
                <span>By {article.author}</span>
                <span className="text-border-strong">|</span>
                <span>{publishedLabel}</span>
                <span className="text-border-strong">|</span>
                <span>{article.readTimeMinutes} min read</span>
              </div>

              {/* Article actions: save + share with PostHog tracking */}
              <ArticleActions
                articleId={article.id}
                articleSlug={article.slug}
                articleTitle={article.title}
                isSignedIn={isSignedIn}
                initialSaved={initialSaved}
              />
            </div>

            {/* Hero image — sharp hairline frame */}
            <figure className="mb-6">
              <div className="relative w-full aspect-[16/9] overflow-hidden border border-border-subtle">
                <Image
                  src={article.imageUrl}
                  alt={article.title}
                  fill
                  priority
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 880px"
                />
              </div>
              {article.imageCaption && (
                <figcaption className="mt-2 text-caption text-text-tertiary leading-relaxed">
                  {article.imageCaption}
                </figcaption>
              )}
            </figure>

            {/* Bias Distribution block — quiet hairline panel */}
            <div className="border border-border-subtle p-5 mb-8">
              <h2 className="text-h4 font-semibold text-text-primary mb-3">
                Bias distribution
              </h2>
              <BiasMeter
                left={article.leftPercentage}
                center={article.centerPercentage}
                right={article.rightPercentage}
              />
              <p className="mt-3 text-caption text-text-tertiary tabular-nums">
                {article.sourcesCount} sources
              </p>
            </div>

            {/* Article body */}
            <div className="flex flex-col gap-6">
              {article.body.map((paragraph, i) => (
                <p key={i} className="text-body-medium text-text-primary leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Related Stories — only when the article has an embedding and
                cosine-nearest matches exist (§20). Hidden otherwise. */}
            {article.relatedArticles.length > 0 && (
              <div className="mt-12 pt-8 border-t border-border-subtle">
                <h2 className="text-h4 font-semibold text-text-primary mb-6">
                  Related stories
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                  {article.relatedArticles.map((related) => (
                    <RelatedStoryCard key={related.id} article={related} />
                  ))}
                </div>
              </div>
            )}
          </article>

          {/* Sidebar */}
          <aside className="flex flex-col gap-6">
            <BiasAnalysisPanel
              biasLabel={article.biasLabel}
              leftPercentage={article.leftPercentage}
              centerPercentage={article.centerPercentage}
              rightPercentage={article.rightPercentage}
              sourcesCount={article.sourcesCount}
            />
            <AiSummaryPanel
              points={article.summaryPoints}
              generatedAt={article.summaryGeneratedAt}
              readTimeMinutes={article.readTimeMinutes}
            />
            <SourceBreakdownPanel
              sourcesCount={article.sourcesCount}
              counts={article.sourceCounts}
              topSources={article.topSources}
            />
          </aside>
        </div>

        {/* Newsletter CTA */}
        <div className="mt-12">
          <NewsletterCta />
        </div>
      </main>
      )}

      {/* Footer */}
      {/* <Footer /> */}
    </div>
  );
}
