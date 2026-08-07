import "server-only";
import { MAX_ANALYSIS_INPUT_CHARS, EMBEDDING_DIMENSIONS } from "@/lib/pipeline/limits";

// Text embedding for an article (AGENTS.md §20). Server-only.
// Uses Google's gemini-embedding-001 via the REST API directly because
// @ai-sdk/google v4.0.24 silently ignores the outputDimensionality option
// (tested: returns 3072 instead of the requested 1536). The raw API with
// outputDimensionality: 1536 returns the correct dimension, matching the
// article_analyses.embedding vector(1536) column.
//
// GOOGLE_GENERATIVE_AI_API_KEY is server-only (AGENTS.md §21).

const EMBED_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent";

/** Embed an article's title + body. Returns a 1536-dim vector. */
export async function embedArticle(
  title: string,
  rawText: string | null,
): Promise<number[]> {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error(
      "[embed] GOOGLE_GENERATIVE_AI_API_KEY is not set.",
    );
  }

  const text = `${title}\n\n${(rawText ?? "").slice(0, MAX_ANALYSIS_INPUT_CHARS)}`;

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
