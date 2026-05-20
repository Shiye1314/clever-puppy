"use client";

import { useState } from "react";
import TopNav from "./TopNav";
import HistorySidebar from "./HistorySidebar";
import type { Task } from "@/lib/types";

export default function AppShell({ children }: { children: React.ReactNode }) {
  const [pendingRestore, setPendingRestore] = useState<Task | null>(null);

  return (
    <>
      <TopNav />
      <HistorySidebar onSelectTask={setPendingRestore} />
      <main className="pt-[64px] pl-[36px] min-h-screen">
        <div className="mx-auto max-w-[1200px] min-h-[calc(100vh-64px)] pr-6">
          {children}
        </div>
      </main>
    </>
  );
}
