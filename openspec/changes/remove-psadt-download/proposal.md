# Change: Remove PSADT Download in Favor of Static Knowledge

## Why

The current `download_psadt_toolkit` MCP tool and integrated toolkit download in `get_psadt_template` are unreliable due to:

1. **Network dependency**: GitHub API rate limits (60 req/hour unauthenticated) cause frequent failures
2. **Download failures**: Large ZIP downloads (12MB+) timeout on slow connections
3. **Caching complexity**: Managing cached downloads across sessions is error-prone
4. **Version drift**: Dynamic downloads may get incompatible future versions

The toolkit files are stable and well-defined. Caching them statically inside the MCP package provides a more reliable and faster user experience.

## What Changes

### Removals
- **REMOVED**: `download_psadt_toolkit` MCP tool
- **REMOVED**: `download_toolkit`, `output_directory`, and `toolkit_version` parameters from `get_psadt_template` tool
- **REMOVED**: `PsadtDownloadService` class and related code in `src/services/psadt-download.ts`
- **REMOVED**: Types in `src/types/psadt-download.ts`
- **REMOVED**: Tests in `src/__tests__/psadt-download.test.ts`

### Modifications
- **MODIFIED**: `get_psadt_template` tool description and output to reference static toolkit path
- **MODIFIED**: `src/knowledge/psadt/overview.md` to document the static toolkit location
- **MODIFIED**: `src/knowledge/patterns/download.md` to remove dynamic download patterns

### Additions
- **ADDED**: Static PSADT v4.1.7 toolkit files copied from `ReferenceKnowledge/PSAppDeployToolkit_Template_v4/` to `src/knowledge/v4github/`
- **ADDED**: Documentation guidance for users to copy toolkit files from the static knowledge location

## Static Knowledge Source

The static toolkit files will be sourced from the existing reference knowledge at:
```
C:\temp\Packager-MCP\ReferenceKnowledge\PSAppDeployToolkit_Template_v4\
```

This contains PSADT v4.1.7 with:
- **PSAppDeployToolkit module** (135 exported functions)
- **Frontend v4** with `Invoke-AppDeployToolkit.ps1` and `Invoke-AppDeployToolkit.exe`
- **Config, Assets, Strings, Files** directories
- **PSAppDeployToolkit.Extensions** module

### Destination Structure
```
src/knowledge/v4github/
├── PSAppDeployToolkit/
│   ├── PSAppDeployToolkit.psd1       # Module manifest (v4.1.7)
│   ├── PSAppDeployToolkit.psm1       # Module implementation
│   ├── PSAppDeployToolkit.cer        # Code signing certificate
│   ├── COPYING.Lesser                # License
│   ├── !README.txt                   # Module readme
│   ├── ADMX/                         # Group Policy templates
│   ├── Assets/                       # Module assets
│   ├── Config/                       # Module config
│   ├── Frontend/
│   │   ├── v3/                       # Legacy v3 frontend (for compatibility)
│   │   └── v4/                       # v4 frontend files
│   │       ├── Invoke-AppDeployToolkit.exe
│   │       ├── Invoke-AppDeployToolkit.ps1
│   │       └── PSAppDeployToolkit.Extensions/
│   └── lib/                          # .NET assemblies and localized resources
├── Config/
│   └── config.psd1                   # Default toolkit configuration
├── Assets/
│   ├── AppIcon.png
│   └── Banner.Classic.png
└── Files/
    └── Add Setup Files Here.txt      # Placeholder for installer files
```

## User Workflow Change

**Before**: Call `download_psadt_toolkit` tool → toolkit downloaded from GitHub (unreliable)

**After**:
1. Use `get_psadt_template` to generate the deployment script
2. Copy toolkit files from `dist/knowledge/v4github/` to your package directory
3. Or use PowerShell: `Copy-Item -Recurse "$MCPServerPath\knowledge\v4github\*" "C:\MyPackage\"`

## Impact

- **Affected specs**: `psadt-service`
- **Affected code**:
  - `src/services/psadt-download.ts` (deleted)
  - `src/types/psadt-download.ts` (deleted)
  - `src/__tests__/psadt-download.test.ts` (deleted)
  - `src/handlers/tools.ts` (remove download tool and template download integration)
  - `src/knowledge/psadt/overview.md` (update toolkit location guidance)
  - `src/knowledge/patterns/download.md` (update download patterns)
- **External dependency removed**: No longer depends on GitHub API for toolkit downloads
- **Breaking change**: Users who relied on `download_psadt_toolkit` tool must copy from static path instead
