import { z } from 'zod';
import { getOpenAI } from '@/lib/openai';
import { NEWS_VALUE_SYSTEM_PROMPT, buildNewsValuePrompt } from '@/lib/prompts/newsValue';
import { NewsValue } from '@/types/database';

export interface SimpleNewsItem {
  headline: string;
  summary?: string;
}

const NewsValueSchema = z.object({
  market_impact: z.number().min(0).max(1),
  unexpectedness: z.number().min(0).max(1),
  contrarian_potential: z.number().min(0).max(1),
  overall_score: z.number().min(0).max(1),
  value_label: z.enum(['hot', 'notable', 'normal']),
  evaluation_reason: z.string(),
});

const EvaluationSchema = NewsValueSchema.extend({
  headline: z.string(),
});

const EvaluationOutputSchema = z.object({
  evaluations: z.array(EvaluationSchema),
});

export interface EvaluatedNews extends SimpleNewsItem {
  value: NewsValue;
}

export async function evaluateNewsValue(
  newsItems: SimpleNewsItem[]
): Promise<EvaluatedNews[]> {
  if (newsItems.length === 0) {
    return [];
  }

  const userPrompt = buildNewsValuePrompt(newsItems);

  try {
    const response = await getOpenAI().chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.3,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: NEWS_VALUE_SYSTEM_PROMPT },
        { role: 'user', content: userPrompt },
      ],
    });

    const content = response.choices[0]?.message?.content;

    if (!content) {
      console.error('OpenAI response missing content');
      return applyDefaultValues(newsItems);
    }

    const parsed = JSON.parse(content);
    const validation = EvaluationOutputSchema.safeParse(parsed);

    if (!validation.success) {
      console.error('Invalid evaluation output:', validation.error);
      return applyDefaultValues(newsItems);
    }

    const { evaluations } = validation.data;

    return newsItems.map((item, index) => {
      const evaluation =
        evaluations.find((entry) => entry.headline === item.headline) ??
        evaluations[index];

      if (!evaluation) {
        return { ...item, value: getDefaultValue() };
      }

      const { headline: _headline, ...value } = evaluation;

      return {
        ...item,
        value,
      };
    });
  } catch (error) {
    console.error('Error evaluating news value:', error);
    return applyDefaultValues(newsItems);
  }
}

function getDefaultValue(): NewsValue {
  return {
    market_impact: 0.3,
    unexpectedness: 0.3,
    contrarian_potential: 0.3,
    overall_score: 0.3,
    value_label: 'normal',
    evaluation_reason: 'Fallback applied due to evaluation failure.',
  };
}

function applyDefaultValues(newsItems: SimpleNewsItem[]): EvaluatedNews[] {
  return newsItems.map((item) => ({
    ...item,
    value: getDefaultValue(),
  }));
}
