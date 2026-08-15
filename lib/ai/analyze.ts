import "server-only";
import { generateText } from "ai";
import type { LanguageModel } from "ai";
import { google, groq } from "@/lib/ai/provider";
import {
  analysisSchema,
  type AnalysisResult,
  type ArticleCategory,
} from "@/lib/ai/schema";
import { canonicalCategory } from "@/lib/categories";
import type { ArticleAnalysisInsert } from "@/lib/supabase/types";
import type { SentimentLabel, BiasLabel } from "@/lib/types/article";
import {
  GOOGLE_MODEL,
  GROQ_MODEL,
  OPENROUTER_MODEL,
  MAX_ANALYSIS_INPUT_CHARS,
  MAX_ANALYSIS_OUTPUT_TOKENS,
} from "@/lib/pipeline/limits";

// Structured analysis for one article (AGENTS.md §19). Server-only  -  the
// API key never reaches the browser (§21). Uses generateText + manual JSON
// extraction + Zod validation because provider models may produce markdown-
// wrapped JSON that fails json_schema enforcement.
//
// Two-provider fallback: Groq Llama (preferred, 14,400 RPD free) → Google
// Gemini (fallback, ~1000+ RPD free). Once a provider's daily quota is exhausted
// for a run, all subsequent articles go to the next tier.
//
// Failures are classified so the caller can bucket them correctly (§19):
//   • AiQuotaError    -  provider daily cap; NOT retried (pointless within a run).
//   • AiTransientError  -  connection/per-minute/other API error (retried once).
//   • SyntaxError/ZodError  -  invalid/unparseable output (retried once).

/** Provider daily quota exhausted  -  not recoverable within a run (§19). */
export class AiQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiQuotaError";
  }
}

/** Transient failure (connection, per-minute limit, generic API error) (§19). */
export class AiTransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiTransientError";
  }
}

// ─── Provider quota detection ────────────────────────────────────────────────

// Google daily quota exhaustion patterns.
function isGoogleDailyQuota(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("resource has been exhausted") ||
    m.includes("exceeded your daily") ||
    m.includes("exceeded your current quota") ||
    m.includes("quota exceeded")
  );
}

// Groq tokens-per-day (TPD) exhaustion. Groq free tier = 100K TPD.
function isGroqDailyLimit(message: string): boolean {
  const m = message.toLowerCase();
  return m.includes("tokens per day") || m.includes("tpd");
}

// Generic daily quota check for the classify-and-rethrow path.
function isDailyQuotaMessage(message: string): boolean {
  return isGoogleDailyQuota(message) || isGroqDailyLimit(message);
}

// ─── Fallback state ──────────────────────────────────────────────────────────

// Once a provider's daily quota is hit during a run, skip it for the rest of
// the run (calling a quota'd provider costs time, not money).
let googleExhausted = false;
let groqExhausted = false;

// ─── Model calls ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a neutral media-bias analyst. Analyze the political framing and sentiment of a single news article.

Rules:
- Judge framing from the ARTICLE TEXT ONLY. Never infer bias from the source or outlet name.
- leftPercentage + centerPercentage + rightPercentage must total 100.
- politicalFramingLabel should match the strongest percentage, UNLESS confidence is low or the percentages are close  -  then use "unclear". Use "mixed" when left and right are both substantial.
- If evidence is weak, use "unclear" and keep confidence low.
- summary must be neutral and factual, with no opinion or framing.
- Always include a disclaimer that the framing is AI-estimated, not objective truth.
- category must be ONE of: "U.S. News", "World", "Politics", "Business", "Technology", "Science", "Health", "Sports", "Entertainment", "Culture", "Opinion". Pick the single best fit based on the article's subject matter.
- Return ONLY valid JSON matching the schema. No markdown, no code fences, no explanation.

Output shape — return ONLY JSON with exactly these 12 fields:

{
  "category": "Politics",
  "summary": "A concise, neutral, factual summary of the article with no opinion or framing.",
  "sentimentScore": -0.2,
  "sentimentLabel": "negative",
  "leftPercentage": 55,
  "centerPercentage": 30,
  "rightPercentage": 15,
  "politicalFramingLabel": "left",
  "confidence": 0.7,
  "framingNotes": "The article emphasizes one side's concerns, uses loaded phrasing about a policy, and omits the opposing view.",
  "loadedTerms": ["landmark", "hard-line"],
  "disclaimer": "This framing is AI-estimated, not objective truth."
}

Copy the STRUCTURE only. Every value above is an example and must be derived from the article text, never copied. Keep percentages summing to 100 and labels matching the schema enums.`;

function buildPrompt(article: { title: string; rawText: string | null }): string {
  const body = (article.rawText ?? "").slice(0, MAX_ANALYSIS_INPUT_CHARS);
  return `Title: ${article.title}\n\nArticle:\n${body}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// Providers disagree on cosmetic details — Groq returns "Neutral" (capitalised)
// where the schema demands "neutral", categories arrive as "US News",
// "U.S. news", or "us", and numbers sometimes come back quoted ("55").
// Normalise those value shapes BEFORE Zod validation so a cosmetic difference
// never discards an otherwise-valid analysis (§19 invalid-output gate).
// Everything else stays strict.
function normalizeOutput(raw: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = { ...raw };

  for (const key of ["summary", "framingNotes", "disclaimer"] as const) {
    if (typeof out[key] === "string") out[key] = (out[key] as string).trim();
  }
  if (typeof out.sentimentLabel === "string") {
    out.sentimentLabel = (out.sentimentLabel as string).trim().toLowerCase();
  }
  if (typeof out.politicalFramingLabel === "string") {
    out.politicalFramingLabel = (out.politicalFramingLabel as string).trim().toLowerCase();
  }
  if (typeof out.category === "string") {
    out.category = resolveCategory(out.category as string);
  }
  // Models occasionally wrap numeric fields in quotes ("-0.2", "55"). Coerce
  // numeric strings to numbers; leave real strings to fail Zod as before.
  for (const key of [
    "sentimentScore",
    "leftPercentage",
    "centerPercentage",
    "rightPercentage",
    "confidence",
  ] as const) {
    const n = toFiniteNumber(out[key]);
    if (n !== undefined) out[key] = n;
  }
  // Some models return loadedTerms as a comma-separated string rather than an
  // array; split it instead of discarding the whole analysis.
  if (typeof out.loadedTerms === "string") {
    out.loadedTerms = (out.loadedTerms as string)
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return out;
}

/** Accept a number or a numeric string; anything else → undefined (left to Zod). */
function toFiniteNumber(v: unknown): number | undefined {
  if (typeof v === "number") return Number.isFinite(v) ? v : undefined;
  if (typeof v === "string" && v.trim() !== "") {
    const n = Number(v);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

/** Map a model-provided category to its canonical option ("US news" → "U.S. News", "World News" → "World"); "News" when unresolvable. */
export function resolveCategory(label: string): ArticleCategory {
  return canonicalCategory(label) ?? "News";
}

// Extract JSON from model text: strip markdown fences, trailing commas, parse + validate.
// Models sometimes wrap the JSON in prose ("Here is the analysis:") or fences;
// when a direct parse fails, fall back to parsing the outermost {...} window so
// surrounding text can never discard an otherwise-valid analysis.
function extractJson(text: string): AnalysisResult {
  let raw = text.replace(/```(?:json)?\s*\n?/gi, "").replace(/```\s*$/gm, "").trim();
  raw = raw.replace(/,\s*([\]}])/g, "$1");
  const parsed: unknown = tryParse(raw) ?? parseJsonWindow(raw);
  if (typeof parsed !== "object" || parsed === null) {
    throw new SyntaxError("AI output is not a JSON object");
  }
  return analysisSchema.parse(normalizeOutput(parsed as Record<string, unknown>));
}

function tryParse(raw: string): unknown | undefined {
  try {
    return JSON.parse(raw);
  } catch {
    return undefined;
  }
}

function parseJsonWindow(raw: string): unknown | undefined {
  const firstBrace = raw.indexOf("{");
  const lastBrace = raw.lastIndexOf("}");
  if (firstBrace === -1 || lastBrace <= firstBrace) return undefined;
  const window = raw.slice(firstBrace, lastBrace + 1);
  return tryParse(window);
}

// Single generateText call against any resolved model. Uses manual JSON
// extraction + Zod validation because provider models may produce markdown-
// wrapped JSON or omit fields. This approach works with any model regardless
// of structured output support.
async function callProvider(
  model: LanguageModel,
  article: { title: string; rawText: string | null },
): Promise<AnalysisResult> {
  const { text } = await generateText({
    model,
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(article),
    maxOutputTokens: MAX_ANALYSIS_OUTPUT_TOKENS,
  });
  return extractJson(text);
}

// Primary + fallbacks, in order: Groq (free, preferred) → Google (free) →
// OpenRouter (paid, no hard daily free cap). Each tier is skipped for the rest
// of the run once its daily quota is hit. Returns the model actually used so
// the saved `article_analyses.model` reflects the real provider.
async function callModel(article: {
  title: string;
  rawText: string | null;
}): Promise<{ analysis: AnalysisResult; model: string }> {
  if (!groqExhausted) {
    try {
      return {
        analysis: await callProvider(groq(GROQ_MODEL), article),
        model: GROQ_MODEL,
      };
    } catch (err) {
      const msg = (err as Error).message ?? "";
      if (isGroqDailyLimit(msg)) {
        groqExhausted = true;
        console.log(
          "[analyze] Groq daily tokens exhausted  -  switching to Google for remainder of run",
        );
        // Fall through to Google below.
      } else {
        throw err;
      }
    }
  }

  if (!googleExhausted) {
    try {
      return {
        analysis: await callProvider(google(GOOGLE_MODEL), article),
        model: GOOGLE_MODEL,
      };
    } catch (err) {
      const msg = (err as Error).message ?? "";
      if (isGoogleDailyQuota(msg)) {
        googleExhausted = true;
        console.log(
          "[analyze] Google quota exhausted  -  switching to OpenRouter for remainder of run",
        );
        // Fall through to OpenRouter below.
      } else {
        throw err;
      }
    }
  }

  // Paid last resort — no daily free cap, used only when both free tiers are
  // quota'd (otherwise the pipeline would sit idle until the next day).
  return {
    analysis: await callOpenRouter(article),
    model: OPENROUTER_MODEL,
  };
}

// Raw OpenRouter call (§19). Same JSON contract as the SDK providers; the
// extraction + Zod validation below is shared. Raw fetch (no SDK dependency)
// mirrors the OpenRouter embedding fallback in lib/ai/embed.ts.
async function callOpenRouter(article: {
  title: string;
  rawText: string | null;
}): Promise<AnalysisResult> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("[analyze] OPENROUTER_API_KEY is not set.");
  }

  const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENROUTER_MODEL,
      temperature: 0.4,
      max_tokens: MAX_ANALYSIS_OUTPUT_TOKENS,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: buildPrompt(article) },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `[analyze] OpenRouter call failed (${res.status}): ${body.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const text = data.choices?.[0]?.message?.content;
  if (typeof text !== "string" || !text.trim()) {
    throw new SyntaxError("OpenRouter returned empty content");
  }
  return extractJson(text);
}

// ─── DB row mapping ──────────────────────────────────────────────────────────

function normalizePercentages(a: AnalysisResult): {
  left: number;
  center: number;
  right: number;
} {
  const left = clamp(a.leftPercentage, 0, 100);
  const center = clamp(a.centerPercentage, 0, 100);
  const right = clamp(a.rightPercentage, 0, 100);
  const total = left + center + right;
  if (total === 0) return { left: 0, center: 100, right: 0 };
  const l = Math.round((left / total) * 100);
  const r = Math.round((right / total) * 100);
  return { left: l, center: Math.max(0, 100 - l - r), right: r };
}

function deriveBiasLabel(
  pct: { left: number; center: number; right: number },
  modelLabel: BiasLabel,
  confidence: number,
): BiasLabel {
  if (modelLabel === "unclear" && confidence < 0.4) return "unclear";
  const { left, center, right } = pct;
  const CLOSE = 10;
  if (left >= 35 && right >= 35) return "mixed";
  if (confidence < 0.35) return "unclear";
  const max = Math.max(left, center, right);
  if (max === center) return "center";
  if (max === left) return left - right <= CLOSE ? "unclear" : "left";
  return right - left <= CLOSE ? "unclear" : "right";
}

/** What analyzeArticle produces: a DB-ready insert minus the article_id/embedding. */
export type AnalysisRowInput = Omit<ArticleAnalysisInsert, "article_id" | "embedding"> & {
  category: ArticleCategory;
};

function toRow(a: AnalysisResult, model: string): AnalysisRowInput {
  const pct = normalizePercentages(a);
  const biasLabel = deriveBiasLabel(pct, a.politicalFramingLabel as BiasLabel, a.confidence);
  const biasScore = clamp((pct.right - pct.left) / 100, -1, 1);
  return {
    category: a.category,
    summary: a.summary,
    sentiment_score: clamp(a.sentimentScore, -1, 1),
    sentiment_label: a.sentimentLabel as SentimentLabel,
    bias_score: biasScore,
    bias_label: biasLabel,
    left_percentage: pct.left,
    center_percentage: pct.center,
    right_percentage: pct.right,
    confidence: clamp(a.confidence, 0, 1),
    framing_notes: a.framingNotes,
    loaded_terms: a.loadedTerms,
    disclaimer: a.disclaimer,
    model,
  };
}

// ─── Public API ──────────────────────────────────────────────────────────────

interface ArticleForAnalysis {
  title: string;
  rawText: string | null;
}

/**
 * Analyze one article. Retries once on invalid/failed output (§19); throws on the
 * second failure so the caller marks it failed WITHOUT saving a partial row.
 *
 * Throws a classified error so the caller can bucket it (§19):
 *   • AiQuotaError      -  provider daily cap; NOT retried (pointless within a run).
 *   • AiTransientError  -  connection/per-minute/other API error (retried once).
 *   • SyntaxError/ZodError  -  invalid/unparseable output (retried once).
 */
export async function analyzeArticle(
  article: ArticleForAnalysis,
): Promise<AnalysisRowInput> {
  try {
    const { analysis, model } = await callModel(article);
    return toRow(analysis, model);
  } catch (err) {
    const message = (err as Error).message ?? "";

    if (isDailyQuotaMessage(message)) {
      throw new AiQuotaError(message);
    }

    const isInvalidOutput =
      err instanceof SyntaxError ||
      (err instanceof Error && err.name === "ZodError");

    if (isInvalidOutput) {
      console.warn("[analyze] invalid AI output, retrying once:", message.slice(0, 120));
    } else {
      console.warn("[analyze] AI call failed, retrying once:", message.slice(0, 120));
    }

    // Single retry (§19).
    try {
      const { analysis, model } = await callModel(article);
      return toRow(analysis, model);
    } catch (retryErr) {
      const retryMessage = (retryErr as Error).message ?? "";
      if (isDailyQuotaMessage(retryMessage)) {
        throw new AiQuotaError(retryMessage);
      }
      if (
        retryErr instanceof SyntaxError ||
        (retryErr instanceof Error && retryErr.name === "ZodError")
      ) {
        throw retryErr;
      }
      throw new AiTransientError(retryMessage);
    }
  }
}
