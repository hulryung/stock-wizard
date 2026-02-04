'use client';

import { useState } from 'react';
import { Card, Badge, NewsValueBadge } from '@/components';
import type { Recommendation } from '@/types/database';

interface RecommendationCardProps {
  recommendation: Recommendation;
  isHiddenGem?: boolean;
}

export function RecommendationCard({ recommendation, isHiddenGem = false }: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const confidencePercent = recommendation.confidence_score
    ? Math.round(recommendation.confidence_score * 100)
    : null;

  return (
    <Card
      hoverable
      onClick={() => setExpanded(!expanded)}
      className={isHiddenGem ? 'border-amber-200 bg-amber-50/30' : ''}
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge market={recommendation.market} />
          {isHiddenGem && (
            <span className="px-2 py-0.5 text-xs font-medium bg-amber-100 text-amber-700 rounded">
              다크호스
            </span>
          )}
          {recommendation.news_value_label && (
            <NewsValueBadge
              label={recommendation.news_value_label}
              score={recommendation.news_overall_score}
            />
          )}
        </div>
        <div className="flex items-center gap-3 text-sm text-gray-500">
          <span>{recommendation.analysis_date}</span>
          {confidencePercent && (
            <span>신뢰도 {confidencePercent}%</span>
          )}
        </div>
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {recommendation.stock_name} ({recommendation.stock_symbol})
      </h3>

      <p className="text-sm text-gray-600 mb-4">
        &quot;{recommendation.news_headline}&quot; 뉴스 기반
      </p>

      <div className={`rounded-lg ${isHiddenGem ? 'bg-amber-50' : 'bg-gray-50'} p-4 ${expanded ? '' : 'max-h-32 overflow-hidden'}`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">추론 과정</p>
          <button
            className={`text-xs ${isHiddenGem ? 'text-amber-600 hover:text-amber-800' : 'text-blue-600 hover:text-blue-800'}`}
            onClick={(e) => {
              e.stopPropagation();
              setExpanded(!expanded);
            }}
          >
            {expanded ? '접기' : '더보기'}
          </button>
        </div>

        <ol className="text-sm text-gray-600 space-y-2 list-decimal list-inside">
          {recommendation.reasoning_chain.map((step, idx) => (
            <li key={idx}>
              <span className="font-medium">{step.connection}</span>
              {expanded && (
                <p className="ml-5 mt-1 text-gray-500">{step.reasoning}</p>
              )}
            </li>
          ))}
        </ol>

        {expanded && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-700">
              <span className="font-medium">요약:</span> {recommendation.connection_summary}
            </p>
            {recommendation.news_evaluation_reason && (
              <p className="text-sm text-gray-500 mt-2">
                <span className="font-medium">뉴스 가치:</span> {recommendation.news_evaluation_reason}
              </p>
            )}
            {recommendation.price_at_recommendation && (
              <p className="text-sm text-gray-500 mt-2">
                추천 당시 가격: {recommendation.market === 'KR' ? '₩' : '$'}
                {recommendation.price_at_recommendation.toLocaleString()}
              </p>
            )}
            {isHiddenGem && (
              <div className="mt-3 p-2 bg-amber-100 rounded text-xs text-amber-800">
                <span className="font-semibold">리스크 경고:</span> 중소형주는 높은 변동성과 유동성 리스크가 있습니다. 투자는 본인의 판단과 책임 하에 이루어져야 합니다.
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
