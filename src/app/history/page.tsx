import { unstable_noStore as noStore } from 'next/cache';
import { Container, Badge, Card } from '@/components';
import { getRecommendationsWithPerformance } from '@/lib/services/recommendations';
import { getStockPrice } from '@/lib/services/stocks';
import type { Market, RecommendationWithPerformance, RecommendationType } from '@/types/database';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface PageProps {
  searchParams: Promise<{ page?: string; market?: string; type?: string }>;
}

const ITEMS_PER_PAGE = 20;

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function HistoryPage({ searchParams }: PageProps) {
  noStore();

  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const marketFilter = params.market as Market | undefined;
  const typeFilter = params.type as RecommendationType | undefined;

  const { data: recommendations, count } = await getRecommendationsWithPerformance({
    limit: ITEMS_PER_PAGE,
    offset: (page - 1) * ITEMS_PER_PAGE,
    market: marketFilter,
    recommendationType: typeFilter,
  });

  // Fetch current prices for all recommendations
  const recommendationsWithCurrentPrice = await Promise.all(
    recommendations.map(async (rec) => {
      const currentPrice = await getStockPrice(rec.stock_symbol, rec.market);
      return {
        ...rec,
        currentPrice: currentPrice?.price || null,
      };
    })
  );

  const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

  const buildFilterUrl = (market?: string, type?: string) => {
    const parts = ['/history'];
    const params = [];
    if (market) params.push(`market=${market}`);
    if (type) params.push(`type=${type}`);
    if (params.length > 0) parts.push('?' + params.join('&'));
    return parts.join('');
  };

  return (
    <Container>
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          추천 히스토리
        </h1>
        <p className="text-gray-600">
          과거 추천과 실제 수익률을 확인하세요.
        </p>
      </section>

      {/* Type Filter */}
      <section className="mb-4">
        <div className="flex gap-2">
          <FilterLink
            href={buildFilterUrl(marketFilter, undefined)}
            active={!typeFilter}
          >
            전체
          </FilterLink>
          <FilterLink
            href={buildFilterUrl(marketFilter, 'standard')}
            active={typeFilter === 'standard'}
          >
            우량주
          </FilterLink>
          <FilterLink
            href={buildFilterUrl(marketFilter, 'hidden_gem')}
            active={typeFilter === 'hidden_gem'}
            variant="amber"
          >
            다크호스
          </FilterLink>
        </div>
      </section>

      {/* Market Filter */}
      <section className="mb-6">
        <div className="flex gap-2">
          <FilterLink href={buildFilterUrl(undefined, typeFilter)} active={!marketFilter}>
            전체 시장
          </FilterLink>
          <FilterLink href={buildFilterUrl('KR', typeFilter)} active={marketFilter === 'KR'}>
            한국 <Badge market="KR" className="ml-1" />
          </FilterLink>
          <FilterLink href={buildFilterUrl('US', typeFilter)} active={marketFilter === 'US'}>
            미국 <Badge market="US" className="ml-1" />
          </FilterLink>
        </div>
      </section>

      <section className="space-y-4">
        {recommendationsWithCurrentPrice.length > 0 ? (
          recommendationsWithCurrentPrice.map((rec) => (
            <HistoryCard
              key={rec.id}
              recommendation={rec}
              currentPrice={rec.currentPrice}
            />
          ))
        ) : (
          <EmptyHistory typeFilter={typeFilter} />
        )}
      </section>

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          marketFilter={marketFilter}
          typeFilter={typeFilter}
        />
      )}
    </Container>
  );
}

function FilterLink({
  href,
  active,
  children,
  variant = 'blue',
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
  variant?: 'blue' | 'amber';
}) {
  const activeClass = variant === 'amber'
    ? 'bg-amber-500 text-white hover:bg-amber-600'
    : 'bg-blue-600 text-white hover:bg-blue-700';

  return (
    <a
      href={href}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? activeClass
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </a>
  );
}

interface HistoryCardProps {
  recommendation: RecommendationWithPerformance;
  currentPrice: number | null;
}

function HistoryCard({ recommendation, currentPrice }: HistoryCardProps) {
  const perf7d = recommendation.performance_tracking?.find(p => p.days_since_recommendation === 7);
  const perf30d = recommendation.performance_tracking?.find(p => p.days_since_recommendation === 30);

  const isHiddenGem = recommendation.recommendation_type === 'hidden_gem';

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'M월 d일 (EEE)', { locale: ko });
  };

  // Calculate total return from recommendation price to current price
  const totalReturn = recommendation.price_at_recommendation && currentPrice
    ? ((currentPrice - recommendation.price_at_recommendation) / recommendation.price_at_recommendation) * 100
    : null;

  const currencySymbol = recommendation.market === 'KR' ? '₩' : '$';

  return (
    <Card className={isHiddenGem ? 'border-amber-200 bg-amber-50/30' : ''}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge market={recommendation.market} />
          {isHiddenGem && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
              다크호스
            </span>
          )}
          <span className="text-sm text-gray-500">{formatDate(recommendation.analysis_date)}</span>
        </div>
        <div className="flex gap-3">
          <PerformanceBadge label="7일" value={perf7d?.price_change_percent} />
          <PerformanceBadge label="30일" value={perf30d?.price_change_percent} />
          {totalReturn !== null && (
            <PerformanceBadge label="현재" value={totalReturn} highlight />
          )}
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {recommendation.stock_name} ({recommendation.stock_symbol})
      </h3>

      <p className="text-sm text-gray-600 mb-3">
        {recommendation.connection_summary}
      </p>

      <div className="flex flex-wrap items-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <span className="text-gray-400">추천가:</span>
          <span className="text-gray-700 font-medium">
            {currencySymbol}
            {recommendation.price_at_recommendation?.toLocaleString() || '-'}
          </span>
        </div>

        {currentPrice && (
          <div className="flex items-center gap-2">
            <span className="text-gray-400">현재가:</span>
            <span className={`font-medium ${
              totalReturn && totalReturn > 0 ? 'text-green-600' :
              totalReturn && totalReturn < 0 ? 'text-red-600' : 'text-gray-700'
            }`}>
              {currencySymbol}{currentPrice.toLocaleString()}
            </span>
          </div>
        )}

        {recommendation.confidence_score && (
          <span className="text-gray-500 ml-auto">
            신뢰도 {Math.round(recommendation.confidence_score * 100)}%
          </span>
        )}
      </div>

      {isHiddenGem && (
        <div className="mt-3 p-2 bg-amber-100 rounded text-xs text-amber-800">
          <span className="font-semibold">리스크 경고:</span> 중소형주는 높은 변동성과 유동성 리스크가 있습니다.
        </div>
      )}
    </Card>
  );
}

function PerformanceBadge({
  label,
  value,
  highlight = false,
}: {
  label: string;
  value?: number | null;
  highlight?: boolean;
}) {
  if (value === undefined || value === null) {
    return (
      <div className="text-center min-w-[50px]">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-400">-</p>
      </div>
    );
  }

  const isPositive = value > 0;
  const colorClass = isPositive ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600';

  return (
    <div className={`text-center min-w-[50px] ${highlight ? 'px-2 py-1 rounded bg-gray-100' : ''}`}>
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-medium ${colorClass}`}>
        {isPositive ? '+' : ''}{value.toFixed(1)}%
      </p>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  marketFilter,
  typeFilter,
}: {
  currentPage: number;
  totalPages: number;
  marketFilter?: Market;
  typeFilter?: RecommendationType;
}) {
  const buildPageUrl = (page: number) => {
    const params = [`page=${page}`];
    if (marketFilter) params.push(`market=${marketFilter}`);
    if (typeFilter) params.push(`type=${typeFilter}`);
    return `/history?${params.join('&')}`;
  };

  const pages = [];
  const start = Math.max(1, currentPage - 2);
  const end = Math.min(totalPages, currentPage + 2);

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  return (
    <div className="flex justify-center items-center gap-2 mt-8">
      {currentPage > 1 && (
        <a
          href={buildPageUrl(currentPage - 1)}
          className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          이전
        </a>
      )}

      {pages.map((page) => (
        <a
          key={page}
          href={buildPageUrl(page)}
          className={`px-3 py-2 rounded-lg ${
            page === currentPage
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          {page}
        </a>
      ))}

      {currentPage < totalPages && (
        <a
          href={buildPageUrl(currentPage + 1)}
          className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          다음
        </a>
      )}
    </div>
  );
}

function EmptyHistory({ typeFilter }: { typeFilter?: RecommendationType }) {
  const message = typeFilter === 'hidden_gem'
    ? '다크호스 추천 히스토리가 없습니다'
    : typeFilter === 'standard'
    ? '우량주 추천 히스토리가 없습니다'
    : '아직 히스토리가 없습니다';

  return (
    <div className="text-center py-16">
      <div className="mx-auto w-16 h-16 mb-4 rounded-full bg-gray-100 flex items-center justify-center">
        <svg
          className="w-8 h-8 text-gray-400"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        {message}
      </h3>
      <p className="text-gray-500">
        추천이 생성되면 여기에 표시됩니다.
      </p>
    </div>
  );
}
