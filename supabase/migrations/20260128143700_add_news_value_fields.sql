-- Migration: Add news value fields to recommendations table
-- Run this in Supabase SQL Editor or via supabase CLI
-- Created: 2026-01-28

-- Add news value fields to recommendations table
ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS news_market_impact REAL,
ADD COLUMN IF NOT EXISTS news_unexpectedness REAL,
ADD COLUMN IF NOT EXISTS news_contrarian_potential REAL,
ADD COLUMN IF NOT EXISTS news_overall_score REAL,
ADD COLUMN IF NOT EXISTS news_value_label TEXT,
ADD COLUMN IF NOT EXISTS news_evaluation_reason TEXT;

-- Add index for filtering by news value score
CREATE INDEX IF NOT EXISTS idx_recommendations_news_score 
ON recommendations (news_overall_score DESC NULLS LAST);

-- Add check constraint for value_label (skip if exists)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_news_value_label'
  ) THEN
    ALTER TABLE recommendations
    ADD CONSTRAINT chk_news_value_label 
    CHECK (news_value_label IS NULL OR news_value_label IN ('hot', 'notable', 'normal'));
  END IF;
END
$$;
