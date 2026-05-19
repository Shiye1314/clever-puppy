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
      <main className="pt-[64px] pl-[120px] pr-[120px] min-h-screen">
        {children}
      </main>
    </>
  );
}
