## Context

The Winget package repository (`microsoft/winget-pkgs` on GitHub) contains manifests for thousands of Windows applications with installer metadata. This proposal adds the service layer and MCP tools to query this data.

**Stakeholders**: IT admins packaging applications, MSP engineers
**Constraints**: GitHub API rate limits (60/hr unauthenticated, 5000/hr with PAT)

## Goals / Non-Goals

**Goals**:
- Provide `search_winget` tool for finding packages by name
- Provide `get_silent_install_args` tool for installer parameters
- Parse Winget YAML manifests into structured data
- Cache results to minimize API calls
- Support optional GitHub PAT for higher rate limits

**Non-Goals**:
- Writing to Winget repository
- Managing local Winget installations
- Package download/verification (user responsibility)

## Decisions

### Decision 1: Use GitHub REST API for manifest access
- **Why**: Simple, well-documented, provides search and raw file access
- **Alternatives considered**:
  - GitHub GraphQL API: More complex, no significant benefit for this use case
  - Clone repository locally: Too heavy, stale data concerns
  - Winget CLI wrapper: Requires Winget installed, less portable

### Decision 2: Cache manifests for 1 hour, search results for 15 minutes
- **Why**: Balances freshness with API rate limit conservation
- **Alternatives considered**:
  - Longer TTL: Risk of stale data during package updates
  - Shorter TTL: Risk of hitting rate limits

### Decision 3: Parse multiple installer architectures
- **Why**: Many packages have x64, x86, and arm64 variants
- **Decision**: Return all variants, let client choose

### Decision 4: Confidence levels for silent install args
- **Why**: Some args are from Winget manifests (verified), others are heuristics
- **Levels**: `verified` (from manifest), `high` (known installer type), `medium` (pattern match), `low` (generic fallback)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    MCP Tool Layer                            │
│  ┌─────────────────────┐  ┌─────────────────────┐          │
│  │   search_winget     │  │ get_silent_install  │          │
│  │       Tool          │  │     _args Tool      │          │
│  └──────────┬──────────┘  └──────────┬──────────┘          │
└─────────────┼────────────────────────┼──────────────────────┘
              │                        │
              ▼                        ▼
┌─────────────────────────────────────────────────────────────┐
│                   Winget Service                             │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────┐  │
│  │ searchPackages │  │  getManifest   │  │ getSilentArgs│  │
│  └───────┬────────┘  └───────┬────────┘  └──────┬───────┘  │
│          │                   │                   │          │
│  ┌───────┴───────────────────┴───────────────────┴───────┐  │
│  │               Manifest Parser                          │  │
│  │  (YAML → Typed objects)                                │  │
│  └──────────────────────────┬────────────────────────────┘  │
└─────────────────────────────┼────────────────────────────────┘
                              │
              ┌───────────────┼───────────────┐
              ▼               ▼               ▼
┌──────────────────┐  ┌─────────────┐  ┌─────────────────┐
│    LRU Cache     │  │  GitHub API │  │ Silent Args DB  │
│  (from Prop 1)   │  │  (REST)     │  │ (embedded)      │
└──────────────────┘  └─────────────┘  └─────────────────┘
```

## Winget Manifest Structure

Repository path pattern:
```
manifests/{first-letter}/{Publisher}/{AppName}/{Version}/
├── {Publisher}.{AppName}.yaml          # Version manifest
├── {Publisher}.{AppName}.installer.yaml # Installer details
└── {Publisher}.{AppName}.locale.en-US.yaml # Localized info
```

Key fields extracted:
- `PackageIdentifier`: Unique ID (e.g., `Google.Chrome`)
- `PackageVersion`: Version string
- `InstallerUrl`: Download URL
- `InstallerSha256`: Hash for verification
- `InstallerSwitches.Silent`: Silent install arguments
- `InstallerType`: msi, exe, msix, zip, etc.

## Risks / Trade-offs

| Risk | Impact | Mitigation |
|------|--------|------------|
| GitHub rate limiting | High | Cache aggressively, support PAT token |
| Manifest schema changes | Medium | Abstract parsing, version detection |
| Missing silent args in manifest | Medium | Fallback to known installer patterns |
| API unavailable | Medium | Return cached data if available, clear error message |

## Migration Plan

N/A - New capability.

## Open Questions

1. Should we support Winget Community Repository separately?
   - **Decision**: No, focus on official `microsoft/winget-pkgs` for MVP
