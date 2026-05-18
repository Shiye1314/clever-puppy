import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 列出所有大类
export async function GET() {
  const { data, error } = await supabaseAdmin
    .from("categories")
    .select("*")
    .order("writing_samples_count", { ascending: false });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data ?? []);
}

// 手动创建大类
export async function POST(request: Request) {
  const { name, description } = await request.json();
  if (!name) return NextResponse.json({ error: "大类名称必填" }, { status: 400 });

  const { data, error } = await supabaseAdmin
    .from("categories")
    .insert({ name, description })
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
