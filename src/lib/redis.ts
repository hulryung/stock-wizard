import { Redis } from '@upstash/redis'

let redisInstance: Redis | null = null

export function getRedis(): Redis {
  if (redisInstance) {
    return redisInstance
  }

  const redisUrl = process.env.UPSTASH_REDIS_REST_URL
  const redisToken = process.env.UPSTASH_REDIS_REST_TOKEN

  if (!redisUrl || !redisToken) {
    throw new Error('Missing Upstash Redis environment variables')
  }

  redisInstance = new Redis({
    url: redisUrl,
    token: redisToken,
  })

  return redisInstance
}

// For backward compatibility, export a getter
export const redis = new Proxy({} as Redis, {
  get: (_target, prop) => {
    return getRedis()[prop as keyof Redis]
  }
})
