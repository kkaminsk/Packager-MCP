# Design: PSADT Toolkit Download

## Context

The PSAppDeployToolkit is hosted on GitHub at `PSAppDeployToolkit/PSAppDeployToolkit`. Each release includes a ZIP file containing the complete toolkit structure. The MCP server needs to fetch the latest (or specified) release, download the ZIP, extract it, and organize files into the correct package structure.

### Stakeholders
- IT administrators creating Intune packages
- MSP engineers packaging applications for clients
- Current users who manually download PSADT

### Constraints
- GitHub API rate limits (60/hour unauthenticated, 5000/hour with token)
- ZIP file sizes (~2-3 MB typically)
- Cross-platform extraction (Windows primary, but should work on other platforms)

## Goals / Non-Goals

### Goals
- Enable one-click package creation including toolkit files
- Support version pinning for reproducible builds
- Reuse existing GitHub token configuration from Winget integration
- Cache downloaded releases to minimize API calls and bandwidth

### Non-Goals
- Managing multiple PSADT versions simultaneously
- Automatic updates of already-deployed packages
- Modifying PSADT source files after download

## Decisions

### Decision: Use GitHub Releases API

**What**: Fetch releases from `https://api.github.com/repos/PSAppDeployToolkit/PSAppDeployToolkit/releases`

**Why**:
- Official distribution mechanism for PSADT
- Provides versioned, tested releases
- Includes SHA checksums for verification
- Supports authentication for higher rate limits

**Alternatives considered**:
- Clone git repository: Rejected - much larger download, requires git
- Use PSGallery: Rejected - PSADT not published there for desktop deployment toolkit
- Bundle PSADT in MCP server: Rejected - version staleness, licensing complexity

### Decision: Cache Downloaded Releases

**What**: Cache downloaded and extracted toolkit files for 24 hours

**Why**:
- Releases are immutable (version-tagged)
- Multiple package creations benefit from single download
- Reduces GitHub API and bandwidth usage

**Cache strategy**:
- Key: `psadt-toolkit:{version}`
- Storage: Temp directory with version subdirectories
- TTL: 24 hours (releases don't change)

### Decision: Reuse Existing GitHub Token

**What**: Use the same `GITHUB_TOKEN` environment variable already used for Winget

**Why**:
- Consistent configuration
- Users already may have token configured
- Single point of credential management

### Decision: Support Version Specification

**What**: Allow specifying exact version or `latest`

**Why**:
- Reproducible builds require pinned versions
- Enterprise environments may standardize on specific versions
- Default to latest for convenience

### Decision: Separate Tool from Template Generation

**What**: Create `download_psadt_toolkit` as a standalone tool, with integration option in `get_psadt_template`

**Why**:
- Separation of concerns
- Toolkit download is reusable across multiple packages
- Some users may want scripts without downloading toolkit
- Supports advanced workflows (download once, generate many scripts)

## Risks / Trade-offs

### Risk: GitHub Rate Limits
- **Impact**: Users without token limited to 60 requests/hour
- **Mitigation**: Clear error messages suggesting token configuration; aggressive caching; release metadata cached separately from downloads

### Risk: Large File Downloads
- **Impact**: ZIP files are ~2-3MB; could timeout on slow connections
- **Mitigation**: Reuse existing download infrastructure with timeout handling; provide manual download URL fallback

### Risk: PSADT Release Structure Changes
- **Impact**: Future releases might change directory structure
- **Mitigation**: Version-specific extraction logic; document supported versions; fail gracefully with clear errors

### Trade-off: Cache Storage
- **Trade-off**: Caching reduces bandwidth but uses disk space
- **Decision**: Accept disk usage trade-off; temp directory cleaned by OS eventually; cache size is small (~3MB per version)

## Implementation Notes

### GitHub Release API Response Structure

```json
{
  "tag_name": "v4.0.4",
  "name": "PSAppDeployToolkit v4.0.4",
  "assets": [
    {
      "name": "PSAppDeployToolkit_v4.0.4.zip",
      "browser_download_url": "https://github.com/.../PSAppDeployToolkit_v4.0.4.zip",
      "size": 2850000
    }
  ]
}
```

### Extraction Logic

1. Download ZIP to temp directory
2. Extract contents
3. Locate toolkit root (may have version prefix in folder name)
4. Copy required directories to output location
5. Preserve file permissions on non-Windows

### File Structure Expected in Release ZIP

```
PSAppDeployToolkit_v4.0.4/
├── Toolkit/
│   ├── PSAppDeployToolkit/
│   │   ├── PSAppDeployToolkit.psd1
│   │   └── PSAppDeployToolkit.psm1
│   ├── Config/
│   ├── Assets/
│   ├── Strings/
│   ├── Files/                    # Empty - for user content
│   ├── Invoke-AppDeployToolkit.exe
│   └── Invoke-AppDeployToolkit.ps1
└── Examples/
```

## Open Questions

1. **Should we verify ZIP integrity?**
   - GitHub doesn't provide checksums for release assets directly
   - Could compute and cache checksum on first download
   - Decision: Skip for MVP; add in future if needed

2. **Should the Extensions module be included by default?**
   - Most users don't need it
   - Adds complexity to package
   - Decision: Off by default, opt-in parameter
