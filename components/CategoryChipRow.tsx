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
export const CategoryChipRow: React.FC<CategoryChipRowProps> = ({
  categories,
  activeSlug,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 ${className}`}
    >
      {categories.map((category) => {
        const slug = categoryKey(category);
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
