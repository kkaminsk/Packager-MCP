# Change: Add Large File Download Guidance

## Why

The `download_installer` tool downloads files without warning users about file size. Large installers (e.g., Visual Studio, Office, games) can be hundreds of megabytes or even gigabytes. Users experience:

1. **Long waits** - No indication of expected download time for large files
2. **Timeout failures** - 5-minute timeout may not be enough for very large files on slow connections
3. **No alternatives** - When timeout occurs, users aren't given the direct download URL to complete manually

The Winget manifests provide `Content-Length` via HTTP headers, allowing the service to warn users upfront and offer alternatives.

## What Changes

- **MODIFIED**: `download_installer` tool to check file size before downloading
- **NEW**: Size threshold configuration (default 500MB) for large file warnings
- **NEW**: Response includes direct download URL for manual download option
- **MODIFIED**: Timeout errors include the installer URL for manual fallback

Key features:
- Pre-flight `HEAD` request to check file size before downloading
- Warning message for files exceeding threshold with estimated download time
- Direct download URL included in response for all downloads
- Timeout errors now include URL and suggestion to download manually
- Configurable size threshold via config

## Impact

- **Affected specs**: `installer-download` (modified requirements)
- **Affected code**:
  - `src/services/download.ts` (add size check, URL in responses)
  - `src/handlers/tools.ts` (include URL in error handling)
  - `src/config/schema.ts` (add threshold config)
- **Dependencies**: None
- **Security**: No new security concerns; URL is already from trusted Winget manifest
