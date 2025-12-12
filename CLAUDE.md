# Packager-MCP

An MCP (Model Context Protocol) server that transforms Claude CLI and compatible AI tools into expert Windows application packaging assistants for Microsoft Intune.

## Project Overview

This server combines:
- **Winget package repository** integration for live installer metadata
- **PSADT v4** (PowerShell Application Deployment Toolkit) expertise and templates
- **Validation tools** for enterprise-ready packages
- **Guided workflows** for common packaging scenarios

## Tech Stack

| Component | Technology |
|-----------|------------|
| Runtime | Node.js 20+ |
| MCP SDK | `@modelcontextprotocol/sdk` (TypeScript) |
| HTTP Client | `fetch` for GitHub API calls |
| Caching | In-memory LRU (optional Redis for remote) |
| Configuration | YAML/JSON config files |
| Packaging | npm for local, Docker for remote deployment |

## Project Structure

```
src/
├── server.ts              # MCP server entry point
├── handlers/
│   ├── tools.ts           # Tool implementations
│   ├── resources.ts       # Resource handlers
│   └── prompts.ts         # Prompt workflows
├── services/
│   ├── winget.ts          # Winget API integration
│   ├── psadt.ts           # PSADT template generation
│   ├── validation.ts      # Package validation
│   └── detection.ts       # Intune detection rule generation
├── workflows/             # Prompt workflow implementations
│   ├── package-app.ts     # /package-app workflow
│   ├── troubleshoot.ts    # /troubleshoot workflow
│   └── bulk-lookup.ts     # /bulk-lookup workflow
├── knowledge/             # Embedded documentation
│   ├── psadt/             # PSADT v4 docs (overview, functions, variables, best-practices)
│   ├── installers/        # Installer type guides (msi, exe, msix)
│   ├── patterns/          # Packaging patterns (detection, prerequisites, download)
│   ├── reference/         # Silent args database (JSON), exit codes
│   └── v4github/          # Static PSADT v4.1.7 toolkit files
├── templates/             # Handlebars templates for PSADT scripts
├── cache/                 # LRU cache implementation
├── config/                # Configuration loader and schema
├── utils/                 # Logger and error utilities
└── types/                 # TypeScript type definitions

ReferenceKnowledge/        # Source reference materials (not distributed)
├── V4Assets/              # PSADT v4.1.7 source files
├── functionsdoc.md        # Complete function reference
├── V4DOCS.md              # v4 documentation
└── Examples/              # Example deployments
```

## MCP Tools

| Tool | Purpose |
|------|---------|
| `search_winget` | Query Winget repo for app metadata, installer URLs, silent args |
| `get_psadt_template` | Generate PSADT v4 scripts based on installer type (with optional package creation) |
| `validate_package` | Check scripts against best practices |
| `get_silent_install_args` | Retrieve/derive silent install parameters |
| `generate_intune_detection` | Create Intune detection rules (file/registry/MSI/script) |

Note: Use `search_winget` to get installer URLs and SHA256 hashes, then download installers using PowerShell's `Invoke-WebRequest`. When using `get_psadt_template` with `output_directory`, the tool automatically copies PSADT toolkit files from `dist/knowledge/v4github/` and creates a complete deployment package.

## MCP Resources

| URI Pattern | Content |
|-------------|---------|
| `psadt://docs/*` | PSADT v4 documentation (overview, functions, variables, best-practices) |
| `kb://installers/*` | Installer type guides (msi, exe, msix) |
| `kb://patterns/*` | Packaging patterns (detection, prerequisites) |
| `ref://exit-codes` | Common installer exit codes |

Note: Silent install arguments are stored in `src/knowledge/reference/silent-args.json` and accessed via the `get_silent_install_args` tool.

## MCP Prompts

| Prompt | Description |
|--------|-------------|
| `/package-app` | Guided workflow to create complete Intune package |
| `/troubleshoot` | Diagnose failing packages |
| `/bulk-lookup` | Retrieve info for multiple apps |

## Code Conventions

### TypeScript Style
- Use strict TypeScript with explicit types
- Prefer `async/await` over raw Promises
- Use descriptive variable names (no abbreviations)
- Export types from `types/` directory

### Error Handling
- Always provide graceful degradation when GitHub API is unavailable
- Return clear error messages with remediation suggestions
- Log errors with context for debugging

### Caching Strategy
- Cache Winget manifests for 1 hour
- Cache search results for 15 minutes
- Invalidate on version mismatch

### Security Requirements
- Never log API keys or secrets
- Store credentials in environment variables only
- Validate all inputs to prevent script injection
- Use parameterized templates (never string interpolation for user input)

## External Dependencies

### GitHub API (Winget)
- Repository: `microsoft/winget-pkgs`
- Rate limits apply - support PAT tokens for higher limits
- Manifest path pattern: `manifests/{first-letter}/{Publisher}/{AppName}/{Version}/`

### PSADT v4
- Documentation: https://psappdeploytoolkit.com
- Version: 4.1.7 (135 exported functions)
- Key session functions: `Open-ADTSession`, `Close-ADTSession`, `Get-ADTSession`
- Deployment functions: `Install-ADTDeployment`, `Uninstall-ADTDeployment`, `Repair-ADTDeployment`
- Core functions: `Start-ADTProcess`, `Start-ADTMsiProcess`, `Show-ADTInstallationWelcome`, `Show-ADTInstallationProgress`

## Testing

- Unit tests for all services
- Integration tests for MCP protocol compliance
- Test with multiple MCP clients (Claude CLI, Claude Desktop)

## Performance Targets

| Metric | Target |
|--------|--------|
| Cached tool response | < 500ms |
| API call response | < 3s |
| Resource load | < 200ms |

## Key Domain Concepts

### Installer Types
- **MSI**: Windows Installer packages, use `msiexec` with `/qn` for silent
- **EXE**: Can be Nullsoft (NSIS), Inno Setup, InstallShield, WiX - each has different silent args
- **MSIX/AppX**: Modern Windows packages, use `Add-AppxPackage`
- **ZIP**: Extract and run setup, or xcopy deployment

### PSADT v4 Key Concepts
- Module-based architecture (Import-Module PSAppDeployToolkit)
- `ADT` prefix on all 135 functions (e.g., `Show-ADTInstallationWelcome`)
- `$adtSession` object for state management via `Open-ADTSession`
- Deployment functions: `Install-ADTDeployment`, `Uninstall-ADTDeployment`, `Repair-ADTDeployment`
- Structured error handling with `Close-ADTSession`
- Script parameters: `DeploymentType`, `DeployMode`, `SuppressRebootPassThru`, `TerminalServerMode`, `DisableLogging`

### Intune Detection Methods
1. **File**: Check file exists at path with version/size
2. **Registry**: Check registry key/value exists
3. **MSI**: Check MSI product code
4. **Script**: PowerShell script returns exit code 0 for detected

---

<!-- OPENSPEC:START -->
# OpenSpec Instructions

These instructions are for AI assistants working in this project.

Always open `@/openspec/AGENTS.md` when the request:
- Mentions planning or proposals (words like proposal, spec, change, plan)
- Introduces new capabilities, breaking changes, architecture shifts, or big performance/security work
- Sounds ambiguous and you need the authoritative spec before coding

Use `@/openspec/AGENTS.md` to learn:
- How to create and apply change proposals
- Spec format and conventions
- Project structure and guidelines

Keep this managed block so 'openspec update' can refresh the instructions.

<!-- OPENSPEC:END -->