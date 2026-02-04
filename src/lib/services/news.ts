import { getRedis } from '../redis'
import { withRetry } from '../utils/retry'
import { parseRssFeed } from '../utils/xmlParser'
import { KR_NEWS_SOURCES, buildGoogleNewsUrl, type NewsSource } from '../config/newsSources'

export interface NewsItem {
  id: string
  headline: string
  summary?: string
  source: string
  url: string
  publishedAt: Date
  category: string
}

export interface AggregatedNewsResult {
  items: NewsItem[]
  sourceResults: Map<string, { success: boolean; count: number; error?: string }>
}

const FETCH_TIMEOUT_MS = 10000

/**
 * Fetch US market news from Finnhub API
 * @param category - News category: 'general', 'forex', 'crypto', or 'merger'
 * @returns Array of news items
 */
export async function fetchMarketNews(
  category: 'general' | 'forex' | 'crypto' | 'merger'
): Promise<NewsItem[]> {
  const cacheKey = `news:finnhub:${category}:${new Date().toISOString().split('T')[0]}`

  try {
    // Try to get from cache first
    const cached = await getRedis().get(cacheKey)
    if (cached) {
      return JSON.parse(cached as string)
    }
  } catch (error) {
    console.error('Redis cache read error:', error)
  }

  try {
    const apiKey = process.env.FINNHUB_API_KEY
    if (!apiKey) {
      console.error('FINNHUB_API_KEY not set')
      return []
    }

    const url = `https://finnhub.io/api/v1/news?category=${category}&token=${apiKey}`

    const newsItems = await withRetry(
      async () => {
        const response = await fetch(url, {
          headers: {
            'User-Agent': 'Stock-Wizard/1.0'
          },
          signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
        })

        if (!response.ok) {
          throw new Error(`Finnhub API error: ${response.status} ${response.statusText}`)
        }

        const data = (await response.json()) as Array<{
          id: number
          headline: string
          summary: string
          source: string
          url: string
          datetime: number
          image: string
          category: string
        }>

        return data.map((item) => ({
          id: `finnhub-${item.id}`,
          headline: item.headline,
          summary: item.summary,
          source: item.source,
          url: item.url,
          publishedAt: new Date(item.datetime * 1000),
          category: item.category || category
        }))
      },
      {
        maxRetries: 3,
        onRetry: (error, attempt) => {
          console.warn(`Finnhub fetch retry ${attempt}:`, error.message)
        }
      }
    )

    // Cache for 1 hour
    try {
      await getRedis().setex(cacheKey, 3600, JSON.stringify(newsItems))
    } catch (error) {
      console.error('Redis cache write error:', error)
    }

    return newsItems
  } catch (error) {
    console.error('Error fetching market news from Finnhub:', error)
    return []
  }
}

/**
 * Fetch Korean news from Google News RSS (legacy single-source function)
 * @param query - Search query for Korean news
 * @returns Array of news items
 */
export async function fetchKoreanNews(query: string): Promise<NewsItem[]> {
  const cacheKey = `news:google:${encodeURIComponent(query)}:${new Date().toISOString().split('T')[0]}`

  try {
    // Try to get from cache first
    const cached = await getRedis().get(cacheKey)
    if (cached) {
      return JSON.parse(cached as string)
    }
  } catch (error) {
    console.error('Redis cache read error:', error)
  }

  try {
    const rssUrl = buildGoogleNewsUrl(query)
    const newsItems = await fetchFromRssSource(
      {
        id: 'google-news-kr',
        name: 'Google News Korea',
        type: 'rss',
        url: rssUrl,
        priority: 5,
        enabled: true
      },
      'korean'
    )

    // Cache for 1 hour
    try {
      await getRedis().setex(cacheKey, 3600, JSON.stringify(newsItems))
    } catch (error) {
      console.error('Redis cache write error:', error)
    }

    return newsItems
  } catch (error) {
    console.error('Error fetching Korean news from Google News RSS:', error)
    return []
  }
}

/**
 * Fetch Korean news from all configured sources in parallel
 * @param query - Search query for Google News
 * @returns Aggregated news items from all sources
 */
export async function fetchKoreanNewsAggregated(query: string): Promise<AggregatedNewsResult> {
  const cacheKey = `news:kr-aggregated:${encodeURIComponent(query)}:${new Date().toISOString().split('T')[0]}`

  try {
    // Try to get from cache first
    const cached = await getRedis().get(cacheKey)
    if (cached) {
      const parsed = JSON.parse(cached as string) as {
        items: Array<NewsItem & { publishedAt: string }>
        sourceResults: [string, { success: boolean; count: number; error?: string }][]
      }
      return {
        items: parsed.items.map((item) => ({
          ...item,
          publishedAt: new Date(item.publishedAt)
        })),
        sourceResults: new Map(parsed.sourceResults)
      }
    }
  } catch (error) {
    console.error('Redis cache read error:', error)
  }

  const sourceResults = new Map<string, { success: boolean; count: number; error?: string }>()
  const allItems: NewsItem[] = []

  // Build source list with Google News URL
  const sources: NewsSource[] = KR_NEWS_SOURCES.map((source) => {
    if (source.id === 'google-news-kr') {
      return { ...source, url: buildGoogleNewsUrl(query) }
    }
    return source
  }).filter((source) => source.enabled && source.url)

  // Fetch from all sources in parallel
  const fetchPromises = sources.map(async (source) => {
    try {
      const items = await fetchFromRssSource(source, 'korean')
      sourceResults.set(source.id, { success: true, count: items.length })
      return items
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error'
      sourceResults.set(source.id, { success: false, count: 0, error: errorMsg })
      console.error(`Failed to fetch from ${source.name}:`, errorMsg)
      return []
    }
  })

  const results = await Promise.all(fetchPromises)
  for (const items of results) {
    allItems.push(...items)
  }

  // Sort by publication date (newest first)
  allItems.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())

  const result = { items: allItems, sourceResults }

  // Cache for 1 hour
  try {
    const cacheData = {
      items: allItems,
      sourceResults: Array.from(sourceResults.entries())
    }
    await getRedis().setex(cacheKey, 3600, JSON.stringify(cacheData))
  } catch (error) {
    console.error('Redis cache write error:', error)
  }

  return result
}

/**
 * Fetch news from a single RSS source with retry logic
 * @param source - News source configuration
 * @param category - Category to assign to items
 * @returns Array of news items
 */
export async function fetchFromRssSource(
  source: NewsSource,
  category: string
): Promise<NewsItem[]> {
  if (!source.url) {
    throw new Error(`No URL configured for source: ${source.id}`)
  }

  return withRetry(
    async () => {
      const response = await fetch(source.url!, {
        headers: {
          'User-Agent': 'Stock-Wizard/1.0',
          Accept: 'application/rss+xml, application/xml, text/xml, application/atom+xml'
        },
        signal: AbortSignal.timeout(FETCH_TIMEOUT_MS)
      })

      if (!response.ok) {
        throw new Error(`RSS fetch error: ${response.status} ${response.statusText}`)
      }

      const rssText = await response.text()
      const parsed = parseRssFeed(rssText)

      return parsed.items.map((item, index) => {
        // Extract source from description if available (Google News pattern)
        let itemSource = item.source || source.name
        if (!item.source && item.description) {
          const sourceMatch = /^(.*?)\s*-\s*/.exec(item.description)
          if (sourceMatch) {
            itemSource = sourceMatch[1].trim()
          }
        }

        return {
          id: `${source.id}-${index}`,
          headline: item.title,
          summary: item.description?.substring(0, 200),
          source: itemSource,
          url: item.link || '',
          publishedAt: item.pubDate ? new Date(item.pubDate) : new Date(),
          category
        }
      })
    },
    {
      maxRetries: 3,
      initialDelayMs: 1000,
      onRetry: (error, attempt) => {
        console.warn(`RSS fetch retry ${attempt} for ${source.name}:`, error.message)
      }
    }
  )
}
