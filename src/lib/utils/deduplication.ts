/**
 * News deduplication utility using Jaccard similarity
 */

import type { NewsItem } from '../services/news'

export interface DeduplicationOptions {
  similarityThreshold?: number // 0-1, default 0.7
  priorityOrder?: string[] // Source IDs in priority order (first = highest)
}

export interface DeduplicationResult {
  uniqueItems: NewsItem[]
  duplicateCount: number
  clusters: Map<string, NewsItem[]> // Canonical item ID -> all similar items
}

const DEFAULT_OPTIONS: Required<DeduplicationOptions> = {
  similarityThreshold: 0.7,
  priorityOrder: ['yonhap-economy', 'yonhap-industry', 'hankyung-market', 'edaily', 'google-news-kr']
}

/**
 * Simple hash function for initial clustering
 * Creates a normalized fingerprint from the headline
 */
function simpleHash(text: string): string {
  const normalized = text
    .toLowerCase()
    .replace(/[^가-힣a-z0-9\s]/g, '') // Keep Korean, English, numbers, spaces
    .replace(/\s+/g, ' ')
    .trim()

  // Take first 50 chars as fingerprint base
  const fingerprint = normalized.slice(0, 50)

  // Simple hash
  let hash = 0
  for (let i = 0; i < fingerprint.length; i++) {
    const char = fingerprint.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash // Convert to 32bit integer
  }
  return Math.abs(hash).toString(36)
}

/**
 * Tokenize text into word set for Jaccard similarity
 */
function tokenize(text: string): Set<string> {
  const normalized = text
    .toLowerCase()
    .replace(/[^가-힣a-z0-9\s]/g, '')
    .trim()

  const words = normalized.split(/\s+/).filter((w) => w.length > 1)
  return new Set(words)
}

/**
 * Calculate Jaccard similarity between two sets
 * J(A,B) = |A ∩ B| / |A ∪ B|
 */
function jaccardSimilarity(set1: Set<string>, set2: Set<string>): number {
  if (set1.size === 0 && set2.size === 0) return 1
  if (set1.size === 0 || set2.size === 0) return 0

  let intersectionSize = 0
  for (const item of set1) {
    if (set2.has(item)) {
      intersectionSize++
    }
  }

  const unionSize = set1.size + set2.size - intersectionSize
  return intersectionSize / unionSize
}

/**
 * Get source priority (lower = higher priority)
 */
function getSourcePriority(sourceId: string, priorityOrder: string[]): number {
  const index = priorityOrder.indexOf(sourceId)
  return index === -1 ? priorityOrder.length : index
}

/**
 * Extract source ID from news item
 */
function extractSourceId(item: NewsItem): string {
  // The source ID is encoded in the item ID (e.g., 'yonhap-economy-0')
  const match = item.id.match(/^([a-z-]+)-\d+$/)
  if (match) {
    return match[1]
  }
  // Fallback: try to infer from source name
  if (item.source.includes('연합')) return 'yonhap-economy'
  if (item.source.includes('한경') || item.source.includes('한국경제')) return 'hankyung-market'
  if (item.source.includes('이데일리')) return 'edaily'
  return 'google-news-kr'
}

/**
 * Deduplicate news items based on headline similarity
 *
 * @param items - Array of news items to deduplicate
 * @param options - Deduplication options
 * @returns Deduplicated items with metadata
 */
export function deduplicateNews(
  items: NewsItem[],
  options: DeduplicationOptions = {}
): DeduplicationResult {
  const opts = { ...DEFAULT_OPTIONS, ...options }

  if (items.length === 0) {
    return {
      uniqueItems: [],
      duplicateCount: 0,
      clusters: new Map()
    }
  }

  // Step 1: Pre-cluster by simple hash for efficiency
  const hashClusters = new Map<string, NewsItem[]>()
  for (const item of items) {
    const hash = simpleHash(item.headline)
    const cluster = hashClusters.get(hash) || []
    cluster.push(item)
    hashClusters.set(hash, cluster)
  }

  // Step 2: Within each cluster, do fine-grained similarity check
  const clusters = new Map<string, NewsItem[]>()
  const processed = new Set<string>()

  for (const [_, hashCluster] of hashClusters) {
    // Also compare across nearby clusters by doing a broader check
    for (let i = 0; i < hashCluster.length; i++) {
      const item = hashCluster[i]
      if (processed.has(item.id)) continue

      const similarItems: NewsItem[] = [item]
      const itemTokens = tokenize(item.headline)

      // Check against all other unprocessed items
      for (const candidate of items) {
        if (candidate.id === item.id || processed.has(candidate.id)) continue

        const candidateTokens = tokenize(candidate.headline)
        const similarity = jaccardSimilarity(itemTokens, candidateTokens)

        if (similarity >= opts.similarityThreshold) {
          similarItems.push(candidate)
          processed.add(candidate.id)
        }
      }

      processed.add(item.id)

      // Select canonical item based on source priority
      similarItems.sort((a, b) => {
        const priorityA = getSourcePriority(extractSourceId(a), opts.priorityOrder)
        const priorityB = getSourcePriority(extractSourceId(b), opts.priorityOrder)
        return priorityA - priorityB
      })

      const canonical = similarItems[0]
      clusters.set(canonical.id, similarItems)
    }
  }

  // Collect unique items (canonical from each cluster)
  const uniqueItems: NewsItem[] = []
  for (const [canonicalId] of clusters) {
    const item = items.find((i) => i.id === canonicalId)
    if (item) {
      uniqueItems.push(item)
    }
  }

  // Sort by publication date (newest first)
  uniqueItems.sort((a, b) => b.publishedAt.getTime() - a.publishedAt.getTime())

  const duplicateCount = items.length - uniqueItems.length

  return {
    uniqueItems,
    duplicateCount,
    clusters
  }
}

/**
 * Generate content hash for a news item
 * Used for database storage and quick duplicate detection
 */
export function generateContentHash(headline: string, publishedAt?: Date): string {
  const dateStr = publishedAt ? publishedAt.toISOString().split('T')[0] : ''
  const content = `${headline}|${dateStr}`

  // Simple hash
  let hash = 0
  for (let i = 0; i < content.length; i++) {
    const char = content.charCodeAt(i)
    hash = (hash << 5) - hash + char
    hash = hash & hash
  }
  return Math.abs(hash).toString(16).padStart(8, '0')
}
