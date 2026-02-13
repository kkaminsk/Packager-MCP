# Senior Engineer Recommendations for Packager-MCP

**Date:** 2026-02-12
**Reviewer:** BHG Bot (Senior Engineering Review)

---

## 1. Architecture & Code Organization

### 1.1 Eliminate Singleton Anti-Pattern
**Priority: Medium** | **Effort: Medium**

Every service (`WingetService`, `ValidationService`, `IntunePublisherService`) uses a module-level singleton with a `get*Service()` / `reset*Service()` pattern. This makes testing harder, hides dependencies, and creates implicit global state.

**Recommendation:** Use dependency injection. Create a `ServiceContainer` or pass services through constructor parameters. The MCP server's setup in `server.ts` is the natural composition root.

```typescript
// Instead of:
const wingetService = getWingetService(); // hidden global

// Do:
class ToolHandlers {
  constructor(private winget: WingetService, private psadt: PsadtService) {}
}
```

### 1.2 Separate Tool Handler Registration from Business Logic
**Priority: Medium** | **Effort: Medium**

`tools.ts` is 500+ lines mixing Zod schema definitions, input mapping (snake_case → camelCase), file system operations, and error handling all in one function. The `get_psadt_template` handler alone has inline `import()` calls for `node:fs` and `node:path`.

**Recommendation:**
- Move Zod schemas to `src/schemas/` or co-locate with types
- Extract the package-creation file system logic from the template handler into its own service (e.g., `PackageAssemblyService`)
- Each tool handler should be ~20-30 lines: validate → call service → format response

### 1.3 Remove Dynamic Imports Inside Handlers
**Priority: High** | **Effort: Low**

The `get_psadt_template` handler uses `await import('node:fs')` and `await import('node:path')` inline. These are built-in modules — there's no reason to dynamically import them. This pattern is repeated in `intune-publisher.ts`.

**Recommendation:** Use static imports at the top of each file.

---

## 2. Error Handling & Resilience

### 2.1 Add Retry Logic for GitHub API Calls
**Priority: High** | **Effort: Low**

`winget.ts` has a `rateLimitRetries` config option but **never uses it**. The `fetchGitHub` method makes a single attempt and throws on failure.

**Recommendation:** Implement exponential backoff with the configured retry count, especially for 429 (rate limit) and 5xx errors.

### 2.2 Intune Publisher Lacks Timeout Configuration
**Priority: Medium** | **Effort: Low**

`intune-publisher.ts` has hardcoded polling loops: `for (let i = 0; i < 30; i++)` with 2-second delays (60s total for Azure Storage URI), and `for (let i = 0; i < 60; i++)` (120s for commit). These are non-configurable magic numbers.

**Recommendation:** Make timeouts configurable and use `AbortController` with `fetch` for request-level timeouts. Extract polling into a utility function with configurable intervals and max attempts.

### 2.3 Graceful Degradation for Stale Cache
**Priority: Low** | **Effort: Low**

The stale-cache fallback in `searchPackages` iterates all cache keys with `startsWith` — this is O(n) and fragile. The key format must match exactly.

**Recommendation:** Store the last successful result per query as a dedicated stale fallback, separate from TTL-governed entries.

---

## 3. Security

### 3.1 PEM/PFX Files Committed to Repository
**Priority: Critical** | **Effort: Low**

`scripts/packager-mcp.pem` and `scripts/packager-mcp.pfx` are tracked in the repository. The `.gitignore` only ignores them at the root level, not under `scripts/`. Even if these are self-signed test certs, this sets a dangerous precedent.

**Recommendation:**
1. Remove these files from the repository: `git rm --cached scripts/packager-mcp.pem scripts/packager-mcp.pfx`
2. Add `*.pem`, `*.pfx`, `*.p12` to `.gitignore` globally
3. Rotate any certificates that were ever in the repo

### 3.2 CORS is Wide Open on HTTP Transport
**Priority: Medium** | **Effort: Low**

`http-server.ts` sets `Access-Control-Allow-Origin: *` unconditionally. If the HTTP transport is used in production (not just stdio), this allows any website to make requests to the MCP server.

**Recommendation:** Make CORS origin configurable in the transport config. Default to `127.0.0.1` / `localhost` only.

### 3.3 No Input Sanitization on File Paths
**Priority: High** | **Effort: Medium**

The `output_directory` parameter in `get_psadt_template` and `file_path` in `verify_psadt_functions` accept arbitrary file paths with no validation. A malicious or confused AI client could write to system directories.

**Recommendation:** Validate that paths are within an allowed base directory, or at minimum reject absolute paths containing `..` traversal. Consider a configurable `allowedOutputDirs` setting.

### 3.4 Clean Up .gitignore
**Priority: Low** | **Effort: Trivial**

The `.gitignore` has duplicate entries (`.claude/settings.local.json` appears 4 times) and one-off test directories (`/TEST_WinRAR_Package4`, `/Test`, `/testing`). This suggests manual editing without review.

**Recommendation:** Deduplicate, use patterns instead of specific directories, and add a comment structure.

---

## 4. Testing

### 4.1 Test Files in Root Directory
**Priority: Medium** | **Effort: Low**

There are 8 `test-*.mjs` files in the project root that are not part of the vitest test suite. These are ad-hoc integration/manual test scripts.

**Recommendation:**
- Move to `scripts/manual-tests/` or `tests/integration/`
- Convert the most valuable ones into proper vitest integration tests
- Add them to `.gitignore` or document their purpose

### 4.2 Known Test Failures Not Addressed
**Priority: Medium** | **Effort: Low**

Per `technicaldebt.md`, two tests in `config-loader.test.ts` fail due to environment variable isolation. These have been known since at least 2026-01-20.

**Recommendation:** Fix by using `vi.stubEnv()` or running env-dependent tests in a subprocess. Failing tests that are "known" and ignored erode test trust.

### 4.3 No Integration Tests
**Priority: High** | **Effort: High**

There are unit tests for individual services but no integration tests that exercise the MCP protocol end-to-end (client → server → tool → response). The Intune publisher has zero tests.

**Recommendation:**
- Add MCP protocol integration tests using the SDK's client
- Add mock-based tests for `intune-publisher.ts` (mock `fetch` calls)
- Add a CI step that runs `npm test` (the GitHub Actions workflow only builds the MSI)

---

## 5. Build & DevOps

### 5.1 Build Script Uses Windows-Only Commands
**Priority: High** | **Effort: Low**

The `build` script in `package.json` uses `xcopy`, which doesn't exist on Linux/macOS. This breaks Docker builds and cross-platform development.

```json
"build": "tsc && xcopy src\\templates dist\\templates /E /I /Y && xcopy src\\knowledge dist\\knowledge /E /I /Y"
```

**Recommendation:** Use `shx`, `cpy-cli`, or `copyfiles` (npm packages), or write a small Node.js build script. The Dockerfile likely works only because it runs `tsc` directly and skips the copy step — but then templates/knowledge are missing in Docker.

### 5.2 `dist/` Directory is Tracked in Git
**Priority: Medium** | **Effort: Low**

The `dist/` folder appears to be partially tracked (it's in `.gitignore` but files exist in the listing). Build artifacts should never be in source control.

**Recommendation:** Ensure `dist/` is fully in `.gitignore` and removed from tracking. Publish built artifacts via releases/CI only.

### 5.3 No CI Test Step
**Priority: High** | **Effort: Low**

The GitHub Actions workflows (`build-msi.yml`, `validate-knowledge.yml`) don't run the test suite.

**Recommendation:** Add a `test` job to CI that runs `npm ci && npm run build && npm test` on every PR.

### 5.4 Version Mismatch
**Priority: Low** | **Effort: Trivial**

`package.json` says `"version": "1.0.0"` but the README says "v0.8 - Beta". Pick one source of truth.

**Recommendation:** Use `package.json` as the canonical version. If it's beta, use `"version": "0.8.0"`.

---

## 6. Performance

### 6.1 Redundant Config Loading
**Priority: Medium** | **Effort: Low**

`loadConfig()` is called multiple times across services (e.g., `WingetService` constructor calls it again to get the GitHub token). Each call re-reads and re-parses the YAML file.

**Recommendation:** Load config once in `main()` and inject it into services. The config loader already returns a parsed object — it just shouldn't be called N times.

### 6.2 Cache Keys Not Normalized
**Priority: Low** | **Effort: Low**

Search cache keys include all parameters as a concatenated string: `search:${query}:${exactMatch}:${includeVersions}:${limit}`. The query isn't normalized (case, whitespace), so `"Chrome"` and `"chrome"` produce different cache entries.

**Recommendation:** Normalize cache key inputs (lowercase, trim) to improve hit rates.

---

## 7. Documentation & Developer Experience

### 7.1 Redundant Documentation Files
**Priority: Low** | **Effort: Trivial**

There's `README.md` and `Readme.txt` in the root. Also `AGENTS.md`, `CLAUDE.md`, and `COPILOT.md` appear to be AI-assistant instruction files — consider whether all three are needed or if one (`AGENTS.md`) suffices.

**Recommendation:** Remove `Readme.txt`. Consolidate AI agent instructions into one file.

### 7.2 `applicationspecification.md` Purpose Unclear
**Priority: Low** | **Effort: Trivial**

This file exists but wasn't referenced anywhere in the code. If it's an internal spec document, move it to a `docs/` folder.

### 7.3 No CONTRIBUTING.md at Root
**Priority: Low** | **Effort: Low**

There's a `CONTRIBUTING.md` inside `src/knowledge/` (for the knowledge base), but nothing at the project root for code contributors.

---

## 8. Type Safety & Code Quality

### 8.1 Excessive Use of `as` Type Assertions
**Priority: Medium** | **Effort: Medium**

Throughout the codebase, `as` casts are used to coerce API responses (`await response.json() as { id: string }`). These provide zero runtime safety.

**Recommendation:** Use Zod schemas to validate external API responses (GitHub, Graph API). You already depend on Zod — use it at trust boundaries, not just for tool input validation.

### 8.2 Inconsistent Naming Conventions
**Priority: Low** | **Effort: Medium**

Tool inputs use `snake_case` (MCP convention), types use `camelCase`, and there's manual mapping between them in every handler. This is error-prone boilerplate.

**Recommendation:** Create a generic `snakeToCamel` utility or use Zod's `.transform()` to handle the conversion at the schema level, eliminating the manual mapping in handlers.

---

## Summary: Top 5 Actions

| # | Recommendation | Priority | Impact |
|---|---------------|----------|--------|
| 1 | Remove PEM/PFX from repo & fix `.gitignore` | Critical | Security |
| 2 | Fix cross-platform build script (`xcopy` → node-based copy) | High | Breaks Docker + non-Windows devs |
| 3 | Add CI test step & fix known test failures | High | Quality confidence |
| 4 | Implement GitHub API retry logic (config exists, code doesn't) | High | Reliability |
| 5 | Validate/sanitize file paths in tool inputs | High | Security |
