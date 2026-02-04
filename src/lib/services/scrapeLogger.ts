/**
 * Scrape Logger Service
 * Handles logging of news scraping execution and storing news items
 */

import { getSupabase } from '../supabase'
import type { NewsItem } from './news'
import type { Market, NewsScrapeLog, StoredNewsItem, ScrapeExecutionSummary } from '@/types/database'
import { generateContentHash } from '../utils/deduplication'

export interface SourceScrapeResult {
  sourceId: string
  sourceName: string
  market: Market
  status: 'success' | 'partial' | 'failed'
  itemsFetched: number
  itemsAfterDedup: number
  startedAt: Date
  completedAt: Date
  errorType?: string
  errorMessage?: string
  retryCount: number
  items: NewsItem[]
}

export interface ExecutionSummary {
  totalSources: number
  successfulSources: number
  failedSources: number
  totalItemsFetched: number
  totalItemsAfterDedup: number
  totalItemsStored: number
  totalDurationMs: number
  analysisRan: boolean
  recommendationsGenerated: number
}

/**
 * ScrapeLogger class - manages scraping execution logs
 */
export class ScrapeLogger {
  private executionId: string
  private startTime: Date
  private sourceResults: SourceScrapeResult[] = []

  constructor() {
    this.executionId = crypto.randomUUID()
    this.startTime = new Date()
  }

  getExecutionId(): string {
    return this.executionId
  }

  /**
   * Log the result of a source scrape
   */
  addSourceResult(result: SourceScrapeResult): void {
    this.sourceResults.push(result)
  }

  /**
   * Create a source result tracker
   */
  createSourceTracker(sourceId: string, sourceName: string, market: Market) {
    const startedAt = new Date()
    let retryCount = 0

    return {
      incrementRetry: () => {
        retryCount++
      },
      complete: (items: NewsItem[], itemsAfterDedup: number) => {
        const result: SourceScrapeResult = {
          sourceId,
          sourceName,
          market,
          status: items.length > 0 ? 'success' : 'failed',
          itemsFetched: items.length,
          itemsAfterDedup,
          startedAt,
          completedAt: new Date(),
          retryCount,
          items
        }
        this.addSourceResult(result)
        return result
      },
      fail: (error: Error, errorType = 'unknown') => {
        const result: SourceScrapeResult = {
          sourceId,
          sourceName,
          market,
          status: 'failed',
          itemsFetched: 0,
          itemsAfterDedup: 0,
          startedAt,
          completedAt: new Date(),
          errorType,
          errorMessage: error.message.substring(0, 500),
          retryCount,
          items: []
        }
        this.addSourceResult(result)
        return result
      }
    }
  }

  /**
   * Save all logs to database
   */
  async saveLogs(summary: ExecutionSummary): Promise<void> {
    const supabase = getSupabase()

    // Save individual source logs
    const logs: Omit<NewsScrapeLog, 'id' | 'created_at'>[] = this.sourceResults.map((result) => ({
      execution_id: this.executionId,
      source_id: result.sourceId,
      source_name: result.sourceName,
      market: result.market,
      status: result.status,
      items_fetched: result.itemsFetched,
      items_after_dedup: result.itemsAfterDedup,
      started_at: result.startedAt.toISOString(),
      completed_at: result.completedAt.toISOString(),
      duration_ms: result.completedAt.getTime() - result.startedAt.getTime(),
      error_type: result.errorType || null,
      error_message: result.errorMessage || null,
      retry_count: result.retryCount
    }))

    if (logs.length > 0) {
      const { error: logsError } = await supabase.from('news_scrape_logs').insert(logs)

      if (logsError) {
        console.error('Failed to save scrape logs:', logsError)
      }
    }

    // Save execution summary
    const summaryRecord: Omit<ScrapeExecutionSummary, 'id' | 'created_at'> = {
      execution_id: this.executionId,
      total_sources: summary.totalSources,
      successful_sources: summary.successfulSources,
      failed_sources: summary.failedSources,
      total_items_fetched: summary.totalItemsFetched,
      total_items_after_dedup: summary.totalItemsAfterDedup,
      total_items_stored: summary.totalItemsStored,
      total_duration_ms: summary.totalDurationMs,
      analysis_ran: summary.analysisRan,
      recommendations_generated: summary.recommendationsGenerated
    }

    const { error: summaryError } = await supabase
      .from('scrape_execution_summary')
      .insert(summaryRecord)

    if (summaryError) {
      console.error('Failed to save execution summary:', summaryError)
    }
  }

  /**
   * Get summary statistics
   */
  getSummary(): Omit<ExecutionSummary, 'analysisRan' | 'recommendationsGenerated' | 'totalItemsStored'> {
    const successfulResults = this.sourceResults.filter((r) => r.status === 'success')
    const failedResults = this.sourceResults.filter((r) => r.status === 'failed')

    return {
      totalSources: this.sourceResults.length,
      successfulSources: successfulResults.length,
      failedSources: failedResults.length,
      totalItemsFetched: this.sourceResults.reduce((sum, r) => sum + r.itemsFetched, 0),
      totalItemsAfterDedup: this.sourceResults.reduce((sum, r) => sum + r.itemsAfterDedup, 0),
      totalDurationMs: new Date().getTime() - this.startTime.getTime()
    }
  }
}

/**
 * Save news items to database
 */
export async function saveNewsItems(
  items: NewsItem[],
  sourceId: string,
  analysisDate: string,
  duplicateClusters?: Map<string, NewsItem[]>
): Promise<number> {
  if (items.length === 0) return 0

  const supabase = getSupabase()
  let savedCount = 0

  // Build a map of duplicates for quick lookup
  const duplicateMap = new Map<string, string>() // item.id -> canonical.id
  if (duplicateClusters) {
    for (const [canonicalId, cluster] of duplicateClusters) {
      for (const item of cluster) {
        if (item.id !== canonicalId) {
          duplicateMap.set(item.id, canonicalId)
        }
      }
    }
  }

  // Prepare items for insertion
  const newsRecords: Omit<StoredNewsItem, 'id' | 'created_at' | 'duplicate_of_id'>[] = items.map(
    (item) => ({
      external_id: item.id,
      source_id: sourceId,
      headline: item.headline,
      summary: item.summary || null,
      url: item.url || null,
      published_at: item.publishedAt.toISOString(),
      content_hash: generateContentHash(item.headline, item.publishedAt),
      is_duplicate: duplicateMap.has(item.id),
      was_analyzed: false,
      analysis_date: analysisDate
    })
  )

  // Insert in batches to avoid timeout
  const batchSize = 50
  for (let i = 0; i < newsRecords.length; i += batchSize) {
    const batch = newsRecords.slice(i, i + batchSize)

    const { error } = await supabase.from('news_items').upsert(batch, {
      onConflict: 'source_id,external_id',
      ignoreDuplicates: true
    })

    if (error) {
      console.error(`Failed to save news items batch ${i / batchSize + 1}:`, error)
    } else {
      savedCount += batch.length
    }
  }

  return savedCount
}

/**
 * Mark news items as analyzed
 */
export async function markItemsAsAnalyzed(itemIds: string[], analysisDate: string): Promise<void> {
  if (itemIds.length === 0) return

  const supabase = getSupabase()

  const { error } = await supabase
    .from('news_items')
    .update({ was_analyzed: true, analysis_date: analysisDate })
    .in('external_id', itemIds)

  if (error) {
    console.error('Failed to mark items as analyzed:', error)
  }
}
