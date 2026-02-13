## 1. Implement Retry Logic
- [x] 1.1 Create `src/utils/retry.ts` with a generic `fetchWithRetry` utility supporting exponential backoff, `Retry-After` header, and configurable max attempts
- [x] 1.2 Update `WingetService.fetchGitHub()` to use `fetchWithRetry` with the configured `rateLimitRetries`
- [x] 1.3 Retry on HTTP 429, 500, 502, 503, 504
- [x] 1.4 Log each retry attempt with delay and attempt number

## 2. Eliminate Redundant Config Loading
- [ ] 2.1 Update `WingetService` constructor to accept config as a parameter instead of calling `loadConfig()`
- [ ] 2.2 Pass config from `server.ts` through service initialization
- [ ] 2.3 Verify no other services call `loadConfig()` independently

## 3. Normalize Cache Keys
- [x] 3.1 Lowercase and trim search query in cache key generation
- [ ] 3.2 Add test verifying `"Chrome"` and `"chrome"` share the same cache entry

## 4. Tests
- [x] 4.1 Add unit tests for retry utility (success, retry-then-success, exhaust-retries)
- [x] 4.2 Add test for `Retry-After` header handling
- [ ] 4.3 Update existing winget tests for constructor change
