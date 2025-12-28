# Technical Design: Intune Publisher

## Context

Enterprise IT administrators use packager-mcp to create PSADT deployment packages for Intune. The current workflow ends with a complete package on disk, but users must manually:
1. Run IntuneWinAppUtil.exe to create .intunewin file
2. Log into Intune portal
3. Create a new Win32 app
4. Upload the package and configure settings

This design adds Graph API integration to automate steps 3-4, assuming the user has already created the .intunewin file.

### Stakeholders
- Enterprise IT admins deploying packages
- MSPs managing multiple tenants
- Security teams (certificate handling)

## Goals / Non-Goals

### Goals
- Upload .intunewin packages to Intune via Graph API
- Use certificate-based service principal auth (no interactive login)
- Auto-populate app metadata from packaging context
- Fetch descriptions and logos automatically where possible

### Non-Goals
- Create .intunewin files (use IntuneWinAppUtil.exe separately)
- Manage app assignments (groups, required/available)
- Handle supersedence or dependencies
- Support interactive or device code authentication

## Decisions

### Decision 1: Use @azure/identity for certificate auth

**What**: Use the official Azure SDK for Node.js to handle certificate-based authentication.

**Why**:
- `@azure/identity` is Microsoft's official library
- `CertificateCredential` class handles PFX/PEM parsing
- Automatic token caching and refresh
- Well-documented and maintained

**Alternatives considered**:
- Raw JWT signing with `jsonwebtoken` - More control but more error-prone
- MSAL.js - Lower level, more complex for this use case

### Decision 2: Store credentials in environment variables

**What**: Read auth config from environment variables, not config files.

**Why**:
- Standard practice for secrets (12-factor app)
- Works with Docker secrets
- No risk of committing credentials
- Consistent with existing GITHUB_TOKEN pattern

**Variables**:
```
AZURE_TENANT_ID=<tenant-guid>
AZURE_CLIENT_ID=<app-guid>
AZURE_CLIENT_CERTIFICATE_PATH=/path/to/cert.pfx
AZURE_CLIENT_CERTIFICATE_PASSWORD=optional
```

### Decision 3: Use native fetch for Graph API calls

**What**: Use Node.js native `fetch` with `@azure/identity` token.

**Why**:
- Consistent with existing Winget service pattern
- No additional HTTP library dependency
- Full control over request/response handling

**Alternative**: Microsoft Graph SDK - Heavier dependency, overkill for our few endpoints.

### Decision 4: Web search via Claude's native capability

**What**: Use Claude's built-in web search for descriptions/logos rather than adding a search API.

**Why**:
- Claude already has WebSearch tool access
- No additional API keys needed
- Natural language understanding for extracting descriptions
- Works in the MCP prompt workflow context

**Implementation**: The prompt workflow will use WebSearch during execution.

### Decision 5: Chunked upload for .intunewin files

**What**: Implement Graph API's chunked upload session for large files.

**Why**:
- .intunewin files can be >100MB
- Graph API requires chunked upload for files >4MB
- Provides progress indication for long uploads

**Approach**:
1. Create upload session via POST to `/deviceAppManagement/mobileApps/{id}/microsoft.graph.win32LobApp/contentVersions/{ver}/files/{file}/commit`
2. Upload chunks via PUT to the upload URL
3. Commit the upload

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    MCP Client (Claude)                   │
└─────────────────────────────────────────────────────────┘
                           │
                           ▼
┌─────────────────────────────────────────────────────────┐
│                   handlers/tools.ts                      │
│                 publish_to_intune tool                   │
└─────────────────────────────────────────────────────────┘
                           │
          ┌────────────────┼────────────────┐
          ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│ graph-auth.ts│  │intune-pub.ts │  │  Web Search      │
│              │  │              │  │  (via Claude)    │
│ Certificate  │  │ Graph API    │  │                  │
│ Credential   │  │ Calls        │  │ Description/Logo │
└──────────────┘  └──────────────┘  └──────────────────┘
       │                 │
       │                 ▼
       │       ┌──────────────────┐
       └──────►│ Microsoft Graph  │
               │ API              │
               │ /deviceAppMgmt  │
               └──────────────────┘
```

## API Design

### publish_to_intune Tool

**Input Schema**:
```typescript
interface PublishToIntuneInput {
  // Required
  intunewin_path: string;           // Path to .intunewin file

  // Auto-populated if not provided
  app_name?: string;                // From PSADT context
  app_version?: string;             // From PSADT context
  app_vendor?: string;              // From PSADT context

  // Optional
  description?: string;             // Or fetched via web search
  logo_path?: string;               // Or fetched via web search
  skip_logo?: boolean;              // Don't fetch logo (default: false)

  // Detection (from generate_intune_detection output)
  detection_rule?: DetectionRule;
}
```

**Output Schema**:
```typescript
interface PublishResult {
  success: boolean;
  app_id?: string;                  // Intune app GUID
  app_name?: string;
  portal_url?: string;              // Link to app in Intune portal
  error?: string;
  recommendations?: string[];
}
```

## Risks / Trade-offs

### Risk 1: Certificate handling complexity
**Risk**: Users may struggle to create and configure service principal with certificate.
**Mitigation**: Provide detailed setup guide in documentation. Include PowerShell script to create service principal.

### Risk 2: Large file upload reliability
**Risk**: Network interruptions during large .intunewin uploads.
**Mitigation**: Implement retry logic with exponential backoff. Consider resumable uploads in future.

### Risk 3: Graph API rate limits
**Risk**: Throttling during batch operations.
**Mitigation**: Implement rate limit detection (429 status) and respect Retry-After header.

### Risk 4: Logo search quality
**Risk**: Web search may return inappropriate or low-quality logos.
**Mitigation**: Make logo fetch optional (skip_logo flag). Validate image dimensions. Fall back gracefully.

## Migration Plan

This is a new feature, no migration required.

### Rollout Steps
1. Release as opt-in feature
2. Document service principal setup
3. Gather feedback on auth experience
4. Consider adding interactive auth if demand exists

## Open Questions

- [ ] Should we cache Graph API tokens across tool calls? (Likely yes, add to cache service)
- [ ] Should we support managed identity for Azure-hosted scenarios? (Future enhancement)
- [ ] Should we add a `list_intune_apps` tool for verification? (Consider for v2)
