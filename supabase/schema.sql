-- recommendations 테이블
CREATE TABLE recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  analysis_date DATE NOT NULL,
  market VARCHAR(10) NOT NULL, -- 'KR' or 'US'
  stock_symbol VARCHAR(20) NOT NULL,
  stock_name VARCHAR(100) NOT NULL,
  news_headline TEXT NOT NULL,
  news_source VARCHAR(100),
  reasoning_chain JSONB NOT NULL, -- CoT 추론 단계
  connection_summary TEXT NOT NULL, -- 연결고리 요약
  confidence_score DECIMAL(3,2), -- 0.00-1.00
  price_at_recommendation DECIMAL(15,2),
  UNIQUE(analysis_date, stock_symbol)
);

-- news_sources 테이블
CREATE TABLE news_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  recommendation_id UUID REFERENCES recommendations(id),
  headline TEXT NOT NULL,
  url TEXT,
  source VARCHAR(100),
  published_at TIMESTAMPTZ
);

-- performance_tracking 테이블
CREATE TABLE performance_tracking (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  recommendation_id UUID REFERENCES recommendations(id),
  tracked_at TIMESTAMPTZ DEFAULT NOW(),
  days_since_recommendation INT NOT NULL,
  current_price DECIMAL(15,2) NOT NULL,
  price_change_percent DECIMAL(8,4),
  UNIQUE(recommendation_id, days_since_recommendation)
);

-- RLS: Public read access
ALTER TABLE recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON recommendations FOR SELECT USING (true);

ALTER TABLE news_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON news_sources FOR SELECT USING (true);

ALTER TABLE performance_tracking ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Public read" ON performance_tracking FOR SELECT USING (true);

-- Indexes
CREATE INDEX idx_recommendations_date ON recommendations(analysis_date DESC);
CREATE INDEX idx_recommendations_market ON recommendations(market);
CREATE INDEX idx_performance_recommendation ON performance_tracking(recommendation_id);
