import "server-only";
import { fetchHtml } from "@/lib/scraping/direct";
import { scrapeHtml as scrapeHtmlWithOxylabs } from "@/lib/scraping/oxylabs";

// Single scraper entry point (AGENTS.md §9). The HTML source is chosen by env:
//   • unset / "direct"  → free plain-fetch provider (this branch's default —
//     the $0 setup; no Oxylabs involved)
//   • "oxylabs"         → paid Oxylabs Web Scraper API (still in code, opt-in)
// Callers (manual scrape route, scheduler processing) import ONLY this module,
// so the engine stays provider-agnostic.

export type ScraperProvider = "oxylabs" | "direct";

let loggedProvider: ScraperProvider | null = null;

export function getScraperProvider(): ScraperProvider {
  const value = process.env.SCRAPER_PROVIDER;
  return value === "oxylabs" ? "oxylabs" : "direct";
}

/** Fetch a URL's HTML via the active provider. Same contract for both. */
export async function scrapeHtml(url: string): Promise<string> {
  const provider = getScraperProvider();
  if (provider !== loggedProvider) {
    console.log(`[scrape] scraper provider: ${provider}`);
    loggedProvider = provider;
  }
  return provider === "oxylabs" ? scrapeHtmlWithOxylabs(url) : fetchHtml(url);
}
