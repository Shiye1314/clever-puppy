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
    <div className="max-w-2xl mx-auto px-8 py-16">
      <h1 className="font-serif text-3xl text-ink mb-12">设置</h1>

      <div className="space-y-10">
        <section>
          <h2 className="text-sm text-muted uppercase tracking-wider mb-4">API 密钥</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-ink mb-1.5">Claude API Key</label>
              <input
                type="password"
                value={anthropicKey}
                onChange={(e) => setAnthropicKey(e.target.value)}
                placeholder="sk-ant-..."
                className="w-full prose-input"
              />
            </div>
            <div>
              <label className="block text-sm text-ink mb-1.5">DeepSeek API Key</label>
              <input
                type="password"
                value={deepseekKey}
                onChange={(e) => setDeepseekKey(e.target.value)}
                placeholder="sk-..."
                className="w-full prose-input"
              />
            </div>
            <div>
              <label className="block text-sm text-ink mb-1.5">Voyage API Key</label>
              <input
                type="password"
                value={embeddingKey}
                onChange={(e) => setEmbeddingKey(e.target.value)}
                placeholder="..."
                className="w-full prose-input"
              />
            </div>
          </div>
        </section>

        <section>
          <h2 className="text-sm text-muted uppercase tracking-wider mb-4">LLM 供应商</h2>
          <select
            value={provider}
            onChange={(e) => setProvider(e.target.value)}
            className="w-full prose-input"
          >
            <option value="anthropic">Anthropic (Claude)</option>
            <option value="deepseek">DeepSeek</option>
          </select>
        </section>

        <section>
          <h2 className="text-sm text-muted uppercase tracking-wider mb-4">模型选择</h2>
          <div className="grid grid-cols-2 gap-6">
            <div>
              <label className="block text-sm text-ink mb-1.5">生成模型</label>
              <select
                value={preferredModel}
                onChange={(e) => setPreferredModel(e.target.value)}
                className="w-full prose-input"
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
              <label className="block text-sm text-ink mb-1.5">提取模型</label>
              <select
                value={extractionModel}
                onChange={(e) => setExtractionModel(e.target.value)}
                className="w-full prose-input"
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
          className="px-8 py-2.5 border border-amber text-amber text-sm hover:bg-amber hover:text-white transition-all duration-300"
        >
          {saved ? "已保存" : "保存设置"}
        </button>
      </div>
    </div>
  );
}
