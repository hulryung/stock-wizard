/**
 * News source configuration for Korean and US markets
 */

export type NewsSourceType = 'rss' | 'api'

export interface NewsSource {
  id: string
  name: string
  type: NewsSourceType
  url?: string
  priority: number // Lower = higher priority for deduplication
  enabled: boolean
}

/**
 * Korean news sources - RSS feeds from major financial news outlets
 */
export const KR_NEWS_SOURCES: NewsSource[] = [
  {
    id: 'google-news-kr',
    name: 'Google News Korea',
    type: 'rss',
    // URL constructed dynamically with search query
    priority: 5,
    enabled: true
  },
  {
    id: 'yonhap-economy',
    name: '연합뉴스 경제',
    type: 'rss',
    url: 'https://www.yna.co.kr/rss/economy.xml',
    priority: 1,
    enabled: true
  },
  {
    id: 'yonhap-industry',
    name: '연합뉴스 산업',
    type: 'rss',
    url: 'https://www.yna.co.kr/rss/industry.xml',
    priority: 2,
    enabled: true
  },
  {
    id: 'hankyung-market',
    name: '한경 전체',
    type: 'rss',
    url: 'https://www.hankyung.com/feed/all-news',
    priority: 3,
    enabled: true
  },
  {
    id: 'edaily',
    name: '이데일리 주식',
    type: 'rss',
    url: 'http://rss.edaily.co.kr/stock_news.xml',
    priority: 4,
    enabled: true
  }
]

/**
 * US news sources - API-based (Finnhub)
 */
export const US_NEWS_SOURCES: NewsSource[] = [
  {
    id: 'finnhub',
    name: 'Finnhub',
    type: 'api',
    priority: 1,
    enabled: true
  }
]

/**
 * Get enabled news sources for a market
 */
export function getEnabledSources(market: 'KR' | 'US'): NewsSource[] {
  const sources = market === 'KR' ? KR_NEWS_SOURCES : US_NEWS_SOURCES
  return sources.filter((source) => source.enabled)
}

/**
 * Build Google News RSS URL with search query
 */
export function buildGoogleNewsUrl(query: string): string {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`
}

/**
 * Get source by ID
 */
export function getSourceById(sourceId: string): NewsSource | undefined {
  return [...KR_NEWS_SOURCES, ...US_NEWS_SOURCES].find((s) => s.id === sourceId)
}
