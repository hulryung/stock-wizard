/**
 * Retry utility with exponential backoff
 */

export interface RetryOptions {
  maxRetries?: number
  initialDelayMs?: number
  backoffMultiplier?: number
  maxDelayMs?: number
  onRetry?: (error: Error, attempt: number) => void
}

export type ErrorType = 'transient' | 'permanent'

const DEFAULT_OPTIONS: Required<Omit<RetryOptions, 'onRetry'>> = {
  maxRetries: 3,
  initialDelayMs: 1000,
  backoffMultiplier: 2,
  maxDelayMs: 30000
}

/**
 * Classify error as transient (retryable) or permanent (non-retryable)
 */
export function classifyError(error: unknown): ErrorType {
  if (error instanceof Error) {
    const message = error.message.toLowerCase()
    const name = error.name.toLowerCase()

    // Network errors - transient
    if (
      name.includes('aborterror') ||
      name.includes('timeouterror') ||
      message.includes('timeout') ||
      message.includes('network') ||
      message.includes('econnreset') ||
      message.includes('econnrefused') ||
      message.includes('enotfound') ||
      message.includes('socket hang up') ||
      message.includes('fetch failed')
    ) {
      return 'transient'
    }

    // HTTP status code based classification
    if (message.includes('429') || message.includes('too many requests')) {
      return 'transient' // Rate limiting
    }
    if (
      message.includes('500') ||
      message.includes('502') ||
      message.includes('503') ||
      message.includes('504')
    ) {
      return 'transient' // Server errors
    }

    // Client errors - permanent
    if (
      message.includes('400') ||
      message.includes('401') ||
      message.includes('403') ||
      message.includes('404')
    ) {
      return 'permanent'
    }
  }

  // Default to transient for unknown errors
  return 'transient'
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Calculate delay for given attempt using exponential backoff
 */
function calculateDelay(
  attempt: number,
  initialDelay: number,
  multiplier: number,
  maxDelay: number
): number {
  const delay = initialDelay * Math.pow(multiplier, attempt - 1)
  // Add jitter (0-20% of delay) to prevent thundering herd
  const jitter = delay * Math.random() * 0.2
  return Math.min(delay + jitter, maxDelay)
}

/**
 * Execute an operation with retry logic using exponential backoff
 *
 * @param operation - Async function to execute
 * @param options - Retry configuration options
 * @returns Result of the operation
 * @throws Last error if all retries fail
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> {
  const opts = { ...DEFAULT_OPTIONS, ...options }
  let lastError: Error | null = null

  for (let attempt = 1; attempt <= opts.maxRetries + 1; attempt++) {
    try {
      return await operation()
    } catch (error) {
      const err = error instanceof Error ? error : new Error(String(error))
      lastError = err

      // Check if we should retry
      if (attempt > opts.maxRetries) {
        break
      }

      const errorType = classifyError(error)
      if (errorType === 'permanent') {
        throw err
      }

      // Calculate delay and wait
      const delay = calculateDelay(
        attempt,
        opts.initialDelayMs,
        opts.backoffMultiplier,
        opts.maxDelayMs
      )

      if (opts.onRetry) {
        opts.onRetry(err, attempt)
      }

      await sleep(delay)
    }
  }

  throw lastError ?? new Error('Retry failed')
}
