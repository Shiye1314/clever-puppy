import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { REWRITE_GENERATE_PROMPT } from "@/lib/agents/prompts";
import { callLLM } from "@/lib/llm/client";
import type { ArticleSectionsV2 } from "@/lib/agents/generator";
import type { StyleDNA } from "@/lib/types";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  const { categoryId, slotValues } = await request.json();

  if (!categoryId || !slotValues) {
    return NextResponse.json(
      { error: "缺少必填参数 categoryId 或 slotValues" },
      { status: 400 }
    );
  }

  try {
    // 1. 获取应用配置（API Key 和 provider）
    const { data: settings } = await supabaseAdmin
      .from("app_settings")
      .select("*")
      .single();
    const apiKey =
      settings?.deepseek_api_key ||
      settings?.anthropic_api_key ||
      process.env.CLAUDE_API_KEY!;
    const provider = settings?.provider || "deepseek";

    // 2. 获取全局风格DNA
    const { data: globalDnaRow } = await supabaseAdmin
      .from("style_dna")
      .select("*")
      .single();
    const globalDNA: StyleDNA = (globalDnaRow?.dna_json ?? {}) as StyleDNA;

    // 3. 获取品牌分类的风格DNA（含 brand_template + category_type）
    const { data: catRow } = await supabaseAdmin
      .from("categories")
      .select("style_dna, name")
      .eq("id", categoryId)
      .single();

    if (!catRow?.style_dna) {
      return NextResponse.json(
        { error: "该分类没有风格DNA数据" },
        { status: 400 }
      );
    }

    const catStyleRaw = catRow.style_dna as Record<string, unknown>;

    // 4. 提取 brand_template，并将分类DNA（排除模板和类型标记）与全局DNA合并
    const brandTemplate = catStyleRaw.brand_template;
    if (!brandTemplate) {
      return NextResponse.json(
        { error: "该分类没有品牌模板（brand_template），请先完成品牌学习" },
        { status: 400 }
      );
    }

    const { brand_template: _, category_type: __, ...catDNAFields } = catStyleRaw;

    // 合并全局DNA + 分类DNA（排除 brand_template 和 category_type）
    const mergedDNA: StyleDNA = {
      ...globalDNA,
      ...catDNAFields,
    } as StyleDNA;

    // 合并 title_formulas：分类优先，全局补充
    mergedDNA.title_formulas = [
      ...new Set([
        ...((catDNAFields.title_formulas as string[]) || []),
        ...(globalDNA.title_formulas || []),
      ]),
    ];

    // 合并 keywords_high_freq：分类优先，全局补充
    mergedDNA.keywords_high_freq = [
      ...new Set([
        ...((catDNAFields.keywords_high_freq as string[]) || []),
        ...(globalDNA.keywords_high_freq || []),
      ]),
    ];

    // 5. 获取该品牌的参考范文（最近2篇）
    const { data: writingSamples } = await supabaseAdmin
      .from("writing_samples")
      .select("content")
      .eq("category_id", categoryId)
      .order("created_at", { ascending: false })
      .limit(2);
    const referenceSamples =
      writingSamples?.map((s: { content: string }) => s.content).join("\n\n") ||
      "无参考范文";

    // 6. 获取违禁词
    const { data: banned } = await supabaseAdmin
      .from("banned_words")
      .select("word");
    const bannedWords =
      banned?.map((b: { word: string }) => b.word).join("、") || "无";

    // 7. 构建 REWRITE_GENERATE_PROMPT
    const prompt = REWRITE_GENERATE_PROMPT
      .replace("{styleDNA}", JSON.stringify(mergedDNA, null, 2))
      .replace("{brandTemplate}", JSON.stringify(brandTemplate, null, 2))
      .replace("{slotValues}", JSON.stringify(slotValues, null, 2))
      .replace("{referenceSamples}", referenceSamples)
      .replace("{bannedWords}", bannedWords);

    // 8. 调用 LLM 生成
    const text = await callLLM({
      prompt,
      model: "deepseek-v4-pro",
      maxTokens: 4096,
      provider: provider as "anthropic" | "deepseek",
      apiKey,
      system: "你是一个小红书爆文写手。按提示词的格式要求输出完整文章内容。",
    });

    // 9. 解析响应
    const sections = parseSections(text);

    // 10. 保存结果到 tasks 表
    const { data: task, error: taskError } = await supabaseAdmin
      .from("tasks")
      .insert({
        task_type: "rewrite",
        module: "rewrite",
        title: `洗稿生成 - ${catRow.name || "未知品牌"}`,
        input_data: { categoryId, slotValues },
        output_data: sections,
        product_card: null,
        metadata: {
          brand_template_summary: {
            brand: (brandTemplate as Record<string, unknown>)?.brand,
          },
          category_name: catRow.name,
        },
        status: "completed",
      })
      .select()
      .single();

    if (taskError) {
      console.error("保存任务失败:", taskError.message);
    }

    // 11. 返回结果
    return NextResponse.json({
      sections,
      taskId: task?.id ?? "",
    });
  } catch (err) {
    return NextResponse.json(
      { error: (err as Error).message },
      { status: 500 }
    );
  }
}

/** 从 LLM 输出中解析五段式文章（与 generator.ts 中的实现一致） */
function parseSections(text: string): ArticleSectionsV2 {
  const m = (name: string) => {
    const match = text.match(
      new RegExp(
        `<section name="${name}">\\s*([\\s\\S]*?)\\s*</section>`,
        "i"
      )
    );
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
