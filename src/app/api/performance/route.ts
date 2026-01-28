import { NextRequest, NextResponse } from 'next/server';
import { getSupabase } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const recommendationId = searchParams.get('recommendation_id');

  if (recommendationId) {
    const { data, error } = await getSupabase()
      .from('performance_tracking')
      .select('*')
      .eq('recommendation_id', recommendationId)
      .order('days_since_recommendation', { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json(data);
  }

  // Get aggregate stats
  const { data, error } = await getSupabase()
    .from('performance_tracking')
    .select('days_since_recommendation, price_change_percent');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stats = {
    day7: calculateStats(data?.filter(d => d.days_since_recommendation === 7) || []),
    day30: calculateStats(data?.filter(d => d.days_since_recommendation === 30) || [])
  };

  return NextResponse.json(stats);
}

function calculateStats(data: { price_change_percent: number | null }[]) {
  const values = data.map(d => d.price_change_percent).filter((v): v is number => v !== null);
  if (values.length === 0) return { avg: 0, count: 0, positive: 0 };
  
  return {
    avg: values.reduce((a, b) => a + b, 0) / values.length,
    count: values.length,
    positive: values.filter(v => v > 0).length
  };
}
