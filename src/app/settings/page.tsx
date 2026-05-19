"use client";

import { useState, useEffect } from "react";

export default function SettingsPage() {
  const [anthropicKey, setAnthropicKey] = useState("");
  const [deepseekKey, setDeepseekKey] = useState("");
  const [embeddingKey, setEmbeddingKey] = useState("");
  const [provider, setProvider] = useState("deepseek");
  const [preferredModel, setPreferredModel] = useState("deepseek-v4-pro");
  const [extractionModel, setExtractionModel] = useState("deepseek-v4-pro");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((d) => {
        setPreferredModel(d.preferredModel);
        setExtractionModel(d.extractionModel);
        setProvider(d.provider || "anthropic");
      })
      .catch(() => {});
  }, []);

  const handleSave = async () => {
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        anthropicApiKey: anthropicKey || undefined,
        deepseekApiKey: deepseekKey || undefined,
        embeddingApiKey: embeddingKey || undefined,
        provider,
        preferredModel,
        extractionModel,
      }),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    }
  };

  return (
    <div className="max-w-2xl py-16">
      <h1 className="font-sans text-[70px] font-bold text-ink tracking-tight mb-12">
        设置
      </h1>

      {/* API 密钥 */}
      <section className="rounded-xl border border-border bg-surface p-8 mb-6">
        <div className="flex items-center gap-2.5 mb-7">
          <span className="w-1.5 h-1.5 rounded-full bg-amber" />
          <h2 className="text-[32px] font-medium text-ink">API 密钥</h2>
        </div>
        <div className="space-y-5">
          {[
            { label: "Claude API Key", value: anthropicKey, setter: setAnthropicKey, placeholder: "sk-ant-..." },
            { label: "DeepSeek API Key", value: deepseekKey, setter: setDeepseekKey, placeholder: "sk-..." },
            { label: "Embedding API Key", value: embeddingKey, setter: setEmbeddingKey, placeholder: "..." },
          ].map((f) => (
            <div key={f.label}>
              <label className="block text-[20px] font-medium text-muted/70 mb-2">{f.label}</label>
              <input
                type="password"
                value={f.value}
                onChange={(e) => f.setter(e.target.value)}
                placeholder={f.placeholder}
                className="w-full h-10 rounded-[16px] border border-border bg-paper px-3.5 text-[20px] text-ink placeholder:text-muted/40 focus:outline-none focus:border-amber/50 transition-colors"
              />
            </div>
          ))}
        </div>
      </section>

      {/* LLM 供应商 */}
      <section className="rounded-xl border border-border bg-surface p-8 mb-6">
        <div className="flex items-center gap-2.5 mb-7">
          <span className="w-1.5 h-1.5 rounded-full bg-amber" />
          <h2 className="text-[32px] font-medium text-ink">LLM 供应商</h2>
        </div>
        <select
          value={provider}
          onChange={(e) => setProvider(e.target.value)}
          className="w-full h-10 rounded-[16px] border border-border bg-paper px-3.5 text-[20px] text-ink focus:outline-none focus:border-amber/50 transition-colors appearance-none"
        >
          <option value="anthropic">Anthropic (Claude)</option>
          <option value="deepseek">DeepSeek</option>
        </select>
      </section>

      {/* 模型选择 */}
      <section className="rounded-xl border border-border bg-surface p-8 mb-10">
        <div className="flex items-center gap-2.5 mb-7">
          <span className="w-1.5 h-1.5 rounded-full bg-amber" />
          <h2 className="text-[32px] font-medium text-ink">模型选择</h2>
        </div>
        <div className="grid grid-cols-2 gap-8">
          <div>
            <label className="block text-[20px] font-medium text-muted/70 mb-2">生成模型</label>
            <select
              value={preferredModel}
              onChange={(e) => setPreferredModel(e.target.value)}
              className="w-full h-10 rounded-[16px] border border-border bg-paper px-3.5 text-[20px] text-ink focus:outline-none focus:border-amber/50 transition-colors appearance-none"
            >
              {provider === "anthropic" ? (
                <>
                  <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                  <option value="claude-opus-4-7">Claude Opus 4.7</option>
                  <option value="claude-sonnet-4-5">Claude Sonnet 4.5</option>
                  <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
                </>
              ) : (
                <>
                  <option value="deepseek-v4-pro">DeepSeek V4 Pro</option>
                  <option value="deepseek-v3">DeepSeek V3</option>
                </>
              )}
            </select>
          </div>
          <div>
            <label className="block text-[20px] font-medium text-muted/70 mb-2">提取模型</label>
            <select
              value={extractionModel}
              onChange={(e) => setExtractionModel(e.target.value)}
              className="w-full h-10 rounded-[16px] border border-border bg-paper px-3.5 text-[20px] text-ink focus:outline-none focus:border-amber/50 transition-colors appearance-none"
            >
              {provider === "anthropic" ? (
                <>
                  <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
                  <option value="claude-sonnet-4-6">Claude Sonnet 4.6</option>
                </>
              ) : (
                <>
                  <option value="deepseek-v4-pro">DeepSeek V4 Pro</option>
                  <option value="deepseek-v3">DeepSeek V3</option>
                </>
              )}
            </select>
          </div>
        </div>
      </section>

      <button
        onClick={handleSave}
        className="px-10 py-2.5 bg-amber text-white text-[32px] font-medium tracking-wide rounded-[16px] hover:bg-amber/90 transition-colors"
      >
        {saved ? "已保存" : "保存设置"}
      </button>
    </div>
  );
}
