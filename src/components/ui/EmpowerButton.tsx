"use client";

interface Props {
  onClick: () => void;
  loading: boolean;
}

export default function EmpowerButton({ onClick, loading }: Props) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className={`
        relative px-8 py-3 text-sm tracking-[0.2em] border transition-all duration-300
        disabled:cursor-wait
        ${loading
          ? "border-amber text-amber animate-breathe"
          : "border-muted/30 text-muted hover:text-amber hover:border-amber"
        }
      `}
      style={{
        background: loading
          ? "linear-gradient(90deg, transparent 0%, rgba(200,146,43,0.06) 50%, transparent 100%)"
          : "transparent",
        backgroundSize: "200% 100%",
        animation: loading
          ? "flowLine 1.5s ease-in-out infinite, breathe 2s ease-in-out infinite"
          : undefined,
      }}
    >
      {loading ? (
        <span className="inline-flex items-center gap-2">
          <span className="w-1.5 h-1.5 bg-amber rounded-full animate-pulse" />
          赋能中...
        </span>
      ) : (
        "✦ 爆文赋能启动 ✦"
      )}
    </button>
  );
}
