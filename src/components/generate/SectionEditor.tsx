"use client";

import { useRef, useEffect } from "react";

interface Props {
  label: string;
  content: string;
  onChange: (content: string) => void;
  onRewrite: () => void;
  loading: boolean;
}

export default function SectionEditor({ label, content, onChange, onRewrite, loading }: Props) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // 内容变化时自动调整高度
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = el.scrollHeight + "px";
  }, [content]);

  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[14px] font-medium text-muted/70">
          {label}
        </span>
        <button
          onClick={onRewrite}
          disabled={loading}
          className="px-1.5 py-0.5 text-[12px] font-semibold rounded-md bg-amber text-white
                     hover:bg-amber/90 active:scale-[0.97]
                     disabled:opacity-40 disabled:cursor-not-allowed
                     transition-all duration-200 shadow-sm"
        >
          {loading ? (
            <span className="inline-flex items-center gap-0.5">
              <span className="w-1 h-1 bg-white rounded-full animate-pulse" />
              ...
            </span>
          ) : (
            "改"
          )}
        </button>
      </div>
      <textarea
        ref={textareaRef}
        value={content}
        onChange={(e) => onChange(e.target.value)}
        rows={1}
        className="w-full min-h-[50px] rounded-md bg-paper px-2 py-1.5 text-[14px] text-ink leading-relaxed
                   placeholder:text-muted/40 resize-none overflow-hidden
                   focus:outline-none focus:bg-surface focus:ring-1 focus:ring-amber/20
                   transition-colors duration-200"
      />
    </div>
  );
}
