import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { NEW_IDEA_PARSE_PROMPT } from "@/lib/agents/prompts";
import { callLLM, extractJSON } from "@/lib/llm/client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const { categoryId, rawIdea } = await request.json();

    if (!categoryId || !rawIdea) {
      return NextResponse.json(
        { error: "缺少必填参数：categoryId 和 rawIdea" },
        { status: 400 }
      );
    }

    // 1. 加载品牌分类及其 style_dna
    const { data: category, error: catError } = await supabaseAdmin
      .from("categories")
      .select("*")
      .eq("id", categoryId)
      .single();

    if (catError || !category) {
      return NextResponse.json(
        { error: "未找到该品牌分类" },
        { status: 404 }
      );
    }

    const styleDna = category.style_dna as Record<string, unknown> | null;
    const brandTemplate = styleDna?.brand_template as Record<string, unknown> | null;
    const variableSlots = brandTemplate?.variable_slots as Array<{
      slot_name: string;
      description: string;
      example: string;
    }> | null;

    if (!brandTemplate || !variableSlots || variableSlots.length === 0) {
      return NextResponse.json(
        { error: "该品牌尚未提取模板，请先积累3篇以上范文" },
        { status: 400 }
      );
    }

    // 2. 获取 API 配置
    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("provider, deepseek_api_key, anthropic_api_key")
      .single();

    const provider = (settings?.provider as string) || "deepseek";
    const apiKey =
      provider === "anthropic"
        ? (settings?.anthropic_api_key as string)
        : (settings?.deepseek_api_key as string);

    if (!apiKey) {
      return NextResponse.json(
        { error: `未配置 ${provider} API Key` },
        { status: 400 }
      );
    }

    // 3. 构建提示词
    const brandName = category.name as string;
    const prompt = NEW_IDEA_PARSE_PROMPT
      .replace(/\{brand_name\}/g, brandName)
      .replace(/\{variable_slots\}/g, JSON.stringify(variableSlots, null, 2))
      .replace(/\{user_raw_input\}/g, rawIdea);

    // 4. 调用 LLM
    const llmResponse = await callLLM({
      prompt,
      model: "deepseek-v4-pro",
      maxTokens: 1024,
      provider: provider as "anthropic" | "deepseek",
      apiKey,
    });

    // 5. 提取 JSON
    const slotValues = extractJSON(llmResponse);

    return NextResponse.json({
      slotValues,
      brandName,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
