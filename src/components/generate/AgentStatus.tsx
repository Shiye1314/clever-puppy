"use client";

interface AgentState {
  name: string;
  icon: string;
  status: "idle" | "running" | "done";
  summary?: string;
}

interface Props {
  agents: {
    extraction: Record<string, unknown>;
    research: Record<string, unknown>;
    integration: Record<string, unknown>;
  } | null;
  generating: boolean;
}

export default function AgentStatus({ agents, generating }: Props) {
  const stages: AgentState[] = [
    {
      name: "信息提取",
      icon: "📄",
      status: agents ? "done" : generating ? "running" : "idle",
      summary: agents?.extraction
        ? `产品「${(agents.extraction as Record<string, string>).productName || "..."}」`
        : undefined,
    },
    {
      name: "市场分析",
      icon: "🔍",
      status: agents ? "done" : generating ? "running" : "idle",
      summary: agents?.research
        ? `${((agents.research as Record<string, unknown>).painScenarios as string[])?.[0]?.slice(0, 30) || ""}...`
        : undefined,
    },
    {
      name: "信息整合",
      icon: "🧩",
      status: agents ? "done" : "idle",
      summary: agents?.integration ? "简报已生成" : undefined,
    },
    {
      name: "爆文生成",
      icon: "✨",
      status: agents ? "done" : generating ? "idle" : "idle",
      summary: agents ? "三段爆文已输出" : undefined,
    },
  ];

  if (!generating && !agents) return null;

  return (
    <div className="space-y-1.5 mb-4">
      {stages.map((stage) => (
        <div
          key={stage.name}
          className={`flex items-center gap-2.5 text-xs transition-all duration-500 ${
            stage.status === "done"
              ? "text-ink"
              : stage.status === "running"
              ? "text-amber"
              : "text-muted/40"
          }`}
        >
          <span className="w-4 text-center">{stage.icon}</span>
          <span className="w-16 flex-shrink-0">{stage.name}</span>
          {stage.status === "running" && (
            <span className="flex gap-0.5">
              <span className="w-1 h-1 bg-amber rounded-full animate-pulse" style={{ animationDelay: "0ms" }} />
              <span className="w-1 h-1 bg-amber rounded-full animate-pulse" style={{ animationDelay: "150ms" }} />
              <span className="w-1 h-1 bg-amber rounded-full animate-pulse" style={{ animationDelay: "300ms" }} />
            </span>
          )}
          {stage.status === "done" && stage.summary && (
            <span className="text-muted truncate">{stage.summary}</span>
          )}
          {stage.status === "done" && (
            <span className="text-amber ml-auto">✓</span>
          )}
        </div>
      ))}
    </div>
  );
}
