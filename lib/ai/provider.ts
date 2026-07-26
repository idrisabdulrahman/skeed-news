import "server-only";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

// Single OpenRouter provider for all AI calls (AGENTS.md §19/§20/§21). The API
// key is read here and nowhere else, so the server-only boundary has one owner.
// OPENROUTER_API_KEY is server-only (§21) — never NEXT_PUBLIC_.
export const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});
