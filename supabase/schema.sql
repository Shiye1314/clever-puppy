-- 启用 pgvector 扩展
CREATE EXTENSION IF NOT EXISTS vector;

-- 风格DNA（团队共享，单条记录）
CREATE TABLE style_dna (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  dna_json JSONB NOT NULL DEFAULT '{}',
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO style_dna (dna_json) VALUES ('{
  "openings": {"patterns": [], "styles": []},
  "closings": {"patterns": [], "interaction_triggers": false},
  "paragraph_rhythm": {"short_sentence_ratio": 0.6, "exclamation_density": "medium", "line_break_frequency": "high"},
  "emoji_usage": {"frequency": "medium", "preferred": [], "position": "paragraph_start"},
  "pronouns": {"first_person": "我", "second_person": "你/姐妹们", "style": "闺蜜口吻"},
  "title_formulas": [],
  "keywords_high_freq": [],
  "tone": ""
}'::jsonb);

-- 品牌档案
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  category TEXT,
  template_json JSONB NOT NULL DEFAULT '{}',
  fixed_selling_points JSONB NOT NULL DEFAULT '[]',
  variable_slots JSONB NOT NULL DEFAULT '[]',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 范文库（带向量）
CREATE TABLE writing_samples (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_id UUID REFERENCES brands(id) ON DELETE SET NULL,
  title TEXT,
  content TEXT NOT NULL,
  source_type TEXT DEFAULT 'upload',
  embedding VECTOR(1024),
  structure_labels JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 任务/历史记录
CREATE TABLE tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_type TEXT DEFAULT 'generate',
  module TEXT DEFAULT 'generate',
  title TEXT,
  input_data JSONB NOT NULL DEFAULT '{}',
  product_card JSONB,
  output_data JSONB,
  metadata JSONB DEFAULT '{}',
  status TEXT DEFAULT 'completed',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 违禁词库
CREATE TABLE banned_words (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  word TEXT NOT NULL,
  category TEXT DEFAULT 'general',
  severity TEXT DEFAULT 'block'
);

INSERT INTO banned_words (word, category, severity) VALUES
  ('第一', 'superlative', 'block'),
  ('最好', 'superlative', 'block'),
  ('绝对', 'superlative', 'warn'),
  ('100%', 'exaggeration', 'warn');

-- 全局设置
CREATE TABLE app_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  anthropic_api_key TEXT DEFAULT '',
  embedding_api_key TEXT DEFAULT '',
  preferred_model TEXT DEFAULT 'claude-sonnet-4-6',
  extraction_model TEXT DEFAULT 'claude-haiku-4-5',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

INSERT INTO app_settings (id) VALUES (gen_random_uuid());

-- 定时清理30天前的历史记录
CREATE OR REPLACE FUNCTION cleanup_old_tasks()
RETURNS void AS $$
BEGIN
  DELETE FROM tasks WHERE created_at < now() - INTERVAL '30 days';
END;
$$ LANGUAGE plpgsql;

-- 注意: 需要 pg_cron 扩展来调度定时任务
-- SELECT cron.schedule('cleanup-tasks', '0 3 * * *', 'SELECT cleanup_old_tasks();');

-- ============================================================
-- 大类/品类表（每类独立的风格DNA）
-- ============================================================
CREATE TABLE categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  description TEXT,
  style_dna JSONB NOT NULL DEFAULT '{}',
  writing_samples_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- 给范文库添加分类关联
ALTER TABLE writing_samples ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- 给任务添加分类关联
ALTER TABLE tasks ADD COLUMN IF NOT EXISTS category_id UUID REFERENCES categories(id) ON DELETE SET NULL;

-- 区分品牌大类 vs 细分大类
ALTER TABLE categories ADD COLUMN IF NOT EXISTS category_type TEXT NOT NULL DEFAULT 'niche' CHECK (category_type IN ('brand', 'niche'));
CREATE INDEX IF NOT EXISTS idx_categories_type ON categories(category_type);
