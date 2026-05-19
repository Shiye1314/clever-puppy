"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/lib/supabase/client";
import type { Task } from "@/lib/types";

interface Props {
  onSelectTask: (task: Task) => void;
}

export default function HistorySidebar({ onSelectTask }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [tasks, setTasks] = useState<Task[]>([]);

  const loadTasks = useCallback(async () => {
    const { data } = await supabase
      .from("tasks")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(100);
    if (data) setTasks(data as Task[]);
  }, []);

  useEffect(() => {
    loadTasks();
  }, [loadTasks]);

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    await supabase.from("tasks").delete().eq("id", id);
    loadTasks();
  };

  return (
    <aside
      className={`fixed left-0 top-[135px] bottom-0 z-30 border-r border-border bg-paper transition-all duration-300 ${
        expanded ? "w-60" : "w-[72px]"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex h-10 w-full items-center justify-center border-b border-border text-muted/60 hover:text-ink transition-colors"
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
        <div className="overflow-y-auto h-[calc(100%-40px)]">
          <p className="px-4 py-3 text-[28px] text-muted/50 font-medium tracking-wide">
            历史记录
          </p>
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onSelectTask(task)}
              className="group flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-amber/[0.04] transition-colors"
            >
              <div className="min-w-0 flex-1">
                <p className="text-[28px] text-ink truncate leading-snug">
                  {task.title || task.task_type}
                </p>
                <p className="text-[26px] text-muted/50 mt-0.5">
                  {new Date(task.created_at).toLocaleDateString("zh-CN")}
                </p>
              </div>
              <button
                onClick={(e) => handleDelete(task.id, e)}
                className="ml-2 text-muted/40 opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all text-[28px] shrink-0"
                title="删除"
              >
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <path d="M3 3l6 6M9 3l-6 6" />
                </svg>
              </button>
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="px-4 py-10 text-[28px] text-muted/30 text-center">
              暂无记录
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
