import React from "react";
import Image from "next/image";
import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { auth } from "@clerk/nextjs/server";
import { CategoryChipRow } from "@/components/CategoryChipRow";
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

// Render on demand: manually inserted articles won't exist at build time, so we
// skip static prerendering and read fresh per request (prompt decision 8).
export const dynamic = "force-dynamic";

// Category chip row mirrors the home page. Static for now.
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

// Bolt mark shared with the home page header/footer.
const BoltIcon = ({ className = "" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path
      fillRule="evenodd"
      d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z"
      clipRule="evenodd"
    />
  </svg>
);

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

  const publishedLabel = new Date(article.publishedAt).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });

  return (
    // Force the brand dark palette, consistent with the home page.
    <div className="dark flex-1 bg-bg-app text-text-primary flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-border-strong bg-surface-app">
        <div className="brand-container flex items-center justify-between py-4">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-brand-sm bg-accent-app text-on-accent">
              <BoltIcon className="w-5 h-5" />
            </div>
            <span className="font-bold text-lg tracking-tight">SKEEM NEWS</span>
          </Link>

          <Link
            href="/design-system"
            className="inline-flex items-center gap-2 px-4 py-2 border border-accent-app text-accent-app rounded-brand-sm hover:bg-accent-app hover:text-on-accent transition-all duration-200 text-body-small font-medium font-mono"
          >
            Design System →
          </Link>
        </div>

        <div className="brand-container border-t border-border-subtle py-3">
          <CategoryChipRow categories={CATEGORIES} />
        </div>
      </header>

      {/* Article + sidebar (gated) */}
      {!isSignedIn ? (
        <main className="brand-container flex-1 w-full py-10">
          <AnalysisGate title={article.title} />
        </main>
      ) : (
      <main className="brand-container flex-1 w-full py-10">
        <ArticleAnalysisViewTracker
          articleSlug={article.slug}
          articleTitle={article.title}
          biasLabel={article.biasLabel}
          sentimentLabel={article.sentimentLabel}
        />
        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_360px] gap-8">
          {/* Main column */}
          <article className="min-w-0">
            {/* Breadcrumb tag line */}
            <p className="font-mono text-caption text-text-tertiary mb-3">
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
              <div className="flex items-center gap-2 font-mono text-caption text-text-tertiary">
                <span>By {article.author}</span>
                <span className="text-border-strong">|</span>
                <span>{publishedLabel}</span>
                <span className="text-border-strong">|</span>
                <span>{article.readTimeMinutes} min read</span>
              </div>

              {/* Article actions: save + share with PostHog tracking */}
              <ArticleActions articleSlug={article.slug} articleTitle={article.title} />
            </div>

            {/* Hero image */}
            <figure className="mb-6">
              <div className="relative w-full aspect-[16/9] overflow-hidden rounded-brand-md border border-border-subtle">
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

            {/* Bias Distribution block */}
            <div className="rounded-brand-md border border-border-subtle bg-surface-app p-5 mb-8">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-h4 font-semibold text-text-primary">Bias Distribution</h2>
              </div>
              <BiasMeter
                left={article.leftPercentage}
                center={article.centerPercentage}
                right={article.rightPercentage}
              />
              <p className="mt-3 font-mono text-caption text-text-tertiary">
                {article.sourcesCount} sources
              </p>
            </div>

            {/* Article body */}
            <div className="flex flex-col gap-6">
              {article.body.map((paragraph, i) => (
                <p key={i} className="text-body-medium text-text-secondary leading-relaxed">
                  {paragraph}
                </p>
              ))}
            </div>

            {/* Related Stories — only when the article has an embedding and
                cosine-nearest matches exist (§20). Hidden otherwise. */}
            {article.relatedArticles.length > 0 && (
              <div className="mt-12 pt-8 border-t border-border-subtle">
                <h2 className="text-h3 font-semibold text-text-primary mb-6">Related Stories</h2>
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
