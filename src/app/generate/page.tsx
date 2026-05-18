"use client";

import { useState } from "react";
import UploadZone from "@/components/generate/UploadZone";
import ProductCardForm from "@/components/generate/ProductCardForm";
import ArticleResult from "@/components/generate/ArticleResult";
import CategorySelector from "@/components/generate/CategorySelector";
import AgentStatus from "@/components/generate/AgentStatus";
import EmpowerButton from "@/components/ui/EmpowerButton";
import type { ProductCard, ArticleSections } from "@/lib/types";
import { supabase } from "@/lib/supabase/client";

const emptyCard: ProductCard = {
  productName: "",
  sellingPoints: [],
  targetPainPoint: "",
  usageScenario: "",
  competitorDiff: "",
};

const emptySections: ArticleSections = {
  hook: "",
  transition: "",
  sellingPoints: "",
};

export default function GeneratePage() {
  const [rawContent, setRawContent] = useState("");
  const [fileName, setFileName] = useState("");
  const [card, setCard] = useState<ProductCard>(emptyCard);
  const [sections, setSections] = useState<ArticleSections>(emptySections);
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
            content: `${data.card.productName} ${data.card.sellingPoints?.join(" ")} ${data.sections?.hook || ""}`
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

  const handleRewriteSection = async (name: "hook" | "transition" | "sellingPoints") => {
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
    <div className="flex h-[calc(100vh-56px)]">
      {/* 操作区 40% */}
      <div className="w-[40%] min-w-[400px] border-r border-border overflow-y-auto p-8 space-y-8">
        <div>
          <p className="text-xs text-muted uppercase tracking-wider mb-4">Step 1 · 上传资料</p>
          <UploadZone onTextReady={handleTextReady} />
          <button
            onClick={handleExtract}
            disabled={!rawContent || extracting}
            className="mt-4 text-xs text-muted hover:text-amber transition-colors disabled:opacity-40"
          >
            {extracting ? "提炼中..." : "整理信息 →"}
          </button>
        </div>

        <div>
          <p className="text-xs text-muted uppercase tracking-wider mb-4">Step 2 · 产品信息卡</p>
          <ProductCardForm card={card} onChange={setCard} loading={extracting} />
          <div className="text-xs text-muted mb-1">写作风格</div>
          <CategorySelector value={selectedCategory} onChange={setSelectedCategory} />
          <div className="mt-6">
            <EmpowerButton onClick={handleGenerate} loading={generating} />
          </div>
        </div>
      </div>

      {/* 结果区 60% */}
      <div className="w-[60%] overflow-y-auto p-8">
        <p className="text-xs text-muted uppercase tracking-wider mb-6">Step 3 · 爆文输出</p>
        <AgentStatus agents={agentStatus} generating={generating} />
        {sections.hook || sections.transition || sections.sellingPoints ? (
          <>
            <ArticleResult
              sections={sections}
              onChange={setSections}
              onRewriteSection={handleRewriteSection}
              loading={rewriting}
            />
            <button
              onClick={handleSave}
              className="mt-6 text-xs text-muted hover:text-amber transition-colors"
            >
              💾 保存到历史
            </button>
          </>
        ) : (
          <p className="text-sm text-muted/60 mt-32 text-center">
            点击"爆文赋能启动"后此处显示生成结果
          </p>
        )}
      </div>
    </div>
  );
}
