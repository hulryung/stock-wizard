'use client';

import { useEffect, useState } from 'react';

interface CurrentPriceDisplayProps {
  symbol: string;
  market: 'KR' | 'US';
  recommendationPrice: number | null;
}

export function CurrentPriceDisplay({ symbol, market, recommendationPrice }: CurrentPriceDisplayProps) {
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function fetchPrice() {
      try {
        const response = await fetch(`/api/stock-price?symbol=${symbol}&market=${market}`);
        if (!response.ok) {
          setLoading(false);
          return;
        }
        const data = await response.json();
        if (!cancelled && data.price) {
          setCurrentPrice(data.price);
        }
      } catch {
        // Silently fail - price will show as "-"
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    fetchPrice();

    return () => {
      cancelled = true;
    };
  }, [symbol, market]);

  if (loading) {
    return (
      <div className="text-center min-w-[50px] px-2 py-1 rounded bg-gray-100 animate-pulse">
        <p className="text-xs text-gray-400">현재</p>
        <div className="h-4 w-10 bg-gray-200 rounded mx-auto mt-1" />
      </div>
    );
  }

  if (!currentPrice || !recommendationPrice) {
    return (
      <div className="text-center min-w-[50px]">
        <p className="text-xs text-gray-400">현재</p>
        <p className="text-sm text-gray-400">-</p>
      </div>
    );
  }

  const totalReturn = ((currentPrice - recommendationPrice) / recommendationPrice) * 100;
  const isPositive = totalReturn > 0;
  const colorClass = isPositive ? 'text-green-600' : totalReturn < 0 ? 'text-red-600' : 'text-gray-600';

  return (
    <div className="text-center min-w-[50px] px-2 py-1 rounded bg-gray-100">
      <p className="text-xs text-gray-400">현재</p>
      <p className={`text-sm font-medium ${colorClass}`}>
        {isPositive ? '+' : ''}{totalReturn.toFixed(1)}%
      </p>
    </div>
  );
}
