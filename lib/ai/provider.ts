import "server-only";
import { createGoogleGenerativeAI } from "@ai-sdk/google";
import { createGroq } from "@ai-sdk/groq";

// Groq - preferred for analysis (Llama 3.3 70B, 14,400 RPD free, 30 RPM).
// Structured output via OpenAI-compatible API. GROQ_API_KEY is server-only
// (AGENTS.md §21).
export const groq = createGroq({
  apiKey: process.env.GROQ_API_KEY,
});

// Google Gemini - fallback for analysis when Groq daily quota is exhausted
// (gemini-2.0-flash, ~1000+ RPD free via AI Studio key) and embeddings
// (gemini-embedding-001, 1000 RPD free). GOOGLE_GENERATIVE_AI_API_KEY is
// server-only (AGENTS.md §21).
export const google = createGoogleGenerativeAI({
  apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});
