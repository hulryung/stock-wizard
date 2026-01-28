import { NextRequest, NextResponse } from 'next/server';
import { format } from 'date-fns';
import { fetchMarketNews, fetchKoreanNews } from '@/lib/services/news';
import { analyzeNewsForStocks } from '@/lib/services/analysis';
import { getStockPrice } from '@/lib/services/stocks';
import { saveRecommendation, checkAnalysisExists } from '@/lib/services/recommendations';

export const dynamic = 'force-dynamic';
export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const today = format(new Date(), 'yyyy-MM-dd');
  if (await checkAnalysisExists(today)) {
    return NextResponse.json({ message: 'Already analyzed today' });
  }

  try {
    console.log('[DEBUG] Starting news fetch...');
    const [usNews, krNews] = await Promise.all([
      fetchMarketNews('general'),
      fetchKoreanNews('경제 산업 기업 뉴스')
    ]);
    console.log('[DEBUG] US News count:', usNews.length);
    console.log('[DEBUG] KR News count:', krNews.length);

    console.log('[DEBUG] Starting analysis...');
    const [usAnalysis, krAnalysis] = await Promise.all([
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
      )
    ]);
    console.log('[DEBUG] US Analysis:', usAnalysis.recommendations.length);
    console.log('[DEBUG] KR Analysis:', krAnalysis.recommendations.length);

    const allRecommendations = [
      ...usAnalysis.recommendations,
      ...krAnalysis.recommendations
    ];
    console.log('[DEBUG] Total recommendations to save:', allRecommendations.length);

    let savedCount = 0;

    for (const rec of allRecommendations) {
      const price = await getStockPrice(rec.stockSymbol, rec.market);
      const saved = await saveRecommendation({
        analysis_date: today,
        market: rec.market,
        stock_symbol: rec.stockSymbol,
        stock_name: rec.stockName,
        news_headline: rec.newsHeadline,
        news_source: null,
        reasoning_chain: rec.reasoningChain,
        connection_summary: rec.connectionSummary,
        confidence_score: rec.confidenceScore,
        price_at_recommendation: price?.price ?? null,
        news_market_impact: rec.newsValue?.market_impact,
        news_unexpectedness: rec.newsValue?.unexpectedness,
        news_contrarian_potential: rec.newsValue?.contrarian_potential,
        news_overall_score: rec.newsValue?.overall_score,
        news_value_label: rec.newsValue?.value_label,
        news_evaluation_reason: rec.newsValue?.evaluation_reason,
      });

      if (saved) {
        savedCount++;
      }
    }

    return NextResponse.json({ 
      success: true, 
      count: savedCount,
      debug: {
        usNewsCount: usNews.length,
        krNewsCount: krNews.length,
        usRecommendations: usAnalysis.recommendations.length,
        krRecommendations: krAnalysis.recommendations.length,
        totalToSave: allRecommendations.length
      }
    });
  } catch (error) {
    console.error('Daily analysis error:', error);
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 });
  }
}
