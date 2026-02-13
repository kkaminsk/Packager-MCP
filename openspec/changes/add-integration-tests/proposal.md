# Change: Add Integration Tests and Intune Publisher Tests

## Why

There are no integration tests exercising the MCP protocol end-to-end. The Intune publisher service has zero test coverage. Ad-hoc `test-*.mjs` scripts in the project root are informal and not part of the test suite. The project's stated coverage target is 80% for the services layer but there's no enforcement.

## What Changes

- **NEW**: MCP protocol integration tests using the SDK's client (stdio transport)
- **NEW**: Unit tests for `intune-publisher.ts` with mocked `fetch` calls
- **NEW**: Unit tests for `graph-auth.ts`
- **REFACTOR**: Move ad-hoc `test-*.mjs` files from root to `scripts/manual-tests/`
- **NEW**: Validate API responses with Zod schemas at trust boundaries (GitHub, Graph API) instead of `as` type assertions

## Impact

- **Affected specs**: `mcp-server-core`
- **Affected code**:
  - `src/__tests__/integration/` — new directory
  - `src/__tests__/intune-publisher.test.ts` — new
  - `src/__tests__/graph-auth.test.ts` — new
  - `test-*.mjs` — moved to `scripts/manual-tests/`
  - `src/services/winget.ts`, `src/services/intune-publisher.ts` — Zod response validation
