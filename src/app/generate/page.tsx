"use client";

import { useState } from "react";
import UploadZone from "@/components/generate/UploadZone";
import ProductCardForm from "@/components/generate/ProductCardForm";
import ArticleResult from "@/components/generate/ArticleResult";
import CategorySelector from "@/components/generate/CategorySelector";
import AgentStatus from "@/components/generate/AgentStatus";
import EmpowerButton from "@/components/ui/EmpowerButton";
import type { ProductCard } from "@/lib/types";
import type { ArticleSectionsV2 } from "@/lib/agents/generator";
import { supabase } from "@/lib/supabase/client";

const emptyCard: ProductCard = {
  productName: "",
  sellingPoints: [],
  targetPainPoint: "",
  usageScenario: "",
  competitorDiff: "",
};

const emptySections: ArticleSectionsV2 = {
  painPoint: "", transition: "", productIntro: "", brandIntro: "", ctaHook: "",
};

export default function GeneratePage() {
  const [rawContent, setRawContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [card, setCard] = useState<ProductCard>(emptyCard);
  const [sections, setSections] = useState<ArticleSectionsV2>(emptySections);
  const [extracting, setExtracting] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [rewriting, setRewriting] = useState<string | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("");
  const [agentStatus, setAgentStatus] = useState<{
    extraction: Record<string, unknown>;
    research: Record<string, unknown>;
    integration: Record<string, unknown>;
  } | null>(null);

  const handleTextReady = (text: string, name?: string) => {
    setRawContent(text);
    if (name) setFileName(name);
  };

  const handleExtract = async () => {
    if (!rawContent) return;
    setExtracting(true);
    setAgentStatus(null);
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: rawContent }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCard({
        productName: data.productName || "",
        sellingPoints: data.sellingPoints || [],
        targetPainPoint: data.targetPainPoint || "",
        usageScenario: data.usageScenario || "",
        competitorDiff: data.competitorDiff || "",
      });
    } catch (err) {
      alert("提取失败: " + (err as Error).message);
    }
    setExtracting(false);
  };

  const handleGenerate = async () => {
    setGenerating(true);
    setAgentStatus(null);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: rawContent, productCardOverride: card, categoryId: selectedCategory || undefined }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (data.agents) {
        setAgentStatus(data.agents);
      } else {
        setAgentStatus(null);
      }
      setSections(data.sections);
      setCard(data.card);

      // 保存历史
      const { data: task } = await supabase.from("tasks").insert({
        task_type: "generate",
        module: "generate",
        title: card.productName || fileName || "素材生成",
        input_data: { rawContent, fileName, productCard: card },
        product_card: data.card,
        output_data: data.sections,
        metadata: {},
        category_id: selectedCategory || null,
      }).select().single();

      if (task) setCurrentTaskId(task.id);

      // 自动分类
      if (!selectedCategory && data.card.productName) {
        fetch("/api/categories/classify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: `${data.card.productName} ${data.card.sellingPoints?.join(" ")} ${data.sections?.painPoint || ""}`
          }),
        }).then((r) => r.json()).then((c) => {
          if (c.categoryId && !c.error) setSelectedCategory(c.categoryId);
        }).catch(() => {});
      }
    } catch (err) {
      alert("生成失败: " + (err as Error).message);
    }
    setGenerating(false);
  };

  const handleRewriteSection = async (name: "painPoint" | "transition" | "productIntro" | "brandIntro" | "ctaHook") => {
    setRewriting(name);
    try {
      const res = await fetch("/api/rewrite-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections, sectionName: name, categoryId: selectedCategory || undefined }),
      });
      const updated = await res.json();
      setSections(updated);

      // 更新历史
      if (currentTaskId) {
        await supabase.from("tasks").update({
          output_data: updated,
          updated_at: new Date().toISOString(),
        }).eq("id", currentTaskId);
      }
    } catch (err) {
      alert("重写失败: " + (err as Error).message);
    }
    setRewriting(null);
  };

  const handleSave = async () => {
    if (currentTaskId) return;

    const { data: task } = await supabase.from("tasks").insert({
      task_type: "generate",
      module: "generate",
      title: card.productName || fileName || "素材生成",
      input_data: { rawContent, fileName, productCard: card },
      product_card: card,
      output_data: sections,
      metadata: {},
      category_id: selectedCategory || null,
    }).select().single();

    if (task) setCurrentTaskId(task.id);
    alert("已保存到历史记录");
  };

  return (
    <div className="flex h-[calc(100vh-135px)]">
      {/* 操作区 40% */}
      <div className="w-[40%] min-w-[440px] border-r border-border overflow-y-auto scrollbar-hide p-10 space-y-10">
        {/* Step 1 */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-4 rounded-full bg-amber flex-shrink-0" />
            <span className="text-[32px] font-medium text-ink">上传资料</span>
          </div>
          <div className="rounded-xl bg-surface border border-border p-5 space-y-4">
            <UploadZone onTextReady={handleTextReady} />
            <button
              onClick={handleExtract}
              disabled={!rawContent || extracting}
              className="text-[32px] text-amber hover:text-amber/80 transition-colors disabled:opacity-30 font-medium"
            >
              {extracting ? "提炼中..." : "整理信息 →"}
            </button>
          </div>
        </section>

        {/* Step 2 */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <span className="w-1 h-4 rounded-full bg-amber flex-shrink-0" />
            <span className="text-[32px] font-medium text-ink">产品信息卡</span>
          </div>
          <div className="rounded-xl bg-surface border border-border p-5 space-y-6">
            <ProductCardForm card={card} onChange={setCard} loading={extracting} />

            <div className="flex items-center gap-2 pt-2">
              <span className="w-1 h-4 rounded-full bg-amber flex-shrink-0" />
              <span className="text-[20px] font-medium text-muted/70">写作风格</span>
            </div>
            <CategorySelector value={selectedCategory} onChange={setSelectedCategory} />

            <div className="pt-2">
              <EmpowerButton onClick={handleGenerate} loading={generating} />
            </div>
          </div>
        </section>
      </div>

      {/* 结果区 60% */}
      <div className="w-[60%] overflow-y-auto p-10">
        <div className="flex items-center gap-2 mb-6">
          <span className="w-1 h-4 rounded-full bg-amber flex-shrink-0" />
          <span className="text-[32px] font-medium text-ink">爆文输出</span>
        </div>

        <AgentStatus agents={agentStatus} generating={generating} />

        {sections.painPoint || sections.transition || sections.productIntro ? (
          <>
            <ArticleResult
              sections={sections}
              onChange={setSections}
              onRewriteSection={handleRewriteSection}
              loading={rewriting}
            />
            <button
              onClick={handleSave}
              className="mt-8 text-[32px] text-muted/60 hover:text-amber transition-colors font-medium"
            >
              保存到历史
            </button>
          </>
        ) : (
          <div className="rounded-xl bg-surface border border-border p-16 text-center mt-4">
            <p className="text-[20px] text-muted/40 leading-relaxed">
              点击"生成"后此处显示生成结果
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
