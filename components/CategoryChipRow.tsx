import React from "react";
import { Chip } from "@/components/Chip";

export interface CategoryChipRowProps {
  categories: string[];
  className?: string;
}

// Horizontally scrollable row of category chips. Presentational for now —
// chips are static until follow/filter behavior exists.
export const CategoryChipRow: React.FC<CategoryChipRowProps> = ({
  categories,
  className = "",
}) => {
  return (
    <div
      className={`flex items-center gap-2 overflow-x-auto pb-1 ${className}`}
    >
      {categories.map((category) => (
        <div key={category} className="flex-shrink-0">
          <Chip label={category} />
        </div>
      ))}
    </div>
  );
};
