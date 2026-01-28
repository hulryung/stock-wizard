import { z } from 'zod';
import { getOpenAI } from '@/lib/openai';
import { CONTRARIAN_SYSTEM_PROMPT } from '@/lib/prompts/contrarian';

const ReasoningStepSchema = z.object({
  step: z.number(),
  reasoning: z.string(),
  connection: z.string(),
});

const RecommendationSchema = z.object({
  stockSymbol: z.string(),
  stockName: z.string(),
  market: z.enum(['KR', 'US']),
  newsHeadline: z.string(),
  reasoningChain: z.array(ReasoningStepSchema),
  connectionSummary: z.string(),
  confidenceScore: z.number().min(0).max(1),
});

const AnalysisOutputSchema = z.object({
  recommendations: z.array(RecommendationSchema),
});

export type AnalysisOutput = z.infer<typeof AnalysisOutputSchema>;

const MAX_RECOMMENDATIONS = 5;

const FEW_SHOT_PROMPT = `다음 예시처럼 2-3단계 떨어진 역발상 추천을 하세요. 직접 연관된 산업은 추천하지 않습니다.

예시 1:
뉴스: "전기차 배터리 화재 증가로 리콜 확대"
추론:
1) 화재 증가로 안전 규제 강화 → 배터리 상태 모니터링 필요
2) 자동차 OEM이 열폭주 예측 시스템 도입 → 차량 내 AI 기반 BMS 확산
3) 엣지 AI 연산 수요 증가 → AI 추론 칩 수요 확대
추천: NVIDIA (US)
출력 JSON:
{
  "recommendations": [
    {
      "stockSymbol": "NVDA",
      "stockName": "NVIDIA Corporation",
      "market": "US",
      "newsHeadline": "전기차 배터리 화재 증가로 리콜 확대",
      "reasoningChain": [
        {
          "step": 1,
          "reasoning": "배터리 화재로 규제와 안전 요구가 강화됨",
          "connection": "배터리 상태 모니터링 기술 필요"
        },
        {
          "step": 2,
          "reasoning": "OEM이 열폭주 예측을 위한 AI BMS를 도입",
          "connection": "차량 내 엣지 AI 연산 수요 확대"
        },
        {
          "step": 3,
          "reasoning": "엣지 AI 연산이 늘며 고성능 추론 칩 수요 증가",
          "connection": "AI 칩 공급사가 수혜"
        }
      ],
      "connectionSummary": "배터리 안전 규제 강화 → AI 기반 BMS → 엣지 AI 칩 수요 확대",
      "confidenceScore": 0.67
    }
  ]
}

예시 2:
뉴스: "미국 주요 항만 파업으로 물류 지연 장기화"
추론:
1) 물류 지연 장기화 → 재고 회전율 악화
2) 기업들이 창고 자동화 투자 확대 → 머신 비전 기반 로봇 수요 증가
3) 머신 비전 핵심 부품 수요 증가 → 산업용 카메라/비전 기업 수혜
추천: Cognex (US)
출력 JSON:
{
  "recommendations": [
    {
      "stockSymbol": "CGNX",
      "stockName": "Cognex Corporation",
      "market": "US",
      "newsHeadline": "미국 주요 항만 파업으로 물류 지연 장기화",
      "reasoningChain": [
        {
          "step": 1,
          "reasoning": "항만 파업으로 물류 병목이 장기화됨",
          "connection": "기업 재고 회전율 악화"
        },
        {
          "step": 2,
          "reasoning": "재고 효율 개선을 위해 창고 자동화 투자 확대",
          "connection": "머신 비전 로봇 수요 증가"
        },
        {
          "step": 3,
          "reasoning": "머신 비전 시스템 확대",
          "connection": "산업용 카메라/비전 기업 수혜"
        }
      ],
      "connectionSummary": "항만 병목 → 창고 자동화 → 머신 비전 부품 수요 확대",
      "confidenceScore": 0.6
    }
  ]
}

출력 형식(JSON만 반환):
{
  "recommendations": [
    {
      "stockSymbol": "...",
      "stockName": "...",
      "market": "KR",
      "newsHeadline": "...",
      "reasoningChain": [
        { "step": 1, "reasoning": "...", "connection": "..." }
      ],
      "connectionSummary": "...",
      "confidenceScore": 0.0
    }
  ]
}`;

function buildUserPrompt(
  newsItems: { headline: string; summary?: string }[],
  market: 'KR' | 'US'
): string {
  const formattedNews = newsItems
    .map((item, index) => {
      const summary = item.summary ? ` 요약: ${item.summary}` : '';
      return `${index + 1}. ${item.headline}${summary}`;
    })
    .join('\n');

  return `${FEW_SHOT_PROMPT}

이제 실제 뉴스를 분석하세요.
시장: ${market}
뉴스 목록:
${formattedNews}

요구사항:
- recommendations는 최대 ${MAX_RECOMMENDATIONS}개
- 직접 영향 산업은 추천하지 않음
- reasoningChain에 단계별 reasoning과 connection을 작성
- market은 반드시 "${market}" 사용
- JSON만 반환`;
}

export async function analyzeNewsForStocks(
  newsItems: { headline: string; summary?: string }[],
  market: 'KR' | 'US'
): Promise<AnalysisOutput> {
  if (newsItems.length === 0) {
    return { recommendations: [] };
  }

  const userPrompt = buildUserPrompt(newsItems, market);

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: CONTRARIAN_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.error('OpenAI response missing content');
      return { recommendations: [] };
    }

    const parsed = JSON.parse(content);
    const validation = AnalysisOutputSchema.safeParse(parsed);

    if (!validation.success) {
      console.error('Invalid analysis output:', validation.error);
      return { recommendations: [] };
    }

    return {
      recommendations: validation.data.recommendations.slice(0, MAX_RECOMMENDATIONS),
    };
  } catch (error) {
    console.error('Error analyzing news for stocks:', error);
    return { recommendations: [] };
  }
}
