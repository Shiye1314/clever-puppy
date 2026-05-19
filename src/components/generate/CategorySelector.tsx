"use client";

import { useState, useEffect } from "react";

interface Category {
  id: string;
  name: string;
  writing_samples_count: number;
}

interface Props {
  value: string;
  onChange: (categoryId: string) => void;
}

export default function CategorySelector({ value, onChange }: Props) {
  const [categories, setCategories] = useState<Category[]>([]);

  useEffect(() => {
    fetch("/api/categories")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setCategories(data);
      })
      .catch(() => {});
  }, []);

  return (
    <div className="space-y-0">
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[16px] border border-border bg-surface px-4 py-2.5 text-[20px] text-ink
                   focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20
                   transition-colors duration-200 appearance-none cursor-pointer"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23737373' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E")`,
          backgroundRepeat: "no-repeat",
          backgroundPosition: "right 14px center",
          paddingRight: "36px",
        }}
      >
        <option value="">通用（全局风格）</option>
        {categories.map((cat) => (
          <option key={cat.id} value={cat.id}>
            {cat.name}（{cat.writing_samples_count} 篇范文）
          </option>
        ))}
      </select>
    </div>
  );
}
