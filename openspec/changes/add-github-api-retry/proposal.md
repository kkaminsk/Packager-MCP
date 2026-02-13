# Change: Implement GitHub API Retry Logic

## Why

The config schema defines `rateLimitRetries` (default: 3) but the `WingetService.fetchGitHub()` method makes a single attempt and throws on failure. Rate limit errors (429) and transient server errors (5xx) could be recovered with retries. The config also loads redundantly — `loadConfig()` is called in multiple service constructors.

## What Changes

- **FIX**: Implement exponential backoff retry in `fetchGitHub()` using the configured `rateLimitRetries` value
- **FIX**: Respect `Retry-After` header from GitHub API on 429 responses
- **FIX**: Retry on 5xx server errors
- **REFACTOR**: Load config once in `main()` and pass to services via constructor, eliminating redundant `loadConfig()` calls
- **FIX**: Normalize search cache keys (lowercase, trim) for better hit rates

## Impact

- **Affected specs**: `winget-service`
- **Affected code**:
  - `src/services/winget.ts` — retry logic, constructor change
  - `src/server.ts` — pass config to services
  - `src/config/loader.ts` — ensure single-load pattern
