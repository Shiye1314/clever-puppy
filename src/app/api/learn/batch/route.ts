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

请识别该文案的品类分类。分类规则：
1. 只归类到大类，不要细分。比如：公务员考试/国考/省考→都归「公考」；数学/英语/语文等学科→都归「学科教育」；国内游/出境游/定制游→都归「旅游」；烘焙/咖啡/西点→都归「技能培训」；法考/考研/留学→都归「升学考证」
2. 品类命名简短（2-4个字），例如：
- 旅游
- 学科教育
- 公考
- 技能培训
- 升学考证
- 企业服务

输出格式（严格JSON）：
{
  "categoryName": "品类名"
}`;

const STYLE_ANALYSIS_PROMPT = `你是一个写作风格分析师。请分析以下{count}篇同一品类（{categoryName}）的爆文范文，提炼出该品类下的写作DNA档案。

{essays}

请从以下维度分析并输出 JSON：

{
  "openings": {
    "patterns": ["该品类常见的开头句式模板"],
    "styles": ["情绪引入式/好奇式/数字提纲式等"]
  },
  "closings": {
    "patterns": ["该品类常见的结尾句式"],
    "interaction_triggers": true/false
  },
  "paragraph_rhythm": {
    "short_sentence_ratio": 0.0-1.0,
    "exclamation_density": "low/medium/high",
    "line_break_frequency": "low/medium/high"
  },
  "emoji_usage": {
    "frequency": "low/medium/high",
    "preferred": ["该品类常用emoji"],
    "position": "paragraph_start/inline/mixed"
  },
  "pronouns": {
    "first_person": "我/俺",
    "second_person": "你/姐妹们/宝子们",
    "style": "闺蜜口吻/专家口吻/朋友分享"
  },
  "title_formulas": ["该品类标题公式"],
  "keywords_high_freq": ["该品类高频词"],
  "tone": "该品类整体语气"
}`;

export async function POST(request: Request) {
  const { content } = await request.json();
  if (!content) return NextResponse.json({ error: "请提供范文内容" }, { status: 400 });

  // 获取 API key
  const { data: settings } = await supabaseAdmin
    .from("app_settings").select("*").single();
  const apiKey = settings?.deepseek_api_key || settings?.anthropic_api_key || process.env.CLAUDE_API_KEY;
  const provider = settings?.provider || "deepseek";
  if (!apiKey) return NextResponse.json({ error: "未配置 API Key" }, { status: 500 });

  // 按 --- 分割文章
  const articles = content
    .split(/---+/)
    .map((a: string) => a.trim())
    .filter((a: string) => a.length > 50);

  if (articles.length === 0) {
    return NextResponse.json({ error: "未检测到有效文章（每篇需>50字，用 --- 分隔）" }, { status: 400 });
  }

  const results: Array<{
    article: string;
    categoryName: string;
    categoryId: string;
    isNewCategory: boolean;
  }> = [];

  // Step 1: 逐篇分类
  for (const article of articles) {
    try {
      const classifyPrompt = CLASSIFY_PROMPT.replace("{content}", article.slice(0, 2000));
      const classifyText = await callLLM({
        prompt: classifyPrompt,
        model: "deepseek-v4-pro",
        maxTokens: 256,
        provider: provider as any,
        apiKey,
      });
      const result = extractJSON(classifyText);
      const { categoryName } = result as { categoryName: string };

      // 检查是否已有该大类
      const { data: existing } = await supabaseAdmin
        .from("categories")
        .select("id, name")
        .ilike("name", `%${categoryName}%`)
        .single();

      let categoryId: string;
      let isNew = false;

      if (existing) {
        categoryId = existing.id;
      } else {
        const { data: newCat } = await supabaseAdmin
          .from("categories")
          .insert({ name: categoryName, description: `自动识别：${categoryName}` })
          .select()
          .single();
        categoryId = newCat!.id;
        isNew = true;
      }

      // 存入范文库
      await supabaseAdmin.from("writing_samples").insert({
        content: article,
        category_id: categoryId,
        source_type: "upload",
        title: article.slice(0, 50),
      });

      results.push({ article: article.slice(0, 80), categoryName, categoryId, isNewCategory: isNew });
    } catch {
      // 单篇失败不影响整体
      continue;
    }
  }

  // Step 2: 按大类分组，提炼每个大类的风格DNA
  const categoryGroups = new Map<string, string[]>();
  const categoryNames = new Map<string, string>();

  for (const r of results) {
    if (!categoryGroups.has(r.categoryId)) {
      categoryGroups.set(r.categoryId, []);
      categoryNames.set(r.categoryId, r.categoryName);
    }
    categoryGroups.get(r.categoryId)!.push(r.article);
  }

  const dnaResults: Array<{ categoryId: string; categoryName: string; articleCount: number }> = [];

  for (const [categoryId, categoryArticles] of categoryGroups) {
    if (categoryArticles.length < 1) continue;

    try {
      // 用该分类的所有文章分析DNA
      const stylePrompt = STYLE_ANALYSIS_PROMPT
        .replace("{count}", String(categoryArticles.length))
        .replace("{categoryName}", categoryNames.get(categoryId) || "")
        .replace("{essays}", categoryArticles.map((a, i) => `[范文${i + 1}]\n${a}`).join("\n\n"));

      const styleText = await callLLM({
        prompt: stylePrompt,
        model: "deepseek-v4-pro",
        maxTokens: 2048,
        provider: provider as any,
        apiKey,
      });
      const dnaJson = extractJSON(styleText);

      // 更新大类DNA和计数
      await supabaseAdmin
        .from("categories")
        .update({
          style_dna: dnaJson,
          writing_samples_count: categoryArticles.length,
          updated_at: new Date().toISOString(),
        })
        .eq("id", categoryId);

      dnaResults.push({
        categoryId,
        categoryName: categoryNames.get(categoryId) || "",
        articleCount: categoryArticles.length,
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json({
    totalArticles: articles.length,
    classified: results.length,
    categoriesFound: categoryGroups.size,
    dnaUpdated: dnaResults.length,
    categories: dnaResults,
  });
}
