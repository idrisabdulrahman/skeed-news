import React from "react";
import { Chip } from "@/components/Chip";
import { categoryKey } from "@/lib/categories";

export interface CategoryChipRowProps {
  categories: string[];
  activeSlug?: string;
  className?: string;
}

// Centered wrapping row of sentence-case category links (N6 nav voice).
// Chips link to /category/[slug]; the current section is highlighted.
// A static "News" chip (all articles) is always first.
export const CategoryChipRow: React.FC<CategoryChipRowProps> = ({
  categories,
  activeSlug,
  className = "",
}) => {
  const allCategories = ["News", ...categories.filter((c) => c !== "News")];

  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 ${className}`}
    >
      {allCategories.map((category) => {
        const slug = category === "News" ? "news" : categoryKey(category);
        return (
          <div key={category} className="flex-shrink-0">
            <Chip
              label={category}
              href={`/category/${slug}`}
              active={activeSlug === slug}
            />
          </div>
        );
      })}
    </div>
  );
};
