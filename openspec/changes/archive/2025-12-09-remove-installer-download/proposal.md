# Change: Remove installer download capability

## Why

The `download_installer` MCP tool has proven troublesome due to:
- Timeout issues with large installer files
- Hash verification failures due to network issues
- Complex nested ZIP extraction that can fail
- Rate limiting from GitHub API lookups

The existing `search_winget` tool already provides the `InstallerUrl` and `InstallerSha256` from Winget manifests. Clients can use this URL directly with PowerShell's `Invoke-WebRequest` to download installers to the PSADT Files folder.

## What Changes

- **REMOVED**: `download_installer` MCP tool
- **REMOVED**: `src/services/download.ts` service
- **REMOVED**: `src/types/download.ts` type definitions
- **MODIFIED**: Download patterns documentation to guide clients on using `Invoke-WebRequest`
- Configuration options for `download.*` no longer needed

## Impact

- Affected specs: `installer-download` (removed entirely)
- Affected code:
  - `src/handlers/tools.ts` - remove `download_installer` registration
  - `src/services/download.ts` - delete file
  - `src/types/download.ts` - delete file
  - `src/knowledge/patterns/download.md` - update to use `Invoke-WebRequest` approach
  - `src/utils/errors.ts` - remove `DownloadError`, `HashVerificationError`, `ExtractionError`
  - `src/config/loader.ts` - remove `download.*` config options
