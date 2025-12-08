# Tasks for 10-add-large-file-download-guidance

## Implementation Tasks

1. [x] **Add size threshold to config schema**
   - Add `download.largeFileSizeThreshold` to `src/config/schema.ts`
   - Default: 500MB (524288000 bytes)
   - Update config loader to read this value

2. [x] **Implement pre-flight size check in download service**
   - Add `checkFileSize()` method to `InstallerDownloadService`
   - Perform HTTP HEAD request to get `Content-Length`
   - Return file size or undefined if unavailable

3. [x] **Add large file warning to download response**
   - When file exceeds threshold, include `largeFileWarning` object in response
   - Include: `sizeBytes`, `sizeFormatted`, `estimatedDownloadTime`, `directDownloadUrl`
   - Provide message suggesting manual download for very large files

4. [x] **Always include download URL in response**
   - Add `installerUrl` field to successful download response
   - Allows users to reference the source URL

5. [x] **Enhance timeout error with URL**
   - Modify timeout error handling to include the installer URL
   - Add suggestion: "For large files, consider downloading manually from: {url}"

6. [x] **Add unit tests for size check**
   - Test HEAD request handling
   - Test large file warning generation
   - Test URL inclusion in timeout errors

7. [x] **Update download pattern documentation**
   - Update `src/knowledge/patterns/download.md` with large file handling guidance

## Validation

- [x] Run `npm run test` - all tests pass (202 tests)
- [x] Run `npm run build` - builds successfully
- [x] Run `openspec validate 10-add-large-file-download-guidance --strict` - valid
