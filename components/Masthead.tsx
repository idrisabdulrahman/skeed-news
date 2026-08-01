import React from "react";
import Link from "next/link";
import { CategoryChipRow } from "@/components/CategoryChipRow";
import { AuthControls } from "@/components/AuthControls";
import { ThemeToggle } from "@/components/ThemeToggle";
import { getCategories } from "@/lib/supabase/queries/articles";
import { formatTodayLabel } from "@/lib/format";

// Bolt mark used in the masthead (shared with the footer).
const BoltIcon = ({ className = "" }: { className?: string }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path
      fillRule="evenodd"
      d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z"
      clipRule="evenodd"
    />
  </svg>
);

export interface MastheadProps {
  /** Slug of the section currently being viewed; highlighted in the chip row. */
  activeCategorySlug?: string;
  /** Show the auth controls in the right cluster. Details page hides them. */
  showAuth?: boolean;
}

// N6 masthead shared by home, category, news details, and saved pages:
// date · centred wordmark · theme (and auth) · live category chip row.
// The chip row comes from stored article categories, so it only renders once
// the backfill SQL has populated articles.category.
export async function Masthead({
  activeCategorySlug,
  showAuth = true,
}: MastheadProps) {
  const categories = await getCategories();

  return (
    <header>
      <div className="brand-container">
        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-4 py-4">
          <p className="text-caption text-text-tertiary tabular-nums hidden sm:block">
            {formatTodayLabel()}
          </p>

          <Link href="/" className="flex items-center gap-2.5 justify-self-center">
            <span className="flex items-center justify-center w-8 h-8 rounded-brand-sm bg-accent-app text-on-accent">
              <BoltIcon className="w-5 h-5" />
            </span>
            <span className="font-bold text-lg tracking-tight">SKEEM NEWS</span>
          </Link>

          <div className="flex items-center gap-2.5 justify-self-end">
            <ThemeToggle />
            {showAuth && <AuthControls />}
          </div>
        </div>

        {categories.length > 0 && (
          <nav aria-label="Sections" className="border-t border-border-subtle py-3">
            <CategoryChipRow
              categories={categories}
              activeSlug={activeCategorySlug}
            />
          </nav>
        )}
      </div>
      <div className="border-t border-border-strong" />
    </header>
  );
}
