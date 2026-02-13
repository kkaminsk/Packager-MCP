# OpenSpec Changes — Results

**Date:** 2026-02-12  
**Test Suite:** ✅ 205 passed, 0 failed (9 test files)  
**TypeScript:** ✅ Compiles clean (`tsc --noEmit`)

---

## Implemented (5/8)

### 1. fix-security-issues — ✅ Complete
**Priority:** Critical  
**Spec:** `mcp-server-core`  
**Changes:**
- Removed tracked certificate files (`scripts/packager-mcp.pem`, `.pfx`) from git
- Added `*.pem`, `*.pfx`, `*.p12`, `*.key` to `.gitignore`; cleaned up duplicates
- Configurable CORS via `corsOrigin` in `TransportConfig` / `http-server.ts` (replaces hardcoded `*`)
- Added `SecurityConfig` with `allowedOutputDirs` to schema

### 2. add-path-sanitization — ✅ Complete
**Priority:** High  
**Spec:** `mcp-server-core`  
**Changes:**
- Created `src/utils/path-validation.ts` with `validateOutputPath()` and `validateReadPath()`
- Integrated into `tools.ts` for `get_psadt_template`, `verify_psadt_functions`, `publish_to_intune`
- 10 unit tests in `src/__tests__/path-validation.test.ts`

### 3. fix-code-quality — ✅ Complete
**Priority:** Low  
**Spec:** `mcp-server-core`  
**Changes:**
- Deleted stale `Readme.txt`, moved `applicationspecification.md` → `docs/`
- Created `CONTRIBUTING.md`
- Updated `CLAUDE.md` / `COPILOT.md` with canonical `AGENTS.md` references
- Extracted polling timeouts as named constants (`AZURE_STORAGE_URI_TIMEOUT_MS`, `COMMIT_TIMEOUT_MS`, `POLL_INTERVAL_MS`)
- Replaced retry loops with generic `pollUntil<T>()` utility
- Updated `packager-mcp.example.yaml`

### 4. fix-cross-platform-build — ✅ Complete
**Priority:** High  
**Spec:** `mcp-server-core`  
**Changes:**
- Created `scripts/copy-assets.mjs` (cross-platform asset copy, replaces `xcopy`)
- Updated `package.json` build script

### 5. add-github-api-retry — ✅ Complete
**Priority:** High  
**Spec:** `winget-service`  
**Changes:**
- Created `src/utils/retry.ts` with exponential backoff + jitter
- Integrated into `WingetService.fetchGitHub()` with `rateLimitRetries: 3`
- Tests use real timers with `baseDelayMs: 1` (no fake timer issues)

---

## Implemented by Sub-Agent — Needs Verification (1/8)

### 6. add-ci-test-pipeline — ⚠️ Likely Complete
**Priority:** High  
**Spec:** `mcp-server-core`  
**Changes:**
- `.github/workflows/ci.yml` exists (created by sub-agent)
- Targeted: GitHub Actions CI on push/PR, config-loader env var isolation fixes
- **Status:** Sub-agent completed; CI file present. Needs manual review of workflow correctness.

---

## Not Yet Implemented (2/8)

### 7. refactor-dependency-injection — 🔲 Not Started
**Priority:** Medium  
**Spec:** `mcp-server-core`  
**Planned:**
- ServiceContainer pattern for dependency injection
- Extract Zod schemas to `src/schemas/`
- PackageAssemblyService extraction
- Remove dynamic imports, add snake→camel utility

### 8. add-integration-tests — 🔲 Not Started
**Priority:** Medium  
**Spec:** `mcp-server-core`  
**Planned:**
- MCP protocol end-to-end tests
- `intune-publisher` unit tests with mocked Azure calls
- Zod response schema validation
- Move `test-*.mjs` scripts to `scripts/manual-tests/`

---

## Files Modified (key changes)

| File | Change |
|------|--------|
| `.gitignore` | Cleaned duplicates, added cert patterns |
| `src/schema.ts` | Added `corsOrigin`, `SecurityConfig` |
| `src/http-server.ts` | Configurable CORS |
| `src/tools.ts` | Path validation integration |
| `src/winget.ts` | Retry logic for GitHub API |
| `src/intune-publisher.ts` | `pollUntil<T>()`, named constants |
| `src/utils/path-validation.ts` | New — path sanitization |
| `src/utils/retry.ts` | New — exponential backoff |
| `src/utils/index.ts` | Re-exports new utilities |
| `scripts/copy-assets.mjs` | New — cross-platform asset copy |
| `.github/workflows/ci.yml` | New — CI pipeline |
| `CONTRIBUTING.md` | New |
| `docs/applicationspecification.md` | Moved from root |
| `packager-mcp.example.yaml` | Updated with new config options |
| `CLAUDE.md`, `COPILOT.md` | Added AGENTS.md references |

## Notes
- OpenSpec CLI (`openspec`) not installed — proposals not formally validated
- All 8 proposals have proper structure (`proposal.md` + `tasks.md` + `specs/`)
- Pre-existing OpenSpec changes untouched: `add-claude-code-check`, `add-intune-publisher`, `add-intune-setup-script`, `add-mcp-registration`, `add-project-folder`, `add-wix-installer`, `bundle-nodejs-in-msi`
