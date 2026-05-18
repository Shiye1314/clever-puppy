"use client";

import { useState, useRef } from "react";

interface Props {
  onTextReady: (text: string, fileName?: string) => void;
}

export default function UploadZone({ onTextReady }: Props) {
  const [preview, setPreview] = useState("");
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setFileName(file.name);
    setLoading(true);
    try {
      const { parseFile } = await import("@/lib/file-parser");
      const parsed = await parseFile(file);
      setPreview(parsed.text.slice(0, 500));
      onTextReady(parsed.text, file.name);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const handlePasteText = (text: string) => {
    setPreview(text.slice(0, 500));
    setFileName("粘贴文字");
    onTextReady(text);
  };

  return (
    <div className="space-y-4">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="border border-dashed border-border rounded-sm p-8 text-center cursor-pointer
                   hover:border-amber transition-colors duration-200"
      >
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.pdf,.docx,.doc,.pptx"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {loading ? (
          <p className="text-sm text-muted">解析中...</p>
        ) : (
          <>
            <p className="text-sm text-muted mb-1">
              拖拽文件到此处，或点击上传
            </p>
            <p className="text-xs text-muted/60">
              支持 PDF、PPT、Word、纯文本
            </p>
          </>
        )}
      </div>

      <textarea
        placeholder="或直接粘贴产品资料文字..."
        className="w-full h-24 prose-input text-sm resize-none"
        onBlur={(e) => {
          if (e.target.value.trim()) handlePasteText(e.target.value.trim());
        }}
      />

      {preview && (
        <div className="text-xs text-muted leading-relaxed">
          <p className="text-ink font-medium mb-1">
            {fileName || "预览"}
          </p>
          <p className="line-clamp-4">{preview}</p>
        </div>
      )}
    </div>
  );
}
