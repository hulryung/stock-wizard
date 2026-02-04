/**
 * XML/RSS parser utility using fast-xml-parser
 */

import { XMLParser } from 'fast-xml-parser'

export interface RssItem {
  title: string
  description?: string
  link?: string
  pubDate?: string
  guid?: string
  source?: string
}

export interface ParsedRssFeed {
  title: string
  description?: string
  items: RssItem[]
}

/**
 * Decode HTML entities in text
 */
function decodeHtmlEntities(text: string): string {
  if (!text) return ''

  const entities: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#39;': "'",
    '&apos;': "'",
    '&nbsp;': ' ',
    '&#160;': ' ',
    '&ndash;': '-',
    '&mdash;': '-',
    '&hellip;': '...',
    '&bull;': '*',
    '&copy;': '(c)',
    '&reg;': '(R)',
    '&trade;': '(TM)'
  }

  let result = text
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, 'gi'), char)
  }

  // Handle numeric entities (&#NNN;)
  result = result.replace(/&#(\d+);/g, (_, num) => String.fromCharCode(parseInt(num, 10)))

  // Handle hex entities (&#xHHHH;)
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  )

  return result
}

/**
 * Strip HTML tags from text
 */
function stripHtmlTags(text: string): string {
  if (!text) return ''
  return text.replace(/<[^>]*>/g, '').trim()
}

/**
 * Parse RSS 2.0 or Atom feed from XML text
 *
 * @param xmlText - Raw XML text of the feed
 * @returns Parsed feed with title and items
 */
export function parseRssFeed(xmlText: string): ParsedRssFeed {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    trimValues: true,
    parseTagValue: false,
    isArray: (name) => name === 'item' || name === 'entry'
  })

  const parsed = parser.parse(xmlText)

  // Handle RSS 2.0 format
  if (parsed.rss?.channel) {
    const channel = parsed.rss.channel
    const items = channel.item || []

    return {
      title: decodeHtmlEntities(extractText(channel.title)),
      description: decodeHtmlEntities(extractText(channel.description)),
      items: items.map((item: Record<string, unknown>) => parseRssItem(item))
    }
  }

  // Handle Atom format
  if (parsed.feed) {
    const feed = parsed.feed
    const entries = feed.entry || []

    return {
      title: decodeHtmlEntities(extractText(feed.title)),
      description: decodeHtmlEntities(extractText(feed.subtitle)),
      items: entries.map((entry: Record<string, unknown>) => parseAtomEntry(entry))
    }
  }

  // Return empty feed if format not recognized
  return {
    title: 'Unknown Feed',
    items: []
  }
}

/**
 * Extract text content from various XML element formats
 */
function extractText(element: unknown): string {
  if (!element) return ''
  if (typeof element === 'string') return element
  if (typeof element === 'number') return String(element)

  // Handle objects with text content (e.g., { '#text': 'value' })
  if (typeof element === 'object') {
    const obj = element as Record<string, unknown>
    if ('#text' in obj) return String(obj['#text'])
    if ('_text' in obj) return String(obj['_text'])
  }

  return ''
}

/**
 * Parse RSS 2.0 item
 */
function parseRssItem(item: Record<string, unknown>): RssItem {
  const title = decodeHtmlEntities(stripHtmlTags(extractText(item.title)))
  let description = extractText(item.description)
  description = decodeHtmlEntities(stripHtmlTags(description))

  let link = extractText(item.link)
  // Handle link as CDATA or object
  if (typeof item.link === 'object' && item.link !== null) {
    const linkObj = item.link as Record<string, unknown>
    link = String(linkObj['@_href'] || linkObj['#text'] || '')
  }

  let source = ''
  if (typeof item.source === 'object' && item.source !== null) {
    const sourceObj = item.source as Record<string, unknown>
    source = String(sourceObj['#text'] || '')
  } else if (typeof item.source === 'string') {
    source = item.source
  }

  return {
    title,
    description: description?.substring(0, 500),
    link: link.trim(),
    pubDate: extractText(item.pubDate),
    guid: extractText(item.guid),
    source: decodeHtmlEntities(source)
  }
}

/**
 * Parse Atom entry
 */
function parseAtomEntry(entry: Record<string, unknown>): RssItem {
  const title = decodeHtmlEntities(stripHtmlTags(extractText(entry.title)))

  let description = ''
  if (entry.summary) {
    description = decodeHtmlEntities(stripHtmlTags(extractText(entry.summary)))
  } else if (entry.content) {
    description = decodeHtmlEntities(stripHtmlTags(extractText(entry.content)))
  }

  let link = ''
  if (Array.isArray(entry.link)) {
    // Find the alternate link (main link)
    const altLink = entry.link.find(
      (l: Record<string, unknown>) => l['@_rel'] === 'alternate' || !l['@_rel']
    ) as Record<string, unknown> | undefined
    link = String(altLink?.['@_href'] || entry.link[0]?.['@_href'] || '')
  } else if (typeof entry.link === 'object' && entry.link !== null) {
    const linkObj = entry.link as Record<string, unknown>
    link = String(linkObj['@_href'] || '')
  }

  let pubDate = ''
  if (entry.published) {
    pubDate = extractText(entry.published)
  } else if (entry.updated) {
    pubDate = extractText(entry.updated)
  }

  return {
    title,
    description: description?.substring(0, 500),
    link: link.trim(),
    pubDate,
    guid: extractText(entry.id)
  }
}
