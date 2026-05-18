declare module "pptx-parser" {
  interface Slide {
    text: string;
  }

  interface PptxParser {
    parse(buffer: Buffer | ArrayBuffer): Promise<Slide[]>;
  }

  const pptxParser: PptxParser;
  export default pptxParser;
}
