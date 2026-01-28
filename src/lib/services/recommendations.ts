import { getSupabase } from '@/lib/supabase';
import type { Recommendation, RecommendationWithPerformance, Market } from '@/types/database';
import { format } from 'date-fns';

export async function getTodayRecommendations(market?: Market): Promise<Recommendation[]> {
  const today = format(new Date(), 'yyyy-MM-dd');
  
  let query = getSupabase()
    .from('recommendations')
    .select('*')
    .eq('analysis_date', today)
    .order('confidence_score', { ascending: false });

  if (market) {
    query = query.eq('market', market);
  }

  const { data, error } = await query;

  if (error) {
    console.error('Error fetching recommendations:', error);
    return [];
  }

  return data || [];
}

export async function getRecommendationsWithPerformance(
  options: {
    limit?: number;
    offset?: number;
    market?: Market;
  } = {}
): Promise<{ data: RecommendationWithPerformance[]; count: number }> {
  const { limit = 20, offset = 0, market } = options;

  let query = getSupabase()
    .from('recommendations')
    .select('*, performance_tracking(*)', { count: 'exact' })
    .order('analysis_date', { ascending: false })
    .range(offset, offset + limit - 1);

  if (market) {
    query = query.eq('market', market);
  }

  const { data, error, count } = await query;

  if (error) {
    console.error('Error fetching recommendations with performance:', error);
    return { data: [], count: 0 };
  }

  return { data: data || [], count: count || 0 };
}

export async function getRecommendationById(id: string): Promise<RecommendationWithPerformance | null> {
  const { data, error } = await getSupabase()
    .from('recommendations')
    .select('*, performance_tracking(*)')
    .eq('id', id)
    .single();

  if (error) {
    console.error('Error fetching recommendation:', error);
    return null;
  }

  return data;
}

export async function saveRecommendation(recommendation: Omit<Recommendation, 'id' | 'created_at'>): Promise<string | null> {
  const { data, error } = await getSupabase()
    .from('recommendations')
    .insert(recommendation)
    .select('id')
    .single();

  if (error) {
    console.error('Error saving recommendation:', error);
    return null;
  }

  return data.id;
}

export async function checkAnalysisExists(date: string): Promise<boolean> {
  const { data, error } = await getSupabase()
    .from('recommendations')
    .select('id')
    .eq('analysis_date', date)
    .limit(1);

  if (error) {
    console.error('Error checking analysis:', error);
    return false;
  }

  return (data?.length || 0) > 0;
}
