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
      className={`fixed left-0 top-14 bottom-0 z-30 border-r border-border bg-paper transition-all duration-300 ${
        expanded ? "w-60" : "w-12"
      }`}
    >
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex h-10 w-full items-center justify-center border-b border-border text-muted hover:text-ink transition-colors"
        title={expanded ? "收起历史" : "展开历史"}
      >
        {expanded ? "⇤" : "☰"}
      </button>

      {expanded && (
        <div className="overflow-y-auto h-[calc(100%-40px)]">
          <p className="px-4 py-3 text-xs text-muted uppercase tracking-wider">
            历史记录
          </p>
          {tasks.map((task) => (
            <div
              key={task.id}
              onClick={() => onSelectTask(task)}
              className="group flex items-center justify-between px-4 py-2.5 cursor-pointer hover:bg-amber/5 transition-colors border-b border-border/50"
            >
              <div className="min-w-0 flex-1">
                <p className="text-xs text-ink truncate">
                  {task.title || task.task_type}
                </p>
                <p className="text-[10px] text-muted">
                  {new Date(task.created_at).toLocaleDateString("zh-CN")}
                </p>
              </div>
              <button
                onClick={(e) => handleDelete(task.id, e)}
                className="ml-2 text-muted opacity-0 group-hover:opacity-100 hover:text-red-500 transition-all text-xs"
              >
                ✕
              </button>
            </div>
          ))}
          {tasks.length === 0 && (
            <p className="px-4 py-6 text-xs text-muted text-center">
              暂无记录
            </p>
          )}
        </div>
      )}
    </aside>
  );
}
