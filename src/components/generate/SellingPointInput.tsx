"use client";

import { useRef, useEffect } from "react";

interface Props {
  points: string[];
  onChange: (points: string[]) => void;
}

export default function SellingPointInput({ points, onChange }: Props) {
  const composingRef = useRef(false);
  const newInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    newInputRef.current?.focus();
  }, [points.length]);

  const handleChange = (index: number, value: string) => {
    const updated = [...points];
    if (index < updated.length) {
      updated[index] = value;
    } else {
      updated.push(value);
    }
    onChange(updated.filter((p) => p !== ""));
  };

  const handleRemove = (index: number) => {
    onChange(points.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1">
      {points.map((point, i) => (
        <div key={i} className="flex items-center gap-2">
          <input
            type="text"
            value={point}
            onChange={(e) => handleChange(i, e.target.value)}
            placeholder={`核心卖点 ${i + 1}`}
            className="flex-1 rounded-lg border border-border bg-surface px-2 py-1.5 text-[14px] text-ink
                       placeholder:text-muted/40
                       focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20
                       transition-colors duration-200"
          />
          {points.length > 2 && (
            <button
              onClick={() => handleRemove(i)}
              className="w-6 h-6 flex items-center justify-center rounded-md text-muted/30 hover:text-muted hover:bg-border/30 transition-colors flex-shrink-0"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                <path d="M3 3l8 8M11 3l-8 8" />
              </svg>
            </button>
          )}
        </div>
      ))}
      {/* 新增空白输入 — 非受控模式，key 强制重建避免残留文字 */}
      <input
        ref={newInputRef}
        key={points.length}
        type="text"
        defaultValue=""
        onCompositionStart={() => { composingRef.current = true; }}
        onCompositionEnd={(e) => {
          composingRef.current = false;
          const val = e.currentTarget.value;
          if (val) handleChange(points.length, val);
        }}
        onChange={(e) => {
          if (composingRef.current) return;
          if (e.target.value) handleChange(points.length, e.target.value);
        }}
        placeholder={`核心卖点 ${points.length + 1}`}
        className="w-full rounded-lg border border-border bg-surface px-2 py-1.5 text-[14px] text-ink
                   placeholder:text-muted/40
                   focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20
                   transition-colors duration-200"
      />
    </div>
  );
}
