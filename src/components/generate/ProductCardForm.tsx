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
    <div className="space-y-4">
      <input
        type="text"
        value={card.productName}
        onChange={(e) => update("productName", e.target.value)}
        placeholder="产品名"
        className="w-full prose-input text-sm"
      />

      <SellingPointInput
        points={card.sellingPoints}
        onChange={(sp) => update("sellingPoints", sp)}
      />

      <input
        type="text"
        value={card.targetPainPoint}
        onChange={(e) => update("targetPainPoint", e.target.value)}
        placeholder="人群痛点"
        className="w-full prose-input text-sm"
      />

      <input
        type="text"
        value={card.usageScenario}
        onChange={(e) => update("usageScenario", e.target.value)}
        placeholder="使用场景"
        className="w-full prose-input text-sm"
      />

      <input
        type="text"
        value={card.competitorDiff}
        onChange={(e) => update("competitorDiff", e.target.value)}
        placeholder="竞品差异"
        className="w-full prose-input text-sm"
      />
    </div>
  );
}
