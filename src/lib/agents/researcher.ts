import { RESEARCH_PROMPT } from "./prompts";
import { callLLM, extractJSON } from "../llm/client";

export async function runMarketResearch(
  productInfo: string,
  apiKey: string,
  model: string = "claude-sonnet-4-6",
  provider: string = "anthropic"
): Promise<Record<string, unknown>> {
  const prompt = RESEARCH_PROMPT.replace("{productInfo}", productInfo);
  const text = await callLLM({ prompt, model, maxTokens: 2048, provider: provider as any, apiKey });
  return extractJSON(text);
}
