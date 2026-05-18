"use client";

import SectionEditor from "./SectionEditor";
import type { ArticleSections } from "@/lib/types";

interface Props {
  sections: ArticleSections;
  onChange: (sections: ArticleSections) => void;
  onRewriteSection: (name: "hook" | "transition" | "sellingPoints") => void;
  loading: string | null;
}

export default function ArticleResult({ sections, onChange, onRewriteSection, loading }: Props) {
  const update = (field: keyof ArticleSections, value: string) => {
    onChange({ ...sections, [field]: value });
  };

  const fullText = `${sections.hook}\n\n${sections.transition}\n\n${sections.sellingPoints}`;

  return (
    <div className="space-y-6">
      <SectionEditor
        label="🪝 钩子段"
        content={sections.hook}
        onChange={(v) => update("hook", v)}
        onRewrite={() => onRewriteSection("hook")}
        loading={loading === "hook"}
      />

      <SectionEditor
        label="🔀 过渡段"
        content={sections.transition}
        onChange={(v) => update("transition", v)}
        onRewrite={() => onRewriteSection("transition")}
        loading={loading === "transition"}
      />

      <SectionEditor
        label="💎 卖点段"
        content={sections.sellingPoints}
        onChange={(v) => update("sellingPoints", v)}
        onRewrite={() => onRewriteSection("sellingPoints")}
        loading={loading === "sellingPoints"}
      />

      <div className="flex gap-4 pt-4">
        <button
          onClick={() => navigator.clipboard.writeText(fullText)}
          className="text-xs text-muted hover:text-amber transition-colors"
        >
          📋 复制全文
        </button>
      </div>
    </div>
  );
}
