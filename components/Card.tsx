import React from "react";
import Image from "next/image";

export interface CardProps {
  imageSrc?: string;
  category?: string;
  subcategory?: string;
  title: string;
  description: string;
  breaking?: boolean;
  time?: string;
  readTime?: string;
  isLive?: boolean;
  className?: string;
}

export const Card: React.FC<CardProps> = ({
  imageSrc = "/skyline_markets.jpg",
  category = "Politics",
  subcategory = "United States",
  title,
  description,
  breaking = true,
  time = "2h ago",
  readTime = "5 min read",
  isLive = true,
  className = "",
}) => {
  return (
    <div
      className={`flex flex-col md:flex-row overflow-hidden rounded-brand-md border border-border-subtle bg-surface-app shadow-brand-md hover:shadow-brand-lg transition-all duration-300 ${className}`}
    >
      {/* Image container */}
      <div className="relative w-full md:w-70 h-50 md:h-auto shrink-0">
        <Image
          loading="eager"
          src={imageSrc}
          alt={title}
          fill
          className="object-cover"
          sizes="(max-width: 768px) 100vw, 280px"
        />

        {/* Live Badge */}
        {isLive && (
          <div className="absolute top-3 left-3 flex items-center gap-1.5 px-2.5 py-1 rounded-brand-full bg-[#0A0B0A]/70 backdrop-blur-md border border-border-subtle">
            <span className="w-1.5 h-1.5 rounded-full bg-breaking animate-pulse"></span>
            <span className="font-mono text-caption font-bold text-white tracking-wider">
              LIVE
            </span>
          </div>
        )}
      </div>

      {/* Details Container */}
      <div className="flex flex-col flex-1 p-5 justify-between">
        <div>
          {/* Header row */}
          <div className="flex justify-between items-center mb-2.5">
            <span className="font-mono text-caption text-text-tertiary">
              <span className="text-text-secondary hover:text-accent-app cursor-pointer transition-colors duration-200">
                {category}
              </span>
              <span className="mx-1.5">•</span>
              <span>{subcategory}</span>
            </span>

            {/* Bookmark button */}
            <button className="text-text-tertiary hover:text-text-primary transition-colors duration-200">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4.5 h-4.5"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
                />
              </svg>
            </button>
          </div>

          {/* Title */}
          <h3 className="text-h3 font-semibold text-text-primary leading-tight mb-2 hover:text-accent-app cursor-pointer transition-colors duration-200">
            {title}
          </h3>

          {/* Description */}
          <p className="text-body-small text-text-secondary line-clamp-2 leading-relaxed mb-4">
            {description}
          </p>
        </div>

        {/* Footer row */}
        <div className="flex justify-between items-center pt-3 border-t border-border-subtle">
          <div className="flex items-center gap-3 text-caption font-mono text-text-tertiary">
            {breaking && (
              <span className="inline-flex items-center gap-1 text-breaking font-semibold">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                  className="w-3.5 h-3.5 text-accent-app"
                >
                  <path
                    fillRule="evenodd"
                    d="M14.615 1.595a.75.75 0 01.359.852L12.982 9.75h7.268a.75.75 0 01.548 1.262l-10.5 11.25a.75.75 0 01-1.272-.71l1.992-7.302H3.75a.75.75 0 01-.548-1.262l10.5-11.25a.75.75 0 01.913-.143z"
                    clipRule="evenodd"
                  />
                </svg>
                Breaking
              </span>
            )}
            {time && <span>• {time}</span>}
            {readTime && (
              <span className="inline-flex items-center gap-1">
                • 
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={2}
                  stroke="currentColor"
                  className="w-3.5 h-3.5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
                {readTime}
              </span>
            )}
          </div>

          {/* Bottom Bookmark/Share icon */}
          <button className="text-text-tertiary hover:text-text-primary transition-colors duration-200">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
              className="w-4.5 h-4.5"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M17.593 3.322c1.1.128 1.907 1.077 1.907 2.185V21L12 17.25 4.5 21V5.507c0-1.108.806-2.057 1.907-2.185a48.507 48.507 0 0111.186 0z"
              />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};
