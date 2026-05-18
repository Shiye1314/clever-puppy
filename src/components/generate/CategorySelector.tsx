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
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="prose-input text-xs w-full mt-2"
    >
      <option value="">通用（全局风格）</option>
      {categories.map((cat) => (
        <option key={cat.id} value={cat.id}>
          {cat.name}（{cat.writing_samples_count} 篇范文）
        </option>
      ))}
    </select>
  );
}
