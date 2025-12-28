# Application Specification: Packager-MCP

## Document Information

| Field | Value |
|-------|-------|
| Version | 0.8.0 |
| Status | Beta |
| Last Updated | December 2024 |
| Author | [Your Name] |

---

## 1. Executive Summary

### 1.1 Vision Statement

An MCP (Model Context Protocol) server that transforms Claude CLI and compatible AI tools into expert Windows application packaging assistants. The server combines curated knowledge about PowerShell Application Deployment Toolkit (PSADT) v4 with live data from the Winget package repository to streamline the creation of enterprise-ready Intune application packages.

### 1.2 Problem Statement

Enterprise IT professionals and Managed Service Providers (MSPs) face significant challenges when packaging applications for Microsoft Intune deployment:

- **Inconsistent packaging quality**: Without standardized templates and best practices, packages vary in reliability
- **Time-consuming research**: Finding silent install parameters, download URLs, and dependencies requires manual investigation
- **PSADT complexity**: The PowerShell Application Deployment Toolkit is powerful but has a steep learning curve
- **Version management**: Keeping track of application versions and update procedures is error-prone
- **Documentation gaps**: Institutional knowledge about packaging decisions is often lost

### 1.3 Solution Overview

An MCP server that provides:

1. **Intelligent Winget lookups** — Automated retrieval of installer URLs, silent install parameters, and metadata
2. **PSADT v4 expertise** — Embedded knowledge of best practices, patterns, and common pitfalls
3. **Template generation** — Production-ready PSADT scripts tailored to specific application types
4. **Validation tools** — Automated checking of packages against enterprise standards
5. **Guided workflows** — Step-by-step prompts for common packaging scenarios

---

## 2. Target Users

### 2.1 Primary Users

| User Type | Description | Key Needs |
|-----------|-------------|-----------|
| **Enterprise IT Administrators** | In-house IT staff managing Intune deployments | Speed, reliability, compliance |
| **MSP Engineers** | Service providers packaging apps for multiple clients | Efficiency, consistency, scalability |
| **Endpoint Engineers** | Specialists focused on Windows endpoint management | Advanced features, customization |

### 2.2 User Personas

#### Persona 1: Alex — Enterprise IT Admin

- Manages 2,000 endpoints via Intune
- Packages 5-10 new applications monthly
- Has basic PowerShell knowledge
- Wants reliable packages without deep PSADT expertise

#### Persona 2: Sarah — MSP Engineer

- Supports 15 different client environments
- Packages 30+ applications monthly
- Experienced with PSADT but wants faster turnaround
- Needs consistent, documented packages across clients

#### Persona 3: Marcus — Endpoint Specialist

- Deep expertise in Windows deployment
- Creates complex, multi-phase installations
- Wants advanced customization options
- Values validation and quality assurance tools

---

## 3. Functional Requirements

### 3.1 MCP Tools

Tools are functions that Claude can invoke to perform actions or retrieve dynamic data.

#### 3.1.1 `search_winget`

**Purpose**: Query the Winget package repository for application metadata.

**Input Parameters**:
```json
{
  "query": "string — Application name or identifier",
  "exact_match": "boolean — Whether to require exact ID match (default: false)",
  "include_versions": "boolean — Include version history (default: false)"
}
```

**Output**:
```json
{
  "package_id": "string",
  "name": "string",
  "publisher": "string",
  "version": "string",
  "installer_type": "string (msi|exe|msix|zip)",
  "installer_url": "string",
  "installer_sha256": "string",
  "silent_args": "string",
  "install_scope": "string (machine|user)",
  "dependencies": ["array of dependency IDs"],
  "minimum_os_version": "string",
  "source_manifest_url": "string"
}
```

**Behavior**:
- Searches `microsoft/winget-pkgs` GitHub repository
- Returns best match or list of candidates if ambiguous
- Caches results to minimize API calls
- Falls back gracefully if GitHub API is unavailable

---

#### 3.1.2 `get_psadt_template`

**Purpose**: Generate a PSADT v4 deployment script template based on application characteristics.

**Input Parameters**:
```json
{
  "installer_type": "string (msi|exe|msix|zip|script)",
  "install_scope": "string (machine|user|both)",
  "requires_reboot": "boolean",
  "has_prerequisites": "boolean",
  "include_uninstall": "boolean (default: true)",
  "include_repair": "boolean (default: false)",
  "complexity": "string (basic|standard|advanced)"
}
```

**Output**:
```json
{
  "script_content": "string — Complete PSADT script",
  "file_structure": {
    "files": ["array of required files"],
    "folders": ["array of required folders"]
  },
  "customization_points": [
    {
      "location": "string — Line number or section",
      "description": "string — What to customize",
      "example": "string — Example value"
    }
  ],
  "documentation": "string — Usage notes"
}
```

---

#### 3.1.3 `validate_package`

**Purpose**: Check a package configuration or script against best practices and common issues.

**Input Parameters**:
```json
{
  "script_content": "string — PSADT script to validate",
  "validation_level": "string (basic|standard|strict)",
  "target_environment": "string (intune|sccm|standalone)"
}
```

**Output**:
```json
{
  "is_valid": "boolean",
  "score": "integer (0-100)",
  "issues": [
    {
      "severity": "string (error|warning|info)",
      "category": "string",
      "message": "string",
      "line_number": "integer|null",
      "suggestion": "string"
    }
  ],
  "passed_checks": ["array of passed validation rules"]
}
```

**Validation Rules Include**:
- Required PSADT functions are present
- Silent install parameters are properly configured
- Exit codes are handled correctly
- Logging is configured
- Intune detection rules can be generated
- No hardcoded paths that would fail on other systems
- Proper error handling exists

---

#### 3.1.4 `get_silent_install_args`

**Purpose**: Retrieve or derive silent installation arguments for a specific application.

**Input Parameters**:
```json
{
  "application_name": "string",
  "installer_type": "string (msi|exe|nullsoft|inno|installshield|wix)",
  "installer_path": "string (optional — for analysis)"
}
```

**Output**:
```json
{
  "silent_args": "string",
  "very_silent_args": "string|null",
  "log_args": "string|null",
  "install_dir_arg": "string|null",
  "confidence": "string (verified|high|medium|low)",
  "source": "string (winget|known_installer|heuristic)",
  "notes": "string"
}
```

---

#### 3.1.5 `generate_intune_detection`

**Purpose**: Create detection rules for Intune based on the application package.

**Input Parameters**:
```json
{
  "detection_type": "string (file|registry|msi|script)",
  "application_name": "string",
  "version": "string",
  "install_path": "string (optional)",
  "msi_product_code": "string (optional)"
}
```

**Output**:
```json
{
  "detection_method": "string",
  "configuration": {
    // Detection-type-specific configuration
  },
  "powershell_script": "string (if script-based detection)",
  "intune_json": "object — Ready for Intune API"
}
```

---

#### 3.1.6 `verify_psadt_functions`

**Purpose**: Verify that a PSADT script file uses only valid v4.1.7 function names. This tool catches AI-generated incorrect function names like `Initialize-ADTDeployment` (which should be `Open-ADTSession`).

**Input Parameters**:
```json
{
  "file_path": "string — Path to the PSADT script file to verify"
}
```

**Output**:
```json
{
  "isValid": "boolean",
  "validFunctions": ["array of valid function names found"],
  "invalidFunctions": [
    {
      "found": "string — Invalid function name",
      "suggestion": "string — Correct function to use",
      "line": "integer — Line number"
    }
  ],
  "parameterIssues": [
    {
      "function": "string",
      "issue": "string",
      "suggestion": "string"
    }
  ]
}
```

**Behavior**:
- Scans the script for all ADT-prefixed function calls
- Validates each against the official PSADT v4.1.7 function list (135 functions)
- Identifies common AI hallucinations like `Initialize-ADTDeployment`
- Returns suggested replacements for invalid functions

---

### 3.2 MCP Resources

Resources are static or semi-static content that Claude can access for context.

#### 3.2.1 PSADT v4 Documentation

| Resource URI | Description |
|--------------|-------------|
| `psadt://docs/overview` | PSADT v4 architecture and concepts |
| `psadt://docs/functions` | Complete function reference |
| `psadt://docs/variables` | Built-in variables reference |
| `psadt://docs/migration` | Migration guide from v3 to v4 |
| `psadt://docs/best-practices` | Recommended patterns and practices |

#### 3.2.2 Packaging Knowledge Base

| Resource URI | Description |
|--------------|-------------|
| `kb://installers/msi` | MSI packaging guide and common parameters |
| `kb://installers/exe` | EXE installer types and handling (NSIS, Inno Setup, InstallShield, etc.) |
| `kb://installers/msix` | MSIX/AppX packaging for Intune |
| `kb://patterns/detection` | Detection rule patterns and examples |
| `kb://patterns/prerequisites` | Handling .NET, VC++, and other prereqs |

#### 3.2.3 Reference Data

| Resource URI | Description |
|--------------|-------------|
| `ref://exit-codes` | Common installer exit codes and meanings |

**Note**: Silent install arguments are accessed via the `get_silent_install_args` tool rather than as a resource, enabling dynamic lookups from the Winget repository with confidence scoring.

---

### 3.3 MCP Prompts

Prompts are pre-defined workflows that users can invoke.

#### 3.3.1 `/package-app`

**Description**: Guided workflow to create a complete Intune-ready package from scratch.

**Workflow Steps**:
1. Gather application name and version
2. Search Winget for metadata (auto-populate if found)
3. Confirm or manually enter installer details
4. Select installation context and requirements
5. Generate PSADT script
6. Create detection rules
7. Generate documentation
8. Output complete package structure

**Arguments**:
```
/package-app [application-name] [--quick] [--no-validate]
```

---

#### 3.3.2 `/convert-legacy`

**Description**: Convert an existing PSADT v3 package to v4 format.

**Workflow Steps**:
1. Analyze existing v3 script
2. Identify deprecated functions and patterns
3. Generate equivalent v4 script
4. Highlight manual review points
5. Validate converted script

**Arguments**:
```
/convert-legacy [path-to-v3-script]
```

---

#### 3.3.3 `/troubleshoot`

**Description**: Diagnose issues with a failing package.

**Workflow Steps**:
1. Gather error symptoms
2. Review provided logs or script
3. Identify likely causes
4. Suggest specific fixes
5. Optionally apply fixes to script

**Arguments**:
```
/troubleshoot [--log-file path] [--error-code code]
```

---

#### 3.3.4 `/bulk-lookup`

**Description**: Retrieve information for multiple applications at once.

**Arguments**:
```
/bulk-lookup app1, app2, app3 [--output csv|json|markdown]
```

---

## 4. Technical Architecture

### 4.1 System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        MCP Clients                              │
│  (Claude CLI, Claude Desktop, VS Code, other MCP-compatible)    │
└─────────────────────────────┬───────────────────────────────────┘
                              │ JSON-RPC over stdio/HTTP
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                     MCP Server Core                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐             │
│  │   Router    │  │   Auth      │  │   Config    │             │
│  │             │  │ (if licensed│  │   Manager   │             │
│  └──────┬──────┘  └─────────────┘  └─────────────┘             │
│         │                                                       │
│  ┌──────┴──────────────────────────────────────────────┐       │
│  │                  Handler Layer                       │       │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐          │       │
│  │  │  Tools   │  │ Resources│  │ Prompts  │          │       │
│  │  │ Handler  │  │ Handler  │  │ Handler  │          │       │
│  │  └────┬─────┘  └────┬─────┘  └────┬─────┘          │       │
│  └───────┼─────────────┼─────────────┼─────────────────┘       │
│          │             │             │                          │
│  ┌───────┴─────────────┴─────────────┴─────────────────┐       │
│  │                  Service Layer                       │       │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐    │       │
│  │  │   Winget   │  │   PSADT    │  │ Validation │    │       │
│  │  │   Service  │  │   Service  │  │  Service   │    │       │
│  │  └─────┬──────┘  └─────┬──────┘  └────────────┘    │       │
│  └────────┼───────────────┼────────────────────────────┘       │
└───────────┼───────────────┼─────────────────────────────────────┘
            │               │
            ▼               ▼
┌───────────────────┐ ┌───────────────────┐
│   GitHub API      │ │  Knowledge Base   │
│ (winget-pkgs)     │ │  (embedded/files) │
└───────────────────┘ └───────────────────┘
```

### 4.2 Technology Stack

| Component | Technology | Rationale |
|-----------|------------|-----------|
| **Runtime** | Node.js 20+ or Python 3.11+ | Wide MCP SDK support |
| **MCP SDK** | `@modelcontextprotocol/sdk` (TS) or `mcp` (Python) | Official SDKs |
| **HTTP Client** | `fetch` / `httpx` | GitHub API calls |
| **Caching** | In-memory LRU + optional Redis | Reduce API calls |
| **Configuration** | YAML/JSON config file | User customization |
| **Packaging** | npm/pip for local, Docker for remote | Deployment flexibility |

### 4.3 Data Flow Examples

#### Example: Package a New Application

```
User: "Package Google Chrome for Intune"
  │
  ▼
Claude: Invokes search_winget(query="Google Chrome")
  │
  ▼
MCP Server: Queries GitHub API for winget-pkgs/manifests/.../GoogleChrome
  │
  ▼
Returns: {
  package_id: "Google.Chrome",
  installer_type: "exe",
  silent_args: "--silent --install",
  installer_url: "https://...",
  ...
}
  │
  ▼
Claude: Invokes get_psadt_template(installer_type="exe", ...)
  │
  ▼
MCP Server: Generates PSADT script using templates + knowledge base
  │
  ▼
Claude: Invokes validate_package(script_content=...)
  │
  ▼
MCP Server: Validates against rules, returns any issues
  │
  ▼
Claude: Presents complete package with documentation to user
```

---

## 5. Data Sources

### 5.1 Winget Package Repository

**Source**: `https://github.com/microsoft/winget-pkgs`

**Access Method**: GitHub REST API or raw file access

**Data Extracted**:
- Package identifier and metadata
- Installer URLs and checksums
- Silent install switches
- Dependencies
- Version history

**Update Frequency**: Real-time queries (with caching)

**Caching Strategy**:
- Cache manifests for 1 hour
- Cache search results for 15 minutes
- Invalidate on version mismatch

### 5.2 PSADT Knowledge Base

**Source**: Curated content embedded in MCP server

**Content Includes**:
- Official PSADT v4 documentation (with permission/attribution)
- Custom best practices documentation
- Common patterns and anti-patterns
- Troubleshooting guides

**Update Frequency**: Server releases

### 5.3 Silent Install Database

**Source**: Curated reference data

**Content**:
- Known silent install arguments by installer type
- Application-specific overrides
- Exit code mappings

---

## 6. Non-Functional Requirements

### 6.1 Performance

| Metric | Target |
|--------|--------|
| Tool response time (cached) | < 500ms |
| Tool response time (API call) | < 3s |
| Resource load time | < 200ms |
| Concurrent connections | 10+ (local), 100+ (remote) |

### 6.2 Reliability

- Graceful degradation when GitHub API is unavailable
- Cached fallback data for common packages
- Clear error messages with remediation suggestions

### 6.3 Security

| Concern | Mitigation |
|---------|------------|
| API key exposure | Keys stored in environment variables, never logged |
| Malicious script injection | Strict input validation, parameterized templates |
| License enforcement | Server-side validation for premium features |
| Audit logging | Optional logging of all tool invocations |

### 6.4 Compatibility

| MCP Client | Support Level |
|------------|---------------|
| Claude CLI | Full |
| Claude Desktop | Full |
| Claude.ai (remote MCP) | Full (if deployed remotely) |
| VS Code + Continue | Full |
| Other MCP clients | Standard MCP compliance |

---

## 7. Deployment Options

### 7.1 Local Installation

```bash
# npm
npm install -g intune-packaging-mcp

# pip
pip install intune-packaging-mcp
```

**Configuration**: `~/.config/intune-packaging-mcp/config.yaml`

**Claude CLI Integration**:
```bash
claude mcp add --scope user intune-packager -- intune-packaging-mcp serve
```

### 7.2 Remote Deployment

For team/enterprise use, deploy as a remote MCP server:

- **Docker container** on internal infrastructure
- **Cloud hosting** (Azure, AWS, etc.) with OAuth authentication
- **Anthropic remote MCP** integration for Claude.ai users

### 7.3 Configuration Options

```yaml
# config.yaml
server:
  name: "Packager-MCP"
  version: "1.0.0"

github:
  # Optional: Personal access token for higher rate limits
  token: ${GITHUB_TOKEN}
  cache_ttl_minutes: 60

features:
  # Feature flags for premium/licensed features
  advanced_templates: true
  bulk_operations: true
  custom_knowledge_base: true

knowledge_base:
  # Path to additional custom documentation
  custom_docs_path: "./custom-docs"
  
logging:
  level: "info"
  audit_file: "./audit.log"
```

---

## 8. Monetization Strategy

### 8.1 Tier Structure

| Tier | Price | Features |
|------|-------|----------|
| **Community** | Free | Basic Winget lookup, standard PSADT templates, community support |
| **Professional** | $29/month | Advanced templates, validation, bulk operations, email support |
| **Enterprise** | Custom | Custom knowledge bases, SSO, audit logging, SLA, dedicated support |

### 8.2 Feature Matrix

| Feature | Community | Professional | Enterprise |
|---------|:---------:|:------------:|:----------:|
| Winget search | ✓ | ✓ | ✓ |
| Basic PSADT templates | ✓ | ✓ | ✓ |
| Advanced templates | — | ✓ | ✓ |
| Package validation | Basic | Full | Full + Custom Rules |
| Bulk operations | — | ✓ | ✓ |
| Detection rule generation | ✓ | ✓ | ✓ |
| Custom prompts | — | — | ✓ |
| Remote MCP hosting | — | — | ✓ |
| Audit logging | — | — | ✓ |
| Support | Community | Email | Dedicated |

### 8.3 License Enforcement

- License key validated at server startup
- Feature flags controlled server-side
- Graceful degradation to Community tier on invalid/expired license

---

## 9. Roadmap

### Phase 1: MVP (v1.0) — COMPLETE

- [x] Core Winget lookup functionality
- [x] Basic PSADT v4 templates (MSI, EXE)
- [x] Simple validation rules
- [x] `/package-app` prompt workflow
- [x] Local installation support
- [x] Documentation

### Phase 2: Enhanced Features (v1.5) — IN PROGRESS

- [x] Advanced installer type support (MSIX, ZIP, script)
- [x] Comprehensive validation engine
- [x] `/convert-legacy` prompt for v3→v4 migration
- [x] PSADT function verification tool (`verify_psadt_functions`)
- [x] Caching layer (in-memory LRU)
- [ ] Redis support for remote caching
- [ ] License key system

### Phase 3: Enterprise (v2.0)

- [x] Docker container deployment
- [ ] Remote MCP server deployment (Streamable HTTP transport)
- [ ] OAuth/SSO integration
- [ ] Custom knowledge base support
- [ ] Audit logging
- [ ] Team/organization management
- [ ] API for license management

### Phase 4: Ecosystem (v2.5+)

- [ ] VS Code extension companion
- [ ] Integration with SCCM/ConfigMgr
- [ ] Application update monitoring
- [ ] Community template repository
- [ ] Automated testing framework for packages

---

## 10. Success Metrics

| Metric | Target (Year 1) |
|--------|-----------------|
| GitHub stars | 500+ |
| Active installations | 1,000+ |
| Professional subscriptions | 100+ |
| Enterprise customers | 10+ |
| Community Discord/forum members | 500+ |
| Average package creation time reduction | 60%+ |

---

## 11. Risks and Mitigations

| Risk | Impact | Likelihood | Mitigation |
|------|--------|------------|------------|
| GitHub API rate limiting | Medium | Medium | Implement caching, support PAT tokens |
| PSADT v5 release | Medium | Low | Monitor development, plan migration path |
| Winget schema changes | High | Low | Abstract data layer, version detection |
| Competitor entry | Medium | Medium | Focus on quality and community |
| Low adoption | High | Medium | Freemium model, content marketing |

---

## 12. Appendices

### Appendix A: Glossary

| Term | Definition |
|------|------------|
| **MCP** | Model Context Protocol — Open standard for AI tool integration |
| **PSADT** | PowerShell Application Deployment Toolkit |
| **Intune** | Microsoft's cloud-based endpoint management solution |
| **Winget** | Windows Package Manager |
| **MSP** | Managed Service Provider |

### Appendix B: References

- [Model Context Protocol Specification](https://modelcontextprotocol.io)
- [PSADT Documentation](https://psappdeploytoolkit.com)
- [Winget Package Repository](https://github.com/microsoft/winget-pkgs)
- [Intune Win32 App Management](https://docs.microsoft.com/en-us/mem/intune/apps/apps-win32-app-management)

### Appendix C: Sample Winget Manifest Structure

```yaml
PackageIdentifier: Google.Chrome
PackageVersion: "120.0.6099.130"
PackageName: Google Chrome
Publisher: Google LLC
License: Freeware
ShortDescription: A fast, secure, and free web browser
Installers:
  - Architecture: x64
    InstallerType: exe
    InstallerUrl: https://dl.google.com/chrome/install/latest/chrome_installer.exe
    InstallerSha256: abc123...
    InstallerSwitches:
      Silent: --silent --install
      SilentWithProgress: --silent --install
```

### Appendix D: Sample PSADT v4 Script Structure

```powershell
[CmdletBinding()]
param (
    [Parameter(Mandatory = $false)]
    [ValidateSet('Install', 'Uninstall', 'Repair')]
    [System.String]$DeploymentType,

    [Parameter(Mandatory = $false)]
    [ValidateSet('Auto', 'Interactive', 'NonInteractive', 'Silent')]
    [System.String]$DeployMode,

    [Parameter(Mandatory = $false)]
    [System.Management.Automation.SwitchParameter]$SuppressRebootPassThru,

    [Parameter(Mandatory = $false)]
    [System.Management.Automation.SwitchParameter]$TerminalServerMode,

    [Parameter(Mandatory = $false)]
    [System.Management.Automation.SwitchParameter]$DisableLogging
)

## Session configuration hashtable
$adtSession = @{
    AppVendor = 'Google'
    AppName = 'Chrome'
    AppVersion = '120.0.6099.130'
    AppArch = 'x64'
    AppLang = 'EN'
    AppRevision = '01'
    AppSuccessExitCodes = @(0)
    AppRebootExitCodes = @(1641, 3010)
    AppProcessesToClose = @('chrome', 'GoogleUpdate')
    AppScriptVersion = '1.0.0'
    AppScriptDate = '2025-01-01'
    AppScriptAuthor = 'IT Admin'
    RequireAdmin = $true
    DeployAppScriptFriendlyName = $MyInvocation.MyCommand.Name
    DeployAppScriptParameters = $PSBoundParameters
    DeployAppScriptVersion = '4.1.7'
}

## Deployment functions
function Install-ADTDeployment {
    [CmdletBinding()]
    param()

    $adtSession.InstallPhase = "Pre-$($adtSession.DeploymentType)"
    Show-ADTInstallationWelcome -CloseProcesses $adtSession.AppProcessesToClose -AllowDefer -DeferTimes 3
    Show-ADTInstallationProgress

    $adtSession.InstallPhase = $adtSession.DeploymentType
    $installerPath = Join-Path -Path $adtSession.DirFiles -ChildPath 'chrome_installer.exe'
    Start-ADTProcess -FilePath $installerPath -ArgumentList '--silent --install'

    $adtSession.InstallPhase = "Post-$($adtSession.DeploymentType)"
}

function Uninstall-ADTDeployment {
    [CmdletBinding()]
    param()

    $adtSession.InstallPhase = "Pre-$($adtSession.DeploymentType)"
    Show-ADTInstallationWelcome -CloseProcesses $adtSession.AppProcessesToClose -CloseProcessesCountdown 60
    Show-ADTInstallationProgress

    $adtSession.InstallPhase = $adtSession.DeploymentType
    $app = Get-ADTApplication -Name 'Google Chrome'
    if ($app.UninstallString) {
        Start-ADTProcess -FilePath $app.UninstallString -ArgumentList '--uninstall --force-uninstall'
    }

    $adtSession.InstallPhase = "Post-$($adtSession.DeploymentType)"
}

function Repair-ADTDeployment {
    [CmdletBinding()]
    param()
    Install-ADTDeployment
}

## Initialization
$ErrorActionPreference = [System.Management.Automation.ActionPreference]::Stop
$ProgressPreference = [System.Management.Automation.ActionPreference]::SilentlyContinue
Set-StrictMode -Version 1

try {
    Import-Module -FullyQualifiedName @{ ModuleName = "$PSScriptRoot\PSAppDeployToolkit\PSAppDeployToolkit.psd1"; Guid = '8c3c366b-8606-4576-9f2d-4051144f7ca2'; ModuleVersion = '4.1.7' } -Force
    $iadtParams = Get-ADTBoundParametersAndDefaultValues -Invocation $MyInvocation
    $adtSession = Remove-ADTHashtableNullOrEmptyValues -Hashtable $adtSession
    $adtSession = Open-ADTSession @adtSession @iadtParams -PassThru
}
catch {
    $Host.UI.WriteErrorLine((Out-String -InputObject $_ -Width ([System.Int32]::MaxValue)))
    exit 60008
}

## Invocation
try {
    & "$($adtSession.DeploymentType)-ADTDeployment"
    Close-ADTSession
}
catch {
    Write-ADTLogEntry -Message "Unhandled error: $(Resolve-ADTErrorRecord -ErrorRecord $_)" -Severity 3
    Close-ADTSession -ExitCode 60001
}
```

---

*End of Specification Document*
