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
        w-full px-3 py-1.5 text-[16px] font-bold rounded-lg transition-all duration-300
        disabled:cursor-wait
        ${loading
          ? "bg-amber/80 text-white animate-breathe"
          : "text-white animate-gradient-text hover:shadow-lg hover:shadow-amber/25 active:scale-[0.98]"
        }
      `}
      style={loading ? undefined : {
        backgroundImage: "linear-gradient(to right, #1700a6, #2563eb, #007cc2, #4816ff, #1700a6)",
        backgroundSize: "300% 100%",
      }}
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
