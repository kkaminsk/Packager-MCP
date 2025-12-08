# Design: Installer Download Service

## Context

The MCP server already integrates with Winget to fetch package metadata including `InstallerUrl` and `InstallerSha256`. Users need to download these installers and place them in the PSADT `Files` folder to complete the packaging workflow. This feature bridges that gap.

### Constraints
- Node.js runtime (no native dependencies preferred)
- Must work on Windows (primary) but code should be cross-platform
- Large files (up to 2GB) must not exhaust memory
- Network failures are common in enterprise environments

### Stakeholders
- Enterprise IT Administrators packaging applications
- MSP Engineers creating packages for multiple clients

## Goals / Non-Goals

### Goals
- Download installer files from URLs in Winget manifests
- Verify file integrity via SHA256 hash
- Handle nested installers (ZIP containing MSI/EXE)
- Provide clear progress and error feedback

### Non-Goals
- Download from arbitrary user-provided URLs (security risk)
- Resume interrupted downloads (adds complexity)
- Parallel downloads of multiple packages
- Caching downloaded installers (disk space management)

## Decisions

### Decision 1: Use Native `fetch` with Streaming

**What**: Use Node.js native `fetch` API with `response.body` streaming to handle large files without loading them entirely into memory.

**Why**:
- Native to Node.js 20+ (no additional dependencies)
- Supports streaming which prevents memory issues with large installers
- Allows computing SHA256 hash during download

**Alternatives considered**:
- `axios`: Additional dependency, overkill for this use case
- `node-fetch`: No longer needed in Node 20+
- `undici`: Lower-level than needed, `fetch` is sufficient

### Decision 2: Single Installer Selection Strategy

**What**: When multiple installers exist (x64/x86/arm64), select based on user preference or default to x64.

**Why**:
- Most enterprise deployments target x64
- Simplifies the API (one file per call)
- User can specify preference when needed

**Selection priority**:
1. User-specified architecture
2. x64 (most common)
3. x86 (fallback)
4. First available

### Decision 3: Temp Directory for ZIP Extraction

**What**: Extract nested ZIP files to a temp directory, then move the target file to the output directory.

**Why**:
- Avoids leaving partial extractions in the output directory on failure
- Allows cleanup on error
- Windows temp directories have appropriate permissions

**Flow**:
```
Download ZIP → Temp dir → Extract all → Find nested file → Move to output → Cleanup temp
```

### Decision 4: Hash-First Verification

**What**: Compute SHA256 hash during download stream, not after writing to disk.

**Why**:
- Single pass through the data (performance)
- Can abort early if hash clearly wrong (streamed computation)
- No need to re-read file after download

**Implementation**:
```typescript
const hash = crypto.createHash('sha256');
for await (const chunk of response.body) {
  hash.update(chunk);
  fileStream.write(chunk);
}
const computedHash = hash.digest('hex');
```

### Decision 5: Error Categorization

**What**: Define specific error types for different failure modes.

**Why**:
- Enables specific remediation guidance
- Helps with debugging and logging
- Consistent error handling across the service

**Error types**:
- `PackageNotFoundError`: Winget package doesn't exist
- `DownloadError`: Network/HTTP failures
- `HashVerificationError`: Checksum mismatch
- `ExtractionError`: ZIP extraction failures

## Risks / Trade-offs

### Risk: Large File Downloads

**Risk**: Downloads of very large files (1GB+) may timeout or fail.

**Mitigation**:
- Configurable timeout (default 5 minutes)
- Clear timeout error message
- Future: Could add chunked download support

### Risk: Disk Space

**Risk**: Download may fail if disk is full.

**Mitigation**:
- Check available space before download (Content-Length header)
- Clean error message if write fails
- Temp files cleaned up on error

### Risk: Network Proxies

**Risk**: Enterprise networks often have proxies that may interfere.

**Mitigation**:
- Use standard Node.js fetch which respects `HTTP_PROXY`/`HTTPS_PROXY`
- Include proxy configuration in error troubleshooting

## Migration Plan

N/A - This is a new capability with no existing functionality to migrate.

## Open Questions

None - Design decisions are complete for initial implementation.
