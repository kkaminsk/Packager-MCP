# Implementation Tasks

## 1. Core Download Service

- [x] 1.1 Create `src/types/download.ts` with type definitions
  - `DownloadInstallerInput` interface
  - `DownloadInstallerOutput` interface
  - `DownloadProgress` type
  - `NestedInstallerConfig` type

- [x] 1.2 Create `src/services/download.ts` with `InstallerDownloadService`
  - HTTP download with streaming for large files
  - SHA256 hash computation during download
  - Hash verification against expected value
  - Progress callback support

- [x] 1.3 Add nested installer extraction logic
  - Detect ZIP files containing installers
  - Extract to temp directory
  - Locate nested installer file
  - Move to final destination

## 2. Tool Integration

- [x] 2.1 Add Zod schema for `download_installer` tool in `src/handlers/tools.ts`
  - `package_id` (required): Winget package identifier
  - `version` (optional): Specific version to download
  - `architecture` (optional): x64, x86, arm64 preference
  - `output_directory` (required): Destination path for installer
  - `output_filename` (optional): Override filename

- [x] 2.2 Register `download_installer` tool handler
  - Validate inputs
  - Fetch manifest from WingetService
  - Select appropriate installer variant
  - Download and verify
  - Return result with file path and metadata

## 3. WingetService Integration

- [x] 3.1 Add method to select best installer from manifest
  - Filter by architecture preference
  - Handle nested installer types
  - Return installer metadata (URL, hash, type)

## 4. Error Handling

- [x] 4.1 Implement download-specific error types
  - `DownloadError` for network failures
  - `HashVerificationError` for checksum mismatches
  - `ExtractionError` for nested installer failures

- [x] 4.2 Add graceful error messages with remediation hints
  - Network timeout suggestions
  - Hash mismatch actions (re-download, check manifest)
  - Missing package guidance

## 5. Testing

- [x] 5.1 Unit tests for `InstallerDownloadService`
  - Mock HTTP responses
  - Hash verification success/failure
  - Nested installer extraction

- [x] 5.2 Integration test with real Winget package
  - Small package download (e.g., a portable app)
  - Verify file integrity
  - Note: Tests skip in CI, run manually with `npm run test -- --run download.integration`

## 6. Documentation

- [x] 6.1 Update knowledge base with download patterns
  - Created `src/knowledge/patterns/download.md`
  - Added to resource list in PsadtService

- [x] 6.2 Add example usage in prompts documentation
  - Download patterns documentation includes workflow examples
  - Tool integrates with existing prompts
