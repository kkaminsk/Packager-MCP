# Change: Add Installer Download Tool

## Why

Enterprise packaging workflows require retrieving installer files from vendor sources and placing them in the PSADT `Files` folder. Currently, users must manually download installers and configure paths. This creates friction in the packaging workflow and potential for errors (wrong file, version mismatch, corrupted download).

The Winget integration already retrieves `InstallerUrl` and `InstallerSha256` from manifests. Adding a download capability completes the end-to-end packaging workflow.

## What Changes

- **NEW**: `download_installer` MCP tool that downloads installer files from Winget manifest URLs
- **NEW**: `InstallerDownloadService` to handle HTTP downloads with SHA256 verification
- **NEW**: Progress reporting for large file downloads
- **NEW**: Automatic extraction of nested installers (ZIP with embedded MSI/EXE)

Key features:
- Downloads installer using URL from Winget manifest
- Verifies SHA256 hash against Winget-provided checksum
- Saves to specified output directory (typically PSADT `Files` folder)
- Handles nested installers (e.g., ZIP containing MSI)
- Reports download progress for large files

## Impact

- **Affected specs**: New `installer-download` capability
- **Affected code**:
  - `src/services/download.ts` (new)
  - `src/handlers/tools.ts` (add tool registration)
  - `src/types/download.ts` (new types)
- **Dependencies**: Leverages existing `WingetService` for manifest data
- **Security**: SHA256 verification prevents corrupted or tampered files
