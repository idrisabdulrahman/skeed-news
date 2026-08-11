import React from "react";
import type { Metadata } from "next";
import Link from "next/link";
import { auth } from "@clerk/nextjs/server";
import { StoryCard } from "@/components/StoryCard";
import { Masthead } from "@/components/Masthead";
import { Footer } from "@/components/Footer";
import {
  getArticlesByCategory,
  getAllArticles,
} from "@/lib/supabase/queries/articles";
import { labelFromSlug } from "@/lib/categories";

const PER_PAGE = 15;

// Categories change as the pipeline runs - always read fresh.
export const dynamic = "force-dynamic";

type PageParams = { slug: string };
type SearchParams = { page?: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<PageParams>;
}): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${labelFromSlug(slug)} - Skeem News` };
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: Promise<PageParams>;
  searchParams: Promise<SearchParams>;
}) {
  const { slug } = await params;
  const { page } = await searchParams;
  const currentPage = Math.max(1, parseInt(page ?? "1", 10));
  const isAllNews = slug === "news";

  const [result, { userId }] = await Promise.all([
    isAllNews
      ? getAllArticles(currentPage, PER_PAGE)
      : getArticlesByCategory(slug, currentPage, PER_PAGE),
    auth(),
  ]);
  const { articles, total } = result;
  const totalPages = Math.ceil(total / PER_PAGE);
  const isSignedIn = Boolean(userId);

  const label = labelFromSlug(slug);

  return (
    <div id="theme-root" className="flex-1 bg-bg-app text-text-primary flex flex-col font-sans">
      <Masthead activeCategorySlug={slug} />

      <main className="brand-container flex-1 w-full py-12">
        {articles.length === 0 ? (
          <div className="border border-border-subtle p-12 text-center">
            <p className="text-body-medium text-text-primary">
              {isAllNews
                ? "No analyzed stories yet."
                : `No analyzed stories in ${label} yet.`}
            </p>
            <p className="mt-1 text-caption text-text-tertiary">
              Check back after the next pipeline run.
            </p>
          </div>
        ) : (
          <>
            <section className="grid grid-cols-1 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)] gap-10 lg:gap-16 items-start">
              <div className="lg:sticky lg:top-8">
                <p className="text-caption text-accent-app font-medium uppercase tracking-widest mb-3">
                  {isAllNews ? "All stories" : "Section"}
                </p>
                <h1 className="text-h3 md:text-h2 font-bold tracking-tight">
                  {label}
                </h1>
                <p className="mt-3 text-body-small text-text-tertiary leading-relaxed max-w-[32ch]">
                  {isAllNews
                    ? "Every analyzed story, newest first."
                    : "Every story filed under this section, newest first."}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-12">
                {articles.map((article) => (
                  <StoryCard key={article.id} article={article} />
                ))}
              </div>
            </section>

            {totalPages > 1 && (
              <nav className="mt-10 flex items-center justify-center gap-2" aria-label="Pagination">
                {currentPage > 1 && (
                  <Link
                    href={`/category/${slug}?page=${currentPage - 1}`}
                    className="h-10 px-4 border border-border-strong text-text-primary text-body-small font-medium rounded-brand-sm transition-colors duration-200 hover:border-text-tertiary hover:text-accent-app active:translate-y-px"
                  >
                    Previous
                  </Link>
                )}
                <span className="h-10 px-4 text-body-small text-text-tertiary">
                  Page {currentPage} of {totalPages}
                </span>
                {currentPage < totalPages && (
                  <Link
                    href={`/category/${slug}?page=${currentPage + 1}`}
                    className="h-10 px-4 border border-border-strong text-text-primary text-body-small font-medium rounded-brand-sm transition-colors duration-200 hover:border-text-tertiary hover:text-accent-app active:translate-y-px"
                  >
                    Next
                  </Link>
                )}
              </nav>
            )}
          </>
        )}
      </main>

      <Footer isSignedIn={isSignedIn} />
    </div>
  );
}
