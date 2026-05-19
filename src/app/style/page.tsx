"use client";

import { useState, useEffect } from "react";
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
  const [analyzing, setAnalyzing] = useState(false);
  const [saved, setSaved] = useState(false);
  const [categories, setCategories] = useState<Array<{id: string; name: string; writing_samples_count: number; updated_at: string}>>([]);
  const [batchLearning, setBatchLearning] = useState(false);
  const [batchResult, setBatchResult] = useState<{
    totalArticles: number; classified: number; categoriesFound: number;
    dnaUpdated: number; categories: Array<{ categoryId: string; categoryName: string; articleCount: number }>;
  } | null>(null);

  useEffect(() => {
    fetch("/api/style-dna").then((r) => r.json()).then((d) => {
      if (d && !d.error) setDna({ ...defaultDna, ...d });
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/categories").then((r) => r.json()).then((data) => {
      if (Array.isArray(data)) setCategories(data);
    }).catch(() => {});
  }, []);

  const handleBatchLearn = async () => {
    if (!samples.trim()) return;
    setBatchLearning(true);
    setBatchResult(null);
    try {
      const res = await fetch("/api/learn/batch", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: samples }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBatchResult(data);
      fetch("/api/categories").then((r) => r.json()).then((d) => {
        if (Array.isArray(d)) setCategories(d);
      }).catch(() => {});
    } catch (err) {
      alert("批量学习失败: " + (err as Error).message);
    }
    setBatchLearning(false);
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
      setDna({ ...defaultDna, ...data.style_dna } as StyleDNA);
      alert(`已加载「${data.name}」的风格DNA到编辑区`);
    }
  };

  return (
    <div className="flex h-[calc(100vh-135px)]">
      {/* 左侧 — 导入 + 档案 */}
      <div className="flex-1 overflow-y-auto py-14 pr-16">
        {/* 导入范文 */}
        <section className="mb-16">
          <div className="flex items-center gap-2.5 mb-6">
            <span className="w-1 h-4 rounded-full bg-amber flex-shrink-0" />
            <h2 className="text-[32px] font-medium text-ink">导入范文</h2>
          </div>
          <textarea
            value={samples}
            onChange={(e) => setSamples(e.target.value)}
            placeholder="粘贴爆文代表作，每篇用 --- 分隔"
            className="w-full h-[344px] rounded-xl border border-border bg-surface p-4 text-[20px] leading-relaxed resize-y placeholder:text-muted/40 focus:outline-none focus:border-amber/50 transition-colors"
          />
          <div className="flex items-center gap-4 mt-4">
            <button
              onClick={handleBatchLearn}
              disabled={batchLearning || !samples.trim()}
              className="text-[32px] text-amber font-medium hover:text-amber/80 transition-colors disabled:opacity-30"
            >
              {batchLearning ? "学习中..." : "批量学习 · 自动分类"}
            </button>
            {batchResult && (
              <span className="text-[20px] text-muted/50">
                {batchResult.totalArticles} 篇 → {batchResult.categoriesFound} 品类 · {batchResult.dnaUpdated} DNA 更新
              </span>
            )}
          </div>
        </section>

        {/* 风格档案 */}
        <section className="pb-16">
          <div className="flex items-center gap-2.5 mb-6">
            <span className="w-1 h-4 rounded-full bg-amber flex-shrink-0" />
            <h2 className="text-[32px] font-medium text-ink">风格档案</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-[20px] font-medium text-muted/70 mb-2">语气</label>
              <input
                type="text" value={dna.tone}
                onChange={(e) => setDna({ ...dna, tone: e.target.value })}
                className="w-full h-10 rounded-[16px] border border-border bg-surface px-3.5 text-[20px] text-ink placeholder:text-muted/40 focus:outline-none focus:border-amber/50 transition-colors"
                placeholder="如：闺蜜聊天 + 10% 专业背书"
              />
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[20px] font-medium text-muted/70 mb-2">高频关键词</label>
                <input
                  type="text"
                  value={dna.keywords_high_freq.join(", ")}
                  onChange={(e) => setDna({ ...dna, keywords_high_freq: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
                  className="w-full h-10 rounded-[16px] border border-border bg-surface px-3.5 text-[20px] text-ink placeholder:text-muted/40 focus:outline-none focus:border-amber/50 transition-colors"
                  placeholder="逗号分隔"
                />
              </div>
              <div>
                <label className="block text-[20px] font-medium text-muted/70 mb-2">常用 Emoji</label>
                <input
                  type="text"
                  value={dna.emoji_usage.preferred.join(", ")}
                  onChange={(e) => setDna({ ...dna, emoji_usage: { ...dna.emoji_usage, preferred: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) } })}
                  className="w-full h-10 rounded-[16px] border border-border bg-surface px-3.5 text-[20px] text-ink placeholder:text-muted/40 focus:outline-none focus:border-amber/50 transition-colors"
                  placeholder="✨ 💡 ✅ 🔥"
                />
              </div>
            </div>

            <div>
              <label className="block text-[20px] font-medium text-muted/70 mb-2">标题公式</label>
              <textarea
                value={dna.title_formulas.join("\n")}
                onChange={(e) => setDna({ ...dna, title_formulas: e.target.value.split("\n").filter(Boolean) })}
                className="w-full h-20 rounded-xl border border-border bg-surface p-4 text-[20px] leading-relaxed resize-y placeholder:text-muted/40 focus:outline-none focus:border-amber/50 transition-colors"
                placeholder="每行一个"
              />
            </div>

            <div className="grid grid-cols-2 gap-8">
              <div>
                <label className="block text-[20px] font-medium text-muted/70 mb-3">
                  短句比例 <span className="tabular-nums ml-1 text-amber">{dna.paragraph_rhythm.short_sentence_ratio}</span>
                </label>
                <div className="flex items-center gap-3">
                  <span className="text-[20px] text-muted/40 tabular-nums">0</span>
                  <input
                    type="range" min="0" max="1" step="0.1"
                    value={dna.paragraph_rhythm.short_sentence_ratio}
                    onChange={(e) => setDna({ ...dna, paragraph_rhythm: { ...dna.paragraph_rhythm, short_sentence_ratio: parseFloat(e.target.value) } })}
                    className="flex-1 h-1.5 rounded-full accent-amber appearance-none bg-border cursor-pointer"
                  />
                  <span className="text-[20px] text-muted/40 tabular-nums">1</span>
                </div>
              </div>
              <div>
                <label className="block text-[20px] font-medium text-muted/70 mb-3">感叹号密度</label>
                <select
                  value={dna.paragraph_rhythm.exclamation_density}
                  onChange={(e) => setDna({ ...dna, paragraph_rhythm: { ...dna.paragraph_rhythm, exclamation_density: e.target.value } })}
                  className="w-full h-10 rounded-[16px] border border-border bg-surface px-3.5 text-[20px] text-ink focus:outline-none focus:border-amber/50 transition-colors appearance-none"
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
            className="mt-10 px-10 py-2.5 bg-amber text-white text-[32px] font-medium tracking-wide rounded-[16px] hover:bg-amber/90 transition-colors"
          >
            {saved ? "已保存" : "保存风格档案"}
          </button>
        </section>
      </div>

      {/* 垂直分割线 */}
      <div className="w-px bg-border flex-shrink-0" />

      {/* 右侧 — 大类管理 */}
      <div className="w-[600px] flex-shrink-0 overflow-y-auto scrollbar-hide py-14 pl-16">
        <div className="flex items-center gap-2.5 mb-3">
          <span className="w-1 h-4 rounded-full bg-amber flex-shrink-0" />
          <h2 className="text-[32px] font-medium text-ink">大类管理</h2>
        </div>
        <p className="text-[20px] text-muted/40 leading-relaxed mb-8">
          每个品类独立学习写作风格，投喂越多，模仿越精准
        </p>

        <div className="space-y-3">
          {categories.map((cat) => (
            <div
              key={cat.id}
              onClick={() => handleViewCategory(cat.id)}
              className="group rounded-xl border border-border bg-surface p-5 cursor-pointer transition-all duration-200 hover:border-amber hover:shadow-sm"
            >
              <div className="flex items-end justify-between">
                <span className="text-[38px] font-semibold text-ink group-hover:text-amber transition-colors">
                  {cat.name}
                </span>
                <span className="text-[90px] leading-none font-bold text-muted/8 tabular-nums group-hover:text-amber/10 transition-colors">
                  {cat.writing_samples_count}
                </span>
              </div>
              <p className="text-[20px] text-muted/40 mt-2">
                {new Date(cat.updated_at).toLocaleDateString("zh-CN")}
              </p>
            </div>
          ))}
          {categories.length === 0 && (
            <div className="py-16 text-center">
              <p className="text-[32px] text-muted/30">暂无品类</p>
              <p className="text-[20px] text-muted/20 mt-1">导入范文后自动分类</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
