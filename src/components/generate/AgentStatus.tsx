"use client";

import { useState, useEffect } from "react";

interface Props {
  agents: {
    extraction: Record<string, unknown>;
    research: Record<string, unknown>;
    integration: Record<string, unknown>;
  } | null;
  generating: boolean;
}

const STAGES = [
  { key: "extraction", name: "信息提取" },
  { key: "research", name: "市场分析" },
  { key: "integration", name: "信息整合" },
  { key: "generation", name: "爆文生成" },
] as const;

export default function AgentStatus({ agents, generating }: Props) {
  const [progressIndex, setProgressIndex] = useState(0);

  // 生成过程中各阶段依次推进
  useEffect(() => {
    if (!generating) {
      setProgressIndex(0);
      return;
    }
    // 每 3 秒推进到下一阶段（模拟4阶段约12秒）
    const timer = setInterval(() => {
      setProgressIndex((prev) => Math.min(prev + 1, STAGES.length - 1));
    }, 3000);
    return () => clearInterval(timer);
  }, [generating]);

  if (!generating && !agents) return null;

  const getStatus = (i: number) => {
    if (agents) return "done";
    if (i === progressIndex) return "running";
    if (i < progressIndex) return "done";
    return "idle";
  };

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
    <div className="rounded-xl bg-surface border border-border p-2 mb-3">
      <div className="flex items-center gap-0">
        {STAGES.map((stage, i) => {
          const status = getStatus(i);
          return (
            <div key={stage.name} className="flex items-center gap-0 flex-1 last:flex-none">
              <div
                className={`flex items-center gap-1.5 py-1 px-2 rounded-md transition-colors duration-500 ${
                  status === "done"
                    ? "text-ink"
                    : status === "running"
                    ? "text-amber"
                    : "text-muted/30"
                }`}
              >
                {statusDot(status)}
                <span className="text-[14px] font-medium whitespace-nowrap">{stage.name}</span>
              </div>
              {i < STAGES.length - 1 && (
                <div
                  className={`flex-1 h-px mx-1 min-w-[8px] transition-colors duration-500 ${
                    status === "done" ? "bg-amber/30" : "bg-border/50"
                  }`}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
