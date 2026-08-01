"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";
import type { ArticleCard } from "@/lib/types/article";
import { CompactBiasBar } from "@/components/CompactBiasBar";

export interface StoryCardProps {
  article: ArticleCard;
  /** Hero-diptych variant: wider 16/9 image and larger image sizes hint. */
  featured?: boolean;
  className?: string;
}

// Vertical story card (F6 voice): hairline border on paper — no surface fill,
// no shadow, no rounding. Image on top, then category · region meta (sentence
// case), title, quiet framing bar, and a sources count. Presentational only.
export const StoryCard: React.FC<StoryCardProps> = ({
  article,
  featured = false,
  className = "",
}) => {
  const {
    slug,
    title,
    imageUrl,
    sourceCategory,
    region,
    leftPercentage,
    centerPercentage,
    rightPercentage,
    sourcesCount,
  } = article;

  return (
    <article
      className={`group flex flex-col overflow-hidden border border-border-subtle ${className}`}
    >
      {/* Image */}
      <div className={`relative w-full ${featured ? "aspect-[16/9]" : "aspect-[16/10]"}`}>
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover"
          sizes={
            featured
              ? "(max-width: 1024px) 100vw, 45vw"
              : "(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
          }
        />
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 pt-4 gap-2.5">
        <span className="text-caption text-text-tertiary">
          <span className="text-text-secondary">{sourceCategory}</span>
          <span className="mx-1.5">·</span>
          <span>{region}</span>
        </span>

        <h3 className="text-h3 font-semibold text-text-primary leading-snug line-clamp-3">
          <Link
            href={`/news/${slug}`}
            className="hover:text-accent-app transition-colors duration-200"
            onClick={() =>
              posthog.capture("article_clicked", {
                article_slug: slug,
                article_title: title,
                source_category: sourceCategory,
                region,
              })
            }
          >
            {title}
          </Link>
        </h3>

        {/* Framing indicator pinned toward the bottom */}
        <div className="mt-auto flex flex-col gap-2 pt-2">
          <CompactBiasBar
            left={leftPercentage}
            center={centerPercentage}
            right={rightPercentage}
          />
          <span className="text-caption text-text-tertiary tabular-nums">
            {sourcesCount} sources
          </span>
        </div>
      </div>
    </article>
  );
};
