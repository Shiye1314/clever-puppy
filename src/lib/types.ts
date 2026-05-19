// 产品信息卡
export interface ProductCard {
  productName: string;
  sellingPoints: string[];
  targetPainPoint: string;
  usageScenario: string;
  competitorDiff: string;
  brandTone?: string;
}

// 三段式爆文（旧版，保持向后兼容）
export interface ArticleSections {
  hook: string;
  transition: string;
  sellingPoints: string;
}

// 五段式爆文（升级版，匹配真实写作结构）
export interface ArticleSectionsV2 {
  painPoint: string;    // 痛点场景
  transition: string;   // 转折引入产品
  productIntro: string; // 产品介绍（卖点展开）
  brandIntro: string;   // 品牌背书
  ctaHook: string;      // CTA钩子
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
