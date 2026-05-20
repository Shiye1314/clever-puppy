import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { callLLM, extractJSON } from "@/lib/llm/client";
import { BRAND_EXTRACT_PROMPT, NICHE_CLASSIFY_PROMPT, STYLE_ANALYSIS_PROMPT } from "@/lib/agents/prompts";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const { content, category_type } = await request.json();
  if (!content) return NextResponse.json({ error: "请提供范文内容" }, { status: 400 });

  const mode = category_type === "brand" ? "brand" : "niche";

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

  // ============================================================
  // 品牌大类模式
  // ============================================================
  if (mode === "brand") {
    try {
      // Step 1: 从所有文章中提取品牌名
      const brandPrompt = BRAND_EXTRACT_PROMPT.replace(
        "{essays}",
        articles.map((a: string, i: number) => `[文章${i + 1}]\n${a.slice(0, 1500)}`).join("\n\n")
      );
      const brandText = await callLLM({
        prompt: brandPrompt,
        model: "deepseek-v4-pro",
        maxTokens: 128,
        provider: provider as any,
        apiKey,
      });
      const { brandName } = extractJSON(brandText) as { brandName: string };

      if (!brandName || brandName === "未识别") {
        return NextResponse.json({ error: "未能从文章中识别出品牌名，请在投喂内容开头注明品牌名" }, { status: 400 });
      }

      // Step 2: 查重 — 仅在品牌大类中查找
      const { data: existingBrands } = await supabaseAdmin
        .from("categories")
        .select("id, name, style_dna, writing_samples_count")
        .ilike("name", `%${brandName}%`);

      // 在品牌大类中匹配（style_dna->>category_type === "brand"）
      const existingBrand = (existingBrands ?? []).find(
        (b: Record<string, unknown>) =>
          ((b.style_dna as Record<string, unknown>)?.category_type as string) === "brand"
      );

      let categoryId: string;
      let isNew = false;

      if (existingBrand) {
        categoryId = existingBrand.id as string;
      } else {
        // 新建品牌大类
        const { data: newCat, error: createErr } = await supabaseAdmin
          .from("categories")
          .insert({
            name: brandName,
            description: `品牌自动识别：${brandName}`,
            style_dna: { category_type: "brand" },
          })
          .select()
          .single();

        if (createErr) {
          return NextResponse.json({ error: "创建品牌失败: " + createErr.message }, { status: 500 });
        }
        categoryId = newCat!.id;
        isNew = true;
      }

      // Step 3: 存入范文库（全部文章 → 同一个品牌分类）
      for (const article of articles) {
        await supabaseAdmin.from("writing_samples").insert({
          content: article,
          category_id: categoryId,
          source_type: "upload",
          title: article.slice(0, 50),
        });
      }

      // Step 4: 持续学习 — 加载该品牌的所有历史范文（旧+新），一起分析
      const { data: allSamples } = await supabaseAdmin
        .from("writing_samples")
        .select("content")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });

      const allArticles = allSamples?.map((s: { content: string }) => s.content) ?? [];
      const totalCount = allArticles.length;

      // Step 5: 风格DNA分析
      const stylePrompt = STYLE_ANALYSIS_PROMPT
        .replace(/\{count\}/g, String(totalCount))
        .replace(/\{categoryLabel\}/g, "品牌")
        .replace("{categoryName}", brandName)
        .replace("{essays}", allArticles.map((a: string, i: number) => `[范文${i + 1}]\n${a}`).join("\n\n"));

      const styleText = await callLLM({
        prompt: stylePrompt,
        model: "deepseek-v4-pro",
        maxTokens: 2048,
        provider: provider as any,
        apiKey,
      });
      const dnaJson = extractJSON(styleText);
      const mergedDna = { ...dnaJson, category_type: "brand" };

      await supabaseAdmin
        .from("categories")
        .update({
          style_dna: mergedDna,
          writing_samples_count: totalCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", categoryId);

      return NextResponse.json({
        mode: "brand",
        brandName,
        categoryId,
        isNewBrand: isNew,
        totalArticles: articles.length,
        totalAccumulated: totalCount,
        dnaUpdated: 1,
        categories: [{ categoryId, categoryName: brandName, articleCount: totalCount }],
      });
    } catch (err) {
      return NextResponse.json({ error: "品牌学习失败: " + (err as Error).message }, { status: 500 });
    }
  }

  // ============================================================
  // 细分大类模式（原有逻辑）
  // ============================================================
  const results: Array<{
    article: string;
    categoryName: string;
    categoryId: string;
    isNewCategory: boolean;
  }> = [];

  // Step 1: 逐篇分类
  for (const article of articles) {
    try {
      const classifyPrompt = NICHE_CLASSIFY_PROMPT.replace("{content}", article.slice(0, 2000));
      const classifyText = await callLLM({
        prompt: classifyPrompt,
        model: "deepseek-v4-pro",
        maxTokens: 256,
        provider: provider as any,
        apiKey,
      });
      const result = extractJSON(classifyText);
      const { categoryName } = result as { categoryName: string };

      // 检查是否已有该大类（仅在细分大类中查找）
      const { data: existingNiche } = await supabaseAdmin
        .from("categories")
        .select("id, name, style_dna")
        .ilike("name", `%${categoryName}%`);

      const matchedNiche = (existingNiche ?? []).find(
        (c: Record<string, unknown>) => {
          const dna = c.style_dna as Record<string, unknown>;
          const ct = dna?.category_type as string | undefined;
          // 匹配 niche 或无标记的（兼容旧数据）
          return ct === "niche" || !ct;
        }
      );

      let categoryId: string;
      let isNew = false;

      if (matchedNiche) {
        categoryId = matchedNiche.id as string;
      } else {
        const { data: newCat } = await supabaseAdmin
          .from("categories")
          .insert({
            name: categoryName,
            description: `自动识别：${categoryName}`,
            style_dna: { category_type: "niche" },
          })
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
      continue;
    }
  }

  // Step 2: 按大类分组，持续学习 — 每组加载所有历史范文
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
      // 加载该分类的所有历史范文（持续学习）
      const { data: allSamples } = await supabaseAdmin
        .from("writing_samples")
        .select("content")
        .eq("category_id", categoryId)
        .order("created_at", { ascending: false });

      const allArticles = allSamples?.map((s: { content: string }) => s.content) ?? [];
      const totalCount = allArticles.length;

      const stylePrompt = STYLE_ANALYSIS_PROMPT
        .replace(/\{count\}/g, String(totalCount))
        .replace(/\{categoryLabel\}/g, "品类")
        .replace("{categoryName}", categoryNames.get(categoryId) || "")
        .replace("{essays}", allArticles.map((a: string, i: number) => `[范文${i + 1}]\n${a}`).join("\n\n"));

      const styleText = await callLLM({
        prompt: stylePrompt,
        model: "deepseek-v4-pro",
        maxTokens: 2048,
        provider: provider as any,
        apiKey,
      });
      const dnaJson = extractJSON(styleText);
      const mergedDna = { ...dnaJson, category_type: "niche" };

      await supabaseAdmin
        .from("categories")
        .update({
          style_dna: mergedDna,
          writing_samples_count: totalCount,
          updated_at: new Date().toISOString(),
        })
        .eq("id", categoryId);

      dnaResults.push({
        categoryId,
        categoryName: categoryNames.get(categoryId) || "",
        articleCount: totalCount,
      });
    } catch {
      continue;
    }
  }

  return NextResponse.json({
    mode: "niche",
    totalArticles: articles.length,
    classified: results.length,
    categoriesFound: categoryGroups.size,
    dnaUpdated: dnaResults.length,
    categories: dnaResults,
  });
}
