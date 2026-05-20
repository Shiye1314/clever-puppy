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
  const [categoryMode, setCategoryMode] = useState<"brand" | "niche">("brand");
  const [rewriteRequirement, setRewriteRequirement] = useState("");
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
        body: JSON.stringify({ content: rawContent, productCardOverride: card, categoryId: selectedCategory || undefined, rewriteRequirement: rewriteRequirement || undefined }),
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

      // 自动保存历史
      const saveRes = await fetch("/api/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          task_type: "generate",
          module: "generate",
          title: data.card.productName || fileName || "素材生成",
          input_data: { rawContent, fileName, productCard: data.card, rewriteRequirement },
          product_card: data.card,
          output_data: data.sections,
          metadata: { rewriteRequirement },
          category_id: selectedCategory || null,
        }),
      });
      const savedTask = await saveRes.json();
      if (savedTask?.id) setCurrentTaskId(savedTask.id);

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
        await fetch(`/api/tasks?id=${currentTaskId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            output_data: updated,
            updated_at: new Date().toISOString(),
          }),
        });
      }
    } catch (err) {
      alert("重写失败: " + (err as Error).message);
    }
    setRewriting(null);
  };

  const handleSave = async () => {
    if (currentTaskId) {
      // 已存在记录 → 更新
      const res = await fetch(`/api/tasks?id=${currentTaskId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          product_card: card,
          output_data: sections,
          metadata: { rewriteRequirement },
          category_id: selectedCategory || null,
          updated_at: new Date().toISOString(),
        }),
      });
      const result = await res.json();
      if (!result.error) alert("已更新历史记录");
      else alert("更新失败: " + result.error);
      return;
    }

    const res = await fetch("/api/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        task_type: "generate",
        module: "generate",
        title: card.productName || fileName || "素材生成",
        input_data: { rawContent, fileName, productCard: card, rewriteRequirement },
        product_card: card,
        output_data: sections,
        metadata: { rewriteRequirement },
        category_id: selectedCategory || null,
      }),
    });
    const task = await res.json();
    if (task?.id) setCurrentTaskId(task.id);
    alert("已保存到历史记录");
  };

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* 操作区 40% */}
      <div className="w-[40%] min-w-[220px] border-r border-border overflow-y-auto scrollbar-hide p-5 space-y-5">
        {/* Step 1 */}
        <section>
          <div className="flex items-center gap-1 mb-2">
            <span className="w-0.5 h-2 rounded-full bg-amber flex-shrink-0" />
            <span className="text-[16px] font-medium text-ink">上传资料</span>
          </div>
          <div className="rounded-xl bg-surface border border-border p-3 space-y-2">
            <UploadZone onTextReady={handleTextReady} />
            <button
              onClick={handleExtract}
              disabled={!rawContent || extracting}
              className="text-[16px] text-amber hover:text-amber/80 transition-colors disabled:opacity-30 font-medium"
            >
              {extracting ? "提炼中..." : "整理信息 →"}
            </button>
          </div>
        </section>

        {/* 产品信息卡 */}
        <section>
          <div className="flex items-center gap-1 mb-2">
            <span className="w-0.5 h-2 rounded-full bg-amber flex-shrink-0" />
            <span className="text-[16px] font-medium text-ink">产品信息卡</span>
          </div>
          <div className="rounded-xl bg-surface border border-border p-3">
            <ProductCardForm card={card} onChange={setCard} loading={extracting} />
          </div>
        </section>
      </div>

      {/* 结果区 60% */}
      <div className="w-[60%] overflow-y-auto scrollbar-hide p-5">
        {/* 洗稿要求 */}
        <section className="mb-5">
          <div className="flex items-center gap-1 mb-2">
            <span className="w-0.5 h-2 rounded-full bg-amber flex-shrink-0" />
            <span className="text-[16px] font-medium text-ink">洗稿要求</span>
          </div>
          <div className="rounded-xl bg-surface border border-border p-3 space-y-3">
            <textarea
              value={rewriteRequirement}
              onChange={(e) => setRewriteRequirement(e.target.value)}
              placeholder="输入你的新想法、新需求、新要求，AI 会根据这些额外要求进行爆文撰写。例如：强调性价比、突出限时优惠、加入品牌故事..."
              className="w-full min-h-[120px] rounded-lg border border-border bg-paper px-2 py-1.5 text-[14px] text-ink
                         placeholder:text-muted/40 resize-y
                         focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20
                         transition-colors duration-200"
            />

            {/* 写作风格 */}
            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1">
                <span className="w-0.5 h-2 rounded-full bg-amber flex-shrink-0" />
                <span className="text-[14px] font-medium text-muted/70">写作风格</span>
              </div>
              {/* 模式切换 */}
              <div className="flex rounded-lg border border-border bg-paper p-0.5">
                <button
                  onClick={() => setCategoryMode("brand")}
                  className={`px-2.5 py-1 text-[13px] font-medium rounded-md transition-all ${
                    categoryMode === "brand"
                      ? "bg-amber text-white shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  品牌专类
                </button>
                <button
                  onClick={() => setCategoryMode("niche")}
                  className={`px-2.5 py-1 text-[13px] font-medium rounded-md transition-all ${
                    categoryMode === "niche"
                      ? "bg-amber text-white shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  细分大类
                </button>
              </div>
            </div>
            <CategorySelector value={selectedCategory} onChange={setSelectedCategory} />

            <div className="pt-1">
              <EmpowerButton onClick={handleGenerate} loading={generating} />
            </div>
          </div>
        </section>

        <div className="flex items-center gap-1 mb-3">
          <span className="w-0.5 h-2 rounded-full bg-amber flex-shrink-0" />
          <span className="text-[16px] font-medium text-ink">爆文输出</span>
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
              className="mt-4 text-[16px] text-muted/60 hover:text-amber transition-colors font-medium"
            >
              保存到历史
            </button>
          </>
        ) : (
          <div className="rounded-xl bg-surface border border-border p-8 text-center mt-2">
            <p className="text-[14px] text-muted/40 leading-relaxed">
              点击"生成"后此处显示生成结果
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
