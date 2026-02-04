export type Market = 'KR' | 'US';
export type RecommendationType = 'standard' | 'hidden_gem';

export interface ReasoningStep {
  step: number;
  reasoning: string;
  connection: string;
}

export interface NewsValue {
  market_impact: number;      // 0-1: 시장 영향력
  unexpectedness: number;     // 0-1: 희소성/의외성
  contrarian_potential: number; // 0-1: 역발상 적합도
  overall_score: number;      // 0-1: 종합 점수
  value_label: 'hot' | 'notable' | 'normal'; // UI 표시용
  evaluation_reason: string;  // 평가 근거
}

export interface Recommendation {
  id: string;
  created_at: string;
  analysis_date: string;
  market: Market;
  recommendation_type: RecommendationType;
  stock_symbol: string;
  stock_name: string;
  news_headline: string;
  news_source: string | null;
  reasoning_chain: ReasoningStep[];
  connection_summary: string;
  confidence_score: number | null;
  price_at_recommendation: number | null;
  news_market_impact?: number;
  news_unexpectedness?: number;
  news_contrarian_potential?: number;
  news_overall_score?: number;
  news_value_label?: 'hot' | 'notable' | 'normal';
  news_evaluation_reason?: string;
}

export interface NewsSource {
  id: string;
  created_at: string;
  recommendation_id: string;
  headline: string;
  url: string | null;
  source: string | null;
  published_at: string | null;
}

export interface PerformanceTracking {
  id: string;
  recommendation_id: string;
  tracked_at: string;
  days_since_recommendation: number;
  current_price: number;
  price_change_percent: number | null;
}

// Supabase query result types
export interface RecommendationWithPerformance extends Recommendation {
  performance_tracking?: PerformanceTracking[];
}

// News scraping log types
export interface NewsScrapeLog {
  id: string;
  created_at: string;
  execution_id: string;
  source_id: string;
  source_name: string;
  market: Market;
  status: 'success' | 'partial' | 'failed';
  items_fetched: number;
  items_after_dedup: number;
  started_at: string;
  completed_at: string | null;
  duration_ms: number | null;
  error_type: string | null;
  error_message: string | null;
  retry_count: number;
}

export interface StoredNewsItem {
  id: string;
  created_at: string;
  external_id: string;
  source_id: string;
  headline: string;
  summary: string | null;
  url: string | null;
  published_at: string | null;
  content_hash: string;
  is_duplicate: boolean;
  duplicate_of_id: string | null;
  was_analyzed: boolean;
  analysis_date: string | null;
}

export interface ScrapeExecutionSummary {
  id: string;
  execution_id: string;
  created_at: string;
  total_sources: number;
  successful_sources: number;
  failed_sources: number;
  total_items_fetched: number;
  total_items_after_dedup: number;
  total_items_stored: number;
  total_duration_ms: number | null;
  analysis_ran: boolean;
  recommendations_generated: number;
}
