import React from "react";

export interface ChipProps {
  label: string;
  icon?: React.ReactNode;
  active?: boolean;
  onClick?: () => void;
  className?: string;
}

export const Chip: React.FC<ChipProps> = ({
  label,
  icon,
  active = false,
  onClick,
  className = "",
}) => {
  return (
    <button
      onClick={onClick}
      className={`inline-flex items-center gap-2 font-sans text-body-small font-medium cursor-pointer transition-colors duration-200
        ${
          active
            ? "text-accent-app"
            : "text-text-secondary hover:text-accent-app"
        } ${className}`}
    >
      {icon && <span className="flex-shrink-0 w-3.5 h-3.5">{icon}</span>}
      <span>{label}</span>
    </button>
  );
};
