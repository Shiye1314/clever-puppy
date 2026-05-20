import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { callLLM, extractJSON } from "@/lib/llm/client";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const CLASSIFY_PROMPT = `你是一个内容分类专家。请分析以下小红书文案，判断它属于什么品类/赛道。

文案内容：
{content}

请识别该文案的品类分类。规则：只归大类不细分，品类命名简短（2-4个字）。例如：
- 旅游
- 学科教育
- 公考
- 技能培训
- 升学考证
- 企业服务

输出格式（严格JSON）：
{
  "categoryName": "品类名",
  "confidence": 0.0-1.0
}`;

export async function POST(request: Request) {
  const { content } = await request.json();
  if (!content) return NextResponse.json({ error: "请提供内容" }, { status: 400 });

  // 获取API key
  const { data: settings } = await supabaseAdmin
    .from("app_settings").select("*").single();
  const apiKey = settings?.deepseek_api_key || settings?.anthropic_api_key || process.env.CLAUDE_API_KEY;
  const provider = settings?.provider || "deepseek";
  if (!apiKey) return NextResponse.json({ error: "未配置 API Key" }, { status: 500 });

  try {
    // 调用 LLM 做分类
    const prompt = CLASSIFY_PROMPT.replace("{content}", content.slice(0, 2000));
    const text = await callLLM({
      prompt,
      model: "deepseek-v4-pro",
      maxTokens: 256,
      provider: provider as any,
      apiKey,
    });
    const result = extractJSON(text);

    // 检查是否已存在该大类
    const { data: existing } = await supabaseAdmin
      .from("categories")
      .select("id, name")
      .ilike("name", `%${result.categoryName}%`)
      .single();

    if (existing) {
      return NextResponse.json({
        categoryId: existing.id,
        categoryName: existing.name,
        isNew: false,
      });
    }

    // 自动创建新大类（标记为细分大类）
    const { data: newCategory, error: createError } = await supabaseAdmin
      .from("categories")
      .insert({
        name: result.categoryName,
        description: `自动识别：${result.categoryName}`,
        style_dna: { category_type: "niche" },
      })
      .select()
      .single();

    if (createError) {
      return NextResponse.json({ error: createError.message }, { status: 500 });
    }

    return NextResponse.json({
      categoryId: newCategory.id,
      categoryName: newCategory.name,
      isNew: true,
    });
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
