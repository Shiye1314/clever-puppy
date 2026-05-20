"use client";

import { useState } from "react";
import UploadZone from "@/components/generate/UploadZone";
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
  const [card, setCard] = useState<ProductCard | null>(null);
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
  const [prepared, setPrepared] = useState(false);

  const handleTextReady = (text: string, name?: string) => {
    setRawContent(text);
    if (name) setFileName(name);
    setPrepared(false);
    setCard(null);
  };

  // 阶段1：信息整理（提取→研究→整合）
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

      setCard(data.card);
      if (data.agents) setAgentStatus(data.agents);
      setPrepared(true);
    } catch (err) {
      alert("整理失败: " + (err as Error).message);
    }
    setExtracting(false);
  };

  // 阶段2：风格融合生成（自动检测是否已完成整理信息）
  const handleGenerate = async () => {
    setGenerating(true);
    const hasCard = card && card.productName;
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          // 已整理：传 productCard（快速路径，跳过前三步）
          // 未整理：传 content（完整路径，当场跑四步骤）
          ...(hasCard
            ? { productCard: card }
            : { content: rawContent }
          ),
          categoryId: selectedCategory || undefined,
          rewriteRequirement: rewriteRequirement || undefined,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSections(data.sections);
      if (!hasCard && data.card) {
        setCard(data.card);
        setPrepared(true);
      }
      if (data.agents) setAgentStatus(data.agents);

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
        title: card?.productName || fileName || "素材生成",
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
    <div className="flex gap-3 h-[calc(100vh-64px)]">
      {/* 操作区 40% */}
      <div className="w-[40%] min-w-[220px] relative overflow-y-auto scrollbar-hide p-5 space-y-5">
        {/* 居中分割线 */}
        <div className="absolute top-0 bottom-0 -right-1.5 w-px bg-border" />

        {/* Step 1: 上传 + 整理信息 */}
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
              {extracting ? "分析中..." : "整理信息 →"}
            </button>
            {prepared && card && (
              <div className="flex items-center gap-2 text-[13px] text-green-600 bg-green-50 rounded-lg px-3 py-1.5">
                <span>✅</span>
                <span>信息已整理就绪 — {card.productName}</span>
                {card.sellingPoints.length > 0 && (
                  <span className="text-muted/50 truncate">
                    · {card.sellingPoints.join("、")}
                  </span>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 洗稿要求 + 写作风格 + 生成 */}
        <section>
          <div className="flex items-center gap-1 mb-2">
            <span className="w-0.5 h-2 rounded-full bg-amber flex-shrink-0" />
            <span className="text-[16px] font-medium text-ink">洗稿要求</span>
          </div>
          <div className="rounded-xl bg-surface border border-border p-3 space-y-3">
            <textarea
              value={rewriteRequirement}
              onChange={(e) => setRewriteRequirement(e.target.value)}
              placeholder="输入你的新想法、新需求、新要求..."
              className="w-full min-h-[80px] rounded-lg border border-border bg-paper px-2 py-1.5 text-[14px] text-ink
                         placeholder:text-muted/40 resize-y
                         focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20
                         transition-colors duration-200"
            />

            {/* 写作风格 */}
            <div className="flex items-center justify-between pt-1">
              <span className="text-[14px] font-medium text-muted/70">写作风格</span>
              <div className="flex rounded-lg border border-border bg-paper p-0.5">
                <button
                  onClick={() => { setCategoryMode("brand"); setSelectedCategory(""); }}
                  className={`px-2.5 py-1 text-[13px] font-medium rounded-md transition-all ${
                    categoryMode === "brand"
                      ? "bg-amber text-white shadow-sm"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  品牌专类
                </button>
                <button
                  onClick={() => { setCategoryMode("niche"); setSelectedCategory(""); }}
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
            <CategorySelector value={selectedCategory} onChange={setSelectedCategory} mode={categoryMode} />

            <div className="pt-1">
              <EmpowerButton onClick={handleGenerate} loading={generating} />
            </div>
          </div>
        </section>

        {/* Agent 进度 */}
        {agentStatus && (
          <section>
            <div className="flex items-center gap-1 mb-2">
              <span className="w-0.5 h-2 rounded-full bg-amber flex-shrink-0" />
              <span className="text-[16px] font-medium text-ink">分析详情</span>
            </div>
            <div className="rounded-xl bg-surface border border-border p-3">
              <AgentStatus agents={agentStatus} generating={false} />
            </div>
          </section>
        )}
      </div>

      {/* 结果区 60% */}
      <div className="w-[60%] overflow-y-auto scrollbar-hide p-5">
        <div className="flex items-center gap-1 mb-3">
          <span className="w-0.5 h-2 rounded-full bg-amber flex-shrink-0" />
          <span className="text-[16px] font-medium text-ink">爆文输出</span>
        </div>

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
              {rawContent ? `点击「生成」后此处显示生成结果` : `← 先在左侧上传资料`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
