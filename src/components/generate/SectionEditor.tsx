"use client";

interface Props {
  label: string;
  content: string;
  onChange: (content: string) => void;
  onRewrite: () => void;
  loading: boolean;
}

export default function SectionEditor({ label, content, onChange, onRewrite, loading }: Props) {
  return (
    <div className="space-y-3">
      <span className="text-[20px] font-medium text-muted/70">
        {label}
      </span>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[100px] rounded-[16px] border border-border bg-surface px-4 py-3 text-[20px] text-ink
                   placeholder:text-muted/40 resize-y
                   focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20
                   transition-colors duration-200"
      />
      <button
        onClick={onRewrite}
        disabled={loading}
        className="text-[20px] text-amber hover:text-amber/80 transition-colors disabled:opacity-30 font-medium"
      >
        {loading ? "重写中..." : "改写"}
      </button>
    </div>
  );
}
