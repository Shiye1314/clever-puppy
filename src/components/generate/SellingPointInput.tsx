"use client";

interface Props {
  points: string[];
  onChange: (points: string[]) => void;
}

export default function SellingPointInput({ points, onChange }: Props) {
  const handleChange = (index: number, value: string) => {
    const updated = [...points];
    if (index < updated.length) {
      updated[index] = value;
    } else {
      updated.push(value);
    }
    onChange(updated.filter((p) => p !== ""));
  };

  const handleRemove = (index: number) => {
    onChange(points.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-1.5">
      {points.map((point, i) => (
        <div key={i} className="flex items-center gap-1.5">
          <input
            type="text"
            value={point}
            onChange={(e) => handleChange(i, e.target.value)}
            placeholder={`核心卖点 ${i + 1}`}
            className="flex-1 prose-input text-sm"
          />
          {points.length > 2 && (
            <button
              onClick={() => handleRemove(i)}
              className="text-muted hover:text-red-500 text-xs transition-colors"
            >
              ✕
            </button>
          )}
        </div>
      ))}
      {/* 新增的空白输入 */}
      <input
        type="text"
        value=""
        onChange={(e) => {
          if (e.target.value) handleChange(points.length, e.target.value);
        }}
        placeholder={`核心卖点 ${points.length + 1}`}
        className="w-full prose-input text-sm"
      />
    </div>
  );
}
