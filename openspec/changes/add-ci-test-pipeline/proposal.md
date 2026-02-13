# Change: Add CI Test Pipeline

## Why

The GitHub Actions workflows build the MSI and validate knowledge but never run the test suite. Two known test failures in `config-loader.test.ts` have been unaddressed since January 2026. Without CI enforcement, regressions go unnoticed.

## What Changes

- **NEW**: GitHub Actions workflow that runs `npm ci && npm run build && npm test` on every PR and push to `main`
- **FIX**: Fix 2 failing tests in `config-loader.test.ts` (environment variable isolation)
- **NEW**: Test matrix covering Node.js 20 and 24

## Impact

- **Affected specs**: `mcp-server-core`
- **Affected code**:
  - `.github/workflows/ci.yml` — new workflow
  - `src/__tests__/config-loader.test.ts` — fix failing tests
