import "server-only";
import { MAX_ANALYSIS_INPUT_CHARS, EMBEDDING_DIMENSIONS } from "@/lib/pipeline/limits";

// Text embedding for an article (AGENTS.md §20). Server-only.
// Primary: Google's gemini-embedding-001 via the REST API directly because
// @ai-sdk/google v4.0.24 silently ignores the outputDimensionality option
// (tested: returns 3072 instead of the requested 1536). The raw API with
// outputDimensionality: 1536 returns the correct dimension, matching the
// article_analyses.embedding vector(1536) column.
//
// Fallback: OpenRouter text-embedding-3-small (1536 dims natively) — used
// whenever Google 429s (free-tier daily quota is shared with the analysis
// model, so it is regularly exhausted mid-run). Keeps the pipeline moving;
// the vector column expects exactly EMBEDDING_DIMENSIONS either way.
//
// GOOGLE_GENERATIVE_AI_API_KEY / OPENROUTER_API_KEY are server-only (§21).

const EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

const OPENROUTER_EMBED_URL = "https://openrouter.ai/api/v1/embeddings";
const OPENROUTER_EMBED_MODEL = "text-embedding-3-small";

/** Embed an article's title + body. Returns a 1536-dim vector. */
export async function embedArticle(
  title: string,
  rawText: string | null,
): Promise<number[]> {
  const text = `${title}\n\n${(rawText ?? "").slice(0, MAX_ANALYSIS_INPUT_CHARS)}`;

  try {
    return await embedWithGoogle(text);
  } catch (googleErr) {
    // Google quota exhausted or per-call error — fall through to OpenRouter.
    try {
      return await embedWithOpenRouter(text);
    } catch (openrouterErr) {
      throw new Error(
        `[embed] both providers failed. Google: ${(googleErr as Error).message} ` +
          `OpenRouter: ${(openrouterErr as Error).message}`,
      );
    }
  }
}

// Google gemini-embedding-001 (§20) — 1536 dims via outputDimensionality.
async function embedWithGoogle(text: string): Promise<number[]> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error("[embed] GOOGLE_GENERATIVE_AI_API_KEY is not set.");
  }

  const res = await fetch(`${EMBED_URL}?key=${apiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "models/gemini-embedding-001",
      content: { parts: [{ text }] },
      outputDimensionality: EMBEDDING_DIMENSIONS,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `[embed] Google embedding failed (${res.status}): ${body.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as {
    embedding?: { values?: number[] };
  };

  const embedding = data.embedding?.values;

  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `[embed] Dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, got ${embedding?.length ?? "none"}`,
    );
  }

  return embedding;
}

// OpenRouter text-embedding-3-small fallback (§20) — 1536 dims natively.
async function embedWithOpenRouter(text: string): Promise<number[]> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("[embed] OPENROUTER_API_KEY is not set.");
  }

  const res = await fetch(OPENROUTER_EMBED_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: OPENROUTER_EMBED_MODEL,
      input: text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(
      `[embed] OpenRouter embedding failed (${res.status}): ${body.slice(0, 200)}`,
    );
  }

  const data = (await res.json()) as {
    data?: { embedding?: number[] }[];
  };

  const embedding = data.data?.[0]?.embedding;

  if (!Array.isArray(embedding) || embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `[embed] Dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, got ${embedding?.length ?? "none"}`,
    );
  }

  return embedding;
}