"use client";

import { useState, useEffect } from "react";
import SectionEditor from "@/components/generate/SectionEditor";
import type { ArticleSectionsV2 } from "@/lib/agents/generator";

interface BrandCategory {
  id: string;
  name: string;
  writing_samples_count: number;
  style_dna?: Record<string, unknown>;
}

const emptySections: ArticleSectionsV2 = {
  painPoint: "", transition: "", productIntro: "", brandIntro: "", ctaHook: "",
};

export default function RewritePage() {
  const [brands, setBrands] = useState<BrandCategory[]>([]);
  const [selectedBrandId, setSelectedBrandId] = useState("");
  const [selectedBrand, setSelectedBrand] = useState<BrandCategory | null>(null);
  const [rawIdea, setRawIdea] = useState("");
  const [slotValues, setSlotValues] = useState<Record<string, string> | null>(null);
  const [sections, setSections] = useState<ArticleSectionsV2>(emptySections);
  const [extracting, setExtracting] = useState(false);
  const [parsing, setParsing] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [rewriting, setRewriting] = useState<string | null>(null);
  const [currentTaskId, setCurrentTaskId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // 加载品牌大类列表
  useEffect(() => {
    fetch("/api/categories?type=brand")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setBrands(data);
      })
      .catch(() => {});
  }, []);

  // 选择品牌后加载详情
  const handleSelectBrand = async (id: string) => {
    setSelectedBrandId(id);
    setSlotValues(null);
    setSections(emptySections);
    setError(null);
    if (!id) { setSelectedBrand(null); return; }
    const res = await fetch(`/api/categories/${id}`);
    const data = await res.json();
    setSelectedBrand(data);
  };

  // 提取品牌模板
  const handleExtractTemplate = async () => {
    if (!selectedBrandId) return;
    setExtracting(true);
    setError(null);
    try {
      const res = await fetch("/api/brands/extract-template", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: selectedBrandId }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      // 刷新品牌详情
      await handleSelectBrand(selectedBrandId);
    } catch (err) {
      setError((err as Error).message);
    }
    setExtracting(false);
  };

  // 解析新想法
  const handleParseIdea = async () => {
    if (!selectedBrandId || !rawIdea.trim()) return;
    setParsing(true);
    setError(null);
    try {
      const res = await fetch("/api/brands/parse-idea", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: selectedBrandId, rawIdea }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSlotValues(data.slotValues);
    } catch (err) {
      setError((err as Error).message);
    }
    setParsing(false);
  };

  // 生成洗稿爆文
  const handleGenerate = async () => {
    if (!selectedBrandId || !slotValues) return;
    setGenerating(true);
    setError(null);
    try {
      const res = await fetch("/api/brands/rewrite-generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ categoryId: selectedBrandId, slotValues }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSections(data.sections);
      if (data.taskId) setCurrentTaskId(data.taskId);
    } catch (err) {
      setError((err as Error).message);
    }
    setGenerating(false);
  };

  // 重写单个段落
  const handleRewriteSection = async (name: keyof ArticleSectionsV2) => {
    setRewriting(name);
    try {
      const res = await fetch("/api/rewrite-section", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sections, sectionName: name }),
      });
      const updated = await res.json();
      setSections(updated);
    } catch (err) {
      alert("重写失败: " + (err as Error).message);
    }
    setRewriting(null);
  };

  const updateSection = (key: keyof ArticleSectionsV2, value: string) => {
    setSections((prev) => ({ ...prev, [key]: value }));
  };

  const brandTemplate = selectedBrand?.style_dna?.brand_template as Record<string, unknown> | undefined;
  const hasTemplate = !!brandTemplate;
  const articleCount = selectedBrand?.writing_samples_count ?? 0;

  const fullText = `${sections.painPoint}\n\n${sections.transition}\n\n${sections.productIntro}\n\n${sections.brandIntro}\n\n${sections.ctaHook}`;

  return (
    <div className="flex h-[calc(100vh-64px)]">
      {/* 操作区 40% */}
      <div className="w-[40%] min-w-[220px] relative overflow-y-auto scrollbar-hide p-5 space-y-5">
        {/* 居中分割线 */}
        <div className="absolute top-0 bottom-0 -right-1.5 w-px bg-border" />

        {/* 品牌选择 */}
        <section>
          <div className="flex items-center gap-1 mb-2">
            <span className="w-0.5 h-2 rounded-full bg-amber flex-shrink-0" />
            <span className="text-[16px] font-medium text-ink">选择品牌</span>
          </div>
          <div className="rounded-xl bg-surface border border-border p-3 space-y-2">
            <select
              value={selectedBrandId}
              onChange={(e) => handleSelectBrand(e.target.value)}
              className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-[14px] text-ink
                         focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20
                         transition-colors duration-200 appearance-none cursor-pointer"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23737373' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
                backgroundRepeat: "no-repeat",
                backgroundPosition: "right 7px center",
                paddingRight: "18px",
              }}
            >
              <option value="">从品牌知识库选择...</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}（{b.writing_samples_count} 篇范文）
                </option>
              ))}
            </select>

            {selectedBrand && (
              <div className="flex items-center justify-between text-[13px]">
                <span className="text-muted/60">
                  {hasTemplate
                    ? `✅ 模板已提取 · ${articleCount} 篇范文`
                    : articleCount >= 3
                      ? `⚠ 可提取模板（${articleCount} 篇）`
                      : `📝 范文积累中（${articleCount}/3）`}
                </span>
                {articleCount >= 3 && (
                  <button
                    onClick={handleExtractTemplate}
                    disabled={extracting}
                    className="text-[13px] text-amber hover:text-amber/80 transition-colors disabled:opacity-40 font-medium"
                  >
                    {extracting ? "提取中..." : hasTemplate ? "重新提取" : "提取模板"}
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* 新想法输入 */}
        <section>
          <div className="flex items-center gap-1 mb-2">
            <span className="w-0.5 h-2 rounded-full bg-amber flex-shrink-0" />
            <span className="text-[16px] font-medium text-ink">新想法</span>
          </div>
          <div className="rounded-xl bg-surface border border-border p-3 space-y-2">
            <p className="text-[13px] text-muted/50 leading-relaxed">
              像聊天一样告诉我这次的切入点：想结合什么热点？换什么场景？突出什么情绪？
            </p>
            <textarea
              value={rawIdea}
              onChange={(e) => setRawIdea(e.target.value)}
              placeholder={`这次想结合毕业季来写防晒…
新关键词：青春不散场，白到发光…
想换的场景：上次写的通勤，这次写户外音乐节…
语气要比之前更轻松一点`}
              className="w-full min-h-[140px] rounded-lg border border-border bg-paper px-2 py-1.5 text-[14px] text-ink
                         placeholder:text-muted/40 resize-y
                         focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20
                         transition-colors duration-200"
            />
            <button
              onClick={handleParseIdea}
              disabled={parsing || !rawIdea.trim() || !hasTemplate}
              className="w-full px-3 py-1.5 text-[16px] font-bold rounded-lg transition-all duration-300
                         disabled:opacity-40 disabled:cursor-not-allowed
                         text-white hover:shadow-lg hover:shadow-amber/25 active:scale-[0.98]"
              style={{
                backgroundImage: "linear-gradient(to right, #1700a6, #2563eb, #007cc2, #4816ff, #1700a6)",
                backgroundSize: "300% 100%",
              }}
            >
              {parsing ? "解析中..." : !hasTemplate ? "请先提取品牌模板" : "解析新想法 →"}
            </button>

            {slotValues && (
              <div className="bg-paper rounded-lg border border-border p-2 space-y-1 max-h-[200px] overflow-y-auto">
                <span className="text-[12px] font-medium text-amber">已解析的槽位值：</span>
                {Object.entries(slotValues).map(([k, v]) => (
                  <div key={k} className="text-[12px]">
                    <span className="text-muted/50">{k}：</span>
                    <span className="text-ink">{Array.isArray(v) ? (v as string[]).join("、") : v as string}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>

      {/* 结果区 60% */}
      <div className="w-[60%] overflow-y-auto scrollbar-hide p-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm mb-4 flex items-center justify-between">
            <span>❌ {error}</span>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600 ml-3">✕</button>
          </div>
        )}

        {/* 生成按钮 */}
        {slotValues && (
          <div className="mb-4">
            <button
              onClick={handleGenerate}
              disabled={generating}
              className={`w-full px-3 py-1.5 text-[16px] font-bold rounded-lg transition-all duration-300
                disabled:cursor-wait
                ${generating
                  ? "bg-amber/80 text-white animate-breathe"
                  : "text-white hover:shadow-lg hover:shadow-amber/25 active:scale-[0.98]"
                }`}
              style={generating ? undefined : {
                backgroundImage: "linear-gradient(to right, #1700a6, #2563eb, #007cc2, #4816ff, #1700a6)",
                backgroundSize: "300% 100%",
              }}
            >
              {generating ? "生成中..." : "生成洗稿爆文"}
            </button>
          </div>
        )}

        {/* 爆文输出 */}
        {sections.painPoint || sections.transition || sections.productIntro ? (
          <div className="space-y-2">
            <div className="rounded-xl bg-surface border border-border p-4">
              {([
                { key: "painPoint" as const, label: "痛点场景" },
                { key: "transition" as const, label: "转折引入" },
                { key: "productIntro" as const, label: "产品介绍" },
                { key: "brandIntro" as const, label: "品牌背书" },
                { key: "ctaHook" as const, label: "CTA 钩子" },
              ]).map(({ key, label }, i) => (
                <div key={key}>
                  <SectionEditor
                    label={label}
                    content={sections[key]}
                    onChange={(v) => updateSection(key, v)}
                    onRewrite={() => handleRewriteSection(key)}
                    loading={rewriting === key}
                  />
                  {i < 4 && (
                    <div className="py-4">
                      <hr className="border-t border-dashed border-border" />
                    </div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => navigator.clipboard.writeText(fullText)}
              className="text-[14px] text-muted/50 hover:text-amber transition-colors font-medium"
            >
              复制全文
            </button>
          </div>
        ) : (
          <div className="rounded-xl bg-surface border border-border p-8 text-center">
            <p className="text-[14px] text-muted/40 leading-relaxed">
              {!selectedBrandId
                ? "← 先在左侧选择一个品牌"
                : !hasTemplate
                  ? "← 先提取品牌模板（需 3 篇以上范文）"
                  : !slotValues
                    ? "← 输入新想法并点击解析"
                    : "↑ 点击「生成洗稿爆文」按钮"}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
