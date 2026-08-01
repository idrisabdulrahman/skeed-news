// Shared date labels. Server-safe (pure formatting, no client deps).
// Masthead pages used to each compute todayLabel locally — one helper now.

/** Masthead date line (N6 voice): "Saturday, August 1, 2026". */
export function formatTodayLabel(): string {
  return new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}
