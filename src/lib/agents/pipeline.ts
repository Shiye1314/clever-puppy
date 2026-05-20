import { createClient } from "@supabase/supabase-js";
import { extractProductCard } from "./extractor";
import { generateArticle, rewriteSection, type ArticleSectionsV2 } from "./generator";
import type { ProductCard, StyleDNA } from "../types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function runGeneratePipeline(
  rawContent: string,
  productCardOverride?: Partial<ProductCard>,
  categoryId?: string,
  rewriteRequirement?: string
) {
  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // 1. 获取配置
  const { data: settings } = await supabaseAdmin
    .from("app_settings").select("*").single();
  const apiKey = settings?.deepseek_api_key || settings?.anthropic_api_key || process.env.CLAUDE_API_KEY!;
  const provider = settings?.provider || "deepseek";
  const generationModel = settings?.preferred_model || (provider === "deepseek" ? "deepseek-v4-pro" : "claude-sonnet-4-6");
  const extractionModel = settings?.extraction_model || (provider === "deepseek" ? "deepseek-v4-pro" : "claude-haiku-4-5");

  // 2. 获取风格DNA（全局 + 分类合并）
  const { data: dnaRow } = await supabaseAdmin
    .from("style_dna").select("*").single();
  const globalDNA: StyleDNA = (dnaRow?.dna_json ?? {}) as StyleDNA;

  let styleDNA = globalDNA;
  if (categoryId) {
    const { data: catRow } = await supabaseAdmin
      .from("categories").select("style_dna, name, writing_samples_count")
      .eq("id", categoryId).single();
    if (catRow?.style_dna) {
      const catDNA = catRow.style_dna as Partial<StyleDNA>;
      // 智能回退：如果该大类范文数<2，降级为通用模式（合并但降低分类权重）
      styleDNA = { ...globalDNA, ...catDNA } as StyleDNA;
      styleDNA.title_formulas = [
        ...new Set([...(catDNA.title_formulas || []), ...(globalDNA.title_formulas || [])])
      ];
      styleDNA.keywords_high_freq = [
        ...new Set([...(catDNA.keywords_high_freq || []), ...(globalDNA.keywords_high_freq || [])])
      ];
    }
  }

  // 3. 并行执行：文档提取 + 市场分析
  // 先快速提取基本信息用于市场分析
  const { extractProductCard } = await import("./extractor");
  const { runMarketResearch } = await import("./researcher");
  const { integrateBrief } = await import("./integrator");

  // 构建用于分析的文本（产品名+原始内容摘要）
  const analysisText = rawContent.slice(0, 3000);

  // 并行启动两个Agent
  const [extractedCard, marketResearch] = await Promise.all([
    extractProductCard(rawContent, extractionModel, apiKey, provider).catch((e) => {
      throw new Error(`[信息提取Agent] ${(e as Error).message}`);
    }),
    runMarketResearch(analysisText, apiKey, generationModel, provider).catch((e) => {
      throw new Error(`[市场研究Agent] ${(e as Error).message}`);
    }),
  ]);

  // 构建产品信息卡
  const rawCard: ProductCard = {
    productName: (extractedCard.productName as string) || "",
    sellingPoints: (extractedCard.sellingPoints as string[]) || [],
    targetPainPoint: (extractedCard.targetPainPoint as string) || "",
    usageScenario: (extractedCard.usageScenario as string) || "",
    competitorDiff: (extractedCard.competitorDiff as string) || "",
    brandTone: (extractedCard.brandTone as string) || "",
    ...productCardOverride,
  };

  // 4. 信息整合
  const integratedCard = await integrateBrief(rawCard, marketResearch, apiKey, extractionModel, provider).catch((e) => {
    throw new Error(`[信息整合Agent] ${(e as Error).message}`);
  });

  const card: ProductCard = {
    productName: integratedCard.productName || rawCard.productName,
    sellingPoints: integratedCard.sellingPoints || rawCard.sellingPoints,
    targetPainPoint: integratedCard.targetPainPoint || rawCard.targetPainPoint,
    usageScenario: integratedCard.usageScenario || rawCard.usageScenario,
    competitorDiff: integratedCard.competitorDiff || rawCard.competitorDiff,
    brandTone: integratedCard.brandTone || rawCard.brandTone,
  };

  // 5. 获取违禁词
  const { data: banned } = await supabaseAdmin
    .from("banned_words").select("word");
  const bannedWords = banned?.map((b: { word: string }) => b.word) ?? [];

  // 6. 检索参考范文
  let query = supabaseAdmin.from("writing_samples").select("content").limit(2);
  if (categoryId) {
    query = query.eq("category_id", categoryId);
  }
  const { data: samples } = await query;
  const referenceText = samples?.map((s: { content: string }) => s.content).join("\n\n") ?? "";

  // 7. 生成爆文
  const sections = await generateArticle(
    card, styleDNA, referenceText, bannedWords, generationModel, apiKey, provider, rewriteRequirement
  );

  return {
    card,
    sections,
    styleDNA,
    categoryId,
    rewriteRequirement,
    // 返回中间产物供UI展示
    agents: {
      extraction: extractedCard,
      research: marketResearch,
      integration: integratedCard,
    },
  };
}

export async function runRewriteSection(
  sections: ArticleSectionsV2,
  sectionName: "painPoint" | "transition" | "productIntro" | "brandIntro" | "ctaHook",
  categoryId?: string
) {
  const { data: settings } = await supabaseAdmin
    .from("app_settings").select("*").single();
  const apiKey = settings?.anthropic_api_key || settings?.deepseek_api_key || process.env.CLAUDE_API_KEY!;
  const provider = settings?.provider || "anthropic";
  const model = settings?.preferred_model || (provider === "deepseek" ? "deepseek-v4-pro" : "claude-sonnet-4-6");

  const { data: dnaRow } = await supabaseAdmin
    .from("style_dna").select("*").single();
  const globalDNA: StyleDNA = (dnaRow?.dna_json ?? {}) as StyleDNA;

  let styleDNA = globalDNA;
  if (categoryId) {
    const { data: catRow } = await supabaseAdmin
      .from("categories").select("style_dna, name").eq("id", categoryId).single();
    if (catRow?.style_dna) {
      const catDNA = catRow.style_dna as Partial<StyleDNA>;
      styleDNA = { ...globalDNA, ...catDNA } as StyleDNA;
    }
  }

  const currentContent = sections[sectionName];
  const anchorSections: Partial<ArticleSectionsV2> = { ...sections };
  delete (anchorSections as Record<string, string>)[sectionName];

  const newContent = await rewriteSection(
    sectionName, currentContent, anchorSections, styleDNA, model, apiKey, provider
  );

  return { ...sections, [sectionName]: newContent };
}
