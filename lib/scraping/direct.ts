import "server-only";
import { DIRECT_FETCH_TIMEOUT_MS } from "@/lib/pipeline/limits";

// Free direct-fetch scraper provider (SCRAPER_PROVIDER=direct — the default on
// this branch). No proxy, no Oxylabs: a plain server-side fetch with
// browser-ish headers, parsed by the same Cheerio logic as rendered Oxylabs
// HTML. Works for sites that serve static HTML; blocked sites (Cloudflare,
// etc.) throw and the engine isolates the failure per source. Flip
// SCRAPER_PROVIDER=oxylabs if too many sources block.

const BROWSER_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

/**
 * Fetch a URL and return its HTML. Same contract as the Oxylabs provider:
 * throws on transport failure, timeout, non-2xx, or an empty body so callers
 * isolate the error per source. `fetch` follows redirects by default.
 */
export async function fetchHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), DIRECT_FETCH_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(url, {
      headers: BROWSER_HEADERS,
      redirect: "follow",
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(
        `Direct fetch timed out after ${DIRECT_FETCH_TIMEOUT_MS}ms for ${url}`,
      );
    }
    throw new Error(`Direct fetch failed for ${url}: ${String(err)}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    throw new Error(`Direct fetch returned ${res.status} for ${url}`);
  }

  const html = await res.text();
  if (!html || html.length === 0) {
    throw new Error(`Direct fetch returned no HTML for ${url}`);
  }
  return html;
}
