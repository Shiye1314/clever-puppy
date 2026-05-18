import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const text = formData.get("text") as string | null;

  if (file) {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!["txt", "pdf", "docx", "doc", "pptx"].includes(ext)) {
      return NextResponse.json({ error: `不支持的文件格式: .${ext}` }, { status: 400 });
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    const bytes = await file.arrayBuffer();
    const filePath = `uploads/${Date.now()}-${file.name}`;
    await supabase.storage.from("documents").upload(filePath, bytes);

    const { data: urlData } = supabase.storage.from("documents").getPublicUrl(filePath);

    return NextResponse.json({ url: urlData.publicUrl, fileName: file.name, fileType: ext });
  }

  if (text) {
    return NextResponse.json({ text, sourceType: "paste" });
  }

  return NextResponse.json({ error: "请上传文件或粘贴文字" }, { status: 400 });
}
