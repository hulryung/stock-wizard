import { NextRequest, NextResponse } from 'next/server';
import { getStockPrice } from '@/lib/services/stocks';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const symbol = searchParams.get('symbol');
  const market = searchParams.get('market') as 'KR' | 'US' | null;

  if (!symbol || !market) {
    return NextResponse.json({ error: 'Missing symbol or market' }, { status: 400 });
  }

  const quote = await getStockPrice(symbol, market);

  if (!quote) {
    return NextResponse.json({ price: null });
  }

  return NextResponse.json({
    price: quote.price,
    change: quote.change,
    changePercent: quote.changePercent,
  });
}
