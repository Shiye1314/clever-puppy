import { INTEGRATOR_PROMPT } from "./prompts";
import { callLLM, extractJSON } from "../llm/client";
import type { ProductCard } from "../types";

export async function integrateBrief(
  productCard: ProductCard,
  marketResearch: Record<string, unknown>,
  apiKey: string,
  model: string = "claude-haiku-4-5",
  provider: string = "anthropic"
): Promise<ProductCard & { enrichedInsights?: Record<string, string> }> {
  const prompt = INTEGRATOR_PROMPT
    .replace("{productCard}", JSON.stringify(productCard, null, 2))
    .replace("{marketResearch}", JSON.stringify(marketResearch, null, 2));
  const text = await callLLM({ prompt, model, maxTokens: 1024, provider: provider as any, apiKey });
  return extractJSON(text) as any;
}
