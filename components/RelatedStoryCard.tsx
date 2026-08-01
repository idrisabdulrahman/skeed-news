"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";
import type { ArticleCard } from "@/lib/types/article";

export interface RelatedStoryCardProps {
  article: ArticleCard;
  className?: string;
}

// Tiny deterministic hash for the read-time estimate: maps a slug to a stable
// integer. Display-only, so a simple char-code fold is plenty.
function hashSlug(slug: string): number {
  let h = 0;
  for (let i = 0; i < slug.length; i++) {
    h = (h * 31 + slug.charCodeAt(i)) >>> 0;
  }
  return h;
}

// Compact horizontal mini-card for the Related Stories grid: square thumbnail
// on the left, then category · region, title, and date · read time. Estimates a
// read time from the slug so the meta line matches the reference without ever
// rendering "NaN min read" (a UUID id is not a number).
export const RelatedStoryCard: React.FC<RelatedStoryCardProps> = ({
  article,
  className = "",
}) => {
  const { slug, title, imageUrl, sourceCategory, region, publishedAt } = article;

  const dateLabel = publishedAt
    ? new Date(publishedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;
  // Deterministic read-time estimate (mock) so the meta line stays stable.
  const readMinutes = 5 + (hashSlug(slug) % 6);

  return (
    <article className={`group flex gap-4 ${className}`}>
      <Link
        href={`/news/${slug}`}
        className="relative w-20 h-20 flex-shrink-0 overflow-hidden border border-border-subtle"
      >
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover"
          sizes="80px"
        />
      </Link>

      <div className="flex flex-col gap-1 min-w-0">
        <span className="text-caption text-text-tertiary truncate">
          <span className="text-text-secondary">{sourceCategory}</span>
          <span className="mx-1.5">·</span>
          <span>{region}</span>
        </span>

        <h4 className="text-body-small font-semibold text-text-primary leading-snug line-clamp-2">
          <Link
            href={`/news/${slug}`}
            className="hover:text-accent-app transition-colors duration-200"
            onClick={() =>
              posthog.capture("related_article_clicked", {
                article_slug: slug,
                article_title: title,
                source_category: sourceCategory,
                region,
              })
            }
          >
            {title}
          </Link>
        </h4>

        <span className="text-caption text-text-tertiary tabular-nums">
          {dateLabel && <span>{dateLabel}</span>}
          {dateLabel && <span className="mx-1.5">·</span>}
          <span>{readMinutes} min read</span>
        </span>
      </div>
    </article>
  );
};
