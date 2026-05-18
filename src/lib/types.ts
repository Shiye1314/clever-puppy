// 产品信息卡
export interface ProductCard {
  productName: string;
  sellingPoints: string[];
  targetPainPoint: string;
  usageScenario: string;
  competitorDiff: string;
  brandTone?: string;
}

// 三段式爆文
export interface ArticleSections {
  hook: string;
  transition: string;
  sellingPoints: string;
}

// 生成结果
export interface GenerationResult {
  sections: ArticleSections;
  metadata: {
    styleMatch: number;
    similarSentenceWarnings: string[];
    rewriteNotes: string;
  };
}

// 风格DNA
export interface StyleDNA {
  openings: { patterns: string[]; styles: string[] };
  closings: { patterns: string[]; interaction_triggers: boolean };
  paragraph_rhythm: {
    short_sentence_ratio: number;
    exclamation_density: string;
    line_break_frequency: string;
  };
  emoji_usage: {
    frequency: string;
    preferred: string[];
    position: string;
  };
  pronouns: {
    first_person: string;
    second_person: string;
    style: string;
  };
  title_formulas: string[];
  keywords_high_freq: string[];
  tone: string;
}

// 任务记录
export interface Task {
  id: string;
  task_type: string;
  module: string;
  title: string;
  input_data: {
    rawContent?: string;
    fileName?: string;
    productCard?: ProductCard;
  };
  product_card: ProductCard | null;
  output_data: ArticleSections | null;
  metadata: Record<string, unknown>;
  status: string;
  created_at: string;
  updated_at: string;
}
