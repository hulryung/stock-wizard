import { NextRequest, NextResponse } from 'next/server'
import { fetchMarketNews, fetchKoreanNewsAggregated, type NewsItem } from '@/lib/services/news'
import { analyzeNewsForStocks, analyzeNewsForHiddenGems } from '@/lib/services/analysis'
import { getStockPrice } from '@/lib/services/stocks'
import { saveRecommendation } from '@/lib/services/recommendations'
import { getTodayKST } from '@/lib/utils/date'
import { deduplicateNews } from '@/lib/utils/deduplication'
import { ScrapeLogger, saveNewsItems } from '@/lib/services/scrapeLogger'
import type { RecommendationType } from '@/types/database'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = getTodayKST()
  const logger = new ScrapeLogger()

  try {
    console.log('[DEBUG] Starting news fetch...')
    console.log('[DEBUG] Execution ID:', logger.getExecutionId())

    // Fetch US news
    const usTracker = logger.createSourceTracker('finnhub', 'Finnhub', 'US')
    let usNews: NewsItem[] = []
    try {
      usNews = await fetchMarketNews('general')
      usTracker.complete(usNews, usNews.length)
    } catch (error) {
      usTracker.fail(error instanceof Error ? error : new Error(String(error)), 'fetch_error')
    }
    console.log('[DEBUG] US News count:', usNews.length)

    // Fetch Korean news from all sources
    const krResult = await fetchKoreanNewsAggregated('경제 산업 기업 뉴스')
    console.log('[DEBUG] KR News raw count:', krResult.items.length)

    // Log each source result
    for (const [sourceId, result] of krResult.sourceResults) {
      const tracker = logger.createSourceTracker(sourceId, sourceId, 'KR')
      if (result.success) {
        tracker.complete(
          krResult.items.filter((item) => item.id.startsWith(sourceId)),
          result.count
        )
      } else {
        tracker.fail(new Error(result.error || 'Unknown error'), 'fetch_error')
      }
    }

    // Deduplicate Korean news
    const deduplicationResult = deduplicateNews(krResult.items)
    const krNews = deduplicationResult.uniqueItems
    console.log(
      '[DEBUG] KR News after dedup:',
      krNews.length,
      `(removed ${deduplicationResult.duplicateCount} duplicates)`
    )

    console.log('[DEBUG] Starting analysis...')

    // Run standard analysis and hidden gem analysis in parallel
    const [usAnalysis, krAnalysis, hiddenGemAnalysis] = await Promise.all([
      analyzeNewsForStocks(
        usNews.slice(0, 10).map((news) => ({
          headline: news.headline,
          summary: news.summary
        })),
        'US'
      ),
      analyzeNewsForStocks(
        krNews.slice(0, 10).map((news) => ({
          headline: news.headline,
          summary: news.summary
        })),
        'KR'
      ),
      analyzeNewsForHiddenGems(
        krNews.slice(0, 15).map((news) => ({
          headline: news.headline,
          summary: news.summary
        }))
      )
    ])

    console.log('[DEBUG] US Analysis:', usAnalysis.recommendations.length)
    console.log('[DEBUG] KR Analysis:', krAnalysis.recommendations.length)
    console.log('[DEBUG] Hidden Gem Analysis:', hiddenGemAnalysis.recommendations.length)

    let savedCount = 0
    let hiddenGemSavedCount = 0
    let skippedCount = 0

    // Helper function to save recommendations
    async function saveRec(
      rec: {
        stockSymbol: string
        stockName: string
        market: 'KR' | 'US'
        newsHeadline: string
        reasoningChain: { step: number; reasoning: string; connection: string }[]
        connectionSummary: string
        confidenceScore: number
        newsValue?: {
          market_impact: number
          unexpectedness: number
          contrarian_potential: number
          overall_score: number
          value_label: 'hot' | 'notable' | 'normal'
          evaluation_reason: string
        }
      },
      recommendationType: RecommendationType
    ): Promise<boolean> {
      const quote = await getStockPrice(rec.stockSymbol, rec.market)

      if (!quote || !quote.price) {
        console.log(`[DEBUG] Skipping invalid stock: ${rec.stockSymbol} (${rec.stockName})`)
        skippedCount++
        return false
      }

      const actualStockName = quote.name || rec.stockName

      const saved = await saveRecommendation({
        analysis_date: today,
        market: rec.market,
        recommendation_type: recommendationType,
        stock_symbol: rec.stockSymbol,
        stock_name: actualStockName,
        news_headline: rec.newsHeadline,
        news_source: null,
        reasoning_chain: rec.reasoningChain,
        connection_summary: rec.connectionSummary,
        confidence_score: rec.confidenceScore,
        price_at_recommendation: quote.price,
        news_market_impact: rec.newsValue?.market_impact,
        news_unexpectedness: rec.newsValue?.unexpectedness,
        news_contrarian_potential: rec.newsValue?.contrarian_potential,
        news_overall_score: rec.newsValue?.overall_score,
        news_value_label: rec.newsValue?.value_label,
        news_evaluation_reason: rec.newsValue?.evaluation_reason
      })

      return !!saved
    }

    // Save standard recommendations
    const allStandardRecs = [...usAnalysis.recommendations, ...krAnalysis.recommendations]
    console.log('[DEBUG] Total standard recommendations to save:', allStandardRecs.length)

    for (const rec of allStandardRecs) {
      if (await saveRec(rec, 'standard')) {
        savedCount++
      }
    }

    // Save hidden gem recommendations
    console.log('[DEBUG] Hidden gem recommendations to save:', hiddenGemAnalysis.recommendations.length)

    for (const rec of hiddenGemAnalysis.recommendations) {
      if (await saveRec(rec, 'hidden_gem')) {
        hiddenGemSavedCount++
      }
    }

    console.log(`[DEBUG] Standard saved: ${savedCount}, Hidden gems saved: ${hiddenGemSavedCount}, Skipped: ${skippedCount}`)

    // Save news items to database
    const usItemsStored = await saveNewsItems(usNews.slice(0, 20), 'finnhub', today)
    const krItemsStored = await saveNewsItems(
      krNews.slice(0, 20),
      'kr-aggregated',
      today,
      deduplicationResult.clusters
    )

    // Save scrape logs
    const summary = logger.getSummary()
    await logger.saveLogs({
      ...summary,
      totalItemsStored: usItemsStored + krItemsStored,
      analysisRan: true,
      recommendationsGenerated: savedCount + hiddenGemSavedCount
    })

    console.log('[DEBUG] Scrape logs saved')

    return NextResponse.json({
      success: true,
      count: savedCount,
      hiddenGemCount: hiddenGemSavedCount,
      executionId: logger.getExecutionId(),
      debug: {
        usNewsCount: usNews.length,
        krNewsRawCount: krResult.items.length,
        krNewsAfterDedup: krNews.length,
        duplicatesRemoved: deduplicationResult.duplicateCount,
        usRecommendations: usAnalysis.recommendations.length,
        krRecommendations: krAnalysis.recommendations.length,
        hiddenGemRecommendations: hiddenGemAnalysis.recommendations.length,
        totalToSave: allStandardRecs.length + hiddenGemAnalysis.recommendations.length,
        itemsStored: usItemsStored + krItemsStored,
        sourceResults: Object.fromEntries(krResult.sourceResults)
      }
    })
  } catch (error) {
    console.error('Daily analysis error:', error)

    try {
      const summary = logger.getSummary()
      await logger.saveLogs({
        ...summary,
        totalItemsStored: 0,
        analysisRan: false,
        recommendationsGenerated: 0
      })
    } catch (logError) {
      console.error('Failed to save error logs:', logError)
    }

    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
