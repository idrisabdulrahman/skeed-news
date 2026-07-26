import React from "react";
import Link from "next/link";
import { StoryCard } from "@/components/StoryCard";
import { CategoryChipRow } from "@/components/CategoryChipRow";
import { AuthControls } from "@/components/AuthControls";
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

export default async function HomePage() {
  const articles = await getTopArticles();

  return (
    // Force the brand dark palette on the home page regardless of OS preference.
    <div className="dark flex-1 bg-bg-app text-text-primary flex flex-col font-sans">
      {/* Header */}
      <header className="border-b border-border-strong bg-surface-app">
        <div className="brand-container flex items-center justify-between py-4">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center justify-center w-8 h-8 rounded-brand-sm bg-accent-app text-on-accent">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="w-5 h-5"
              >
                <path
                  fillRule="evenodd"
                  d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z"
                  clipRule="evenodd"
                />
              </svg>
            </div>
            <span className="font-bold text-lg tracking-tight">SKEEM NEWS</span>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/design-system"
              className="hidden sm:inline-flex items-center gap-2 px-4 py-2 border border-accent-app text-accent-app rounded-brand-sm hover:bg-accent-app hover:text-on-accent transition-all duration-200 text-body-small font-medium font-mono"
            >
              Design System →
            </Link>
            <AuthControls />
          </div>
        </div>

        {/* Category chip row */}
        <div className="brand-container border-t border-border-subtle py-3">
          <CategoryChipRow categories={CATEGORIES} />
        </div>
      </header>

      {/* Top News grid */}
      <main className="brand-container flex-1 w-full py-10">
        <h2 className="text-h3 md:text-h2 font-bold tracking-tight mb-8">
          Top News
        </h2>

        {articles.length === 0 ? (
          <div className="rounded-brand-md border border-border-subtle bg-surface-app p-10 text-center">
            <p className="text-body-medium text-text-secondary">
              No analyzed articles yet.
            </p>
            <p className="mt-1 font-mono text-caption text-text-tertiary">
              No analyzed articles yet - check back later.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {articles.map((article) => (
              <StoryCard key={article.id} article={article} />
            ))}
          </div>
        )}
      </main>

      {/* Footer */}
      <Footer />
    </div>
  );
}
