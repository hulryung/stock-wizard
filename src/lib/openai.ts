import OpenAI from 'openai'

let openaiInstance: OpenAI | null = null

export function getOpenAI(): OpenAI {
  if (openaiInstance) {
    return openaiInstance
  }

  const apiKey = process.env.OPENAI_API_KEY

  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY environment variable')
  }

  openaiInstance = new OpenAI({
    apiKey,
  })

  return openaiInstance
}

// For backward compatibility, export a getter
export const openai = new Proxy({} as OpenAI, {
  get: (_target, prop) => {
    return getOpenAI()[prop as keyof OpenAI]
  }
})
