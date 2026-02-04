-- Migration: Add recommendation_type column
-- Created: 2026-02-05
-- Purpose: Distinguish between standard and hidden_gem recommendations

-- Add recommendation_type column
ALTER TABLE recommendations
ADD COLUMN IF NOT EXISTS recommendation_type TEXT DEFAULT 'standard';

-- Add check constraint for valid types
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'chk_recommendation_type'
  ) THEN
    ALTER TABLE recommendations
    ADD CONSTRAINT chk_recommendation_type
    CHECK (recommendation_type IN ('standard', 'hidden_gem'));
  END IF;
END
$$;

-- Add index for filtering by type
CREATE INDEX IF NOT EXISTS idx_recommendations_type
ON recommendations (recommendation_type);

-- Add composite index for date + type queries
CREATE INDEX IF NOT EXISTS idx_recommendations_date_type
ON recommendations (analysis_date, recommendation_type);

COMMENT ON COLUMN recommendations.recommendation_type IS 'Type of recommendation: standard (blue chips) or hidden_gem (risky small/mid caps)';
