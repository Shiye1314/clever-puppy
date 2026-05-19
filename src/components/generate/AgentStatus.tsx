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
      icon: "",
      status: agents ? "done" : generating ? "running" : "idle",
      summary: agents?.extraction
        ? `产品「${(agents.extraction as Record<string, string>).productName || "..."}」`
        : undefined,
    },
    {
      name: "市场分析",
      icon: "",
      status: agents ? "done" : generating ? "running" : "idle",
      summary: agents?.research
        ? `${((agents.research as Record<string, unknown>).painScenarios as string[])?.[0]?.slice(0, 30) || ""}...`
        : undefined,
    },
    {
      name: "信息整合",
      icon: "",
      status: agents ? "done" : "idle",
      summary: agents?.integration ? "简报已生成" : undefined,
    },
    {
      name: "爆文生成",
      icon: "",
      status: agents ? "done" : generating ? "idle" : "idle",
      summary: agents ? "三段爆文已输出" : undefined,
    },
  ];

  if (!generating && !agents) return null;

  const statusDot = (status: string) => {
    if (status === "done")
      return <span className="w-2 h-2 rounded-full bg-amber flex-shrink-0" />;
    if (status === "running")
      return (
        <span className="w-2 h-2 rounded-full bg-amber flex-shrink-0 relative">
          <span className="absolute inset-0 w-2 h-2 rounded-full bg-amber animate-ping opacity-75" />
        </span>
      );
    return <span className="w-2 h-2 rounded-full bg-border flex-shrink-0" />;
  };

  return (
    <div className="rounded-xl bg-surface border border-border p-4 mb-6">
      <div className="flex items-center gap-0">
        {stages.map((stage, i) => (
          <div key={stage.name} className="flex items-center gap-0 flex-1 last:flex-none">
            <div
              className={`flex items-center gap-2.5 py-1 px-2 rounded-md transition-colors duration-500 ${
                stage.status === "done"
                  ? "text-ink"
                  : stage.status === "running"
                  ? "text-amber"
                  : "text-muted/30"
              }`}
            >
              {statusDot(stage.status)}
              <span className="text-[28px] font-medium whitespace-nowrap">{stage.name}</span>
              {stage.status === "done" && stage.summary && (
                <span className="text-muted/50 text-[26px] truncate max-w-[120px]">{stage.summary}</span>
              )}
            </div>
            {i < stages.length - 1 && (
              <div className={`flex-1 h-px mx-1 min-w-[16px] transition-colors duration-500 ${
                stage.status === "done" ? "bg-amber/30" : "bg-border/50"
              }`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
