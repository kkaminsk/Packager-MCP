# Change: Fix Security Vulnerabilities

## Why

Multiple security issues exist: certificate files (PEM/PFX) are tracked in the repository, the HTTP transport allows unrestricted CORS origins, and the `.gitignore` has duplicates and gaps. These represent real risk for credential exposure and unauthorized cross-origin access.

## What Changes

- **FIX**: Remove `scripts/packager-mcp.pem` and `scripts/packager-mcp.pfx` from git tracking
- **FIX**: Add `*.pem`, `*.pfx`, `*.p12` to `.gitignore` globally
- **FIX**: Deduplicate `.gitignore` entries and use patterns instead of one-off directories
- **NEW**: Configurable CORS origin in transport config (default: `127.0.0.1` / `localhost`)
- **MODIFIED**: HTTP server reads allowed origins from config instead of hardcoding `*`

## Impact

- **Affected specs**: `mcp-server-core` (transport/config)
- **Affected code**:
  - `.gitignore` — cleanup and new patterns
  - `scripts/packager-mcp.pem`, `scripts/packager-mcp.pfx` — remove from tracking
  - `src/http-server.ts` — configurable CORS
  - `src/config/schema.ts` — add `corsOrigin` to transport config
