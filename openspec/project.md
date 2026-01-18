# Project Context

## Purpose

**Packager-MCP** - An MCP (Model Context Protocol) server that transforms Claude CLI and compatible AI tools into expert Windows application packaging assistants.

### Goals
1. Automate Winget package lookups for installer metadata, URLs, and silent install parameters
2. Provide PSADT v4 expertise through embedded documentation and templates
3. Generate production-ready PSADT scripts tailored to specific application types
4. Validate packages against enterprise standards before deployment
5. Guide users through common packaging scenarios with step-by-step workflows

### Target Users
- **Enterprise IT Administrators** - Managing Intune deployments for thousands of endpoints
- **MSP Engineers** - Packaging applications for multiple client environments
- **Endpoint Specialists** - Creating complex, multi-phase installations

## Tech Stack

- **Runtime**: Node.js 20+ (primary choice)
- **Language**: TypeScript (strict mode)
- **MCP SDK**: `@modelcontextprotocol/sdk`
- **HTTP Client**: Native `fetch` API
- **Caching**: In-memory LRU cache (Redis optional for remote deployments)
- **Configuration**: YAML config files
- **Package Manager**: npm
- **Containerization**: Docker (for remote deployment)

## Project Conventions

### TypeScript Code Style

- **TypeScript**: Strict mode enabled, explicit types required
- **Naming**:
  - `camelCase` for variables and functions
  - `PascalCase` for types, interfaces, and classes
  - `SCREAMING_SNAKE_CASE` for constants
- **Files**: `kebab-case.ts` for file names
- **Async**: Prefer `async/await` over raw Promises
- **Exports**: Named exports preferred; types exported from `types/` directory

### PowerShell Code Style

PowerShell scripts follow patterns from the reference function library:

- **Naming**: `Verb-PackagerMcpNoun` pattern (e.g., `Connect-PackagerMcpGraph`)
- **Files**: Each function in separate `.ps1` file with companion `.md` documentation
- **Help**: All functions include comment-based help (Synopsis, Description, Parameters, Examples)
- **CmdletBinding**: Always use `[CmdletBinding()]` to enable common parameters

**Function Template**:
```powershell
function Verb-PackagerMcpNoun {
  <#
    .SYNOPSIS
    Brief description.
    .DESCRIPTION
    Detailed description.
    .PARAMETER ParamName
    Parameter description.
    .OUTPUTS
    Return type and description.
    .EXAMPLE
    Verb-PackagerMcpNoun -ParamName 'value'
    Example description.
  #>
  [CmdletBinding()]
  param(
    [Parameter(Mandatory)]
    [string]$ParamName
  )

  # Implementation
}
```

**Logging Pattern**:
```powershell
function Write-PackagerMcpLog {
  param(
    [Parameter(Mandatory)][string]$Message,
    [ValidateSet('INFO','WARN','ERROR','DEBUG')][string]$Level='INFO'
  )
  $line = "[{0}] {1}: {2}" -f (Get-Date).ToString('yyyy-MM-dd HH:mm:ss'), $Level, $Message
  Add-Content -LiteralPath $script:logPath -Value $line
  switch ($Level) {
    'ERROR' { Write-Error $Message }
    'WARN'  { Write-Warning $Message }
    default { Write-Verbose $Message }
  }
}
```

**Graph API Retry Pattern**:
```powershell
function Invoke-GraphWithRetry {
  param(
    [scriptblock]$Script,
    [int]$MaxRetries = 4,
    [string]$OperationName,
    [int[]]$NonFatalStatusCodes,
    $NonFatalReturn
  )
  $i = 0
  while ($true) {
    try {
      return & $Script
    } catch {
      $code = [int]$_.Exception.Response.StatusCode
      $retry = $code -in 429,502,503,504
      $i++
      $wait = [Math]::Min(2 * [Math]::Pow(2, $i), 60)

      # Respect Retry-After header
      try {
        $headers = $_.Exception.Response.Headers
        if ($headers -and $headers['Retry-After']) { $wait = [int]$headers['Retry-After'] }
      } catch {}

      if ($i -le $MaxRetries -and $retry) {
        Write-PackagerMcpLog "Retry $i/$MaxRetries in $wait sec: $($_.Exception.Message)" 'WARN'
        Start-Sleep -Seconds $wait
        continue
      }
      throw
    }
  }
}
```

**User Confirmation Pattern**:
```powershell
function Confirm-PackagerMcpAction {
  param(
    [Parameter(Mandatory)][string]$Message,
    [switch]$Force
  )
  if ($Force) { return }
  $response = Read-Host "$Message (Y/n)"
  if ($response -eq 'n' -or $response -eq 'N') {
    throw 'Operation cancelled by user.'
  }
}
```

### Architecture Patterns

```
src/
├── server.ts           # MCP server entry point and initialization
├── handlers/           # MCP protocol handlers
│   ├── tools.ts        # Tool request handlers
│   ├── resources.ts    # Resource request handlers
│   └── prompts.ts      # Prompt workflow handlers
├── services/           # Business logic layer
│   ├── winget.ts       # GitHub API integration for Winget
│   ├── psadt.ts        # Template generation engine
│   └── validation.ts   # Package validation rules
├── knowledge/          # Embedded static content
│   ├── psadt/          # PSADT v4 documentation
│   ├── installers/     # Installer type guides
│   └── reference/      # Silent args, exit codes databases
├── cache/              # Caching layer
│   └── lru-cache.ts    # In-memory LRU implementation
├── config/             # Configuration management
│   └── schema.ts       # Config validation schema
└── types/              # TypeScript type definitions
    ├── mcp.ts          # MCP-specific types
    ├── winget.ts       # Winget manifest types
    └── psadt.ts        # PSADT template types
```

**Patterns**:
- **Layered Architecture**: Handlers → Services → External APIs
- **Dependency Injection**: Services injected into handlers
- **Graceful Degradation**: Always provide fallback when external APIs fail
- **Caching Layer**: All external API calls go through cache

### Testing Strategy

- **Unit Tests**: All services must have unit tests (Jest)
- **Integration Tests**: MCP protocol compliance tests
- **Client Tests**: Manual testing with Claude CLI and Claude Desktop
- **Coverage Target**: 80% minimum for services layer

### Git Workflow

- **Main Branch**: `main` - production-ready code
- **Feature Branches**: `feature/{description}` - new features
- **Fix Branches**: `fix/{description}` - bug fixes
- **Commits**: Conventional commits format (`feat:`, `fix:`, `docs:`, `refactor:`, `test:`)
- **PRs**: Required for all changes to `main`

## Domain Context

### Windows Application Packaging

**Installer Types**:
| Type | Tool | Silent Args | Notes |
|------|------|-------------|-------|
| MSI | `msiexec.exe` | `/qn /norestart` | Most reliable, has product codes |
| EXE (NSIS) | Direct | `/S` | Nullsoft Scriptable Install System |
| EXE (Inno) | Direct | `/VERYSILENT /SUPPRESSMSGBOXES` | Inno Setup |
| EXE (InstallShield) | Direct | `/s /v"/qn"` | Complex, varies by version |
| MSIX/AppX | `Add-AppxPackage` | N/A | Modern format, self-contained |
| ZIP | Extract + run | N/A | Manual or xcopy deployment |

### PSADT v4.1.8 (PowerShell Application Deployment Toolkit)

Key concepts:
- Module-based: `Import-Module -FullyQualifiedName @{ ModuleName = 'PSAppDeployToolkit'; ModuleVersion = '4.1.8' }`
- Function prefix: All 135 functions use `ADT` prefix (e.g., `Show-ADTInstallationWelcome`)
- Session hashtable: `$adtSession` (lowercase) for session configuration
- Structured initialization: `Open-ADTSession` / `Close-ADTSession`
- Deployment functions: `Install-ADTDeployment`, `Uninstall-ADTDeployment`, `Repair-ADTDeployment`

Key functions:
- `Open-ADTSession` - Initialize deployment session
- `Close-ADTSession` - Finalize deployment and set exit code
- `Show-ADTInstallationWelcome` - User prompts, app closing
- `Start-ADTProcess` - Execute installers (use `-ArgumentList` parameter)
- `Start-ADTMsiProcess` - MSI-specific installation
- `Get-ADTApplication` - Get installed application info
- `Write-ADTLogEntry` - Logging

### Microsoft Intune

**Win32 App Requirements**:
- Package format: `.intunewin` (created by IntuneWinAppUtil.exe)
- Detection rules: File, Registry, MSI product code, or PowerShell script
- Install/Uninstall commands: Command line strings
- Requirements: OS version, architecture, disk space

### Winget Package Repository

- GitHub repo: `microsoft/winget-pkgs`
- Manifest location: `manifests/{first-letter}/{Publisher}/{AppName}/{Version}/`
- Manifest files: `*.yaml` with installer metadata
- Key fields: `InstallerUrl`, `InstallerSha256`, `InstallerSwitches.Silent`

## Important Constraints

### Technical Constraints
- **GitHub API Rate Limits**: 60 requests/hour unauthenticated, 5000/hour with PAT
- **MCP Protocol**: Must comply with Model Context Protocol specification
- **Node.js**: Minimum version 20.x for native fetch support

### Security Constraints
- **No Secret Logging**: API keys and tokens must never appear in logs
- **Input Validation**: All user inputs must be sanitized before use in templates
- **Template Safety**: Use parameterized templates, never raw string interpolation

### Business Constraints
- **Freemium Model**: Core features free, advanced features licensed
- **Offline Capability**: Must function (degraded) without internet access

## External Dependencies

### GitHub API (Winget Repository)
- **Endpoint**: `https://api.github.com/repos/microsoft/winget-pkgs`
- **Auth**: Optional PAT token via `GITHUB_TOKEN` env var
- **Caching**: Manifests cached 1 hour, search results 15 minutes

### PSADT Project
- **Website**: https://psappdeploytoolkit.com
- **GitHub**: https://github.com/PSAppDeployToolkit/PSAppDeployToolkit
- **Version**: Target PSADT v4.1.8

### MCP Protocol
- **Spec**: https://modelcontextprotocol.io
- **SDK**: `@modelcontextprotocol/sdk` npm package
