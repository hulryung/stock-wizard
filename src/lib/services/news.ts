import { getRedis } from '../redis'

export interface NewsItem {
  id: string
  headline: string
  summary?: string
  source: string
  url: string
  publishedAt: Date
  category: string
}

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
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Stock-Wizard/1.0'
      }
    })

    if (!response.ok) {
      console.error(`Finnhub API error: ${response.status} ${response.statusText}`)
      return []
    }

    const data = await response.json() as Array<{
      id: number
      headline: string
      summary: string
      source: string
      url: string
      datetime: number
      image: string
      category: string
    }>

    const newsItems: NewsItem[] = data.map((item) => ({
      id: `finnhub-${item.id}`,
      headline: item.headline,
      summary: item.summary,
      source: item.source,
      url: item.url,
      publishedAt: new Date(item.datetime * 1000),
      category: item.category || category
    }))

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
 * Fetch Korean news from Google News RSS
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
    const rssUrl = `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=ko&gl=KR&ceid=KR:ko`

    const response = await fetch(rssUrl, {
      headers: {
        'User-Agent': 'Stock-Wizard/1.0'
      }
    })

    if (!response.ok) {
      console.error(`Google News RSS error: ${response.status} ${response.statusText}`)
      return []
    }

    const rssText = await response.text()
    const newsItems = parseGoogleNewsRss(rssText)

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
 * Parse Google News RSS XML response
 * @param rssText - Raw RSS XML text
 * @returns Array of parsed news items
 */
function parseGoogleNewsRss(rssText: string): NewsItem[] {
  const newsItems: NewsItem[] = []
  let itemIndex = 0

  // Simple regex-based RSS parsing
  const itemRegex = /<item>([\s\S]*?)<\/item>/g
  let itemMatch

  while ((itemMatch = itemRegex.exec(rssText)) !== null) {
    const itemContent = itemMatch[1]

    // Extract title
    const titleMatch = /<title>([\s\S]*?)<\/title>/.exec(itemContent)
    const headline = titleMatch ? decodeHtmlEntities(titleMatch[1]) : 'Untitled'

    // Extract description/summary
    const descriptionMatch = /<description>([\s\S]*?)<\/description>/.exec(itemContent)
    let summary = descriptionMatch ? decodeHtmlEntities(descriptionMatch[1]) : undefined

    // Remove HTML tags from summary
    if (summary) {
      summary = summary.replace(/<[^>]*>/g, '').trim()
    }

    // Extract link
    const linkMatch = /<link>([\s\S]*?)<\/link>/.exec(itemContent)
    const url = linkMatch ? linkMatch[1].trim() : ''

    // Extract publication date
    const pubDateMatch = /<pubDate>([\s\S]*?)<\/pubDate>/.exec(itemContent)
    const publishedAt = pubDateMatch ? new Date(pubDateMatch[1]) : new Date()

    // Extract source from description (Google News includes source info)
    const sourceMatch = /^(.*?)\s*-\s*/.exec(summary || '')
    const source = sourceMatch ? sourceMatch[1].trim() : 'Google News'

    newsItems.push({
      id: `google-news-${itemIndex}`,
      headline,
      summary: summary?.substring(0, 200),
      source,
      url,
      publishedAt,
      category: 'korean'
    })

    itemIndex++
  }

  return newsItems
}

/**
 * Decode HTML entities in text
 * @param text - Text with HTML entities
 * @returns Decoded text
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'"
  }

  return text.replace(/&[a-zA-Z]+;/g, (match) => entities[match] || match)
}
