import React from "react";
import { Chip } from "@/components/Chip";

export interface CategoryChipRowProps {
  categories: string[];
  className?: string;
}

// Centered wrapping row of sentence-case category links (N6 nav voice).
// Presentational for now — chips are static until follow/filter behavior exists.
export const CategoryChipRow: React.FC<CategoryChipRowProps> = ({
  categories,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 ${className}`}
    >
      {categories.map((category) => (
        <div key={category} className="flex-shrink-0">
          <Chip label={category} />
        </div>
      ))}
    </div>
  );
};
