"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "skeem-theme";
type Theme = "dark" | "light";

// Toggles the `dark`/`light` class on #theme-root (the details page root) and
// persists the choice. Default is dark, matching SSR — returning users who chose
// light see a one-frame flash on load, acceptable without adding next-themes.
export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>(() => {
    if (typeof window === "undefined") return "dark";
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored === "light" ? "light" : "dark";
  });

  useEffect(() => {
    apply(theme);
  }, [theme]);

  function apply(next: Theme) {
    const root = document.getElementById("theme-root");
    if (!root) return;
    root.classList.toggle("dark", next === "dark");
    root.classList.toggle("light", next === "light");
  }

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    apply(next);
    setTheme(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex items-center justify-center w-9 h-9 border border-border-strong text-text-secondary rounded-brand-sm hover:text-accent-app hover:border-accent-app transition-all duration-200"
    >
      {isDark ? (
        // Sun
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
      ) : (
        // Moon
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  );
}
