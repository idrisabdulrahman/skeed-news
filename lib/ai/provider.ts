import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";

// Google Gemini - primary for analysis (gemini-2.0-flash, ~1000+ RPD free
// via AI Studio key) and embeddings (gemini-embedding-001, 1000 RPD free).
// GOOGLE_GENERATIVE_AI_API_KEY is server-only (AGENTS.md §21).
export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// Groq - fallback for analysis when Google daily quota is exhausted.
// Llama 3.3 70B, 14,400 RPD free, 30 RPM. Structured output via OpenAI-
// compatible API. GROQ_API_KEY is server-only (AGENTS.md §21).
export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});
