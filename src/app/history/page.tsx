import { Container, Badge, Card } from '@/components';
import { getRecommendationsWithPerformance } from '@/lib/services/recommendations';
import type { Market, RecommendationWithPerformance } from '@/types/database';
import { format } from 'date-fns';
import { ko } from 'date-fns/locale';

interface PageProps {
  searchParams: Promise<{ page?: string; market?: string }>;
}

const ITEMS_PER_PAGE = 20;

export const dynamic = 'force-dynamic';

export default async function HistoryPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const page = parseInt(params.page || '1', 10);
  const marketFilter = params.market as Market | undefined;
  
  const { data: recommendations, count } = await getRecommendationsWithPerformance({
    limit: ITEMS_PER_PAGE,
    offset: (page - 1) * ITEMS_PER_PAGE,
    market: marketFilter,
  });

  const totalPages = Math.ceil(count / ITEMS_PER_PAGE);

  return (
    <Container>
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          추천 히스토리
        </h1>
        <p className="text-gray-600">
          과거 추천과 실제 성과를 확인하세요.
        </p>
      </section>

      <section className="mb-6">
        <div className="flex gap-2">
          <FilterLink href="/history" active={!marketFilter}>
            전체
          </FilterLink>
          <FilterLink href="/history?market=KR" active={marketFilter === 'KR'}>
            한국 <Badge market="KR" className="ml-1" />
          </FilterLink>
          <FilterLink href="/history?market=US" active={marketFilter === 'US'}>
            미국 <Badge market="US" className="ml-1" />
          </FilterLink>
        </div>
      </section>

      <section className="space-y-4">
        {recommendations.length > 0 ? (
          recommendations.map((rec) => (
            <HistoryCard key={rec.id} recommendation={rec} />
          ))
        ) : (
          <EmptyHistory />
        )}
      </section>

      {totalPages > 1 && (
        <Pagination
          currentPage={page}
          totalPages={totalPages}
          baseUrl={marketFilter ? `/history?market=${marketFilter}&` : '/history?'}
        />
      )}
    </Container>
  );
}

function FilterLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <a
      href={href}
      className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
        active
          ? 'bg-blue-600 text-white hover:bg-blue-700'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {children}
    </a>
  );
}

function HistoryCard({ recommendation }: { recommendation: RecommendationWithPerformance }) {
  const perf7d = recommendation.performance_tracking?.find(p => p.days_since_recommendation === 7);
  const perf30d = recommendation.performance_tracking?.find(p => p.days_since_recommendation === 30);

  const formatDate = (dateStr: string) => {
    return format(new Date(dateStr), 'M월 d일 (EEE)', { locale: ko });
  };

  return (
    <Card>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge market={recommendation.market} />
          <span className="text-sm text-gray-500">{formatDate(recommendation.analysis_date)}</span>
        </div>
        <div className="flex gap-3">
          <PerformanceBadge label="7일" value={perf7d?.price_change_percent} />
          <PerformanceBadge label="30일" value={perf30d?.price_change_percent} />
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {recommendation.stock_name} ({recommendation.stock_symbol})
      </h3>

      <p className="text-sm text-gray-600 mb-3">
        {recommendation.connection_summary}
      </p>

      <div className="flex items-center justify-between text-sm">
        <span className="text-gray-500">
          추천 당시: {recommendation.market === 'KR' ? '₩' : '$'}
          {recommendation.price_at_recommendation?.toLocaleString() || '-'}
        </span>
        {recommendation.confidence_score && (
          <span className="text-gray-500">
            신뢰도 {Math.round(recommendation.confidence_score * 100)}%
          </span>
        )}
      </div>
    </Card>
  );
}

function PerformanceBadge({ label, value }: { label: string; value?: number | null }) {
  if (value === undefined || value === null) {
    return (
      <div className="text-center">
        <p className="text-xs text-gray-400">{label}</p>
        <p className="text-sm text-gray-400">-</p>
      </div>
    );
  }

  const isPositive = value > 0;
  const colorClass = isPositive ? 'text-green-600' : value < 0 ? 'text-red-600' : 'text-gray-600';

  return (
    <div className="text-center">
      <p className="text-xs text-gray-400">{label}</p>
      <p className={`text-sm font-medium ${colorClass}`}>
        {isPositive ? '+' : ''}{value.toFixed(2)}%
      </p>
    </div>
  );
}

function Pagination({
  currentPage,
  totalPages,
  baseUrl,
}: {
  currentPage: number;
  totalPages: number;
  baseUrl: string;
}) {
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
          href={`${baseUrl}page=${currentPage - 1}`}
          className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          이전
        </a>
      )}

      {pages.map((page) => (
        <a
          key={page}
          href={`${baseUrl}page=${page}`}
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
          href={`${baseUrl}page=${currentPage + 1}`}
          className="px-3 py-2 rounded-lg bg-gray-100 text-gray-700 hover:bg-gray-200"
        >
          다음
        </a>
      )}
    </div>
  );
}

function EmptyHistory() {
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
        아직 히스토리가 없습니다
      </h3>
      <p className="text-gray-500">
        추천이 생성되면 여기에 표시됩니다.
      </p>
    </div>
  );
}
