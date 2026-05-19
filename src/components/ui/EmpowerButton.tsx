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
        w-full px-3 py-1.5 text-[16px] font-medium rounded-lg transition-all duration-300
        disabled:cursor-wait
        ${loading
          ? "bg-amber/80 text-white animate-breathe"
          : "bg-amber text-white hover:bg-amber/90 active:scale-[0.98]"
        }
      `}
    >
      {loading ? (
        <span className="inline-flex items-center justify-center gap-1">
          <span className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
          生成中...
        </span>
      ) : (
        "生成"
      )}
    </button>
  );
}
