"use client";

import { useState, useEffect, useRef } from "react";
import { AnimatedItem, ScrollGradient } from "@/components/ui/AnimatedList";
import type { StyleDNA } from "@/lib/types";

const defaultDna: StyleDNA = {
  openings: { patterns: [], styles: [] },
  closings: { patterns: [], interaction_triggers: false },
  paragraph_rhythm: { short_sentence_ratio: 0.6, exclamation_density: "medium", line_break_frequency: "high" },
  emoji_usage: { frequency: "medium", preferred: [], position: "paragraph_start" },
  pronouns: { first_person: "我", second_person: "你/姐妹们", style: "闺蜜口吻" },
  title_formulas: [],
  keywords_high_freq: [],
  tone: "",
};

export default function StylePage() {
  const [dna, setDna] = useState<StyleDNA>(defaultDna);
  const [samples, setSamples] = useState("");
  const [saved, setSaved] = useState(false);
  const [brandCategories, setBrandCategories] = useState<Array<{id: string; name: string; writing_samples_count: number; updated_at: string}>>([]);
  const [nicheCategories, setNicheCategories] = useState<Array<{id: string; name: string; writing_samples_count: number; updated_at: string}>>([]);
  const [batchLearning, setBatchLearning] = useState(false);
  const [learnMode, setLearnMode] = useState<"brand" | "niche">("niche");
  const [selectedType, setSelectedType] = useState<"brand" | "niche">("niche");
  const nicheScrollRef = useRef<HTMLDivElement>(null);
  const samplesRef = useRef<HTMLTextAreaElement>(null);

  // 自延框：输入栏随内容自动延伸高度
  useEffect(() => {
    const el = samplesRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [samples]);
  const [batchResult, setBatchResult] = useState<{
    mode?: string; brandName?: string; isNewBrand?: boolean;
    newCount?: number; skippedCount?: number; totalAccumulated?: number;
    classified?: number; categoriesFound?: number;
    dnaUpdated: number; categories: Array<{ categoryId: string; categoryName: string; articleCount: number }>;
  } | null>(null);

  useEffect(() => {
    fetch("/api/style-dna").then((r) => r.json()).then((d) => {
      if (d && !d.error) setDna({ ...defaultDna, ...d });
    }).catch(() => {});
  }, []);

  const refreshCategories = () => {
    fetch("/api/categories?type=brand").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setBrandCategories(data);
    }).catch(() => {});
    fetch("/api/categories?type=niche").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setNicheCategories(data);
    }).catch(() => {});
  };

  useEffect(() => { refreshCategories(); }, []);

  const handleBatchLearn = async () => {
    if (!samples.trim()) return;
    setBatchLearning(true);
    setBatchResult(null);
    try {
      const res = await fetch("/api/learn/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: samples, category_type: learnMode }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBatchResult(data);
      refreshCategories();
      if (data.mode === "brand") setSelectedType("brand");

      // 增量清除：从输入框中删除已成功处理的文章
      if (data.processedFingerprints && data.processedFingerprints.length > 0) {
        const remaining = removeProcessedArticles(samples, data.processedFingerprints);
        setSamples(remaining);
      }
    } catch (err) {
      alert("批量学习失败: " + (err as Error).message);
    }
    setBatchLearning(false);
  };

  // 按指纹移除已处理的文章（指纹 = 每篇前80字符），保留未处理的
  const removeProcessedArticles = (text: string, fingerprints: string[]): string => {
    const blocks = text.split(/---+/).map((b) => b.trim()).filter((b) => b.length > 50);
    const remaining = blocks.filter((block) => {
      const fp = block.slice(0, 80);
      return !fingerprints.some((f) => fp === f);
    });
    return remaining.length > 0 ? remaining.join("\n\n---\n\n") : "";
  };

  const handleSave = async () => {
    const res = await fetch("/api/style-dna", {
      method: "PUT", headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dna),
    });
    if (res.ok) { setSaved(true); setTimeout(() => setSaved(false), 2000); }
  };

  const handleViewCategory = async (id: string) => {
    const res = await fetch(`/api/categories/${id}`);
    const data = await res.json();
    if (data.style_dna) {
      // 过滤掉内部字段（category_type 等），只保留风格维度
      const { category_type: _, ...cleanDna } = data.style_dna as Record<string, unknown>;
      setDna({ ...defaultDna, ...cleanDna } as StyleDNA);
      alert(`已加载「${data.name}」的风格DNA到编辑区`);
    }
  };

  return (
    <div className="flex h-[calc(100vh-64px)] pl-[19px]">
      {/* 左侧 — 导入 + 档案 */}
      <div className="flex-1 overflow-y-auto scrollbar-hide py-7 pr-8">
        {/* 导入范文 */}
        <section className="mb-8">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-1.5">
              <span className="w-0.5 h-2 rounded-full bg-amber flex-shrink-0" />
              <h2 className="text-[16px] font-medium text-ink">导入范文</h2>
            </div>
            {/* 模式切换 */}
            <div className="flex rounded-lg border border-border bg-paper p-0.5">
              <button
                onClick={() => setLearnMode("brand")}
                className={`px-2.5 py-1 text-[13px] font-medium rounded-md transition-all ${
                  learnMode === "brand"
                    ? "bg-amber text-white shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                品牌专类
              </button>
              <button
                onClick={() => setLearnMode("niche")}
                className={`px-2.5 py-1 text-[13px] font-medium rounded-md transition-all ${
                  learnMode === "niche"
                    ? "bg-amber text-white shadow-sm"
                    : "text-muted hover:text-ink"
                }`}
              >
                细分大类
              </button>
            </div>
          </div>
          <textarea
            ref={samplesRef}
            value={samples}
            onChange={(e) => setSamples(e.target.value)}
            placeholder={
              learnMode === "brand"
                ? "粘贴同一品牌的多篇爆文，每篇用 --- 分隔。Agent 将自动识别品牌名并学习其写作风格"
                : "粘贴爆文代表作，每篇用 --- 分隔。Agent 将自动分类并学习各品类的写作风格"
            }
            className="w-full min-h-[176px] rounded-lg border border-border bg-surface p-2 text-[14px] leading-relaxed resize-none overflow-hidden placeholder:text-muted/40 focus:outline-none focus:border-amber/50 transition-colors"
          />
          <div className="flex items-center gap-2 mt-2">
            <button
              onClick={handleBatchLearn}
              disabled={batchLearning || !samples.trim()}
              className="text-[16px] text-amber font-medium hover:text-amber/80 transition-colors disabled:opacity-30"
            >
              {batchLearning ? "学习中..." : learnMode === "brand" ? "批量学习 · 品牌识别" : "批量学习 · 自动分类"}
            </button>
            {batchResult && (
              <span className="text-[14px] text-muted/50">
                {batchResult.mode === "brand"
                  ? `品牌「${batchResult.brandName}」${batchResult.isNewBrand ? "新建" : "已有"} · 新增${batchResult.newCount ?? 0}篇${batchResult.skippedCount ? `（跳过${batchResult.skippedCount}篇重复）` : ""} · 累计${batchResult.totalAccumulated}篇 · DNA已更新`
                  : `新增${batchResult.newCount ?? 0}篇${batchResult.skippedCount ? `（跳过${batchResult.skippedCount}篇重复）` : ""} → ${batchResult.categoriesFound} 品类 · ${batchResult.dnaUpdated} DNA更新`
                }
              </span>
            )}
          </div>
        </section>

        {/* 风格档案 */}
        <section className="pb-8">
          <div className="flex items-center gap-1.5 mb-3">
            <span className="w-0.5 h-2 rounded-full bg-amber flex-shrink-0" />
            <h2 className="text-[16px] font-medium text-ink">风格档案</h2>
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-[14px] font-medium text-muted/70 mb-1">语气</label>
              <input
                type="text" value={dna.tone}
                onChange={(e) => setDna({ ...dna, tone: e.target.value })}
                className="w-full h-10 rounded-lg border border-border bg-surface px-2 text-[14px] text-ink placeholder:text-muted/40 focus:outline-none focus:border-amber/50 transition-colors"
                placeholder="如：闺蜜聊天 + 10% 专业背书"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[14px] font-medium text-muted/70 mb-1">高频关键词</label>
                <input
                  type="text"
                  value={dna.keywords_high_freq.join(", ")}
                  onChange={(e) => setDna({ ...dna, keywords_high_freq: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  className="w-full h-10 rounded-lg border border-border bg-surface px-2 text-[14px] text-ink placeholder:text-muted/40 focus:outline-none focus:border-amber/50 transition-colors"
                  placeholder="逗号分隔"
                />
              </div>
              <div>
                <label className="block text-[14px] font-medium text-muted/70 mb-1">常用 Emoji</label>
                <input
                  type="text"
                  value={dna.emoji_usage.preferred.join(", ")}
                  onChange={(e) => setDna({ ...dna, emoji_usage: { ...dna.emoji_usage, preferred: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })}
                  className="w-full h-10 rounded-lg border border-border bg-surface px-2 text-[14px] text-ink placeholder:text-muted/40 focus:outline-none focus:border-amber/50 transition-colors"
                  placeholder="✨ 💡 ✅ 🔥"
                />
              </div>
            </div>

            <div>
              <label className="block text-[14px] font-medium text-muted/70 mb-1">标题公式</label>
              <textarea
                value={dna.title_formulas.join("\n")}
                onChange={(e) => setDna({ ...dna, title_formulas: e.target.value.split("\n").filter(Boolean) })}
                className="w-full h-10 rounded-lg border border-border bg-surface p-2 text-[14px] leading-relaxed resize-y placeholder:text-muted/40 focus:outline-none focus:border-amber/50 transition-colors"
                placeholder="每行一个"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[14px] font-medium text-muted/70 mb-1.5">
                  短句比例 <span className="tabular-nums ml-1 text-amber">{dna.paragraph_rhythm.short_sentence_ratio}</span>
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[14px] text-muted/40 tabular-nums">0</span>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={dna.paragraph_rhythm.short_sentence_ratio}
                    onChange={(e) => setDna({ ...dna, paragraph_rhythm: { ...dna.paragraph_rhythm, short_sentence_ratio: parseFloat(e.target.value) } })}
                    className="flex-1 h-0.5 rounded-full accent-amber appearance-none bg-border cursor-pointer"
                  />
                  <span className="text-[14px] text-muted/40 tabular-nums">1</span>
                </div>
              </div>
              <div>
                <label className="block text-[14px] font-medium text-muted/70 mb-1.5">感叹号密度</label>
                <select
                  value={dna.paragraph_rhythm.exclamation_density}
                  onChange={(e) => setDna({ ...dna, paragraph_rhythm: { ...dna.paragraph_rhythm, exclamation_density: e.target.value } })}
                  className="w-full h-10 rounded-lg border border-border bg-surface px-2 text-[14px] text-ink focus:outline-none focus:border-amber/50 transition-colors appearance-none"
                >
                  <option value="low">低</option>
                  <option value="medium">中</option>
                  <option value="high">高</option>
                </select>
              </div>
            </div>
          </div>

          <button
            onClick={handleSave}
            className="mt-5 px-5 py-1.5 bg-amber text-white text-[16px] font-medium tracking-wide rounded-lg hover:bg-amber/90 transition-colors"
          >
            {saved ? "已保存" : "保存风格档案"}
          </button>
        </section>
      </div>

      {/* 垂直分割线 */}
      <div className="w-px bg-border flex-shrink-0" />

      {/* 右侧 — 大类管理 */}
      <div className="w-[300px] flex-shrink-0 relative py-7 pl-8">
        <div className="flex items-center gap-1.5 mb-1.5">
          <span className="w-0.5 h-2 rounded-full bg-amber flex-shrink-0" />
          <h2 className="text-[16px] font-medium text-ink">大类管理</h2>
        </div>
        <p className="text-[14px] text-muted/40 leading-relaxed mb-3">
          每个品类独立学习写作风格，投喂越多，模仿越精准
        </p>

        {/* 类型切换 Tab */}
        <div className="flex rounded-lg border border-border bg-paper p-0.5 mb-3">
          <button
            onClick={() => setSelectedType("brand")}
            className={`flex-1 px-2 py-1 text-[12px] font-medium rounded-md transition-all ${
              selectedType === "brand"
                ? "bg-amber text-white shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            品牌大类
          </button>
          <button
            onClick={() => setSelectedType("niche")}
            className={`flex-1 px-2 py-1 text-[12px] font-medium rounded-md transition-all ${
              selectedType === "niche"
                ? "bg-amber text-white shadow-sm"
                : "text-muted hover:text-ink"
            }`}
          >
            细分大类
          </button>
        </div>

        <div
          ref={nicheScrollRef}
          className="max-h-[calc(100vh-340px)] overflow-y-auto scrollbar-hide"
        >
          {selectedType === "brand" ? (
            <div className="space-y-1.5">
              {brandCategories.map((cat, i) => (
                <AnimatedItem key={cat.id} delay={i * 0.04}>
                  <div
                    onClick={() => handleViewCategory(cat.id)}
                    className="group rounded-lg border border-border bg-surface p-3 cursor-pointer transition-all duration-200 hover:border-amber hover:shadow-sm"
                  >
                    <div className="flex items-end justify-between">
                      <span className="text-[19px] font-semibold text-ink group-hover:text-amber transition-colors">
                        {cat.name}
                      </span>
                      <span className="text-[45px] leading-none font-bold text-muted/8 tabular-nums group-hover:text-amber/10 transition-colors">
                        {cat.writing_samples_count}
                      </span>
                    </div>
                    <p className="text-[14px] text-muted/40 mt-1">
                      {new Date(cat.updated_at).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                </AnimatedItem>
              ))}
              {brandCategories.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-[16px] text-muted/30">暂无品牌大类</p>
                  <p className="text-[14px] text-muted/20 mt-0.5">在左侧导入品牌范文</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1.5">
              {nicheCategories.map((cat, i) => (
                <AnimatedItem key={cat.id} delay={i * 0.04}>
                  <div
                    onClick={() => handleViewCategory(cat.id)}
                    className="group rounded-lg border border-border bg-surface p-3 cursor-pointer transition-all duration-200 hover:border-amber hover:shadow-sm"
                  >
                    <div className="flex items-end justify-between">
                      <span className="text-[19px] font-semibold text-ink group-hover:text-amber transition-colors">
                        {cat.name}
                      </span>
                      <span className="text-[45px] leading-none font-bold text-muted/8 tabular-nums group-hover:text-amber/10 transition-colors">
                        {cat.writing_samples_count}
                      </span>
                    </div>
                    <p className="text-[14px] text-muted/40 mt-1">
                      {new Date(cat.updated_at).toLocaleDateString("zh-CN")}
                    </p>
                  </div>
                </AnimatedItem>
              ))}
              {nicheCategories.length === 0 && (
                <div className="py-8 text-center">
                  <p className="text-[16px] text-muted/30">暂无细分大类</p>
                  <p className="text-[14px] text-muted/20 mt-0.5">导入范文后自动分类</p>
                </div>
              )}
            </div>
          )}
        </div>

        {selectedType === "niche" && nicheCategories.length > 0 && (
          <ScrollGradient scrollRef={nicheScrollRef} color="#FAFBFC" />
        )}
      </div>
    </div>
  );
}
