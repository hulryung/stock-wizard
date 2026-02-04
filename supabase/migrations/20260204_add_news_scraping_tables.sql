-- Migration: Add news scraping infrastructure tables
-- Created: 2026-02-04
-- Purpose: Track news scraping execution, store collected news items, and log execution summaries

-- news_scrape_logs: Track each source's scraping execution
CREATE TABLE IF NOT EXISTS news_scrape_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  execution_id UUID NOT NULL,
  source_id TEXT NOT NULL,
  source_name TEXT NOT NULL,
  market TEXT NOT NULL CHECK (market IN ('KR', 'US')),
  status TEXT NOT NULL CHECK (status IN ('success', 'partial', 'failed')),
  items_fetched INTEGER DEFAULT 0,
  items_after_dedup INTEGER DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  error_type TEXT,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0
);

-- Indexes for news_scrape_logs
CREATE INDEX IF NOT EXISTS idx_scrape_logs_execution_id ON news_scrape_logs (execution_id);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_source_id ON news_scrape_logs (source_id);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_created_at ON news_scrape_logs (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_scrape_logs_status ON news_scrape_logs (status);

-- news_items: Store all collected news items
CREATE TABLE IF NOT EXISTS news_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  external_id TEXT NOT NULL,
  source_id TEXT NOT NULL,
  headline TEXT NOT NULL,
  summary TEXT,
  url TEXT,
  published_at TIMESTAMPTZ,
  content_hash TEXT NOT NULL,
  is_duplicate BOOLEAN DEFAULT FALSE,
  duplicate_of_id UUID REFERENCES news_items(id),
  was_analyzed BOOLEAN DEFAULT FALSE,
  analysis_date DATE,
  UNIQUE (source_id, external_id)
);

-- Indexes for news_items
CREATE INDEX IF NOT EXISTS idx_news_items_source_id ON news_items (source_id);
CREATE INDEX IF NOT EXISTS idx_news_items_content_hash ON news_items (content_hash);
CREATE INDEX IF NOT EXISTS idx_news_items_published_at ON news_items (published_at DESC);
CREATE INDEX IF NOT EXISTS idx_news_items_analysis_date ON news_items (analysis_date);
CREATE INDEX IF NOT EXISTS idx_news_items_was_analyzed ON news_items (was_analyzed) WHERE was_analyzed = FALSE;

-- scrape_execution_summary: High-level execution summary
CREATE TABLE IF NOT EXISTS scrape_execution_summary (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  execution_id UUID UNIQUE NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  total_sources INTEGER NOT NULL,
  successful_sources INTEGER NOT NULL,
  failed_sources INTEGER NOT NULL,
  total_items_fetched INTEGER NOT NULL,
  total_items_after_dedup INTEGER NOT NULL,
  total_items_stored INTEGER NOT NULL,
  total_duration_ms INTEGER,
  analysis_ran BOOLEAN DEFAULT FALSE,
  recommendations_generated INTEGER DEFAULT 0
);

-- Indexes for scrape_execution_summary
CREATE INDEX IF NOT EXISTS idx_scrape_summary_execution_id ON scrape_execution_summary (execution_id);
CREATE INDEX IF NOT EXISTS idx_scrape_summary_created_at ON scrape_execution_summary (created_at DESC);

-- Enable Row Level Security (but allow all operations for now)
ALTER TABLE news_scrape_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE news_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE scrape_execution_summary ENABLE ROW LEVEL SECURITY;

-- Create policies to allow all operations (service role)
DO $$
BEGIN
  -- news_scrape_logs policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'news_scrape_logs' AND policyname = 'Allow all for news_scrape_logs') THEN
    CREATE POLICY "Allow all for news_scrape_logs" ON news_scrape_logs FOR ALL USING (true);
  END IF;

  -- news_items policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'news_items' AND policyname = 'Allow all for news_items') THEN
    CREATE POLICY "Allow all for news_items" ON news_items FOR ALL USING (true);
  END IF;

  -- scrape_execution_summary policies
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'scrape_execution_summary' AND policyname = 'Allow all for scrape_execution_summary') THEN
    CREATE POLICY "Allow all for scrape_execution_summary" ON scrape_execution_summary FOR ALL USING (true);
  END IF;
END
$$;

-- Comments for documentation
COMMENT ON TABLE news_scrape_logs IS 'Tracks individual source scraping execution results';
COMMENT ON TABLE news_items IS 'Stores all collected news items with deduplication tracking';
COMMENT ON TABLE scrape_execution_summary IS 'High-level summary of each scraping execution';

COMMENT ON COLUMN news_scrape_logs.execution_id IS 'Groups all logs from a single cron execution';
COMMENT ON COLUMN news_scrape_logs.status IS 'success = all items fetched, partial = some items, failed = no items';
COMMENT ON COLUMN news_items.content_hash IS 'Hash of headline+date for quick duplicate detection';
COMMENT ON COLUMN news_items.duplicate_of_id IS 'If this is a duplicate, points to the canonical item';
