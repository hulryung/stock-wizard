import { unstable_noStore as noStore } from 'next/cache';
import { Container, Badge } from '@/components';
import { RecommendationCard } from '@/components/recommendations';
import { getTodayRecommendations, getTodayHiddenGems } from '@/lib/services/recommendations';
import type { Market } from '@/types/database';

interface PageProps {
  searchParams: Promise<{ market?: string }>;
}

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function HomePage({ searchParams }: PageProps) {
  noStore();

  const params = await searchParams;
  const marketFilter = params.market as Market | undefined;

  const [recommendations, hiddenGems] = await Promise.all([
    getTodayRecommendations(marketFilter),
    getTodayHiddenGems()
  ]);

  return (
    <Container>
      <section className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          오늘의 역발상 추천
        </h1>
        <p className="text-gray-600">
          AI가 뉴스에서 발견한 숨겨진 연결고리로 예상치 못한 종목을 추천합니다.
        </p>
      </section>

      <section className="mb-6">
        <div className="flex gap-2">
          <MarketFilterButton href="/" active={!marketFilter}>
            전체
          </MarketFilterButton>
          <MarketFilterButton href="/?market=KR" active={marketFilter === 'KR'}>
            한국 <Badge market="KR" className="ml-1" />
          </MarketFilterButton>
          <MarketFilterButton href="/?market=US" active={marketFilter === 'US'}>
            미국 <Badge market="US" className="ml-1" />
          </MarketFilterButton>
        </div>
      </section>

      <section className="space-y-4 mb-12">
        {recommendations.length > 0 ? (
          recommendations.map((rec) => (
            <RecommendationCard key={rec.id} recommendation={rec} />
          ))
        ) : (
          <EmptyState />
        )}
      </section>

      {/* Hidden Gem Section */}
      <section className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <h2 className="text-2xl font-bold text-gray-900">
            다크호스 발굴
          </h2>
          <span className="px-2 py-1 text-xs font-semibold bg-amber-100 text-amber-800 rounded-full">
            HIGH RISK
          </span>
        </div>
        <p className="text-gray-600 text-sm">
          뉴스와 연관된 KOSPI/KOSDAQ 중소형 숨겨진 수혜주. 높은 변동성과 리스크가 있습니다.
        </p>
      </section>

      <section className="space-y-4">
        {hiddenGems.length > 0 ? (
          hiddenGems.map((rec) => (
            <RecommendationCard key={rec.id} recommendation={rec} isHiddenGem />
          ))
        ) : (
          <HiddenGemEmptyState />
        )}
      </section>
    </Container>
  );
}

function MarketFilterButton({
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

function EmptyState() {
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
            d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        오늘의 분석이 아직 없습니다
      </h3>
      <p className="text-gray-500 mb-1">
        매일 오전 6시에 새로운 분석이 업데이트됩니다.
      </p>
      <p className="text-sm text-gray-400">
        AI가 뉴스를 분석하여 숨겨진 투자 기회를 찾고 있습니다.
      </p>
    </div>
  );
}

function HiddenGemEmptyState() {
  return (
    <div className="text-center py-12 bg-amber-50 rounded-xl border border-amber-200">
      <div className="mx-auto w-14 h-14 mb-4 rounded-full bg-amber-100 flex items-center justify-center">
        <svg
          className="w-7 h-7 text-amber-600"
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M13 10V3L4 14h7v7l9-11h-7z"
          />
        </svg>
      </div>
      <h3 className="text-lg font-medium text-gray-900 mb-2">
        오늘의 다크호스가 아직 없습니다
      </h3>
      <p className="text-gray-500 text-sm">
        중소형 숨겨진 수혜주를 분석 중입니다.
      </p>
    </div>
  );
}
