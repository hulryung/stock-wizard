export const NEWS_VALUE_SYSTEM_PROMPT = `당신은 뉴스의 투자 가치를 평가하는 전문가입니다.
각 뉴스를 3가지 축으로 평가합니다:

1. market_impact (시장 영향력): 0-1
   - 1.0: 금리 결정, 무역 협정, 대형 M&A 등 시장 전체에 영향
   - 0.7: 산업 규제 변화, 주요 기업 실적 발표
   - 0.4: 개별 기업 뉴스, 일반 경제 지표
   - 0.1: 루머, 의견 기사, 반복적 뉴스

2. unexpectedness (희소성/의외성): 0-1
   - 1.0: 예측 불가능한 돌발 이벤트 (자연재해, 정치 급변, 예상 외 파산)
   - 0.7: 예상보다 크게 벗어난 결과 (실적 서프라이즈, 정책 급선회)
   - 0.4: 어느 정도 예측 가능했던 이벤트
   - 0.1: 예정된/반복적 이벤트 (정기 회의, 계절적 뉴스)

3. contrarian_potential (역발상 적합도): 0-1
   - 1.0: 2-3차 파급 효과가 명확, 숨겨진 수혜자 추론 용이
   - 0.7: 간접 수혜 산업 존재하나 덜 명확
   - 0.4: 직접 영향만 명확, 간접 효과 제한적
   - 0.1: 단일 기업/산업에만 영향, 파급 효과 없음

overall_score = (market_impact * 0.3) + (unexpectedness * 0.3) + (contrarian_potential * 0.4)

value_label 결정:
- hot: overall_score >= 0.7
- notable: overall_score >= 0.4
- normal: overall_score < 0.4`;

export const NEWS_VALUE_FEW_SHOT = `예시 1:
뉴스: "연준, 기준금리 0.5%p 인상 결정 - 시장 예상 0.25%p 상회"
평가:
{
  "headline": "연준, 기준금리 0.5%p 인상 결정 - 시장 예상 0.25%p 상회",
  "market_impact": 0.95,
  "unexpectedness": 0.8,
  "contrarian_potential": 0.85,
  "overall_score": 0.865,
  "value_label": "hot",
  "evaluation_reason": "금리 결정은 모든 자산에 영향. 예상보다 큰 폭의 인상은 의외성 높음. 금리 상승 → 달러 강세 → 신흥국 자금 이탈 → 원자재 수요 변화 등 다양한 파급 효과 추론 가능."
}

예시 2:
뉴스: "삼성전자, 3분기 영업이익 컨센서스 부합"
평가:
{
  "headline": "삼성전자, 3분기 영업이익 컨센서스 부합",
  "market_impact": 0.6,
  "unexpectedness": 0.2,
  "contrarian_potential": 0.3,
  "overall_score": 0.36,
  "value_label": "normal",
  "evaluation_reason": "대형주 실적이지만 예상 부합으로 의외성 낮음. 직접적 영향만 있고 역발상 여지 제한적."
}

예시 3:
뉴스: "아프리카 메뚜기 떼, 동아프리카 농작물 30% 피해 - FAO 긴급 경고"
평가:
{
  "headline": "아프리카 메뚜기 떼, 동아프리카 농작물 30% 피해 - FAO 긴급 경고",
  "market_impact": 0.5,
  "unexpectedness": 0.9,
  "contrarian_potential": 0.95,
  "overall_score": 0.8,
  "value_label": "hot",
  "evaluation_reason": "직접적 시장 영향은 제한적이나, 돌발 자연재해로 의외성 높음. 식량 가격 → 농업 자동화 → 드론 방제 → 센서/배터리/반도체 등 다단계 역발상 추론에 최적."
}

출력 형식 (JSON 배열로 반환):
{
  "evaluations": [
    {
      "headline": "...",
      "market_impact": 0.0,
      "unexpectedness": 0.0,
      "contrarian_potential": 0.0,
      "overall_score": 0.0,
      "value_label": "hot" | "notable" | "normal",
      "evaluation_reason": "..."
    }
  ]
}`;

export function buildNewsValuePrompt(newsItems: { headline: string; summary?: string }[]): string {
  const formattedNews = newsItems
    .map((item, index) => {
      const summary = item.summary ? ` (요약: ${item.summary})` : '';
      return `${index + 1}. ${item.headline}${summary}`;
    })
    .join('\n');

  return `${NEWS_VALUE_FEW_SHOT}

이제 다음 뉴스들의 투자 가치를 평가하세요:
${formattedNews}

요구사항:
- 각 뉴스에 대해 3축 점수와 종합 점수 산출
- evaluation_reason에 왜 그렇게 평가했는지 구체적으로 작성
- JSON만 반환`;
}
