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
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const autoResize = () => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = el.scrollHeight + "px";
    }
  };

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
    <div className="space-y-1.5">
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => fileRef.current?.click()}
        className="rounded-lg border border-border bg-surface px-4 py-4 text-center cursor-pointer
                   hover:border-amber/50 hover:bg-amber-light/10 transition-all duration-300"
      >
        <input
          ref={fileRef}
          type="file"
          accept=".txt,.pdf,.docx,.doc,.pptx"
          className="hidden"
          onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
        />
        {loading ? (
          <p className="text-[14px] text-muted/50">解析中...</p>
        ) : (
          <>
            <p className="text-[14px] text-muted">
              拖拽文件到此处，或点击上传
            </p>
            <p className="text-[14px] text-muted/40 mt-0.5">
              PDF / PPT / Word / 纯文本
            </p>
          </>
        )}
      </div>

      <textarea
        ref={textareaRef}
        placeholder="或直接粘贴产品资料"
        className="w-full min-h-[150px] rounded-lg border border-border bg-surface px-2 py-1.5 text-[14px] text-ink
                   placeholder:text-muted/40 resize-none
                   focus:outline-none focus:border-amber/50 focus:ring-1 focus:ring-amber/20
                   transition-colors duration-200"
        onInput={autoResize}
        onBlur={(e) => {
          if (e.target.value.trim()) handlePasteText(e.target.value.trim());
        }}
      />

      {preview && (
        <div className="rounded-lg bg-amber-light/20 px-2 py-1.5 text-[14px] text-muted leading-relaxed">
          <p className="text-ink font-medium mb-0.5">
            {fileName || "预览"}
          </p>
          <p className="line-clamp-4">{preview}</p>
        </div>
      )}
    </div>
  );
}
