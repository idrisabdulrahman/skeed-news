import React from "react";

export interface SidebarCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

// Info circle used as the affordance in each sidebar card header (reference).
const InfoIcon = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    fill="none"
    viewBox="0 0 24 24"
    strokeWidth={2}
    stroke="currentColor"
    className="w-4 h-4"
    aria-hidden="true"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z"
    />
  </svg>
);

// Shared shell for the three analysis sidebar cards (Bias Analysis, AI Summary,
// Source Breakdown): surface background, subtle border, brand shadow, and a
// header row with an H3 title and an info icon.
export const SidebarCard: React.FC<SidebarCardProps> = ({
  title,
  children,
  className = "",
}) => {
  return (
    <section
      className={`rounded-brand-md border border-border-subtle bg-surface-app shadow-brand-md p-6 ${className}`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-h3 font-semibold text-text-primary">{title}</h3>
        <span className="text-text-tertiary">
          <InfoIcon />
        </span>
      </div>
      {children}
    </section>
  );
};
