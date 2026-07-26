import type { BiasLabel } from "@/lib/types/article";

// Shared bias presentation helpers. Colors match the design system:
// left → breaking red, right → info blue, everything else → neutral.
// Kept here (not in a component) so every analysis panel maps labels the same way.

export const BIAS_LEFT = "#E53935";
export const BIAS_RIGHT = "#3B82F6";

/** Tailwind text-color class for a bias label. */
export function biasTextClass(label: BiasLabel): string {
  if (label === "left") return "text-[#E53935]";
  if (label === "right") return "text-[#3B82F6]";
  return "text-text-secondary";
}

/** Capitalized display label, e.g. "left" → "Left". */
export function biasDisplayLabel(label: BiasLabel): string {
  return label.charAt(0).toUpperCase() + label.slice(1);
}
