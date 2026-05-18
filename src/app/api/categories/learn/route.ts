import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { callLLM, extractJSON } from "@/lib/llm/client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const LEARN_PROMPT = `你是一个写作风格学习助手。请基于当前风格DNA和新文章，更新风格DNA档案。

【当前大类风格DNA】
{currentDNA}

【新定稿文章】
{newArticle}

任务：
分析新文章中的写作特征，微调风格DNA：
1. 如果发现新的开头句式模板，追加到 openings.patterns
2. 如果发现新的结尾句式，追加到 closings.patterns
3. 更新 keywords_high_freq（合并新旧高频词，去重，保留频率最高的10个）
4. 如果整体语气有变化，更新 tone 字段
5. 更新 emoji_usage.preferred（合并新旧emoji，去重）
6. 其他字段保持不变，除非有明显的风格变化

只输出更新后的完整风格DNA JSON，不要额外说明。`;

export async function POST(request: Request) {
  const { categoryId, articleContent } = await request.json();
  if (!categoryId || !articleContent) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  // 获取大类当前DNA
  const { data: category } = await supabaseAdmin
    .from("categories")
    .select("style_dna")
    .eq("id", categoryId)
    .single();

  if (!category) return NextResponse.json({ error: "大类不存在" }, { status: 404 });

  // 获取API key和供应商配置
  const { data: settings } = await supabaseAdmin
    .from("app_settings").select("*").single();
  const apiKey = settings?.deepseek_api_key || settings?.anthropic_api_key || process.env.CLAUDE_API_KEY;
  const provider = settings?.provider || "deepseek";
  if (!apiKey) return NextResponse.json({ error: "未配置 API Key" }, { status: 500 });

  try {
    const prompt = LEARN_PROMPT
      .replace("{currentDNA}", JSON.stringify(category.style_dna, null, 2))
      .replace("{newArticle}", articleContent.slice(0, 3000));

    const text = await callLLM({
      prompt,
      model: "claude-haiku-4-5",
      maxTokens: 2048,
      provider: provider as "anthropic" | "deepseek",
      apiKey,
    });

    const updatedDNA = extractJSON(text);

    // 获取当前计数并递增
    const { data: currentCat } = await supabaseAdmin
      .from("categories")
      .select("writing_samples_count")
      .eq("id", categoryId)
      .single();

    // 更新大类DNA
    await supabaseAdmin
      .from("categories")
      .update({
        style_dna: updatedDNA,
        writing_samples_count: (currentCat?.writing_samples_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq("id", categoryId);

    return NextResponse.json({
      success: true,
      updatedDNA,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
