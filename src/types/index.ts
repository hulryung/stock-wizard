export interface Stock {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
}

export interface Recommendation {
  symbol: string
  action: 'buy' | 'sell' | 'hold'
  confidence: number
  reasoning: string
}

export interface NewsValue {
  market_impact: number;
  unexpectedness: number;
  contrarian_potential: number;
  overall_score: number;
  value_label: 'hot' | 'notable' | 'normal';
  evaluation_reason: string;
}

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
