import "server-only";
import { generateText } from "ai";
import type { LanguageModel } from "ai";
import { google, groq } from "@/lib/ai/provider";
import { analysisSchema, type AnalysisResult } from "@/lib/ai/schema";
import type { ArticleAnalysisInsert } from "@/lib/supabase/types";
import type { SentimentLabel, BiasLabel } from "@/lib/types/article";
import { GOOGLE_MODEL, GROQ_MODEL, MAX_ANALYSIS_INPUT_CHARS, MAX_ANALYSIS_OUTPUT_TOKENS } from "@/lib/pipeline/limits";

// Structured analysis for one article (AGENTS.md §19). Server-only  -  the
// API key never reaches the browser (§21). Uses generateText + manual JSON
// extraction + Zod validation because provider models may produce markdown-
// wrapped JSON that fails json_schema enforcement.
//
// Two-provider fallback: Google Gemini (primary, ~1000+ RPD free) → Groq
// Llama (fallback, 14,400 RPD free). Once Google daily quota is exhausted
// for a run, all subsequent articles go directly to Groq.
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

// Once Google hits daily quota during a run, skip it for subsequent articles.
let googleExhausted = false;

// ─── Model calls ─────────────────────────────────────────────────────────────

const SYSTEM_PROMPT = `You are a neutral media-bias analyst. Analyze the political framing and sentiment of a single news article.

Rules:
- Judge framing from the ARTICLE TEXT ONLY. Never infer bias from the source or outlet name.
- leftPercentage + centerPercentage + rightPercentage must total 100.
- politicalFramingLabel should match the strongest percentage, UNLESS confidence is low or the percentages are close  -  then use "unclear". Use "mixed" when left and right are both substantial.
- If evidence is weak, use "unclear" and keep confidence low.
- summary must be neutral and factual, with no opinion or framing.
- Always include a disclaimer that the framing is AI-estimated, not objective truth.
- Return ONLY valid JSON matching the schema. No markdown, no code fences, no explanation.`;

function buildPrompt(article: { title: string; rawText: string | null }): string {
  const body = (article.rawText ?? "").slice(0, MAX_ANALYSIS_INPUT_CHARS);
  return `Title: ${article.title}\n\nArticle:\n${body}`;
}

function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// Extract JSON from model text: strip markdown fences, trailing commas, parse + validate.
function extractJson(text: string): AnalysisResult {
  let raw = text.replace(/```(?:json)?\s*\n?/gi, "").replace(/```\s*$/gm, "").trim();
  raw = raw.replace(/,\s*([\]}])/g, "$1");
  const parsed: unknown = JSON.parse(raw);
  return analysisSchema.parse(parsed);
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

// Primary + fallback. Google first; once exhausted, Groq for the rest of the run.
async function callModel(article: { title: string; rawText: string | null }): Promise<AnalysisResult> {
  if (!googleExhausted) {
    try {
      return await callProvider(google(GOOGLE_MODEL), article);
    } catch (err) {
      const msg = (err as Error).message ?? "";
      if (isGoogleDailyQuota(msg)) {
        googleExhausted = true;
        console.log("[analyze] Google quota exhausted  -  switching to Groq for remainder of run");
        // Fall through to Groq below.
      } else {
        throw err;
      }
    }
  }
  return await callProvider(groq(GROQ_MODEL), article);
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
export type AnalysisRowInput = Omit<ArticleAnalysisInsert, "article_id" | "embedding">;

function toRow(a: AnalysisResult, model: string): AnalysisRowInput {
  const pct = normalizePercentages(a);
  const biasLabel = deriveBiasLabel(pct, a.politicalFramingLabel as BiasLabel, a.confidence);
  const biasScore = clamp((pct.right - pct.left) / 100, -1, 1);
  return {
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
    return toRow(await callModel(article), googleExhausted ? GROQ_MODEL : GOOGLE_MODEL);
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
      return toRow(await callModel(article), googleExhausted ? GROQ_MODEL : GOOGLE_MODEL);
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
