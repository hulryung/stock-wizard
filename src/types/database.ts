export type Market = 'KR' | 'US';

export interface ReasoningStep {
  step: number;
  reasoning: string;
  connection: string;
}

export interface Recommendation {
  id: string;
  created_at: string;
  analysis_date: string;
  market: Market;
  stock_symbol: string;
  stock_name: string;
  news_headline: string;
  news_source: string | null;
  reasoning_chain: ReasoningStep[];
  connection_summary: string;
  confidence_score: number | null;
  price_at_recommendation: number | null;
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
