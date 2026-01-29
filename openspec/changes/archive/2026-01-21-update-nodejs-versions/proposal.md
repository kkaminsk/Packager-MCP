# Update Node.js Versions

## Summary

Standardize Node.js versions across all deployment targets to use LTS releases, addressing version inconsistencies and EOL concerns.

## Priority

**Medium** - Important for long-term stability and security, but not urgent.

## Motivation

The project has Node.js version inconsistencies across deployment targets:

| Component | Current | Issue | Recommended |
|-----------|---------|-------|-------------|
| Dockerfile | node:21 | EOL (odd-numbered) | node:24-bookworm-slim |
| MSI Installer | 20.18.1 | Security updates available | 20.20.0 or 24.x |
| GitHub Actions | node 20 | Maintenance LTS | node 24 (Active LTS) |

**Node.js LTS Schedule:**
- Node.js 20 "Iron": Maintenance LTS, EOL April 2026
- Node.js 24 "Krypton": Active LTS, EOL April 2028

## Scope

### Phase 1: Fix EOL Version (Dockerfile)
- Update Dockerfile from `node:21` to `node:24-bookworm-slim`
- This is critical as Node.js 21 is EOL

### Phase 2: Update MSI Bundled Node.js
- Update default version in `scripts/build-msi.ps1` to 20.20.0 (security patches)
- Add SHA256 checksum for new version
- Optionally: Add Node.js 24.x as alternative option

### Phase 3: Update GitHub Actions (Optional)
- Consider updating workflows to use Node.js 24
- Lower priority as Node.js 20 is still in Maintenance LTS

## Impact

- **Medium risk**: Node.js version changes may surface compatibility issues
- **Files affected**: `Dockerfile`, `scripts/build-msi.ps1`, `.github/workflows/*.yml`
- **Testing**: Full Docker build, MSI build, and workflow runs

## Out of Scope

- npm package updates (covered in other proposals)
- Application code changes
