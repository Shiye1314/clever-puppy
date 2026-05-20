import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 获取单个大类详情（含范文列表）
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { data: category, error } = await supabaseAdmin
    .from("categories")
    .select("*")
    .eq("id", id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: samples } = await supabaseAdmin
    .from("writing_samples")
    .select("id, title, content, created_at")
    .eq("category_id", id)
    .order("created_at", { ascending: false });

  return NextResponse.json({ ...category, writing_samples: samples ?? [] });
}

// 更新大类风格DNA
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const updates = await request.json();

  // 获取当前记录，保留 category_type
  const { data: current } = await supabaseAdmin
    .from("categories")
    .select("style_dna")
    .eq("id", id)
    .single();

  const allowedFields: Record<string, unknown> = {};
  if (updates.name) allowedFields.name = updates.name;
  if (updates.description !== undefined) allowedFields.description = updates.description;
  if (updates.style_dna) {
    const currentType = (current?.style_dna as Record<string, unknown>)?.category_type;
    allowedFields.style_dna = { ...updates.style_dna, category_type: currentType };
  }
  allowedFields.updated_at = new Date().toISOString();

  const { error } = await supabaseAdmin
    .from("categories")
    .update(allowedFields)
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}
