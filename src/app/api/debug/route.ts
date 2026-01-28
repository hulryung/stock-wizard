import { NextResponse } from 'next/server';
import { format } from 'date-fns';
import { createClient } from '@supabase/supabase-js';

export const dynamic = 'force-dynamic';

export async function GET() {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!supabaseUrl || !supabaseKey) {
    return NextResponse.json({
      error: 'Missing env vars',
      hasUrl: !!supabaseUrl,
      hasKey: !!supabaseKey
    });
  }
  
  const supabase = createClient(supabaseUrl, supabaseKey);
  
  const { data, error } = await supabase
    .from('recommendations')
    .select('id, analysis_date, stock_symbol')
    .eq('analysis_date', today)
    .limit(5);
  
  return NextResponse.json({
    today,
    serverTime: new Date().toISOString(),
    supabaseUrl,
    dataCount: data?.length || 0,
    error: error?.message || null,
    sample: data?.slice(0, 2) || []
  });
}
