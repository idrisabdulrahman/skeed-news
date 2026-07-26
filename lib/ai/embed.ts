import "server-only";
import { embed } from "ai";
import { openrouter } from "@/lib/ai/provider";
import {
  EMBEDDING_MODEL,
  EMBEDDING_DIMENSIONS,
  MAX_ANALYSIS_INPUT_CHARS,
} from "@/lib/pipeline/limits";

// Text embedding for an article (AGENTS.md §20). Server-only. Uses OpenRouter's
// `openai/text-embedding-3-small`, which returns 1536-dim vectors natively — so
// the result matches the `article_analyses.embedding vector(1536)` column with
// no dimension option to set. Used for pgvector cosine similarity (Related
// Articles).

/** Embed an article's title + body. Returns a 1536-dim vector. */
export async function embedArticle(
  title: string,
  rawText: string | null,
): Promise<number[]> {
  const text = `${title}\n\n${(rawText ?? "").slice(0, MAX_ANALYSIS_INPUT_CHARS)}`;

  const { embedding } = await embed({
    model: openrouter.textEmbeddingModel(EMBEDDING_MODEL),
    value: text,
  });

  if (embedding.length !== EMBEDDING_DIMENSIONS) {
    throw new Error(
      `Embedding dimension mismatch: expected ${EMBEDDING_DIMENSIONS}, got ${embedding.length}`,
    );
  }

  return embedding;
}
