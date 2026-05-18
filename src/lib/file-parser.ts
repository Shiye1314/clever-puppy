import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import pptxParser from "pptx-parser";

export type ParsedFile = {
  text: string;
  pageCount?: number;
  fileName: string;
  fileType: string;
};

export async function parseFile(file: File): Promise<ParsedFile> {
  const fileName = file.name;
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  const buffer = Buffer.from(await file.arrayBuffer());

  switch (ext) {
    case "txt":
      return { text: new TextDecoder().decode(buffer), fileName, fileType: "txt" };

    case "pdf": {
      const parser = new PDFParse({ data: buffer });
      const data = await parser.getText();
      return { text: data.text, pageCount: data.total, fileName, fileType: "pdf" };
    }

    case "docx":
    case "doc": {
      const result = await mammoth.extractRawText({ buffer });
      return { text: result.value, fileName, fileType: "docx" };
    }

    case "pptx": {
      const slides = await pptxParser.parse(buffer);
      const text = slides.map((s: { text: string }) => s.text).join("\n");
      return { text, pageCount: slides.length, fileName, fileType: "pptx" };
    }

    default:
      throw new Error(`不支持的文件格式: .${ext}`);
  }
}
