import { z } from 'zod';
import { getOpenAI } from '@/lib/openai';
import { CONTRARIAN_SYSTEM_PROMPT } from '@/lib/prompts/contrarian';
import { evaluateNewsValue, EvaluatedNews } from './newsEvaluation';
import { NewsValue } from '@/types/database';

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

export interface RecommendationWithNewsValue {
  stockSymbol: string;
  stockName: string;
  market: 'KR' | 'US';
  newsHeadline: string;
  reasoningChain: { step: number; reasoning: string; connection: string }[];
  connectionSummary: string;
  confidenceScore: number;
  newsValue?: NewsValue;
}

export interface AnalysisOutput {
  recommendations: RecommendationWithNewsValue[];
}

const MAX_RECOMMENDATIONS = 5;
const DEFAULT_TOP_N = 5;

const FEW_SHOT_PROMPT = `다음 예시처럼 4단계 이상의 역발상 추천을 하세요. 직접 연관된 산업은 절대 추천하지 않습니다.

예시 1:
뉴스: "전기차 배터리 화재 증가로 리콜 확대"
추론 (4단계):
1) 화재 증가로 안전 규제 강화 → 배터리 상태 모니터링 필요
2) 자동차 OEM이 열폭주 예측 시스템 도입 → 차량 내 AI 기반 BMS 확산
3) 엣지 AI 연산 수요 증가 → 저전력 AI 칩 필요
4) 저전력 AI → NPU/추론 전용칩 설계 IP 수요 확대
추천: ARM Holdings (US) - AI 칩 설계 IP
출력 JSON:
{
  "recommendations": [
    {
      "stockSymbol": "ARM",
      "stockName": "ARM Holdings",
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
          "reasoning": "엣지 AI는 저전력이 핵심 → 저전력 AI 칩 수요",
          "connection": "NPU/추론 전용칩 설계 수요 확대"
        },
        {
          "step": 4,
          "reasoning": "칩 설계 IP 라이센스 수요 증가",
          "connection": "AI 칩 설계 IP 기업 수혜"
        }
      ],
      "connectionSummary": "배터리 안전 → AI BMS → 저전력 NPU → 칩 설계 IP",
      "confidenceScore": 0.72
    }
  ]
}

예시 2:
뉴스: "미국 주요 항만 파업으로 물류 지연 장기화"
추론 (4단계):
1) 물류 지연 장기화 → 재고 회전율 악화 → 창고 공간 부족
2) 창고 효율화 압박 → 물류 자동화 투자 확대
3) 물류 로봇 핵심 부품 → 정밀 감속기/서보모터 수요
4) 감속기 핵심 소재 → 고정밀 베어링/기어 가공 기업
추천: 세진티에스 (KR) - 정밀 감속기 부품
출력 JSON:
{
  "recommendations": [
    {
      "stockSymbol": "067770",
      "stockName": "세진티에스",
      "market": "KR",
      "newsHeadline": "미국 주요 항만 파업으로 물류 지연 장기화",
      "reasoningChain": [
        {
          "step": 1,
          "reasoning": "항만 파업으로 물류 병목이 장기화됨",
          "connection": "기업 재고 회전율 악화, 창고 포화"
        },
        {
          "step": 2,
          "reasoning": "창고 효율화를 위해 물류 자동화 투자 급증",
          "connection": "물류 로봇/AGV 수요 폭발"
        },
        {
          "step": 3,
          "reasoning": "물류 로봇 핵심 부품인 정밀 감속기 수요 증가",
          "connection": "감속기/서보모터 기업 수혜"
        },
        {
          "step": 4,
          "reasoning": "감속기 내부 핵심 부품 가공 수요 확대",
          "connection": "정밀 기어/베어링 가공 기업 수혜"
        }
      ],
      "connectionSummary": "항만 병목 → 물류 자동화 → 로봇 감속기 → 정밀 부품 가공",
      "confidenceScore": 0.65
    }
  ]
}

출력 형식(JSON만 반환):
{
  "recommendations": [
    {
      "stockSymbol": "...",
      "stockName": "...",
      "market": "KR" | "US",
      "newsHeadline": "...",
      "reasoningChain": [
        { "step": 1, "reasoning": "...", "connection": "..." },
        { "step": 2, "reasoning": "...", "connection": "..." },
        { "step": 3, "reasoning": "...", "connection": "..." },
        { "step": 4, "reasoning": "...", "connection": "..." }
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
- 직접 영향 산업은 절대 추천하지 않음 (금지 패턴 준수)
- reasoningChain에 반드시 4단계 이상의 추론 작성
- 각 단계마다 다른 산업으로 점프
- market은 반드시 "${market}" 사용
- JSON만 반환`;
}

export interface AnalysisOptions {
  topN?: number;
  skipEvaluation?: boolean;
}

export async function analyzeNewsForStocks(
  newsItems: { headline: string; summary?: string }[],
  market: 'KR' | 'US',
  options?: AnalysisOptions
): Promise<AnalysisOutput> {
  if (newsItems.length === 0) {
    return { recommendations: [] };
  }

  const topN = options?.topN ?? DEFAULT_TOP_N;

  // Stage 1: Evaluate news value
  let evaluatedNews: EvaluatedNews[];
  let newsValueMap: Map<string, NewsValue> = new Map();

  if (!options?.skipEvaluation) {
    console.log(`[Analysis] Stage 1: Evaluating ${newsItems.length} news items...`);
    evaluatedNews = await evaluateNewsValue(newsItems);
    
    // Sort by overall_score and take top N
    evaluatedNews.sort((a, b) => b.value.overall_score - a.value.overall_score);
    const topNews = evaluatedNews.slice(0, topN);
    
    console.log(`[Analysis] Filtered top ${topNews.length} news (scores: ${topNews.map(n => n.value.overall_score.toFixed(2)).join(', ')})`);
    
    // Build news value map for later
    for (const news of evaluatedNews) {
      newsValueMap.set(news.headline, news.value);
    }
    
    // Use filtered news for contrarian analysis
    newsItems = topNews.map(n => ({ headline: n.headline, summary: n.summary }));
  }

  // Stage 2: Contrarian analysis
  console.log(`[Analysis] Stage 2: Running contrarian analysis on ${newsItems.length} news items...`);
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

    // Attach news value to recommendations
    const recommendationsWithValue: RecommendationWithNewsValue[] = 
      validation.data.recommendations.slice(0, MAX_RECOMMENDATIONS).map(rec => ({
        ...rec,
        newsValue: newsValueMap.get(rec.newsHeadline),
      }));

    return { recommendations: recommendationsWithValue };
  } catch (error) {
    console.error('Error analyzing news for stocks:', error);
    return { recommendations: [] };
  }
}
