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

export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}
