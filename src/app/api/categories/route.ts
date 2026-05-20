import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 列出所有大类（支持按类型过滤：brand=品牌大类, niche=细分大类）
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const type = searchParams.get("type"); // "brand" | "niche"

  let query = supabaseAdmin
    .from("categories")
    .select("*")
    .order("writing_samples_count", { ascending: false });

  // 无 type 参数: 返回所有分类
  if (!type) {
    const { data, error } = await query;
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json(data ?? []);
  }

  // 有 type 参数: 先尝试 JSONB 路径过滤
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("*")
    .order("writing_samples_count", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // 客户端过滤: 匹配 category_type，没有设置的默认归为 niche（旧数据兼容）
  const filtered = (data ?? []).filter((cat: Record<string, unknown>) => {
    const dna = (cat.style_dna as Record<string, unknown>) || {};
    const catType = dna.category_type as string | undefined;
    if (type === "niche") {
      // niche: 明确标记为 niche 的 + 没有标记的（兼容旧数据）
      return catType === "niche" || !catType;
    }
    // brand: 只返回明确标记为 brand 的
    return catType === "brand";
  });

  return NextResponse.json(filtered);
}

// 手动创建大类
export async function POST(request: Request) {
  const { name, description, category_type } = await request.json();
  if (!name) return NextResponse.json({ error: "大类名称必填" }, { status: 400 });

  const type = category_type || "niche";

  const { data, error } = await supabaseAdmin
    .from("categories")
    .insert({
      name,
      description: description || "",
      style_dna: { category_type: type },
    })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return NextResponse.json({ error: "该大类已存在" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

// 删除大类
export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "需要 id" }, { status: 400 });

  await supabaseAdmin.from("categories").delete().eq("id", id);
  return NextResponse.json({ success: true });
}
