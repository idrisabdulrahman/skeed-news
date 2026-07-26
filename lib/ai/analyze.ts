import "server-only";
import { generateObject, NoObjectGeneratedError } from "ai";
import { openrouter } from "@/lib/ai/provider";
import { analysisSchema, type AnalysisResult } from "@/lib/ai/schema";
import type { ArticleAnalysisInsert } from "@/lib/supabase/types";
import type { SentimentLabel, BiasLabel } from "@/lib/types/article";
import { ANALYSIS_MODEL, MAX_ANALYSIS_INPUT_CHARS, MAX_ANALYSIS_OUTPUT_TOKENS } from "@/lib/pipeline/limits";

// Structured analysis for one article (AGENTS.md §19). Server-only — the
// API key never reaches the browser (§21). Uses generateObject with the Zod
// schema so the output is schema-validated by the SDK; we then apply the extra
// §19 framing rules (percentages sum to 100, label sanity, bias_score) before
// returning a DB-ready row. On invalid/failed output we retry once (§19);
// a second failure throws so the caller counts it as failed without saving.
//
// Failures are classified so the caller can bucket them correctly (§19) instead
// of blaming every throw on invalid output:
//   • AiQuotaError   — OpenRouter daily free-tier cap ("free-models-per-day").
//                      Will NOT recover within a run → caller fails the run fast.
//   • AiTransientError — connection/per-minute/other API error → count as
//                      ai_call_failed for this article; the run continues.
//   • invalid output — NoObjectGeneratedError (schema/parse) → invalid_ai_output.

/** OpenRouter daily free-tier quota exhausted — not recoverable within a run (§19). */
export class AiQuotaError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiQuotaError";
  }
}

/** Transient AI failure (connection, per-minute limit, generic API error) (§19). */
export class AiTransientError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiTransientError";
  }
}

// Detect quota exhaustion from Google or OpenRouter error messages.
function isDailyQuotaMessage(message: string): boolean {
  const m = message.toLowerCase();
  return (
    m.includes("free-models-per-day") ||
    m.includes("per-day") ||
    m.includes("exceeded your current quota") ||
    m.includes("quota exceeded for metric")
  );
}

const SYSTEM_PROMPT = `You are a neutral media-bias analyst. Analyze the political framing and sentiment of a single news article.

Rules:
- Judge framing from the ARTICLE TEXT ONLY. Never infer bias from the source or outlet name.
- leftPercentage + centerPercentage + rightPercentage must total 100.
- politicalFramingLabel should match the strongest percentage, UNLESS confidence is low or the percentages are close — then use "unclear". Use "mixed" when left and right are both substantial.
- If evidence is weak, use "unclear" and keep confidence low.
- summary must be neutral and factual, with no opinion or framing.
- Always include a disclaimer that the framing is AI-estimated, not objective truth.`;

/** What analyzeArticle produces: a DB-ready insert minus the article_id/embedding. */
export type AnalysisRowInput = Omit<
  ArticleAnalysisInsert,
  "article_id" | "embedding"
>;

interface ArticleForAnalysis {
  title: string;
  rawText: string | null;
}

// Build the user prompt from title + cleaned body, bounded to keep requests small.
function buildPrompt(article: ArticleForAnalysis): string {
  const body = (article.rawText ?? "").slice(0, MAX_ANALYSIS_INPUT_CHARS);
  return `Title: ${article.title}\n\nArticle:\n${body}`;
}

// Clamp helper for defensive numeric bounds.
function clamp(n: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, n));
}

// Normalize the three framing percentages to sum to exactly 100 (§19). The model
// is asked to sum to 100 but may drift by rounding; scale proportionally, then
// fix any residual on center so the stored values always total 100.
function normalizePercentages(a: AnalysisResult): {
  left: number;
  center: number;
  right: number;
} {
  const left = clamp(a.leftPercentage, 0, 100);
  const center = clamp(a.centerPercentage, 0, 100);
  const right = clamp(a.rightPercentage, 0, 100);
  const total = left + center + right;

  if (total === 0) {
    // No signal at all — treat as fully center.
    return { left: 0, center: 100, right: 0 };
  }

  const l = Math.round((left / total) * 100);
  const r = Math.round((right / total) * 100);
  const c = 100 - l - r; // absorb rounding residual into center
  return { left: l, center: Math.max(0, c), right: r };
}

// Derive the bias label from normalized percentages, honoring §19: match the
// strongest lean unless it's weak/close, then "unclear"; "mixed" when left and
// right are both strong. Falls back to the model's label when it already chose
// unclear/mixed with low confidence.
function deriveBiasLabel(
  pct: { left: number; center: number; right: number },
  modelLabel: BiasLabel,
  confidence: number,
): BiasLabel {
  // Respect an explicit low-confidence "unclear" from the model.
  if (modelLabel === "unclear" && confidence < 0.4) return "unclear";

  const { left, center, right } = pct;
  const CLOSE = 10; // within 10 points → too close to call a clear winner

  if (left >= 35 && right >= 35) return "mixed";

  if (confidence < 0.35) return "unclear";

  const max = Math.max(left, center, right);
  if (max === center) return "center";
  if (max === left) {
    // Left strongest, but if right nearly ties it the lean is too close to call.
    return left - right <= CLOSE ? "unclear" : "left";
  }
  return right - left <= CLOSE ? "unclear" : "right";
}

// Map validated AI output to a DB-ready analysis row (minus article_id/embedding).
function toRow(a: AnalysisResult, model: string): AnalysisRowInput {
  const pct = normalizePercentages(a);
  const biasLabel = deriveBiasLabel(
    pct,
    a.politicalFramingLabel as BiasLabel,
    a.confidence,
  );
  // bias_score derived, never asked of the model (§7/§19).
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

// One model call via OpenRouter, schema-validated by the SDK.
async function callModel(article: ArticleForAnalysis): Promise<AnalysisResult> {
  const { object } = await generateObject({
    model: openrouter.chat(ANALYSIS_MODEL),
    schema: analysisSchema,
    system: SYSTEM_PROMPT,
    prompt: buildPrompt(article),
    maxOutputTokens: MAX_ANALYSIS_OUTPUT_TOKENS,
  });
  return object;
}

/**
 * Analyze one article. Retries once on invalid/failed output (§19); throws on the
 * second failure so the caller marks it failed WITHOUT saving a partial row.
 *
 * Throws a classified error so the caller can bucket it (§19):
 *   • AiQuotaError     — daily free-tier cap; NOT retried (pointless within a run).
 *   • AiTransientError — connection/per-minute/other API error (retried once).
 *   • NoObjectGeneratedError — invalid/unparseable output (retried once).
 */
export async function analyzeArticle(
  article: ArticleForAnalysis,
): Promise<AnalysisRowInput> {
  try {
    return toRow(await callModel(article), ANALYSIS_MODEL);
  } catch (err) {
    const message = (err as Error).message ?? "";

    // Daily quota won't recover within this run — surface it distinctly and do
    // NOT spend the retry (§19 decision 1).
    if (isDailyQuotaMessage(message)) {
      throw new AiQuotaError(message);
    }

    if (NoObjectGeneratedError.isInstance(err)) {
      console.warn("[analyze] invalid AI output, retrying once");
    } else {
      console.warn("[analyze] AI call failed, retrying once:", message);
    }

    // Single retry (§19).
    try {
      return toRow(await callModel(article), ANALYSIS_MODEL);
    } catch (retryErr) {
      const retryMessage = (retryErr as Error).message ?? "";
      if (isDailyQuotaMessage(retryMessage)) {
        throw new AiQuotaError(retryMessage);
      }
      // Re-throw invalid output as-is; wrap anything else as transient so the
      // caller can tell it apart from a schema failure.
      if (NoObjectGeneratedError.isInstance(retryErr)) throw retryErr;
      throw new AiTransientError(retryMessage);
    }
  }
}
