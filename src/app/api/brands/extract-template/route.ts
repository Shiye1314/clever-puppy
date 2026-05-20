import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { callLLM, extractJSON } from "@/lib/llm/client";
import { BRAND_TEMPLATE_EXTRACT_PROMPT } from "@/lib/agents/prompts";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const { categoryId } = await request.json();
  if (!categoryId) {
    return NextResponse.json({ error: "缺少参数 categoryId" }, { status: 400 });
  }

  // 加载该大类下所有范文
  const { data: samples, error: samplesError } = await supabaseAdmin
    .from("writing_samples")
    .select("id, title, content")
    .eq("category_id", categoryId)
    .order("created_at", { ascending: false });

  if (samplesError) {
    return NextResponse.json({ error: samplesError.message }, { status: 500 });
  }

  if (!samples || samples.length < 3) {
    return NextResponse.json(
      { error: `范文数量不足，当前 ${samples?.length ?? 0} 篇，至少需要 3 篇` },
      { status: 400 }
    );
  }

  // 获取大类信息（含品牌名）
  const { data: category } = await supabaseAdmin
    .from("categories")
    .select("name, style_dna, writing_samples_count")
    .eq("id", categoryId)
    .single();

  if (!category) {
    return NextResponse.json({ error: "大类不存在" }, { status: 404 });
  }

  // 获取 API key 和供应商配置
  const { data: settings } = await supabaseAdmin
    .from("app_settings")
    .select("*")
    .single();

  const apiKey =
    settings?.deepseek_api_key ||
    settings?.anthropic_api_key ||
    process.env.CLAUDE_API_KEY;
  const provider = settings?.provider || "deepseek";

  if (!apiKey) {
    return NextResponse.json({ error: "未配置 API Key" }, { status: 500 });
  }

  try {
    // 拼接所有范文
    const essays = samples
      .map(
        (s, i) =>
          `[范文${i + 1}] ${s.title ?? "无标题"}\n${s.content ?? ""}`
      )
      .join("\n\n===\n\n");

    const brandName = category.name || "未知品牌";

    const prompt = BRAND_TEMPLATE_EXTRACT_PROMPT.replace(
      "{brand_name}",
      brandName
    ) + `\n\n以下为${brandName}的爆文范文：\n\n${essays}`;

    const text = await callLLM({
      prompt,
      model: "deepseek-v4-pro",
      maxTokens: 4096,
      provider: provider as "anthropic" | "deepseek",
      apiKey,
    });

    const brandTemplate = extractJSON(text);

    // 合并到现有 style_dna，保留 category_type
    const existingDna = (category.style_dna ?? {}) as Record<string, unknown>;
    const existingType = existingDna.category_type || "niche";

    const mergedDna = {
      ...existingDna,
      brand_template: brandTemplate,
      category_type: existingType,
    };

    await supabaseAdmin
      .from("categories")
      .update({
        style_dna: mergedDna,
        writing_samples_count: samples.length,
        updated_at: new Date().toISOString(),
      })
      .eq("id", categoryId);

    return NextResponse.json({
      success: true,
      brandTemplate,
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}
