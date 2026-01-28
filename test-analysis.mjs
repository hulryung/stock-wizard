import { readFileSync } from 'fs';

// Manual .env.local parsing
const envContent = readFileSync('.env.local', 'utf-8');
for (const line of envContent.split('\n')) {
  if (line.includes('=') && !line.startsWith('#')) {
    const [key, ...valueParts] = line.split('=');
    process.env[key.trim()] = valueParts.join('=').trim();
  }
}

const CONTRARIAN_SYSTEM_PROMPT = `당신은 역발상 투자 전문 AI입니다. 뉴스를 분석해 직접적 연관성이 없지만 2-3단계 추론을 통해 수혜가 예상되는 주식을 추천합니다.`;

const FEW_SHOT_PROMPT = `다음 예시처럼 2-3단계 떨어진 역발상 추천을 하세요. 직접 연관된 산업은 추천하지 않습니다.

예시:
뉴스: "전기차 배터리 화재 증가로 리콜 확대"
추론:
1) 화재 증가로 안전 규제 강화 → 배터리 상태 모니터링 필요
2) 자동차 OEM이 열폭주 예측 시스템 도입 → 차량 내 AI 기반 BMS 확산
3) 엣지 AI 연산 수요 증가 → AI 추론 칩 수요 확대
추천: NVIDIA (US)

출력 형식(JSON만 반환):
{
  "recommendations": [
    {
      "stockSymbol": "...",
      "stockName": "...",
      "market": "US",
      "newsHeadline": "...",
      "reasoningChain": [
        { "step": 1, "reasoning": "...", "connection": "..." }
      ],
      "connectionSummary": "...",
      "confidenceScore": 0.0
    }
  ]
}`;

async function fetchNews() {
  const key = process.env.FINNHUB_API_KEY;
  const res = await fetch(`https://finnhub.io/api/v1/news?category=general&token=${key}`);
  const data = await res.json();
  return data.slice(0, 5).map(item => ({
    headline: item.headline,
    summary: item.summary
  }));
}

async function analyzeNews(newsItems) {
  const key = process.env.OPENAI_API_KEY;
  
  const formattedNews = newsItems
    .map((item, index) => `${index + 1}. ${item.headline}${item.summary ? ' 요약: ' + item.summary : ''}`)
    .join('\n');

  const userPrompt = `${FEW_SHOT_PROMPT}

이제 실제 뉴스를 분석하세요.
시장: US
뉴스 목록:
${formattedNews}

요구사항:
- recommendations는 최대 3개
- 직접 영향 산업은 추천하지 않음
- reasoningChain에 단계별 reasoning과 connection을 작성
- market은 반드시 "US" 사용
- JSON만 반환`;

  console.log('Sending to OpenAI...');
  console.log('User prompt length:', userPrompt.length);
  
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${key}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: CONTRARIAN_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ]
    })
  });

  const data = await res.json();
  console.log('OpenAI status:', res.status);
  
  if (data.error) {
    console.log('OpenAI error:', data.error);
    return null;
  }
  
  const content = data.choices?.[0]?.message?.content;
  console.log('Raw response:', content);
  
  try {
    const parsed = JSON.parse(content);
    console.log('Parsed recommendations:', parsed.recommendations?.length || 0);
    return parsed;
  } catch (e) {
    console.log('JSON parse error:', e.message);
    return null;
  }
}

async function main() {
  console.log('=== Full Analysis Test ===\n');
  
  console.log('Fetching news...');
  const news = await fetchNews();
  console.log('Got', news.length, 'news items\n');
  
  console.log('Headlines:');
  news.forEach((n, i) => console.log(`${i+1}. ${n.headline.substring(0, 80)}...`));
  console.log('');
  
  const result = await analyzeNews(news);
  
  if (result?.recommendations?.length > 0) {
    console.log('\n=== RECOMMENDATIONS ===');
    result.recommendations.forEach((rec, i) => {
      console.log(`\n${i+1}. ${rec.stockName} (${rec.stockSymbol})`);
      console.log(`   News: ${rec.newsHeadline?.substring(0, 60)}...`);
      console.log(`   Summary: ${rec.connectionSummary}`);
      console.log(`   Confidence: ${rec.confidenceScore}`);
    });
  }
  
  console.log('\n=== Done ===');
}

main().catch(console.error);
