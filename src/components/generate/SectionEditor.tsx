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
    <div className="space-y-2">
      <span className="text-xs text-muted uppercase tracking-wider">{label}</span>
      <textarea
        value={content}
        onChange={(e) => onChange(e.target.value)}
        className="w-full min-h-[120px] prose-input text-sm resize-y"
      />
      <button
        onClick={onRewrite}
        disabled={loading}
        className="text-xs text-muted hover:text-amber transition-colors disabled:opacity-40"
      >
        {loading ? "重写中..." : "🔄 重写"}
      </button>
    </div>
  );
}
