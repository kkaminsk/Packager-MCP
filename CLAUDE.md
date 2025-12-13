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
| `verify_psadt_functions` | Verify PSADT script uses valid v4.1.7 function names |

Note: Use `search_winget` to get installer URLs and SHA256 hashes, then download installers using PowerShell's `Invoke-WebRequest`. When using `get_psadt_template` with `output_directory`, the tool automatically copies PSADT toolkit files from `dist/knowledge/v4github/` and creates a complete deployment package.

**Important:** After creating a package with `get_psadt_template`, use `verify_psadt_functions` to validate that no incorrect function names were introduced. This catches AI hallucinations like `Initialize-ADTDeployment` (should be `Open-ADTSession`).

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

## CRITICAL: PSADT Script Generation Rules

> **WARNING: YOUR TRAINING DATA IS WRONG ABOUT PSADT v4 FUNCTION NAMES.**
>
> If you write PSADT scripts from memory, they WILL FAIL. You MUST use the `get_psadt_template` tool and use its output WITHOUT MODIFICATION.

### The Problem: AI Training Data Contains INCORRECT Function Names

AI models (including you) have been trained on outdated or incorrect PSADT function names. These functions **DO NOT EXIST** in PSADT v4.1.7 and will cause runtime errors:

| WRONG (in your training data) | CORRECT (use this) |
|------------------------------|-------------------|
| `Initialize-ADTDeployment` | `Open-ADTSession` |
| `Complete-ADTDeployment` | `Close-ADTSession` |
| `Get-ADTInstalledApplication` | `Get-ADTApplication` |
| `-Arguments` parameter | `-ArgumentList` |

**If you write a script containing `Initialize-ADTDeployment`, it will fail with:**
```
The term 'Initialize-ADTDeployment' is not recognized as the name of a cmdlet
```

### The Solution: Use MCP Tools, Not Your Training Data

The `get_psadt_template` tool generates scripts from Handlebars templates with **CORRECT** function names. You MUST:

1. **NEVER write PSADT scripts from memory** - your training data is wrong
2. **ALWAYS use `get_psadt_template`** - it generates correct scripts
3. **NEVER modify the generated script** - any "improvements" will introduce bugs
4. **ALWAYS run `verify_psadt_functions`** - it catches incorrect function names

### Mandatory Workflow for Creating Packages

```
Step 1: search_winget        → Get package metadata
Step 2: get_psadt_template   → Generate script (with output_directory)
Step 3: verify_psadt_functions → Validate the script (MANDATORY)
Step 4: Report results       → Tell user if verification passed/failed
Step 5: Download installer   → User downloads to Files/ folder
```

**IMPORTANT RULES:**
- After `get_psadt_template` creates `Invoke-AppDeployToolkit.ps1`, DO NOT READ IT AND REWRITE IT
- The tool writes the script directly to disk - just tell the user it's done
- If `verify_psadt_functions` returns `isValid: false`, TELL THE USER about the errors
- NEVER deliver a script that failed verification

### Verification is MANDATORY

After generating any PSADT script, you MUST call `verify_psadt_functions`:

```
verify_psadt_functions(file_path: "<output_directory>/Invoke-AppDeployToolkit.ps1")
```

If verification returns `isValid: false`:
- Report the invalid functions to the user
- Show the suggested replacements
- DO NOT tell the user the package is ready

### How to Know if You Made a Mistake

If you see ANY of these in a script, you wrote it wrong:
- `Initialize-ADTDeployment` → Should be `Open-ADTSession`
- `Complete-ADTDeployment` → Should be `Close-ADTSession`
- `Get-ADTInstalledApplication` → Should be `Get-ADTApplication`
- `Start-ADTProcess -Arguments` → Should be `Start-ADTProcess -ArgumentList`

### Testing

If a script fails with "is not recognized as the name of a cmdlet":
1. The AI wrote the script from training data instead of using the tool
2. Run `verify_psadt_functions` to identify the incorrect functions
3. The script must be regenerated using `get_psadt_template`

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