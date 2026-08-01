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
  // Editorial button: rectangular, 44px target, ink primary / hairline secondary.
  // Only colors transition (no transition-all); focus ring appears instantly via
  // the global :focus-visible rule. Press feedback is an instant 1px sink.
  const baseClass = "inline-flex items-center justify-center gap-2 font-sans font-medium text-body-small rounded-brand-sm focus:outline-none disabled:opacity-50 disabled:pointer-events-none px-5 h-11 select-none transition-colors duration-200 active:translate-y-px";

  let variantClass = "";

  if (variant === "primary") {
    if (isOutline) {
      variantClass = "border border-text-primary text-text-primary bg-transparent hover:border-accent-app hover:text-accent-app";
    } else {
      variantClass = "bg-text-primary text-bg-app border border-transparent hover:bg-accent-app hover:text-on-accent";
    }
  } else if (variant === "secondary") {
    if (isOutline) {
      variantClass = "border border-border-strong text-text-primary bg-transparent hover:border-text-tertiary hover:text-accent-app";
    } else {
      variantClass = "bg-surface-app text-text-primary border border-transparent hover:bg-bg-app hover:border-border-strong";
    }
  } else if (variant === "text") {
    if (isOutline) {
      variantClass = "border border-border-strong text-accent-app bg-transparent hover:border-accent-app";
    } else {
      variantClass = "text-accent-app bg-transparent hover:underline border border-transparent";
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
