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

// Small/Mid cap Korean stocks for hidden gems (다크호스) - 200+ stocks
const KR_SMALL_MID_STOCKS: Record<string, string> = {
  // ===== 2차전지/소재 =====
  '247540': '에코프로비엠',
  '066970': '엘앤에프',
  '278280': '천보',
  '086520': '에코프로',
  '003670': '포스코퓨처엠',
  '064550': '바이오니아',
  '200880': '서연이화',
  '091120': '이엠텍',
  '348210': '넥스틴',
  '137400': '피엔티',
  '178920': '피엔에이치테크',
  '121600': '나노신소재',
  '086390': '유니테스트',
  '217190': '제너셈',
  '307950': '현대오토에버',
  '006260': '광성전기',
  '060310': '3S',
  '016590': '신대양제지',
  '033640': '네패스',
  '099190': '아이센스',

  // ===== 반도체/장비 =====
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
  '083310': '엘오티베큠',
  '089030': '테크윙',
  '098120': '마이크로컨텍솔',
  '226400': '오스테오닉',
  '403870': '피에스케이홀딩스',
  '336370': '솔루스첨단소재',
  '064760': '티씨케이',
  '069540': '라이트론',
  '200710': '에이디테크놀로지',
  '166090': '하나머티리얼즈',
  '317830': '에스피소프트',
  '078600': '대주전자재료',
  '092070': '케어젠',
  '079370': '제우스',
  '054950': '제이브이엠',
  '272110': '케이엔제이',
  '353200': '대덕전자',
  '226330': '싸이맥스',
  '319660': '피에스케이',
  '222670': '플럼라인생명과학',
  '263720': '디앤씨미디어',
  '041920': '메디아나',
  '317240': '퀀타매트릭스',
  '101490': '에스앤에스텍',
  '036540': '에스엔텍',
  '067920': '이글벳',

  // ===== 로봇/자동화/기계 =====
  '090360': '로보스타',
  '056080': '유진로봇',
  '277810': '레인보우로보틱스',
  '298040': '효성중공업',
  '064350': '현대로템',
  '099440': 'STX엔진',
  '015590': 'KBG',
  '054620': 'APS홀딩스',
  '241560': '두산밥캣',
  '012200': '케이에스피',
  '092300': '현우산업',
  '013030': '하이록코리아',
  '267260': '현대일렉트릭',
  '352910': '다이나믹디자인',
  '383310': '에코프로에이치엔',
  '060230': '소니드',
  '051360': '토비스',
  '037950': 'ST팜',
  '100700': '세운메디칼',

  // ===== 바이오/헬스케어 =====
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
  '243070': '휴온스',
  '215600': '신라젠',
  '141080': '레고켐바이오',
  '950200': '파마리서치',
  '102940': '코오롱생명과학',
  '237690': '에스티팜',
  '048410': '현대바이오',
  '039200': '오스코텍',
  '067080': '대화제약',
  '019170': '신풍제약',
  '002630': '오리엔트바이오',
  '234080': '신라젠',
  '060850': '영림원소프트랩',
  '066830': '제노포커스',
  '226950': '올릭스',
  '290670': '대보마그네틱',
  '033290': '코웰패션',
  '228760': '지노믹트리',
  '305090': '마이크로디지탈',
  '153710': '옵티팜',
  '094360': '칩스앤미디어',
  '067630': '에이치엘비생명과학',
  '323990': '박셀바이오',
  '330350': '위더스제약',
  '950140': '잉글우드랩',

  // ===== IT/소프트웨어/게임 =====
  '053800': '안랩',
  '035900': 'JYP Ent.',
  '122870': 'YG Ent.',
  '041510': 'SM',
  '293490': '카카오게임즈',
  '112040': '위메이드',
  '078340': '컴투스',
  '067160': '아프리카TV',
  '035760': 'CJ ENM',
  '034230': '파라다이스',
  '027580': '상보',
  '032640': '웹젠',
  '095660': '네오위즈',
  '194480': '데브시스터즈',
  '036120': 'SCI평가정보',
  '036090': '위지트',
  '313760': '윌링스',
  '042420': '네오오토글라스',
  '018880': '한온시스템',
  '072520': '제이에스티나',
  '039840': '디오',
  '030530': '원익IPS',
  '052770': '아이톡시',
  '024850': '피엠아이',
  '045300': '성우테크론',
  '038340': '푸드웰',
  '094840': '슈프리마에이치큐',
  '069080': '웹케시',
  '078070': '유비쿼스',
  '053700': '삼보모터스',
  '115160': '휴맥스',
  '039420': '에스아이리소스',
  '039560': '다산네트웍스',
  '041020': '폴라리스오피스',

  // ===== 신재생/환경/에너지 =====
  '336260': '두산퓨얼셀',
  '281820': '케이씨텍',
  '009830': '한화솔루션',
  '140910': '에이블씨엔씨',
  '034020': '두산에너빌리티',
  '011790': 'SKC',
  '088130': '동아엘텍',
  '006200': '한국전자홀딩스',
  '051600': '한전KPS',
  '267980': '마인드라프트',
  '099430': '바이오플러스',
  '270520': '지엔원에너지',
  '417080': '수산아이앤티',
  '250000': '보라티알',
  '033100': '제룡전기',
  '048770': 'TPC',
  '049520': 'LKENG',
  '014910': '성문전자',
  '091580': '상신이디피',
  '060900': '서보건전지',

  // ===== 방산/우주/항공 =====
  '012450': '한화에어로스페이스',
  '047810': '한국항공우주',
  '103140': '풍산',
  '299660': '앤시스테크놀로지',
  '032500': 'KSS해운',
  '000880': '한화',
  '079550': 'LIG넥스원',
  '071320': '지역난방공사',
  '014580': '태경비케이',
  '100120': '아이컴포넌트',
  '187660': '에이디엠코리아',

  // ===== 조선/해양/운송 =====
  '010620': 'HD현대미포',
  '071970': 'STX중공업',
  '001440': '대한전선',
  '003490': '대한항공',
  '020560': '아시아나항공',
  '044450': 'KSS해운',
  '005880': '대한해운',
  '117580': '대성에너지',
  '001790': '대한제당',
  '004910': '조광페인트',

  // ===== 건설/인프라/부동산 =====
  '028050': '삼성엔지니어링',
  '375500': 'DL이앤씨',
  '047040': '대우건설',
  '000720': '현대건설',
  '006360': 'GS건설',
  '000210': '대림산업',
  '005090': '에스지이',
  '001230': '동국제강',
  '001940': 'KISCO홀딩스',
  '000150': '두산',
  '009420': '한올바이오파마',
  '002380': 'KCC',
  '000120': 'CJ대한통운',
  '082740': 'HSD엔진',
  '044490': '태웅',
  '004800': '효성',

  // ===== 유통/소비재/화장품 =====
  '069960': '현대백화점',
  '004170': '신세계',
  '139480': '이마트',
  '021240': '코웨이',
  '285130': 'SK케미칼',
  '006120': 'SK디스커버리',
  '005830': '동부건설',
  '003620': '쌍용C&E',
  '000480': '조선내화',
  '024110': '기업은행',
  '029780': '삼성카드',
  '192080': '더블유게임즈',
  '002790': '아모레G',
  '051500': 'CJ프레시웨이',
  '007340': 'DN오토모티브',
  '005800': '신영증권',
  '003080': '성보화학',
  '010060': 'OCI홀딩스',
  '003960': '사조대림',

  // ===== 금융/보험 =====
  '039490': '키움증권',
  '005940': 'NH투자증권',
  '006800': '미래에셋증권',
  '003540': '대신증권',
  '001500': '현대차증권',
  '001720': '신영증권',
  '003470': '유안타증권',
  '016360': '삼성증권',
  '071050': '한국금융지주',

  // ===== 기타 중소형주 =====
  '192400': '쿠쿠홀딩스',
  '027410': 'BGF',
  '282330': 'BGF리테일',
  '001680': '대상',
  '017810': '풀무원',
  '005440': '현대그린푸드',
  '002140': '고려산업',
  '003160': '디아이',
  '014820': '동원시스템즈',
  '041650': '상신브레이크',
  '005680': '삼영전자',
  '092730': '네오팜',
  '251970': '펌텍코리아',
  '119860': '다나와',
  '050890': '쏠리드',
  '000080': '하이트진로',
  '078000': '텔코웨어',
  '036810': '에프에스티',
  '080010': '이상네트웍스',
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
 * Fetch Korean stock price from Naver Finance API
 */
async function fetchKRStockPrice(symbol: string, stockName: string): Promise<StockQuote | null> {
  try {
    const response = await fetch(
      `https://m.stock.naver.com/api/stock/${symbol}/basic`,
      {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; StockWizard/1.0)',
        },
        next: { revalidate: 60 },
      }
    )

    if (!response.ok) {
      console.error(`Naver API error for ${symbol}: ${response.status}`)
      return null
    }

    const data = await response.json()

    if (!data.closePrice) {
      console.error(`No price data from Naver for ${symbol}`)
      return null
    }

    // Parse price (remove commas)
    const price = parseFloat(data.closePrice.replace(/,/g, ''))
    const change = parseFloat((data.compareToPreviousClosePrice || '0').replace(/,/g, ''))
    const changePercent = parseFloat(data.fluctuationsRatio || '0')

    // Handle sign based on compareToPreviousPrice.code (5 = falling)
    const isFalling = data.compareToPreviousPrice?.code === '5'
    const signedChange = isFalling ? -Math.abs(change) : Math.abs(change)
    const signedChangePercent = isFalling ? -Math.abs(changePercent) : Math.abs(changePercent)

    return {
      symbol,
      name: stockName,
      price,
      change: signedChange,
      changePercent: signedChangePercent,
      market: 'KR',
    }
  } catch (error) {
    console.error(`Naver fetch error for ${symbol}:`, error)
    return null
  }
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
