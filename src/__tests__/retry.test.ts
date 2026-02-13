import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fetchWithRetry } from '../utils/retry.js';

// Mock the logger
vi.mock('../utils/logger.js', () => ({
  getLogger: () => ({
    child: () => ({
      warn: vi.fn(),
      debug: vi.fn(),
      info: vi.fn(),
      error: vi.fn(),
    }),
  }),
}));

describe('fetchWithRetry', () => {
  beforeEach(() => {
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return response on first successful attempt', async () => {
    const mockResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });
    vi.mocked(fetch).mockResolvedValueOnce(mockResponse);

    const result = await fetchWithRetry('https://api.example.com', {}, { maxRetries: 3 });

    expect(result.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should retry on 429 and succeed on second attempt', async () => {
    const rateLimitResponse = new Response('Rate limited', { status: 429 });
    const successResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });

    vi.mocked(fetch)
      .mockResolvedValueOnce(rateLimitResponse)
      .mockResolvedValueOnce(successResponse);

    const result = await fetchWithRetry('https://api.example.com', {}, {
      maxRetries: 3,
      baseDelayMs: 1, // Use tiny delay for fast tests
    });

    expect(result.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('should return last error response when all retries exhausted', async () => {
    vi.mocked(fetch)
      .mockResolvedValueOnce(new Response('err', { status: 500 }))
      .mockResolvedValueOnce(new Response('err', { status: 500 }))
      .mockResolvedValueOnce(new Response('err', { status: 500 }))
      .mockResolvedValue(new Response('Server Error', { status: 500 }));

    const result = await fetchWithRetry('https://api.example.com', {}, {
      maxRetries: 3,
      baseDelayMs: 1,
    });

    expect(result.status).toBe(500);
    expect(fetch).toHaveBeenCalledTimes(4); // 1 initial + 3 retries
  });

  it('should respect Retry-After header', async () => {
    const headers = new Headers({ 'Retry-After': '1' });
    const rateLimitResponse = new Response('Rate limited', { status: 429, headers });
    const successResponse = new Response(JSON.stringify({ ok: true }), { status: 200 });

    vi.mocked(fetch)
      .mockResolvedValueOnce(rateLimitResponse)
      .mockResolvedValueOnce(successResponse);

    const start = Date.now();
    const result = await fetchWithRetry('https://api.example.com', {}, {
      maxRetries: 3,
      baseDelayMs: 1,
    });

    expect(result.status).toBe(200);
    expect(fetch).toHaveBeenCalledTimes(2);
    // Should have waited at least ~1 second due to Retry-After
    expect(Date.now() - start).toBeGreaterThanOrEqual(900);
  });

  it('should not retry on non-retryable status codes', async () => {
    const notFoundResponse = new Response('Not Found', { status: 404 });
    vi.mocked(fetch).mockResolvedValueOnce(notFoundResponse);

    const result = await fetchWithRetry('https://api.example.com', {}, { maxRetries: 3 });

    expect(result.status).toBe(404);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('should throw on network error after retries exhausted', async () => {
    vi.mocked(fetch)
      .mockRejectedValueOnce(new Error('Network error'))
      .mockRejectedValueOnce(new Error('Network error'));

    await expect(
      fetchWithRetry('https://api.example.com', {}, {
        maxRetries: 1,
        baseDelayMs: 1,
      })
    ).rejects.toThrow('Network error');

    expect(fetch).toHaveBeenCalledTimes(2);
  });
});
