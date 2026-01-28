import { NextRequest, NextResponse } from 'next/server';
import { format, subDays } from 'date-fns';
import { getSupabase } from '@/lib/supabase';
import { getStockPrice } from '@/lib/services/stocks';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const trackingDays = [7, 30]; // Track 7-day and 30-day performance
  let trackedCount = 0;

  for (const days of trackingDays) {
    const targetDate = format(subDays(new Date(), days), 'yyyy-MM-dd');
    
    const { data: recommendations } = await getSupabase()
      .from('recommendations')
      .select('*')
      .eq('analysis_date', targetDate);

    for (const rec of recommendations || []) {
      const currentPrice = await getStockPrice(rec.stock_symbol, rec.market);
      if (!currentPrice || !rec.price_at_recommendation) continue;

      const changePercent = ((currentPrice.price - rec.price_at_recommendation) / rec.price_at_recommendation) * 100;

      await getSupabase().from('performance_tracking').upsert({
        recommendation_id: rec.id,
        days_since_recommendation: days,
        current_price: currentPrice.price,
        price_change_percent: changePercent
      }, { onConflict: 'recommendation_id,days_since_recommendation' });
      
      trackedCount++;
    }
  }

  return NextResponse.json({ success: true, tracked: trackedCount });
}
