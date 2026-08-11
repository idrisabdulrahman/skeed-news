import { z } from "zod";
import { CATEGORY_OPTIONS, type ArticleCategory } from "@/lib/categories";

// Re-export the shared taxonomy (defined once in lib/categories.ts): the model
// prompt, chips, and category pages all read the same list.
export { CATEGORY_OPTIONS, type ArticleCategory };
export const sentimentLabelSchema = z.enum(["positive", "neutral", "negative"]);
export const politicalFramingLabelSchema = z.enum([
  "left",
  "center",
  "right",
  "mixed",
  "unclear",
]);

// A percentage 0–100. Kept as a plain bounded number (not int) — the model may
// return decimals; we normalize to sum 100 after validation.
const percentage = z.number().min(0).max(100);

export const categorySchema = z.enum(CATEGORY_OPTIONS);

export const analysisSchema = z.object({
  category: categorySchema.describe(
    "The single best-fit news category for this article. Pick the ONE category that fits best.",
  ),
  summary: z
    .string()
    .min(1)
    .describe(
      "A neutral, factual summary of the article in 2-4 sentences. No opinion, no framing.",
    ),
  sentimentScore: z
    .number()
    .min(-1)
    .max(1)
    .describe("Overall sentiment of the article, from -1 (negative) to 1 (positive)."),
  sentimentLabel: sentimentLabelSchema.describe(
    "Sentiment label matching sentimentScore: negative < 0, neutral around 0, positive > 0.",
  ),
  leftPercentage: percentage.describe(
    "Estimated share of the framing that leans politically left, 0-100.",
  ),
  centerPercentage: percentage.describe(
    "Estimated share of the framing that is politically center/neutral, 0-100.",
  ),
  rightPercentage: percentage.describe(
    "Estimated share of the framing that leans politically right, 0-100. left + center + right must total 100.",
  ),
  politicalFramingLabel: politicalFramingLabelSchema.describe(
    "The strongest framing lean. Use 'unclear' when evidence is weak; 'mixed' when left and right are both substantial.",
  ),
  confidence: z
    .number()
    .min(0)
    .max(1)
    .describe("Confidence in this framing analysis, 0-1. Keep low when evidence is weak."),
  framingNotes: z
    .string()
    .describe("A short paragraph explaining the framing judgment, citing article evidence only."),
  loadedTerms: z
    .array(z.string())
    .describe("Charged or loaded words/phrases found in the article. Empty array if none."),
  disclaimer: z
    .string()
    .describe("A one-line disclaimer that this framing is AI-estimated, not objective truth."),
});

/** The validated analysis object returned by the model. */
export type AnalysisResult = z.infer<typeof analysisSchema>;
