"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import posthog from "posthog-js";
import type { ArticleCard } from "@/lib/types/article";
import { CompactBiasBar } from "@/components/CompactBiasBar";

export interface StoryCardProps {
  article: ArticleCard;
  className?: string;
}

// Vertical Top News card: image on top, then category · region meta, title,
// compact framing bar, and a sources count. Presentational only.
export const StoryCard: React.FC<StoryCardProps> = ({ article, className = "" }) => {
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
      className={`group flex flex-col overflow-hidden rounded-brand-md border border-border-subtle bg-surface-app shadow-brand-md hover:shadow-brand-lg transition-all duration-300 ${className}`}
    >
      {/* Image */}
      <div className="relative w-full aspect-[16/10]">
        <Image
          src={imageUrl}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 33vw"
        />
        {/* Info affordance, matching the reference's top-right icon */}
        <span className="absolute top-3 right-3 flex items-center justify-center w-7 h-7 rounded-brand-full bg-[#0A0B0A]/70 backdrop-blur-md border border-border-subtle text-white">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-4 h-4"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
            />
          </svg>
        </span>
      </div>

      {/* Body */}
      <div className="flex flex-col flex-1 p-5 gap-3">
        <span className="font-mono text-caption text-text-tertiary">
          <span className="text-text-secondary">{sourceCategory}</span>
          <span className="mx-1.5">·</span>
          <span>{region}</span>
        </span>

        <h3 className="text-h3 font-semibold text-text-primary leading-snug line-clamp-3">
          <Link
            href={`/news/${slug}`}
            className="hover:text-accent-app transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-accent-app/50 rounded-brand-sm"
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

        {/* Framing bar pinned toward the bottom */}
        <div className="mt-auto flex flex-col gap-2 pt-1">
          <CompactBiasBar
            left={leftPercentage}
            center={centerPercentage}
            right={rightPercentage}
          />
          <span className="font-mono text-caption text-text-tertiary">
            {sourcesCount} sources
          </span>
        </div>
      </div>
    </article>
  );
};
