# Tasks: PSADT Toolkit Download

## 1. Core Service Implementation

- [x] 1.1 Create `src/types/psadt-download.ts` with types for download input/output, release metadata, and cache entries
- [x] 1.2 Create `src/services/psadt-download.ts` with `PsadtDownloadService` class
- [x] 1.3 Implement `getLatestRelease()` method to fetch release metadata from GitHub API
- [x] 1.4 Implement `getReleaseByVersion()` method to fetch specific version
- [x] 1.5 Implement `downloadRelease()` method with ZIP download and extraction
- [x] 1.6 Implement release caching (24-hour TTL)
- [x] 1.7 Add error handling for rate limits, network failures, and extraction errors

## 2. MCP Tool Handler

- [x] 2.1 Add `download_psadt_toolkit` tool schema to `src/handlers/tools.ts`
- [x] 2.2 Implement tool handler that invokes `PsadtDownloadService`
- [x] 2.3 Add tool to MCP server registration

## 3. Integration with Existing Services

- [x] 3.1 Add optional `downloadToolkit` parameter to `get_psadt_template` input type
- [x] 3.2 Modify `get_psadt_template` handler to optionally download toolkit after generating script
- [x] 3.3 Update `/package-app` workflow to include toolkit download as part of complete package

## 4. Configuration

- [x] 4.1 Add `psadt.cacheDirectory` config option (default: OS temp directory)
- [x] 4.2 Add `psadt.cacheTtlHours` config option (default: 24)
- [x] 4.3 Add `psadt.defaultVersion` config option (default: "latest")
- [x] 4.4 Update config schema validation in `src/config/schema.ts`

## 5. Knowledge Base Update

- [x] 5.1 Update `src/knowledge/patterns/download.md` with toolkit download section
- [x] 5.2 Update `src/knowledge/psadt/overview.md` to mention automatic download capability

## 6. Testing

- [x] 6.1 Add unit tests for `PsadtDownloadService`
- [x] 6.2 Add integration test for `download_psadt_toolkit` tool
- [x] 6.3 Add test for rate limit handling
- [x] 6.4 Add test for cache behavior

## 7. Documentation

- [x] 7.1 Update CLAUDE.md with new tool documentation
- [x] 7.2 Add usage examples in knowledge base

## Dependencies

- Tasks 2.x depend on 1.x completion
- Tasks 3.x depend on 2.x completion
- Task 4.x can be done in parallel with 1.x
- Tasks 5.x and 7.x can be done in parallel after 2.x
- Task 6.x depends on 1.x and 2.x completion
