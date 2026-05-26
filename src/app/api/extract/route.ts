import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractProductCard } from "@/lib/agents/extractor";
import { runMarketResearch } from "@/lib/agents/researcher";
import { integrateBrief } from "@/lib/agents/integrator";
import type { ProductCard } from "@/lib/types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const { content } = await request.json();

  if (!content) {
    return NextResponse.json({ error: "请提供内容" }, { status: 400 });
  }

  const { data: settings } = await supabaseAdmin
    .from("app_settings").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();

  const apiKey = settings?.deepseek_api_key || settings?.anthropic_api_key || process.env.CLAUDE_API_KEY;
  const provider = settings?.provider || "deepseek";
  const generationModel = settings?.preferred_model || (provider === "deepseek" ? "deepseek-v4-pro" : "claude-sonnet-4-6");
  const extractionModel = settings?.extraction_model || (provider === "deepseek" ? "deepseek-v4-pro" : "claude-haiku-4-5");

  if (!apiKey) return NextResponse.json({ error: "未配置 API Key" }, { status: 500 });

  try {
    const analysisText = content.slice(0, 3000);

    // 并行：信息提取 + 市场分析
    const [extractedCard, marketResearch] = await Promise.all([
      extractProductCard(content, extractionModel, apiKey, provider).catch((e) => {
        throw new Error(`[信息提取Agent] ${(e as Error).message}`);
      }),
      runMarketResearch(analysisText, apiKey, generationModel, provider).catch((e) => {
        throw new Error(`[市场研究Agent] ${(e as Error).message}`);
      }),
    ]);

    // 构建原始信息卡
    const rawCard: ProductCard = {
      productName: (extractedCard.productName as string) || "",
      sellingPoints: (extractedCard.sellingPoints as string[]) || [],
      targetPainPoint: (extractedCard.targetPainPoint as string) || "",
      usageScenario: (extractedCard.usageScenario as string) || "",
      competitorDiff: (extractedCard.competitorDiff as string) || "",
      brandTone: (extractedCard.brandTone as string) || "",
    };

    // 信息整合
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

    return NextResponse.json({
      card,
      agents: {
        extraction: extractedCard,
        research: marketResearch,
        integration: integratedCard,
      },
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
