"use client";

import SectionEditor from "./SectionEditor";
import type { ArticleSectionsV2 } from "@/lib/agents/generator";

interface Props {
  sections: ArticleSectionsV2;
  onChange: (sections: ArticleSectionsV2) => void;
  onRewriteSection: (name: keyof ArticleSectionsV2) => void;
  loading: string | null;
}

export default function ArticleResult({ sections, onChange, onRewriteSection, loading }: Props) {
  const update = (field: keyof ArticleSectionsV2, value: string) => {
    onChange({ ...sections, [field]: value });
  };

  const fullText = `${sections.painPoint}\n\n${sections.transition}\n\n${sections.productIntro}\n\n${sections.brandIntro}\n\n${sections.ctaHook}`;

  const editors: Array<{ key: keyof ArticleSectionsV2; label: string }> = [
    { key: "painPoint", label: "痛点场景" },
    { key: "transition", label: "转折引入" },
    { key: "productIntro", label: "产品介绍" },
    { key: "brandIntro", label: "品牌背书" },
    { key: "ctaHook", label: "CTA 钩子" },
  ];

  return (
    <div className="space-y-4">
      {editors.map(({ key, label }) => (
        <div key={key} className="rounded-xl bg-surface border border-border p-5">
          <SectionEditor
            label={label}
            content={sections[key]}
            onChange={(v) => update(key, v)}
            onRewrite={() => onRewriteSection(key)}
            loading={loading === key}
          />
        </div>
      ))}
      <div className="pt-2">
        <button
          onClick={() => navigator.clipboard.writeText(fullText)}
          className="text-[28px] text-muted/50 hover:text-amber transition-colors font-medium"
        >
          复制全文
        </button>
      </div>
    </div>
  );
}
