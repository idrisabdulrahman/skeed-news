import React from "react";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "text";
  isOutline?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = "primary",
  isOutline = false,
  className = "",
  children,
  disabled,
  ...props
}) => {
  // Base classes for consistent sizing, border-radius, font-family, transitions, and layout
  const baseClass = "inline-flex items-center justify-center font-sans font-medium text-body-small rounded-brand-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-accent-app/50 disabled:opacity-50 disabled:pointer-events-none px-6 py-2.5 h-[42px]";

  let variantClass = "";

  if (variant === "primary") {
    if (isOutline) {
      variantClass = "border border-accent-app text-accent-app bg-transparent hover:bg-accent-app hover:text-on-accent";
    } else {
      variantClass = "bg-accent-app text-on-accent border border-transparent hover:bg-transparent hover:border-accent-app hover:text-accent-app";
    }
  } else if (variant === "secondary") {
    if (isOutline) {
      variantClass = "border border-border-strong text-text-primary bg-transparent hover:bg-surface-app";
    } else {
      variantClass = "bg-surface-app text-text-primary border border-transparent hover:bg-transparent hover:border-border-strong";
    }
  } else if (variant === "text") {
    if (isOutline) {
      variantClass = "border border-border-strong text-accent-app bg-transparent hover:bg-surface-app";
    } else {
      variantClass = "text-accent-app bg-transparent hover:bg-surface-app border border-transparent";
    }
  }

  return (
    <button
      className={`${baseClass} ${variantClass} ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
};
