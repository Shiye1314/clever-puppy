import { GENERATE_PROMPT, REWRITE_SECTION_PROMPT } from "./prompts";
import { callLLM } from "../llm/client";
import type { ProductCard, StyleDNA } from "../types";

export interface ArticleSectionsV2 {
  painPoint: string;
  transition: string;
  productIntro: string;
  brandIntro: string;
  ctaHook: string;
}

export async function generateArticle(
  card: ProductCard, styleDNA: StyleDNA, referenceSamples: string,
  bannedWords: string[], generationModel: string, apiKey: string, provider: string = "anthropic"
): Promise<ArticleSectionsV2> {
  const prompt = GENERATE_PROMPT
    .replace("{styleDNA}", JSON.stringify(styleDNA, null, 2))
    .replace("{productCard}", JSON.stringify(card, null, 2))
    .replace("{referenceSamples}", referenceSamples || "无参考范文")
    .replace("{bannedWords}", bannedWords.join("、") || "无");

  const text = await callLLM({ prompt, model: generationModel, maxTokens: 3072, provider: provider as any, apiKey });
  return parseSections(text);
}

export async function rewriteSection(
  sectionName: string, currentContent: string,
  anchorSections: Partial<ArticleSectionsV2>,
  styleDNA: StyleDNA, model: string, apiKey: string, provider: string = "anthropic"
): Promise<string> {
  const contextText = Object.entries(anchorSections)
    .filter(([, content]) => content)
    .map(([name, content]) => `【${name}段】\n${content}`)
    .join("\n\n");

  const prompt = REWRITE_SECTION_PROMPT
    .replace("{styleDNA}", JSON.stringify(styleDNA, null, 2))
    .replace("{contextSections}", contextText || "无")
    .replace("{sectionName}", sectionName)
    .replace("{currentContent}", currentContent);

  return callLLM({ prompt, model, maxTokens: 1536, provider: provider as any, apiKey });
}

function parseSections(text: string): ArticleSectionsV2 {
  const m = (name: string) => {
    const match = text.match(new RegExp(`<section name="${name}">\\s*([\\s\\S]*?)\\s*</section>`, "i"));
    return match?.[1]?.trim() ?? "";
  };
  return {
    painPoint: m("painPoint"),
    transition: m("transition"),
    productIntro: m("productIntro"),
    brandIntro: m("brandIntro"),
    ctaHook: m("ctaHook"),
  };
}
