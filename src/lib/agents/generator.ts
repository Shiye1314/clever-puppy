import { GENERATE_PROMPT, REWRITE_SECTION_PROMPT } from "./prompts";
import { callLLM } from "../llm/client";
import type { ProductCard, ArticleSections, StyleDNA } from "../types";

export async function generateArticle(
  card: ProductCard, styleDNA: StyleDNA, referenceSamples: string,
  bannedWords: string[], generationModel: string, apiKey: string, provider: string = "anthropic"
): Promise<ArticleSections> {
  const prompt = GENERATE_PROMPT
    .replace("{styleDNA}", JSON.stringify(styleDNA, null, 2))
    .replace("{productCard}", JSON.stringify(card, null, 2))
    .replace("{referenceSamples}", referenceSamples || "无参考范文")
    .replace("{bannedWords}", bannedWords.join("、") || "无");

  const text = await callLLM({ prompt, model: generationModel, maxTokens: 2048, provider: provider as any, apiKey });
  return parseSections(text);
}

export async function rewriteSection(
  sectionName: string, currentContent: string, anchorSections: Partial<ArticleSections>,
  styleDNA: StyleDNA, model: string, apiKey: string, provider: string = "anthropic"
): Promise<string> {
  const contextText = Object.entries(anchorSections)
    .map(([name, content]) => `【${name}段】\n${content}`).join("\n\n");
  const prompt = REWRITE_SECTION_PROMPT
    .replace("{styleDNA}", JSON.stringify(styleDNA, null, 2))
    .replace("{contextSections}", contextText)
    .replace("{sectionName}", sectionName)
    .replace("{currentContent}", currentContent);
  return callLLM({ prompt, model, maxTokens: 1024, provider: provider as any, apiKey });
}

function parseSections(text: string): ArticleSections {
  const h = text.match(/<section name="hook">\s*([\s\S]*?)\s*<\/section>/i);
  const t = text.match(/<section name="transition">\s*([\s\S]*?)\s*<\/section>/i);
  const s = text.match(/<section name="sellingPoints">\s*([\s\S]*?)\s*<\/section>/i);
  return { hook: h?.[1]?.trim() ?? "", transition: t?.[1]?.trim() ?? "", sellingPoints: s?.[1]?.trim() ?? "" };
}
