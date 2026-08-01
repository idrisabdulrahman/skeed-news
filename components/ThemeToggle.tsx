"use client";

import { useSyncExternalStore } from "react";

const STORAGE_KEY = "skeem-theme";
type Theme = "dark" | "light";

// The theme store is the `dark`/`light` class on <html>, set by the blocking
// pre-paint script in layout.tsx (and by the toggle below). Reading it through
// useSyncExternalStore keeps the icon in sync with the real page theme without
// effects or hydration mismatches: during SSR/hydration React uses
// getServerSnapshot ("light", matching the server-rendered markup), then
// re-reads getSnapshot once mounted and re-renders with the actual theme.
// `apply` fires the subscribers so React sees the new snapshot after a toggle.
const subscribers = new Set<() => void>();

function subscribe(callback: () => void): () => void {
  subscribers.add(callback);
  // Cross-tab changes (storage event from another tab) also re-render.
  window.addEventListener("storage", callback);
  return () => {
    subscribers.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

function getSnapshot(): Theme {
  return document.documentElement.classList.contains("dark") ? "dark" : "light";
}

function getServerSnapshot(): Theme {
  return "light";
}

function notify() {
  for (const callback of subscribers) callback();
}

function apply(next: Theme) {
  const root = document.documentElement;
  root.classList.toggle("dark", next === "dark");
  root.classList.toggle("light", next === "light");
  root.style.colorScheme = next;
  notify();
}

export function ThemeToggle() {
  const theme = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  function toggle() {
    const next: Theme = theme === "dark" ? "light" : "dark";
    apply(next);
    localStorage.setItem(STORAGE_KEY, next);
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex items-center justify-center w-10 h-10 border border-border-strong text-text-secondary rounded-brand-sm hover:text-accent-app hover:border-accent-app transition-colors duration-200"
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
