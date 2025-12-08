# Intune Packaging Assistant MCP Server

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
| Runtime | Node.js 20+ (primary) or Python 3.11+ |
| MCP SDK | `@modelcontextprotocol/sdk` (TypeScript) |
| HTTP Client | `fetch` for GitHub API calls |
| Caching | In-memory LRU (optional Redis for remote) |
| Configuration | YAML/JSON config files |
| Packaging | npm for local, Docker for remote deployment |

## Project Structure

```
src/
├── server.ts           # MCP server entry point
├── handlers/
│   ├── tools.ts        # Tool implementations
│   ├── resources.ts    # Resource handlers
│   └── prompts.ts      # Prompt workflows
├── services/
│   ├── winget.ts       # Winget API integration
│   ├── psadt.ts        # PSADT template generation
│   ├── validation.ts   # Package validation
│   └── detection.ts    # Intune detection rule generation
├── knowledge/          # Embedded documentation
│   ├── psadt/          # PSADT v4 docs and patterns
│   ├── installers/     # Installer type guides
│   └── reference/      # Silent args, exit codes
└── types/              # TypeScript type definitions
    ├── winget.ts       # Winget types
    ├── psadt.ts        # PSADT types
    ├── validation.ts   # Validation types
    └── intune.ts       # Intune detection types
```

## MCP Tools to Implement

| Tool | Purpose |
|------|---------|
| `search_winget` | Query Winget repo for app metadata, installer URLs, silent args |
| `get_psadt_template` | Generate PSADT v4 scripts based on installer type |
| `validate_package` | Check scripts against best practices |
| `get_silent_install_args` | Retrieve/derive silent install parameters |
| `generate_intune_detection` | Create Intune detection rules (file/registry/MSI/script) |

## MCP Resources

| URI Pattern | Content |
|-------------|---------|
| `psadt://docs/*` | PSADT v4 documentation (overview, functions, variables, migration, best-practices) |
| `kb://installers/*` | Installer type guides (msi, exe, msix) |
| `kb://patterns/*` | Packaging patterns (detection, prerequisites, user-context) |
| `ref://silent-args` | Known silent install arguments database |
| `ref://exit-codes` | Common installer exit codes |

## MCP Prompts

| Prompt | Description |
|--------|-------------|
| `/package-app` | Guided workflow to create complete Intune package |
| `/convert-legacy` | Convert PSADT v3 scripts to v4 format |
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
- Key functions: `Initialize-ADTDeployment`, `Start-ADTProcess`, `Show-ADTInstallationWelcome`, `Complete-ADTDeployment`

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

### PSADT v4 Key Changes from v3
- Module-based architecture (Import-Module)
- `ADT` prefix on all functions (e.g., `Show-ADTInstallationWelcome`)
- `$ADTSession` object for state management
- Structured error handling with `Complete-ADTDeployment`

### Intune Detection Methods
1. **File**: Check file exists at path with version/size
2. **Registry**: Check registry key/value exists
3. **MSI**: Check MSI product code
4. **Script**: PowerShell script returns exit code 0 for detected

---

## Implementation Roadmap

All 7 proposals have been implemented and archived. Archived proposals are in `openspec/changes/archive/`.

### Proposal Summary

| # | Proposal | Capability | Status |
|---|----------|------------|--------|
| 1 | `1-add-mcp-server-foundation` | MCP server core, config, caching, logging | Archived |
| 2 | `2-add-winget-integration` | `search_winget`, `get_silent_install_args` tools | Archived |
| 3 | `3-add-psadt-templates` | `get_psadt_template` tool, knowledge base resources | Archived |
| 4 | `4-add-validation-engine` | `validate_package` tool | Archived |
| 5 | `5-add-intune-detection` | `generate_intune_detection` tool | Archived |
| 6 | `6-add-mcp-prompts` | `/package-app`, `/convert-legacy`, `/troubleshoot`, `/bulk-lookup` | Archived |
| 7 | `7-knowledge-maintenance` | Knowledge base versioning, maintenance workflow, validation | Archived |

### Creating New Proposals

To propose new changes:
```bash
/openspec:proposal <change-id>
```

To view archived proposals:
```bash
openspec list --archived
```

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