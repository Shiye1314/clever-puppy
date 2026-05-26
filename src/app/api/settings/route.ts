import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET() {
  // 先查是否有记录，没有则创建
  let { data } = await supabaseAdmin.from("app_settings").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (!data) {
    const { data: inserted } = await supabaseAdmin
      .from("app_settings")
      .insert({ id: "00000000-0000-0000-0000-000000000001" })
      .select("*")
      .single();
    data = inserted;
  }

  return NextResponse.json({
    preferredModel: data?.preferred_model,
    extractionModel: data?.extraction_model,
    hasAnthropicKey: !!data?.anthropic_api_key,
    hasDeepseekKey: !!data?.deepseek_api_key,
    hasEmbeddingKey: !!data?.embedding_api_key,
    provider: data?.provider || "deepseek",
  });
}

export async function PUT(request: Request) {
  const body = await request.json();
  const updates: Record<string, string> = {};

  if (body.anthropicApiKey) updates.anthropic_api_key = body.anthropicApiKey;
  if (body.deepseekApiKey) updates.deepseek_api_key = body.deepseekApiKey;
  if (body.embeddingApiKey) updates.embedding_api_key = body.embeddingApiKey;
  if (body.preferredModel) updates.preferred_model = body.preferredModel;
  if (body.extractionModel) updates.extraction_model = body.extractionModel;
  if (body.provider) updates.provider = body.provider;

  // 先查是否有记录
  const { data: existing } = await supabaseAdmin
    .from("app_settings").select("id").order("created_at", { ascending: false }).limit(1).maybeSingle();

  if (existing) {
    // 更新
    const { error } = await supabaseAdmin
      .from("app_settings")
      .update(updates)
      .eq("id", existing.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  } else {
    // 插入新记录
    const { error } = await supabaseAdmin
      .from("app_settings")
      .insert({ id: "00000000-0000-0000-0000-000000000001", ...updates });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
