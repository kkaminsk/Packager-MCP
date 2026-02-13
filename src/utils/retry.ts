import { getLogger } from '../utils/logger.js';

export interface RetryConfig {
  maxRetries: number;
  retryableStatusCodes?: number[];
  baseDelayMs?: number;
}

const DEFAULT_RETRYABLE_STATUS_CODES = [429, 500, 502, 503, 504];
const DEFAULT_BASE_DELAY_MS = 1000;
const MAX_DELAY_MS = 60000;

/**
 * Fetch with exponential backoff retry logic.
 * Retries on configurable HTTP status codes (default: 429, 5xx).
 * Respects the Retry-After header when present.
 */
export async function fetchWithRetry(
  url: string,
  fetchOptions: RequestInit = {},
  config: RetryConfig
): Promise<Response> {
  const logger = getLogger().child({ utility: 'retry' });
  const {
    maxRetries,
    retryableStatusCodes = DEFAULT_RETRYABLE_STATUS_CODES,
    baseDelayMs = DEFAULT_BASE_DELAY_MS,
  } = config;

  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, fetchOptions);

      if (response.ok || !retryableStatusCodes.includes(response.status)) {
        return response;
      }

      // Retryable status but we may have retries left
      if (attempt >= maxRetries) {
        return response;
      }

      // Calculate delay
      let delayMs = Math.min(baseDelayMs * Math.pow(2, attempt), MAX_DELAY_MS);

      // Respect Retry-After header
      const retryAfter = response.headers.get('Retry-After');
      if (retryAfter) {
        const retryAfterSeconds = parseInt(retryAfter, 10);
        if (!isNaN(retryAfterSeconds) && retryAfterSeconds > 0) {
          delayMs = retryAfterSeconds * 1000;
        }
      }

      logger.warn('Retrying request after transient error', {
        url,
        status: response.status,
        attempt: attempt + 1,
        maxRetries,
        delayMs,
      });

      await sleep(delayMs);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt >= maxRetries) {
        throw lastError;
      }

      const delayMs = Math.min(baseDelayMs * Math.pow(2, attempt), MAX_DELAY_MS);

      logger.warn('Retrying request after network error', {
        url,
        error: lastError.message,
        attempt: attempt + 1,
        maxRetries,
        delayMs,
      });

      await sleep(delayMs);
    }
  }

  // Should not reach here, but just in case
  throw lastError ?? new Error('Retry failed');
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
