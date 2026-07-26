import "server-only";
import { OXYLABS_TIMEOUT_MS } from "@/lib/pipeline/limits";

// Oxylabs Web Scraper API client (AGENTS.md §9). Realtime `universal` source
// with `render:"html"` for JS-heavy news pages. Basic auth from server-only
// env — never imported by client code.

const REALTIME_ENDPOINT = "https://realtime.oxylabs.io/v1/queries";

function authHeader(): string {
  const username = process.env.OXY_WSA_USERNAME;
  const password = process.env.OXY_WSA_PASSWORD;
  if (!username || !password) {
    throw new Error(
      "Missing OXY_WSA_USERNAME or OXY_WSA_PASSWORD for Oxylabs Web Scraper API.",
    );
  }
  return "Basic " + Buffer.from(`${username}:${password}`).toString("base64");
}

interface OxylabsResult {
  content?: unknown;
  status_code?: number;
}
interface OxylabsResponse {
  results?: OxylabsResult[];
}

/**
 * Scrape a URL and return its rendered HTML. Throws on transport failure, auth
 * failure, or an unexpected/empty payload so callers can isolate the error per
 * source (§decision 9). The returned HTML is `results[0].content`.
 */
export async function scrapeHtml(url: string): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OXYLABS_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch(REALTIME_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader(),
      },
      body: JSON.stringify({
        source: "universal",
        url,
        render: "html",
      }),
      signal: controller.signal,
    });
  } catch (err) {
    if (err instanceof Error && err.name === "AbortError") {
      throw new Error(`Oxylabs request timed out after ${OXYLABS_TIMEOUT_MS}ms for ${url}`);
    }
    throw new Error(`Oxylabs request failed for ${url}: ${String(err)}`);
  } finally {
    clearTimeout(timeout);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `Oxylabs returned ${res.status} for ${url}${body ? `: ${body.slice(0, 300)}` : ""}`,
    );
  }

  const data = (await res.json()) as OxylabsResponse;
  const content = data.results?.[0]?.content;
  if (typeof content !== "string" || content.length === 0) {
    throw new Error(`Oxylabs returned no HTML content for ${url}`);
  }
  return content;
}
