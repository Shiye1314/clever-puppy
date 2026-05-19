"use client";

import SellingPointInput from "./SellingPointInput";
import type { ProductCard } from "@/lib/types";

interface Props {
  card: ProductCard;
  onChange: (card: ProductCard) => void;
  loading: boolean;
}

export default function ProductCardForm({ card, onChange, loading }: Props) {
  const update = (field: keyof ProductCard, value: unknown) => {
    onChange({ ...card, [field]: value });
  };

  return (
    <div className="space-y-2.5">
      <label className="block space-y-0.5">
        <span className="text-[14px] font-medium text-muted/70">
          产品名
        </span>
        <input
          type="text"
          value={card.productName}
          onChange={(e) => update("productName", e.target.value)}
          placeholder="产品名称"
          className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-[14px] text-ink
                     placeholder:text-muted/40
                     focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20
                     transition-colors duration-200"
        />
      </label>

      <label className="block space-y-0.5">
        <span className="text-[14px] font-medium text-muted/70">
          核心卖点
        </span>
        <SellingPointInput
          points={card.sellingPoints}
          onChange={(sp) => update("sellingPoints", sp)}
        />
      </label>

      <label className="block space-y-0.5">
        <span className="text-[14px] font-medium text-muted/70">
          人群痛点
        </span>
        <input
          type="text"
          value={card.targetPainPoint}
          onChange={(e) => update("targetPainPoint", e.target.value)}
          placeholder="目标受众的核心痛点"
          className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-[14px] text-ink
                     placeholder:text-muted/40
                     focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20
                     transition-colors duration-200"
        />
      </label>

      <label className="block space-y-0.5">
        <span className="text-[14px] font-medium text-muted/70">
          使用场景
        </span>
        <input
          type="text"
          value={card.usageScenario}
          onChange={(e) => update("usageScenario", e.target.value)}
          placeholder="产品使用场景"
          className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-[14px] text-ink
                     placeholder:text-muted/40
                     focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20
                     transition-colors duration-200"
        />
      </label>

      <label className="block space-y-0.5">
        <span className="text-[14px] font-medium text-muted/70">
          竞品差异
        </span>
        <input
          type="text"
          value={card.competitorDiff}
          onChange={(e) => update("competitorDiff", e.target.value)}
          placeholder="与竞品的差异化优势"
          className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-[14px] text-ink
                     placeholder:text-muted/40
                     focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20
                     transition-colors duration-200"
        />
      </label>
    </div>
  );
}
