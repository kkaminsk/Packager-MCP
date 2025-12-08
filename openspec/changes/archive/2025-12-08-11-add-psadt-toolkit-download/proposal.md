# Change: Add PSADT Toolkit Download from GitHub

## Why

Currently, when generating PSADT packages, the MCP server generates the `Deploy-Application.ps1` script and documentation but tells users to manually add the PSAppDeployToolkit module files (`PSAppDeployToolkit/` directory containing `PSAppDeployToolkit.psd1`, `PSAppDeployToolkit.psm1`, etc.) and supporting files (`Invoke-AppDeployToolkit.exe`, strings, assets, etc.).

This creates friction in the packaging workflow:
1. Users must separately download PSADT from GitHub
2. Users must know the correct version to download (v4.x)
3. Users must manually extract and organize files into the correct structure
4. Version mismatches can occur between the generated script and the toolkit version

## What Changes

- **ADDED**: New `download_psadt_toolkit` MCP tool that downloads the PSAppDeployToolkit release from GitHub
- **ADDED**: New `PsadtDownloadService` in `src/services/psadt-download.ts` to handle GitHub release fetching and extraction
- **MODIFIED**: `get_psadt_template` tool to optionally include toolkit download in a single operation
- **MODIFIED**: `/package-app` workflow to integrate toolkit download as part of complete package generation

### New Tool Parameters

```typescript
download_psadt_toolkit: {
  output_directory: string;      // Required: Where to extract toolkit
  version?: string;              // Optional: Specific version (default: latest)
  include_extensions?: boolean;  // Optional: Include Extensions module (default: false)
}
```

### Output Structure

```
{output_directory}/
├── PSAppDeployToolkit/
│   ├── PSAppDeployToolkit.psd1
│   ├── PSAppDeployToolkit.psm1
│   └── ...
├── PSAppDeployToolkit.Extensions/ (if requested)
├── Config/
├── Assets/
├── Strings/
├── Invoke-AppDeployToolkit.exe
└── Invoke-AppDeployToolkit.ps1
```

## Impact

- **Affected specs**: `psadt-service`, potentially new `psadt-toolkit-download` capability
- **Affected code**:
  - `src/services/psadt-download.ts` (new)
  - `src/handlers/tools.ts` (add new tool handler)
  - `src/workflows/package-app.ts` (integrate download)
  - `src/types/psadt.ts` (new types)
- **External dependency**: GitHub API for PSAppDeployToolkit/PSAppDeployToolkit releases
