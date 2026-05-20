"use client";

import { useState, useEffect, useCallback } from "react";
import type { Task } from "@/lib/types";

interface Props {
  onSelectTask: (task: Task) => void;
}

export default function HistorySidebar({ onSelectTask }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  const loadTasks = useCallback(async () => {
    const res = await fetch("/api/tasks");
    const data = await res.json();
    if (Array.isArray(data)) setTasks(data as Task[]);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch(`/api/tasks?id=${id}`, { method: "DELETE" });
    loadTasks();
  };

  return (
    <aside
      className={`fixed left-0 top-[64px] bottom-0 z-30 border-r border-border bg-paper transition-all duration-300 ${
        expanded ? "w-[120px]" : "w-[36px]"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex h-5 w-full items-center justify-center border-b border-border text-muted/60 hover:text-ink transition-colors"
        title={expanded ? "收起" : "展开"}
      >
        {expanded ? (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M10 4l-4 4 4 4" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M3 4h10M3 8h10M3 12h10" />
          </svg>
        )}
      </button>

      {expanded && (
        <div className="overflow-y-auto h-[calc(100%-20px)]">
          <p className="px-2 py-1.5 text-[14px] text-muted/50 font-medium tracking-wide">
            历史记录
          </p>
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onSelectTask(task)}
              className="group flex items-center justify-between px-2 py-1.5 cursor-pointer hover:bg-amber/[0.04] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[14px] text-ink truncate leading-snug">
                  {task.title || task.task_type}
                </p>
                <p className="text-[13px] text-muted/50 mt-0.5">
                  {new Date(task.created_at).toLocaleDateString("zh-CN")}
                </p>
              </div>
              <button
                onClick={(e) => handleDelete(task.id, e)}
                className="ml-1 text-muted/40 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all text-[14px] shrink-0"
                title="删除"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 3l6 6M9 3l-6 6" />
                </svg>
              </button>
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="px-2 py-5 text-[14px] text-muted/30 text-center">
              暂无记录
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
