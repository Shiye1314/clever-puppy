import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { extractProductCard } from "@/lib/agents/extractor";

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
    .from("app_settings").select("*").single();

  const apiKey = settings?.deepseek_api_key || settings?.anthropic_api_key || process.env.CLAUDE_API_KEY;
  const provider = settings?.provider || "deepseek";
  if (!apiKey) return NextResponse.json({ error: "未配置 API Key" }, { status: 500 });

  try {
    const card = await extractProductCard(
      content,
      settings?.extraction_model || "deepseek-v4-pro",
      apiKey,
      provider
    );
    return NextResponse.json(card);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
