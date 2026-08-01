import React from "react";
import Link from "next/link";

export interface ChipProps {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  href?: string;
  onClick?: () => void;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  icon,
  active = false,
  href,
  onClick,
  className = "",
}) => {
  const classes = `inline-flex items-center gap-2 font-sans text-body-small font-medium cursor-pointer transition-colors duration-200
    ${
      active
        ? "text-accent-app"
        : "text-text-secondary hover:text-accent-app"
    } ${className}`;

  // Category chips render as links; callers without an href keep the button.
  if (href) {
    return (
      <Link href={href} className={classes}>
        {icon && <span className="flex-shrink-0 w-3.5 h-3.5">{icon}</span>}
        <span>{label}</span>
      </Link>
    );
  }

  return (
    <button onClick={onClick} className={classes}>
      {icon && <span className="flex-shrink-0 w-3.5 h-3.5">{icon}</span>}
      <span>{label}</span>
    </button>
  );
};
