import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { generateArticle } from "@/lib/agents/generator";
import { extractProductCard } from "@/lib/agents/extractor";
import { runMarketResearch } from "@/lib/agents/researcher";
import { integrateBrief } from "@/lib/agents/integrator";
import type { ProductCard, StyleDNA } from "@/lib/types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const { content, productCard, categoryId, rewriteRequirement } = await request.json();

  // 必须有内容或已有信息卡
  if (!content && (!productCard || !productCard.productName)) {
    return NextResponse.json({ error: "请提供素材内容或先完成信息整理" }, { status: 400 });
  }

  try {
    // 1. 获取 API 配置
    const { data: settings } = await supabaseAdmin
      .from("app_settings").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();
    const apiKey = settings?.deepseek_api_key || settings?.anthropic_api_key || process.env.CLAUDE_API_KEY!;
    const provider = settings?.provider || "deepseek";
    const generationModel = settings?.preferred_model || (provider === "deepseek" ? "deepseek-v4-pro" : "claude-sonnet-4-6");
    const extractionModel = settings?.extraction_model || (provider === "deepseek" ? "deepseek-v4-pro" : "claude-haiku-4-5");

    // 2. 确定信息卡 —— 如果前端已整理好就跳过前三步
    let card: ProductCard;
    let agents: Record<string, unknown> | undefined;

    if (productCard?.productName) {
      // 快速路径：前端已经做完提取+研究+整合
      card = productCard as ProductCard;
    } else {
      // 完整路径：当场跑完提取→研究→整合
      const analysisText = content.slice(0, 3000);

      const [extractedCard, marketResearch] = await Promise.all([
        extractProductCard(content, extractionModel, apiKey, provider).catch((e) => {
          throw new Error(`[信息提取Agent] ${(e as Error).message}`);
        }),
        runMarketResearch(analysisText, apiKey, generationModel, provider).catch((e) => {
          throw new Error(`[市场研究Agent] ${(e as Error).message}`);
        }),
      ]);

      const rawCard: ProductCard = {
        productName: (extractedCard.productName as string) || "",
        sellingPoints: (extractedCard.sellingPoints as string[]) || [],
        targetPainPoint: (extractedCard.targetPainPoint as string) || "",
        usageScenario: (extractedCard.usageScenario as string) || "",
        competitorDiff: (extractedCard.competitorDiff as string) || "",
        brandTone: (extractedCard.brandTone as string) || "",
      };

      const integratedCard = await integrateBrief(rawCard, marketResearch, apiKey, extractionModel, provider).catch((e) => {
        throw new Error(`[信息整合Agent] ${(e as Error).message}`);
      });

      card = {
        productName: integratedCard.productName || rawCard.productName,
        sellingPoints: integratedCard.sellingPoints || rawCard.sellingPoints,
        targetPainPoint: integratedCard.targetPainPoint || rawCard.targetPainPoint,
        usageScenario: integratedCard.usageScenario || rawCard.usageScenario,
        competitorDiff: integratedCard.competitorDiff || rawCard.competitorDiff,
        brandTone: integratedCard.brandTone || rawCard.brandTone,
      };

      agents = { extraction: extractedCard, research: marketResearch, integration: integratedCard };
    }

    // 3. 获取全局风格DNA
    const { data: dnaRow } = await supabaseAdmin
      .from("style_dna").select("*").single();
    const globalDNA: StyleDNA = (dnaRow?.dna_json ?? {}) as StyleDNA;

    // 4. 合并品类风格DNA
    let styleDNA = globalDNA;
    if (categoryId) {
      const { data: catRow } = await supabaseAdmin
        .from("categories").select("style_dna, name, writing_samples_count")
        .eq("id", categoryId).single();
      if (catRow?.style_dna) {
        const catDNA = catRow.style_dna as Partial<StyleDNA>;
        styleDNA = { ...globalDNA, ...catDNA } as StyleDNA;
        styleDNA.title_formulas = [
          ...new Set([...(catDNA.title_formulas || []), ...(globalDNA.title_formulas || [])])
        ];
        styleDNA.keywords_high_freq = [
          ...new Set([...(catDNA.keywords_high_freq || []), ...(globalDNA.keywords_high_freq || [])])
        ];
      }
    }

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
      card,
      styleDNA,
      referenceText,
      bannedWords,
      generationModel,
      apiKey,
      provider,
      rewriteRequirement || ""
    );

    return NextResponse.json({
      sections,
      card,
      styleDNA,
      categoryId,
      rewriteRequirement,
      agents,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
