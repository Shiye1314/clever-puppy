import { NextResponse } from "next/server";
import { runRewriteSection } from "@/lib/agents/pipeline";

export async function POST(request: Request) {
  const { sections, sectionName, categoryId } = await request.json();

  if (!sections || !sectionName) {
    return NextResponse.json({ error: "缺少参数" }, { status: 400 });
  }

  try {
    const updated = await runRewriteSection(sections, sectionName, categoryId);
    return NextResponse.json(updated);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
