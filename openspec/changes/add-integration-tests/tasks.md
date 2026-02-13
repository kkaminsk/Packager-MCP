## 1. Move Ad-Hoc Tests
- [x] 1.1 Create `scripts/manual-tests/` directory
- [x] 1.2 Move all `test-*.mjs` files from root to `scripts/manual-tests/`
- [x] 1.3 Add a `scripts/manual-tests/README.md` explaining their purpose

## 2. Intune Publisher Tests
- [ ] 2.1 Create `src/__tests__/intune-publisher.test.ts`
- [ ] 2.2 Mock `fetch` for Graph API calls
- [ ] 2.3 Test: input validation (missing file, wrong extension, empty file)
- [ ] 2.4 Test: app creation flow (create → upload → commit)
- [ ] 2.5 Test: error parsing for common Graph API errors (401, 403, 429)
- [ ] 2.6 Test: metadata extraction from .intunewin file
- [ ] 2.7 Test: category determination logic

## 3. Graph Auth Tests
- [ ] 3.1 Create `src/__tests__/graph-auth.test.ts`
- [ ] 3.2 Test: `isConfigured()` with and without env vars
- [ ] 3.3 Test: token acquisition (mocked)

## 4. MCP Protocol Integration Tests
- [ ] 4.1 Create `src/__tests__/integration/mcp-protocol.test.ts`
- [ ] 4.2 Start server on stdio transport using SDK client
- [ ] 4.3 Test: list tools returns expected 7 tools
- [ ] 4.4 Test: list resources returns expected 11 resources
- [ ] 4.5 Test: list prompts returns expected 5 prompts
- [ ] 4.6 Test: call `search_winget` tool (with mocked GitHub API)
- [ ] 4.7 Test: call `validate_package` tool with sample script

## 5. Response Validation at Trust Boundaries
- [ ] 5.1 Create Zod schemas for GitHub API responses (`GitHubSearchResponse`, file content response)
- [ ] 5.2 Create Zod schemas for Graph API responses (app creation, file upload status)
- [ ] 5.3 Replace `as` type assertions with Zod `.parse()` in `winget.ts` and `intune-publisher.ts`
- [ ] 5.4 Add tests for malformed API response handling
