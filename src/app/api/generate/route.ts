import { NextResponse } from "next/server";
import { runGeneratePipeline } from "@/lib/agents/pipeline";

export async function POST(request: Request) {
  const { content, productCardOverride, categoryId, rewriteRequirement } = await request.json();

  if (!content) {
    return NextResponse.json({ error: "请提供内容" }, { status: 400 });
  }

  try {
    const result = await runGeneratePipeline(content, productCardOverride, categoryId, rewriteRequirement);
    return NextResponse.json(result);
  } catch (err) {
    return NextResponse.json({ error: (err as Error).message }, { status: 500 });
  }
}
