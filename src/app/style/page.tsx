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
    totalArticles: number;
    classified: number;
    categoriesFound: number;
    dnaUpdated: number;
    categories: Array<{ categoryId: string; categoryName: string; articleCount: number }>;
  } | null>(null);

  useEffect(() => {
    fetch("/api/style-dna")
      .then((r) => r.json())
      .then((d) => {
        if (d && !d.error) setDna({ ...defaultDna, ...d });
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {});
  }, []);

  const handleAnalyze = async () => {
    if (!samples.trim()) return;
    setAnalyzing(true);
    try {
      const res = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: samples, analyzeStyle: true }),
      });
      const data = await res.json();
      // For now just show the samples were received
      alert(`已接收 ${samples.split("---").length} 篇范文，分析功能将在后续迭代中完善`);
    } catch (err) {
      alert("分析失败: " + (err as Error).message);
    }
    setAnalyzing(false);
  };

  const handleSave = async () => {
    const res = await fetch("/api/style-dna", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(dna),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  const handleViewCategory = async (id: string) => {
    const res = await fetch(`/api/categories/${id}`);
    const data = await res.json();
    if (data.style_dna) {
      setDna({ ...defaultDna, ...data.style_dna } as StyleDNA);
      alert(`已加载「${data.name}」的风格DNA到编辑区`);
    }
  };

  const handleBatchLearn = async () => {
    if (!samples.trim()) return;
    setBatchLearning(true);
    setBatchResult(null);
    try {
      const res = await fetch("/api/learn/batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: samples }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setBatchResult(data);
      // 刷新大类列表
      fetch("/api/categories")
        .then((r) => r.json())
        .then((d) => { if (Array.isArray(d)) setCategories(d); })
        .catch(() => {});
    } catch (err) {
      alert("批量学习失败: " + (err as Error).message);
    }
    setBatchLearning(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-8 py-16">
      <h1 className="font-serif text-3xl text-ink mb-12">风格 DNA</h1>

      {/* 范文导入 */}
      <section className="mb-12">
        <h2 className="text-sm text-muted uppercase tracking-wider mb-4">导入范文</h2>
        <textarea
          value={samples}
          onChange={(e) => setSamples(e.target.value)}
          placeholder="粘贴 5-10 篇你的爆文代表作，每篇用 --- 分隔..."
          className="w-full h-40 prose-input text-sm resize-y"
        />
        <div className="flex gap-3 mt-3">
          <button
            onClick={handleAnalyze}
            disabled={analyzing || !samples.trim()}
            className="text-xs text-muted hover:text-amber transition-colors disabled:opacity-40"
          >
            {analyzing ? "分析中..." : "分析风格 →"}
          </button>
          <button
            onClick={handleBatchLearn}
            disabled={batchLearning || !samples.trim()}
            className="text-xs text-amber hover:text-amber/80 transition-colors disabled:opacity-40 border-b border-amber"
          >
            {batchLearning ? "批量学习中..." : "批量学习（自动分类）→"}
          </button>
        </div>
        {batchResult && (
          <div className="mt-4 p-4 border border-amber/30 bg-amber/[0.03] rounded-sm">
            <p className="text-xs text-ink font-medium mb-2">学习完成</p>
            <div className="grid grid-cols-2 gap-x-6 gap-y-1 text-xs text-muted">
              <span>总文章数：{batchResult.totalArticles}</span>
              <span>成功分类：{batchResult.classified}</span>
              <span>识别品类：{batchResult.categoriesFound}</span>
              <span>已更新DNA：{batchResult.dnaUpdated}</span>
            </div>
            {batchResult.categories.length > 0 && (
              <div className="mt-3 space-y-1">
                {batchResult.categories.map((cat) => (
                  <div key={cat.categoryId} className="text-xs text-muted flex justify-between">
                    <span>📂 {cat.categoryName}</span>
                    <span>{cat.articleCount} 篇</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </section>

      {/* 风格DNA 编辑 */}
      <section className="space-y-6">
        <h2 className="text-sm text-muted uppercase tracking-wider mb-4">风格档案</h2>

        <div>
          <label className="block text-xs text-ink mb-1">语气</label>
          <input
            type="text"
            value={dna.tone}
            onChange={(e) => setDna({ ...dna, tone: e.target.value })}
            className="w-full prose-input text-sm"
            placeholder="如：闺蜜聊天 + 10% 专业背书"
          />
        </div>

        <div>
          <label className="block text-xs text-ink mb-1">
            高频关键词（逗号分隔）
          </label>
          <input
            type="text"
            value={dna.keywords_high_freq.join(", ")}
            onChange={(e) =>
              setDna({
                ...dna,
                keywords_high_freq: e.target.value
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
            className="w-full prose-input text-sm"
          />
        </div>

        <div>
          <label className="block text-xs text-ink mb-1">
            标题公式（每行一个）
          </label>
          <textarea
            value={dna.title_formulas.join("\n")}
            onChange={(e) =>
              setDna({
                ...dna,
                title_formulas: e.target.value.split("\n").filter(Boolean),
              })
            }
            className="w-full h-20 prose-input text-sm resize-y"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs text-ink mb-1">短句比例</label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={dna.paragraph_rhythm.short_sentence_ratio}
              onChange={(e) =>
                setDna({
                  ...dna,
                  paragraph_rhythm: {
                    ...dna.paragraph_rhythm,
                    short_sentence_ratio: parseFloat(e.target.value),
                  },
                })
              }
              className="w-full"
            />
            <span className="text-xs text-muted">{dna.paragraph_rhythm.short_sentence_ratio}</span>
          </div>

          <div>
            <label className="block text-xs text-ink mb-1">感叹号密度</label>
            <select
              value={dna.paragraph_rhythm.exclamation_density}
              onChange={(e) =>
                setDna({
                  ...dna,
                  paragraph_rhythm: {
                    ...dna.paragraph_rhythm,
                    exclamation_density: e.target.value,
                  },
                })
              }
              className="w-full prose-input text-sm"
            >
              <option value="low">低</option>
              <option value="medium">中</option>
              <option value="high">高</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-ink mb-1">
            常用 Emoji（逗号分隔）
          </label>
          <input
            type="text"
            value={dna.emoji_usage.preferred.join(", ")}
            onChange={(e) =>
              setDna({
                ...dna,
                emoji_usage: {
                  ...dna.emoji_usage,
                  preferred: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                },
              })
            }
            className="w-full prose-input text-sm"
            placeholder="✨, 💡, ✅, 🔥"
          />
        </div>

        <button
          onClick={handleSave}
          className="px-8 py-2.5 border border-amber text-amber text-sm hover:bg-amber hover:text-white transition-all duration-300"
        >
          {saved ? "已保存" : "保存风格档案"}
        </button>
      </section>

      {/* 大类管理 */}
      <section className="mt-16 pt-12 border-t border-border">
        <h2 className="text-sm text-muted uppercase tracking-wider mb-4">大类管理</h2>
        <p className="text-xs text-muted/70 mb-6">
          每个大类独立学习你的写作风格。投喂越多，模仿越精准。
        </p>

        <div className="space-y-3 mb-6">
          {categories.map((cat) => (
            <div key={cat.id} className="flex items-center justify-between paper-card p-4">
              <div>
                <p className="text-sm text-ink font-medium">{cat.name}</p>
                <p className="text-xs text-muted">
                  {cat.writing_samples_count} 篇范文 · 最后更新 {new Date(cat.updated_at).toLocaleDateString("zh-CN")}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewCategory(cat.id)}
                  className="text-xs text-muted hover:text-amber transition-colors"
                >
                  查看DNA
                </button>
              </div>
            </div>
          ))}
          {categories.length === 0 && (
            <p className="text-sm text-muted/60 text-center py-8">
              暂无大类。投喂不同品类的爆文后会自动创建。
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
