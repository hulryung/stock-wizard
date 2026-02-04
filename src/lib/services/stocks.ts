import { getRedis } from '@/lib/redis'

export interface StockQuote {
  symbol: string
  name: string
  price: number
  change: number
  changePercent: number
  market: 'KR' | 'US'
}

// Major US stocks - must match the prompt reference list
const US_STOCKS: Record<string, string> = {
  'AAPL': 'Apple Inc.',
  'MSFT': 'Microsoft Corporation',
  'GOOGL': 'Alphabet Inc.',
  'AMZN': 'Amazon.com Inc.',
  'NVDA': 'NVIDIA Corporation',
  'TSLA': 'Tesla Inc.',
  'META': 'Meta Platforms Inc.',
  'BRK.B': 'Berkshire Hathaway',
  'UNH': 'UnitedHealth Group',
  'JNJ': 'Johnson & Johnson',
  'JPM': 'JPMorgan Chase',
  'V': 'Visa Inc.',
  'PG': 'Procter & Gamble',
  'XOM': 'Exxon Mobil',
  'HD': 'Home Depot',
  'CVX': 'Chevron',
  'MA': 'Mastercard',
  'ABBV': 'AbbVie Inc.',
  'PFE': 'Pfizer Inc.',
  'COST': 'Costco',
  'MRK': 'Merck & Co.',
  'AVGO': 'Broadcom Inc.',
  'PEP': 'PepsiCo',
  'KO': 'Coca-Cola',
  'TMO': 'Thermo Fisher',
  'ORCL': 'Oracle',
  'CSCO': 'Cisco Systems',
  'ACN': 'Accenture',
  'MCD': "McDonald's",
  'ABT': 'Abbott Laboratories',
  'NKE': 'Nike Inc.',
  'NFLX': 'Netflix Inc.',
  'AMD': 'Advanced Micro Devices',
  'INTC': 'Intel Corporation',
  'QCOM': 'Qualcomm',
  'TXN': 'Texas Instruments',
  'IBM': 'IBM',
  'AMAT': 'Applied Materials',
  'NOW': 'ServiceNow',
  'INTU': 'Intuit',
  'ADBE': 'Adobe Inc.',
  'CRM': 'Salesforce',
  'BA': 'Boeing',
  'CAT': 'Caterpillar',
  'GE': 'General Electric',
  'RTX': 'Raytheon Technologies',
  'LMT': 'Lockheed Martin',
  'UPS': 'United Parcel Service',
  'FDX': 'FedEx',
  'DE': 'Deere & Company',
  'ASML': 'ASML Holding N.V.',
}

// Major Korean stocks (Blue chips) - must match the prompt reference list
const KR_STOCKS: Record<string, string> = {
  '005930': '삼성전자',
  '000660': 'SK하이닉스',
  '068270': '셀트리온',
  '035420': 'NAVER',
  '035720': '카카오',
  '006400': '삼성SDI',
  '051910': 'LG화학',
  '207940': '삼성바이오로직스',
  '373220': 'LG에너지솔루션',
  '005380': '현대자동차',
  '000270': '기아',
  '012330': '현대모비스',
  '003550': 'LG',
  '066570': 'LG전자',
  '096770': 'SK이노베이션',
  '034730': 'SK',
  '015760': '한국전력공사',
  '032830': '삼성생명',
  '055550': '신한지주',
  '105560': 'KB금융',
  '086790': '하나금융지주',
  '316140': '우리금융지주',
  '009150': '삼성전기',
  '000810': '삼성화재',
  '028260': '삼성물산',
  '018260': '삼성에스디에스',
  '011200': 'HMM',
  '010130': '고려아연',
  '047050': '포스코인터내셔널',
  '005490': 'POSCO홀딩스',
  '004020': '현대제철',
  '010950': 'S-Oil',
  '267250': 'HD현대',
  '329180': 'HD현대중공업',
  '042660': '한화오션',
  '009540': 'HD한국조선해양',
  '011070': 'LG이노텍',
  '030200': 'KT',
  '017670': 'SK텔레콤',
  '033780': 'KT&G',
  '090430': '아모레퍼시픽',
  '051900': 'LG생활건강',
  '326030': 'SK바이오팜',
  '302440': 'SK바이오사이언스',
  '352820': '하이브',
  '259960': '크래프톤',
  '263750': '펄어비스',
  '036570': '엔씨소프트',
  '251270': '넷마블',
  '035250': '강원랜드',
  '004990': '롯데지주',
  '023530': '롯데쇼핑',
  '069500': 'KODEX 200',
  '102110': 'TIGER 200',
}

// Small/Mid cap Korean stocks for hidden gems (다크호스)
const KR_SMALL_MID_STOCKS: Record<string, string> = {
  // 2차전지/소재
  '247540': '에코프로비엠',
  '066970': '엘앤에프',
  '278280': '천보',
  '086520': '에코프로',
  '003670': '포스코퓨처엠',

  // 반도체/장비
  '042700': '한미반도체',
  '039030': '이오테크닉스',
  '058470': '리노공업',
  '036930': '주성엔지니어링',
  '140860': '파크시스템스',
  '357780': '솔브레인',
  '131970': '테스나',
  '095340': 'ISC',
  '322310': '오로스테크놀로지',
  '067310': '하나마이크론',
  '108320': 'LX세미콘',
  '025560': '미래산업',
  '950130': '엑세스바이오',

  // 로봇/자동화
  '090360': '로보스타',
  '056080': '유진로봇',
  '277810': '레인보우로보틱스',
  '298040': '효성중공업',
  '064350': '현대로템',

  // 바이오/헬스케어
  '145720': '덴티움',
  '214150': '클래시스',
  '328130': '루닛',
  '196170': '알테오젠',
  '091990': '셀트리온헬스케어',
  '068760': '셀트리온제약',
  '950160': '코오롱티슈진',
  '086900': '메디톡스',
  '108860': '셀바스AI',
  '950210': '프레스티지바이오파마',

  // IT/소프트웨어/엔터
  '053800': '안랩',
  '035900': 'JYP Ent.',
  '122870': 'YG Ent.',
  '041510': 'SM',
  '293490': '카카오게임즈',
  '112040': '위메이드',
  '078340': '컴투스',

  // 신재생/환경/소재
  '336260': '두산퓨얼셀',
  '281820': '케이씨텍',
  '009830': '한화솔루션',
  '140910': '에이블씨엔씨',

  // 방산/우주/항공
  '012450': '한화에어로스페이스',
  '047810': '한국항공우주',
  '103140': '풍산',
  '299660': '앤시스테크놀로지',

  // 조선/해양
  '010620': 'HD현대미포',
  '071970': 'STX중공업',

  // 건설/인프라
  '028050': '삼성엔지니어링',
  '375500': 'DL이앤씨',
  '047040': '대우건설',
  '000720': '현대건설',

  // 유통/소비재
  '069960': '현대백화점',
  '004170': '신세계',
  '139480': '이마트',
}

const CACHE_TTL = 900 // 15 minutes

/**
 * Check if a stock symbol is in our allowed list
 */
export function isValidStock(symbol: string, market: 'KR' | 'US'): boolean {
  if (market === 'US') {
    return symbol in US_STOCKS
  }
  return symbol in KR_STOCKS || symbol in KR_SMALL_MID_STOCKS
}

/**
 * Get stock name from our reference list
 */
export function getStockName(symbol: string, market: 'KR' | 'US'): string | null {
  if (market === 'US') {
    return US_STOCKS[symbol] || null
  }
  return KR_STOCKS[symbol] || KR_SMALL_MID_STOCKS[symbol] || null
}

/**
 * Get small/mid cap stocks list for hidden gems
 */
export function getSmallMidCapStocks(): { symbol: string; name: string }[] {
  return Object.entries(KR_SMALL_MID_STOCKS).map(([symbol, name]) => ({ symbol, name }))
}

/**
 * Get all Korean stocks (blue chips + small/mid caps)
 */
export function getAllKRStocks(): { symbol: string; name: string }[] {
  const allStocks = { ...KR_STOCKS, ...KR_SMALL_MID_STOCKS }
  return Object.entries(allStocks).map(([symbol, name]) => ({ symbol, name }))
}

/**
 * Get stock price from Finnhub (US) or Yahoo Finance (KR)
 * Only returns data for stocks in our reference list
 */
export async function getStockPrice(
  symbol: string,
  market: 'KR' | 'US'
): Promise<StockQuote | null> {
  // Only allow stocks in our reference list
  const stockName = getStockName(symbol, market)
  if (!stockName) {
    console.log(`[Stock] Rejected unknown stock: ${symbol} (${market})`)
    return null
  }

  try {
    // Check cache first
    const cacheKey = `stock:${market}:${symbol}`
    const cached = await getRedis().get(cacheKey)

    if (cached) {
      return JSON.parse(cached as string) as StockQuote
    }

    let quote: StockQuote | null = null

    if (market === 'US') {
      quote = await fetchUSStockPrice(symbol, stockName)
    } else {
      quote = await fetchKRStockPrice(symbol, stockName)
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
async function fetchUSStockPrice(symbol: string, stockName: string): Promise<StockQuote | null> {
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

    if (!data.c) {
      console.error(`No price data for ${symbol}`)
      return null
    }

    return {
      symbol,
      name: stockName,
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
 * Tries KOSPI (.KS) first, then KOSDAQ (.KQ)
 */
async function fetchKRStockPrice(symbol: string, stockName: string): Promise<StockQuote | null> {
  const suffixes = ['.KS', '.KQ']

  for (const suffix of suffixes) {
    try {
      const yahooSymbol = `${symbol}${suffix}`

      const response = await fetch(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}?interval=1d`,
        { next: { revalidate: 60 } }
      )

      if (!response.ok) {
        continue
      }

      const data = await response.json()

      const result = data.chart?.result?.[0]
      if (!result || !result.meta || !result.meta.regularMarketPrice) {
        continue
      }

      const meta = result.meta
      const currentPrice = meta.regularMarketPrice
      const previousClose = meta.previousClose || currentPrice
      const change = currentPrice - previousClose
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0

      return {
        symbol,
        name: stockName, // Always use our reference name, not Yahoo's
        price: currentPrice,
        change,
        changePercent,
        market: 'KR',
      }
    } catch {
      continue
    }
  }

  console.error(`No price data found for KR stock: ${symbol}`)
  return null
}

/**
 * Get list of major stocks for a market
 */
export function getStockList(
  market: 'KR' | 'US'
): { symbol: string; name: string }[] {
  const stocks = market === 'US' ? US_STOCKS : KR_STOCKS
  return Object.entries(stocks).map(([symbol, name]) => ({ symbol, name }))
}

/**
 * Search stocks by query string
 */
export function searchStocks(
  query: string,
  market: 'KR' | 'US'
): { symbol: string; name: string }[] {
  const stocks = market === 'US' ? US_STOCKS : KR_STOCKS
  const lowerQuery = query.toLowerCase()

  return Object.entries(stocks)
    .filter(
      ([symbol, name]) =>
        symbol.toLowerCase().includes(lowerQuery) ||
        name.toLowerCase().includes(lowerQuery)
    )
    .map(([symbol, name]) => ({ symbol, name }))
}
