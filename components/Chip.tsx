import React from "react";

export interface ChipProps {
  label: string;
  icon?: React.ReactNode;
  showAdd?: boolean;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  icon,
  showAdd = true,
  active = false,
  onClick,
  className = "",
}) => {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 px-3 py-1.5 border rounded-brand-sm font-sans text-body-small font-medium transition-all duration-200 cursor-pointer
        ${
          active
            ? "bg-accent-app border-accent-app text-on-accent"
            : "bg-surface-app border-border-strong text-text-primary hover:border-text-tertiary"
        } ${className}`}
    >
      {icon && <span className="flex-shrink-0 w-3.5 h-3.5">{icon}</span>}
      <span>{label}</span>
      {showAdd && (
        <span
          className={`flex-shrink-0 text-caption ml-0.5 ${
            active ? "text-on-accent/80" : "text-text-tertiary hover:text-text-primary"
          }`}
        >
          +
        </span>
      )}
    </button>
  );
};
