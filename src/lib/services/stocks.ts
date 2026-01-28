import { getRedis } from '@/lib/redis'

export interface StockQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  market: 'KR' | 'US'
}

// Major US stocks
const US_STOCKS = [
  { symbol: 'AAPL', name: 'Apple Inc.' },
  { symbol: 'MSFT', name: 'Microsoft Corporation' },
  { symbol: 'GOOGL', name: 'Alphabet Inc.' },
  { symbol: 'AMZN', name: 'Amazon.com Inc.' },
  { symbol: 'NVDA', name: 'NVIDIA Corporation' },
  { symbol: 'TSLA', name: 'Tesla Inc.' },
  { symbol: 'META', name: 'Meta Platforms Inc.' },
  { symbol: 'NFLX', name: 'Netflix Inc.' },
  { symbol: 'AVGO', name: 'Broadcom Inc.' },
  { symbol: 'ASML', name: 'ASML Holding N.V.' },
]

// Major Korean stocks (KOSPI/KOSDAQ)
const KR_STOCKS = [
  { symbol: '005930', name: '삼성전자' },
  { symbol: '000660', name: 'SK하이닉스' },
  { symbol: '035720', name: '카카오' },
  { symbol: '051910', name: 'LG화학' },
  { symbol: '006400', name: '삼성SDI' },
  { symbol: '207940', name: '삼성바이오로직스' },
  { symbol: '373220', name: 'LG에너지솔루션' },
  { symbol: '000270', name: 'KT' },
  { symbol: '015760', name: '한국전력공사' },
  { symbol: '028260', name: 'Samsung Electronics' },
]

const CACHE_TTL = 900 // 15 minutes

/**
 * Get stock price from Finnhub (US) or Yahoo Finance (KR)
 */
export async function getStockPrice(
  symbol: string,
  market: 'KR' | 'US'
): Promise<StockQuote | null> {
  try {
    // Check cache first
    const cacheKey = `stock:${market}:${symbol}`
    const cached = await getRedis().get(cacheKey)

    if (cached) {
      return JSON.parse(cached as string) as StockQuote
    }

    let quote: StockQuote | null = null

    if (market === 'US') {
      quote = await fetchUSStockPrice(symbol)
    } else {
      quote = await fetchKRStockPrice(symbol)
    }

    // Cache the result if successful
    if (quote) {
      await getRedis().setex(cacheKey, CACHE_TTL, JSON.stringify(quote))
    }

    return quote
  } catch (error) {
    console.error(`Error fetching stock price for ${symbol}:`, error)
    return null
  }
}

/**
 * Fetch US stock price from Finnhub
 */
async function fetchUSStockPrice(symbol: string): Promise<StockQuote | null> {
  const apiKey = process.env.FINNHUB_API_KEY

  if (!apiKey) {
    console.error('FINNHUB_API_KEY not configured')
    return null
  }

  try {
    const response = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${apiKey}`,
      { next: { revalidate: 60 } }
    )

    if (!response.ok) {
      console.error(`Finnhub API error: ${response.status}`)
      return null
    }

    const data = await response.json()

    // Finnhub response: { c: currentPrice, d: change, dp: percentChange, ... }
    if (!data.c) {
      console.error(`No price data for ${symbol}`)
      return null
    }

    const stockInfo = US_STOCKS.find((s) => s.symbol === symbol)

    return {
      symbol,
      name: stockInfo?.name || symbol,
      price: data.c,
      change: data.d || 0,
      changePercent: data.dp || 0,
      market: 'US',
    }
  } catch (error) {
    console.error(`Finnhub fetch error for ${symbol}:`, error)
    return null
  }
}

/**
 * Fetch Korean stock price from Yahoo Finance
 */
async function fetchKRStockPrice(symbol: string): Promise<StockQuote | null> {
  try {
    // Convert Korean stock code to Yahoo Finance format
    // KOSPI: {6자리코드}.KS
    // KOSDAQ: {6자리코드}.KQ
    const yahooSymbol = `${symbol}.KS`

    const response = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d`,
      { next: { revalidate: 60 } }
    )

    if (!response.ok) {
      console.error(`Yahoo Finance API error: ${response.status}`)
      return null
    }

    const data = await response.json()

    const result = data.chart?.result?.[0]
    if (!result || !result.meta) {
      console.error(`No price data for ${symbol}`)
      return null
    }

    const meta = result.meta
    const currentPrice = meta.regularMarketPrice || 0
    const previousClose = meta.previousClose || currentPrice
    const change = currentPrice - previousClose
    const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

    const stockInfo = KR_STOCKS.find((s) => s.symbol === symbol)

    return {
      symbol,
      name: stockInfo?.name || symbol,
      price: currentPrice,
      change,
      changePercent,
      market: 'KR',
    }
  } catch (error) {
    console.error(`Yahoo Finance fetch error for ${symbol}:`, error)
    return null
  }
}

/**
 * Get list of major stocks for a market
 */
export async function getStockList(
  market: 'KR' | 'US'
): Promise<{ symbol: string; name: string }[]> {
  return market === 'US' ? US_STOCKS : KR_STOCKS
}

/**
 * Search stocks by query string
 */
export async function searchStocks(
  query: string,
  market: 'KR' | 'US'
): Promise<{ symbol: string; name: string }[]> {
  const stocks = market === 'US' ? US_STOCKS : KR_STOCKS
  const lowerQuery = query.toLowerCase()

  return stocks.filter(
    (stock) =>
      stock.symbol.toLowerCase().includes(lowerQuery) ||
      stock.name.toLowerCase().includes(lowerQuery)
  )
}
