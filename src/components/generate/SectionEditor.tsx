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
    <div className="space-y-1.5">
      <span className="text-[14px] font-medium text-muted/70">
        {label}
      </span>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[50px] rounded-lg border border-border bg-surface px-2 py-1.5 text-[14px] text-ink
                   placeholder:text-muted/40 resize-y
                   focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20
                   transition-colors duration-200"
      />
      <button
        onClick={onRewrite}
        disabled={loading}
        className="text-[14px] text-amber hover:text-amber/80 transition-colors disabled:opacity-30 font-medium"
      >
        {loading ? "重写中..." : "改写"}
      </button>
    </div>
  );
}
