'use client';

import { useState } from 'react';
import { Card, Badge, NewsValueBadge } from '@/components';
import type { Recommendation } from '@/types/database';

interface RecommendationCardProps {
  recommendation: Recommendation;
}

export function RecommendationCard({ recommendation }: RecommendationCardProps) {
  const [expanded, setExpanded] = useState(false);

  const confidencePercent = recommendation.confidence_score
    ? Math.round(recommendation.confidence_score * 100)
    : null;

  return (
    <Card hoverable onClick={() => setExpanded(!expanded)}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <Badge market={recommendation.market} />
          {recommendation.news_value_label && (
            <NewsValueBadge 
              label={recommendation.news_value_label} 
              score={recommendation.news_overall_score}
            />
          )}
        </div>
        {confidencePercent && (
          <span className="text-sm text-gray-500">신뢰도 {confidencePercent}%</span>
        )}
      </div>

      <h3 className="text-lg font-semibold text-gray-900 mb-1">
        {recommendation.stock_name} ({recommendation.stock_symbol})
      </h3>

      <p className="text-sm text-gray-600 mb-4">
        &quot;{recommendation.news_headline}&quot; 뉴스 기반
      </p>

      <div className={`rounded-lg bg-gray-50 p-4 ${expanded ? '' : 'max-h-32 overflow-hidden'}`}>
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-medium text-gray-700">추론 과정</p>
          <button
            className="text-xs text-blue-600 hover:text-blue-800"
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
          </div>
        )}
      </div>
    </Card>
  );
}
