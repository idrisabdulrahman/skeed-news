import "server-only";

// Centralized pipeline limits and thresholds (AGENTS.md §5/§21 — no magic
// numbers scattered through the engine). Tune scraping behaviour here.

/** Default number of valid articles to insert per source when unspecified (§8/§16). */
export const DEFAULT_PER_SOURCE = 3;

/**
 * Maximum candidate URLs passed to a single Supabase `.in()` filter during the
 * URL existence check. Never exceed this — larger `.in()` lists break PostgREST
 * and violate §9's chunking rule.
 */
export const URL_IN_CHUNK = 15;

/**
 * A homepage yields far more candidate links than we need. Cap how many
 * article-detail pages we scrape per source so one run stays bounded (and keeps
 * Oxylabs usage low); we stop early once `perSource` valid articles are inserted.
 */
export const MAX_DETAIL_SCRAPES_PER_SOURCE = 8;

/** Body accepted if it has at least this many meaningful paragraphs (§13). */
export const MIN_BODY_PARAGRAPHS = 3;

/** …or at least this many cleaned characters with a valid title/image/date/url (§13). */
export const MIN_BODY_CHARS = 900;

/** A paragraph shorter than this is treated as noise, not article body (§13). */
export const MIN_PARAGRAPH_CHARS = 40;

/** Oxylabs realtime request timeout (ms). Rendered pages are slow (§decision 1). */
export const OXYLABS_TIMEOUT_MS = 180_000;

/**
 * Direct-fetch provider timeout (ms) (SCRAPER_PROVIDER=direct). No proxy
 * involved — a live page either arrives in seconds or is blocked, so 30s is
 * generous; blocked sites throw and the engine isolates them per source.
 */
export const DIRECT_FETCH_TIMEOUT_MS = 30_000;

// ─── Oxylabs Scheduler (§18) ─────────────────────────────────────────────────

/**
 * Push-Pull / Scheduler base host (§18). Distinct from the Realtime host in
 * lib/scraping/oxylabs.ts — schedules, runs, and stored job results all live on
 * the data.oxylabs.io Push-Pull host.
 */
export const OXYLABS_DATA_BASE = "https://data.oxylabs.io/v1";

/**
 * Cron for each Oxylabs schedule (§18): scrape source homepages at the top of
 * every hour. Vercel Cron then fires at :15 (vercel.json) to give Oxylabs ~15
 * minutes to finish before we process the results (§decision 1).
 */
export const SCHEDULER_CRON = "0 * * * *";

/**
 * Far-future `end_time` for created schedules so they run indefinitely until we
 * deactivate them (§18 orphan handling). Oxylabs requires an end time.
 */
export const SCHEDULE_END_TIME = "2035-12-31 23:59:59";

// ─── AI analysis (§19/§20) ───────────────────────────────────────────────────

/**
 * Articles analyzed per batch (§19). Batching only bounds work per DB round-trip
 * / avoids timeouts — the pipeline still continues until no pending articles
 * remain. Overridable via ANALYSIS_BATCH_SIZE; falls back to 5.
 */
export const ANALYSIS_BATCH_SIZE: number = (() => {
  const raw = Number(process.env.ANALYSIS_BATCH_SIZE);
  return Number.isFinite(raw) && raw > 0 ? Math.floor(raw) : 5;
})();

/**
 * Primary analysis model via Google AI Studio (§19). Free tier ~1000+ RPD.
 * gemini-2.5-flash is deprecated for new API users; gemini-2.0-flash is the
 * stable equivalent. When Google daily quota is exhausted, the pipeline
 * falls back to GROQ_MODEL.
 */
export const GOOGLE_MODEL = "gemini-2.0-flash";

/**
 * Fallback analysis model via Groq (§19). Free tier 14,400 RPD, 30 RPM.
 * Llama 3.3 70B via OpenAI-compatible endpoint. Used when Google quota
 * is exhausted for the day.
 */
export const GROQ_MODEL = "llama-3.3-70b-versatile";

/** Embedding model via Google AI (§20). Returns 1536-dim vectors natively. */
export const EMBEDDING_MODEL = "gemini-embedding-001";

/**
 * Cap on analysis output tokens. 1024 accommodates the full structured analysis
 * (summary, framing notes, loaded terms, disclaimer) without truncation on
 * longer articles. Groq and Google free tiers have no affordability constraint
 * on this value; the cap prevents runaway output.
 */
export const MAX_ANALYSIS_OUTPUT_TOKENS = 1_024;

/** Embedding size — must match the `vector(1536)` column on article_analyses (§20). */
export const EMBEDDING_DIMENSIONS = 1536;

/**
 * Max characters of article text sent to the model. Keeps requests bounded and
 * well under the model's context window; analysis quality does not need the
 * entire body for long articles.
 */
export const MAX_ANALYSIS_INPUT_CHARS = 12_000;
