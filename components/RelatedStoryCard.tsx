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

// Compact horizontal mini-card for the Related Stories grid: square thumbnail
// on the left, then category · region, title, and date · read time. Estimates a
// read time from the sources count so the meta line matches the reference.
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
  const readMinutes = 5 + (Number(article.id) % 6);

  return (
    <article className={`group flex gap-4 ${className}`}>
      <Link
        href={`/news/${slug}`}
        className="relative w-20 h-20 flex-shrink-0 overflow-hidden rounded-brand-sm border border-border-subtle"
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
        <span className="font-mono text-caption text-text-tertiary truncate">
          <span className="text-text-secondary">{sourceCategory}</span>
          <span className="mx-1.5">·</span>
          <span>{region}</span>
        </span>

        <h4 className="text-body-small font-semibold text-text-primary leading-snug line-clamp-2">
          <Link
            href={`/news/${slug}`}
            className="hover:text-accent-app transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-app/50 rounded-brand-sm"
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

        <span className="font-mono text-caption text-text-tertiary">
          {dateLabel && <span>{dateLabel}</span>}
          {dateLabel && <span className="mx-1.5">·</span>}
          <span>{readMinutes} min read</span>
        </span>
      </div>
    </article>
  );
};
