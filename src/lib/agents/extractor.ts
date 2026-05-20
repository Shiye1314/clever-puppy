import { EXTRACT_PROMPT } from "./prompts";
import { callLLM, extractJSON } from "../llm/client";

export async function extractProductCard(
  content: string,
  extractionModel: string,
  apiKey: string,
  provider: string = "anthropic"
): Promise<Record<string, unknown>> {
  const prompt = EXTRACT_PROMPT.replace("{content}", content);
  const text = await callLLM({ prompt, model: extractionModel, maxTokens: 2048, provider: provider as any, apiKey });
  return extractJSON(text);
}
